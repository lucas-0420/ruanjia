import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { 
  Building2, MapPin, Bed, Bath, Maximize, Info, 
  Image as ImageIcon, Check, Loader2, ChevronLeft,
  DollarSign, Layers, ShieldCheck, Trash2, Plus,
  Upload, Sparkles, Wand2, ClipboardList, X
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function PostProperty() {
  const { user, userRole, login, isAuthReady } = useFirebase();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const location = useLocation();

  useEffect(() => {
    if (isAuthReady && user && userRole !== 'agent' && userRole !== 'admin') {
      navigate('/');
    }
  }, [isAuthReady, user, userRole]);

  useEffect(() => {
    if (location.state?.prefill) {
      const prefill = location.state.prefill;
      setFormData(prev => ({
        ...prev,
        title: prefill.title || prev.title,
        price: prefill.price?.toString() || prev.price,
        type: prefill.type || prev.type,
        city: prefill.city || prev.city,
        district: prefill.district || prev.district,
        address: prefill.address || prev.address,
        bedrooms: prefill.bedrooms?.toString() || prev.bedrooms,
        bathrooms: prefill.bathrooms?.toString() || prev.bathrooms,
        area: prefill.area?.toString() || prev.area,
        description: prefill.description || prev.description,
      }));
    }
  }, [location.state]);

  if (isAuthReady && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-50">
        <div className="w-20 h-20 bg-orange-100 rounded-[32px] flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">請先登入</h1>
        <p className="text-gray-500 mb-8 max-w-md">您需要登入帳戶才能刊登或編輯房源資訊。</p>
        <button 
          onClick={login}
          className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all"
        >
          立即登入
        </button>
      </div>
    );
  }
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const dragIndexRef = React.useRef<number | null>(null);
  const [selectedImages, setSelectedImages] = React.useState<Set<number>>(new Set());
  const [video, setVideo] = React.useState<string>('');
  const [uploadingVideo, setUploadingVideo] = React.useState(false);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const [formData, setFormData] = useState({
    title: '',
    price: '',
    type: 'apartment',
    city: '台北市',
    district: '',
    address: '',
    bedrooms: '1',
    bathrooms: '1',
    area: '',
    floor: '',
    totalFloors: '',
    managementFee: '',
    deposit: '兩個月',
    description: '',
    amenities: [] as string[],
    images: [] as string[],
    isZeroFee: true,
    tags: [] as string[],
    createdAt: '',
    owner: null as any,
    ownerPhone: '',
    ownerLineId: '',
  });

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setFetching(true);
        try {
          const { mapPropertyFromDB } = await import('../context/SupabaseContext');
          const { data: row, error } = await supabase.from('properties').select('*').eq('id', id).single();
          if (error) throw error;
          if (row) {
            const data = mapPropertyFromDB(row);
            // flatten location/features for form
            const d: any = { ...data, ...data.location, ...data.features };
            setFormData({
              title: d.title || '',
              price: d.price?.toString() || '',
              type: d.type || 'apartment',
              city: d.city || '台北市',
              district: d.district || '',
              address: d.address || '',
              bedrooms: d.bedrooms?.toString() || '1',
              bathrooms: d.bathrooms?.toString() || '1',
              area: d.area?.toString() || '',
              floor: d.floor?.toString() || '',
              totalFloors: d.totalFloors?.toString() || '',
              managementFee: d.managementFee?.toString() || '',
              deposit: d.deposit || '兩個月',
              description: d.description || '',
              amenities: d.amenities || [],
              images: d.images || [],
              isZeroFee: d.isZeroFee ?? true,
              tags: d.tags || [],
              createdAt: d.createdAt || '',
              owner: d.owner || null,
              ownerPhone: d.owner?.phone || '',
              ownerLineId: d.owner?.lineId || '',
            });
          }
        } catch (error) {
          console.error("Error fetching property:", error);
        } finally {
          setFetching(false);
        }
      };
      fetchProperty();
    }
  }, [id]);

  const handleAiAutoFill = async () => {
    if (!aiInput.trim()) return;
    setIsAiProcessing(true);
    try {
      // Truncate input to prevent token limit issues
      const truncatedInput = aiInput.substring(0, 2000);
      const prompt = `你是一位專業的房地產助手。請從以下這段非格式化的房源描述中提取資訊，並以 JSON 格式回傳。
      描述內容："""${truncatedInput}"""
      
      請回傳以下欄位的 JSON (如果找不到則留空或使用預設值)：
      {
        "title": "標題",
        "price": 數字,
        "type": "apartment" | "studio" | "room" | "house",
        "city": "縣市",
        "district": "行政區",
        "address": "詳細地址",
        "bedrooms": 數字,
        "bathrooms": 數字,
        "area": 數字(坪),
        "floor": 數字,
        "totalFloors": 數字,
        "managementFee": 數字,
        "deposit": "押金描述",
        "amenities": ["設施1", "設施2"...],
        "description": "整理後的專業描述"
      }
      
      注意：只回傳 JSON 字串，不要有其他文字。`;

      const res = await fetch('/api/ai/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: truncatedInput }),
      });
      const result = await res.json();
      setFormData(prev => ({
        ...prev,
        ...result,
        price: result.price?.toString() || prev.price,
        bedrooms: result.bedrooms?.toString() || prev.bedrooms,
        bathrooms: result.bathrooms?.toString() || prev.bathrooms,
        area: result.area?.toString() || prev.area,
        floor: result.floor?.toString() || prev.floor,
        totalFloors: result.totalFloors?.toString() || prev.totalFloors,
        managementFee: result.managementFee?.toString() || prev.managementFee,
      }));
      setShowAiModal(false);
      setAiInput('');
    } catch (error) {
      console.error('AI Auto-fill error:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiGenerateDescription = async () => {
    setIsAiProcessing(true);
    try {
      const prompt = `你是一位專業的房地產文案專家。請根據以下房源資訊，生成一段吸引人的繁體中文房源介紹。
      標題：${formData.title}
      類型：${formData.type}
      地點：${formData.city}${formData.district}${formData.address}
      格局：${formData.bedrooms}房${formData.bathrooms}衛，${formData.area}坪
      設施：${formData.amenities.join(', ')}
      
      請強調生活機能、交通便利性及房屋優點。語氣要專業且溫馨。`;

      const res = await fetch('/api/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
      });
      const result = await res.json();

      setFormData(prev => ({ ...prev, description: result.text || prev.description }));
    } catch (error) {
      console.error('AI Generation error:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAiGenerateTags = async () => {
    if (!formData.description) return;
    setIsAiProcessing(true);
    try {
      // Truncate description to prevent token limit issues
      const truncatedDesc = formData.description.substring(0, 2000);
      const prompt = `你是一位房地產行銷專家。請根據以下房源描述，生成 3-5 個簡短吸引人的標籤（例如：近捷運、全新裝潢、採光佳）。
      房源描述："""${truncatedDesc}"""
      
      請只回傳標籤列表，用逗號分隔。不要有其他文字。`;

      const res = await fetch('/api/ai/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: truncatedDesc }),
      });
      const result = await res.json();

      const newTags = result.tags?.split(/[，,]/).map((t: string) => t.trim()).filter((t: string) => t) || [];
      setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, ...newTags])] }));
    } catch (error) {
      console.error('AI Tags error:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const amenitiesList = [
    '冷氣', '冰箱', '洗衣機', '電視', '熱水器', 
    '床鋪', '衣櫃', '沙發', '桌椅', '陽台', 
    '電梯', '管理員', '垃圾處理', '可養寵物'
  ];

  const handleToggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length || !user) return;

    const invalid = files.find((f: File) => !f.type.startsWith('image/') || f.size > 5 * 1024 * 1024);
    if (invalid) { alert('請上傳圖片檔案，每張不超過 5MB'); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert('未登入'); return; }

    setUploading(true);
    setUploadingCount(files.length);
    try {
      const urls = await Promise.all(files.map(async file => {
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': file.type, Authorization: `Bearer ${session.access_token}` },
          body: file,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || '上傳失敗');
        return json.url as string;
      }));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (error: any) {
      alert(`圖片上傳失敗：${error?.message}`);
    } finally {
      setUploading(false);
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert('請上傳影片檔案'); return; }
    if (file.size > 50 * 1024 * 1024) { alert('影片大小不能超過 50MB'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { alert('未登入'); return; }
    setUploadingVideo(true);
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { 'Content-Type': file.type, Authorization: `Bearer ${session.access_token}` },
        body: file,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '上傳失敗');
      setVideo(json.url);
    } catch (err: any) {
      alert(`影片上傳失敗：${err?.message}`);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!formData.title.trim()) e.title = '請填寫標題';
      if (!formData.price || Number(formData.price) <= 0) e.price = '請填寫租金';
      if (!formData.city || formData.city === 'all') e.city = '請選擇縣市';
      if (!formData.district || formData.district === 'all') e.district = '請選擇行政區';
      if (!formData.address.trim()) e.address = '請填寫地址';
    }
    if (s === 2) {
      if (!formData.bedrooms || Number(formData.bedrooms) < 0) e.bedrooms = '請填寫';
      if (!formData.bathrooms || Number(formData.bathrooms) < 0) e.bathrooms = '請填寫';
      if (!formData.area || Number(formData.area) <= 0) e.area = '請填寫坪數';
      if (!formData.floor || Number(formData.floor) <= 0) e.floor = '請填寫樓層';
      if (!formData.totalFloors || Number(formData.totalFloors) <= 0) e.totalFloors = '請填寫總樓層';
    }
    if (s === 3) {
      if (!formData.description.trim()) e.description = '請填寫房源介紹';
    }
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const errs = validateStep(3);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const propertyData = {
        title: formData.title,
        price: Number(formData.price),
        type: formData.type,
        location: await (async () => {
          let lat = 25.0330, lng = 121.5654;
          const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            try {
              const addr = encodeURIComponent(`${formData.city}${formData.district}${formData.address}台灣`);
              const geo = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=${apiKey}`);
              const geoJson = await geo.json();
              const loc = geoJson.results?.[0]?.geometry?.location;
              if (loc) { lat = loc.lat; lng = loc.lng; }
            } catch (_) {}
          }
          return { city: formData.city, district: formData.district, address: formData.address, lat, lng };
        })(),
        features: {
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          area: Number(formData.area),
          floor: Number(formData.floor),
          totalFloors: Number(formData.totalFloors),
          managementFee: Number(formData.managementFee),
          deposit: formData.deposit
        },
        amenities: formData.amenities,
        images: formData.images.length > 0 ? formData.images : ['https://picsum.photos/seed/property/800/600'],
        description: formData.description,
        owner: {
          name: (id && formData.owner?.name) || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '屋主',
          phone: formData.ownerPhone,
          lineId: formData.ownerLineId,
          avatar: (id && formData.owner?.avatar) || user.user_metadata?.avatar_url || '',
          uid: user.id,
          role: (id && formData.owner?.role) || '屋主'
        },
        isZeroFee: formData.isZeroFee,
        createdAt: id && formData.createdAt ? formData.createdAt : new Date().toISOString(),
        tags: formData.tags
      };

      console.log('Submitting property data:', propertyData);

      const { mapPropertyToDB } = await import('../context/SupabaseContext');
      const dbData = mapPropertyToDB(propertyData, user.id);

      const trySave = async (data: any) => {
        if (id) {
          // 走 server API（service role key，繞過 RLS），支援 owner 及 admin 編輯
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          const res = await fetch(`/api/properties/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            return { message: json.error || '更新失敗', code: String(res.status) } as any;
          }
          return null;
        } else {
          const { error } = await supabase.from('properties').insert({ ...data, owner_id: user.id });
          return error;
        }
      };

      let error = await trySave(dbData);
      // 若因 owner_line_id 欄位不存在而失敗，移除後重試（僅新增時適用）
      if (error && (error.message?.includes('owner_line_id') || error.code === '42703')) {
        const { owner_line_id, ...dataWithoutLineId } = dbData as any;
        error = await trySave(dataWithoutLineId);
      }
      if (error) throw error;
      alert(id ? '房源更新成功！' : '房源刊登成功！');
      navigate('/listings');
    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage = error?.message || '未知錯誤';
      alert(`刊登失敗：${errorMessage}\n請檢查是否所有必填欄位都已正確填寫。`);

    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">請先登入</h1>
        <p className="text-gray-500 mb-8 text-lg">您需要登入後才能刊登房源。</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all"
        >
          回到首頁
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20">
      <div className="max-w-3xl mx-auto px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-widest mb-8 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          返回
        </button>

        {/* AI Assistance Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-orange-600 to-orange-500 rounded-[32px] text-white shadow-xl shadow-orange-200 flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">AI 智能助手</span>
            </div>
            <h2 className="text-xl font-bold mb-1">想要更快刊登房源嗎？</h2>
            <p className="text-orange-100 text-sm">貼上您的房源描述，讓 AI 幫您自動填寫所有欄位。</p>
          </div>
          <button 
            onClick={() => setShowAiModal(true)}
            className="relative z-10 px-6 py-3 bg-white text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all flex items-center gap-2 shadow-lg"
          >
            <ClipboardList className="w-5 h-5" />
            AI 協助填寫
          </button>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-100">
            <div 
              className="h-full bg-orange-600 transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="p-10 md:p-16">
            <header className="mb-12">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                {id ? "編輯房源" : (
                  <>
                    {step === 1 && "基本資訊"}
                    {step === 2 && "房源細節"}
                    {step === 3 && "設施與介紹"}
                  </>
                )}
              </h1>
              <p className="text-gray-500 font-medium">
                {id ? "修改房源的詳細資訊。" : (
                  <>
                    {step === 1 && "告訴我們房源的大致位置與類型。"}
                    {step === 2 && "詳細的規格能幫助租客更快速做出決定。"}
                    {step === 3 && "最後一步，添加設施描述與照片。"}
                  </>
                )}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
              {(step === 1 || isEditing) && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">房源標題 <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="例如：近捷運 景觀兩房"
                        value={formData.title}
                        onChange={(e) => { setFormData({...formData, title: e.target.value}); setErrors(p => ({...p, title: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.title ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">月租金 (NT$) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="25000"
                        value={formData.price}
                        onChange={(e) => { setFormData({...formData, price: e.target.value}); setErrors(p => ({...p, price: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.price ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">房源類型</label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium appearance-none"
                      >
                        <option value="apartment">整層住家</option>
                        <option value="studio">獨立套房</option>
                        <option value="room">分租雅房</option>
                        <option value="house">別墅住宅</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">縣市 <span className="text-red-500">*</span></label>
                      <select
                        value={formData.city}
                        onChange={(e) => { setFormData({...formData, city: e.target.value, district: ''}); setErrors(p => ({...p, city: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium appearance-none", errors.city ? "border-red-400 bg-red-50" : "border-transparent")}
                      >
                        <option value="台北市">台北市</option>
                        <option value="新北市">新北市</option>
                        <option value="桃園市">桃園市</option>
                        <option value="新竹市">新竹市</option>
                        <option value="新竹縣">新竹縣</option>
                        <option value="台中市">台中市</option>
                      </select>
                      {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">行政區 <span className="text-red-500">*</span></label>
                      <select
                        value={formData.district}
                        onChange={(e) => { setFormData({...formData, district: e.target.value}); setErrors(p => ({...p, district: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium appearance-none", errors.district ? "border-red-400 bg-red-50" : "border-transparent")}
                      >
                        <option value="">請選擇行政區</option>
                        {formData.city === '台北市' && (
                          <>
                            <option value="信義區">信義區</option>
                            <option value="大安區">大安區</option>
                            <option value="中山區">中山區</option>
                            <option value="內湖區">內湖區</option>
                          </>
                        )}
                        {formData.city === '新北市' && (
                          <>
                            <option value="板橋區">板橋區</option>
                            <option value="中和區">中和區</option>
                            <option value="永和區">永和區</option>
                            <option value="三重區">三重區</option>
                          </>
                        )}
                        {formData.city === '新竹市' && (
                          <>
                            <option value="東區">東區</option>
                            <option value="北區">北區</option>
                            <option value="香山區">香山區</option>
                          </>
                        )}
                        {formData.city === '新竹縣' && (
                          <>
                            <option value="竹北市">竹北市</option>
                            <option value="竹東鎮">竹東鎮</option>
                            <option value="新豐鄉">新豐鄉</option>
                          </>
                        )}
                        {formData.city === '台中市' && (
                          <>
                            <option value="西屯區">西屯區</option>
                            <option value="北屯區">北屯區</option>
                            <option value="南屯區">南屯區</option>
                            <option value="北區">北區</option>
                          </>
                        )}
                        {formData.city === '桃園市' && (
                          <>
                            <option value="桃園區">桃園區</option>
                            <option value="中壢區">中壢區</option>
                            <option value="平鎮區">平鎮區</option>
                          </>
                        )}
                      </select>
                      {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">詳細地址 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="例如：信義路五段 7 號"
                      value={formData.address}
                      onChange={(e) => { setFormData({...formData, address: e.target.value}); setErrors(p => ({...p, address: ''})); }}
                      className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.address ? "border-red-400 bg-red-50" : "border-transparent")}
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                  </div>
                </div>
              )}

              {(step === 2 || isEditing) && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">房間 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => { setFormData({...formData, bedrooms: e.target.value}); setErrors(p => ({...p, bedrooms: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.bedrooms ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.bedrooms && <p className="mt-1 text-xs text-red-500">{errors.bedrooms}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">衛浴 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => { setFormData({...formData, bathrooms: e.target.value}); setErrors(p => ({...p, bathrooms: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.bathrooms ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.bathrooms && <p className="mt-1 text-xs text-red-500">{errors.bathrooms}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">坪數 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="15"
                        value={formData.area}
                        onChange={(e) => { setFormData({...formData, area: e.target.value}); setErrors(p => ({...p, area: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.area ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.area && <p className="mt-1 text-xs text-red-500">{errors.area}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">樓層 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="5"
                        value={formData.floor}
                        onChange={(e) => { setFormData({...formData, floor: e.target.value}); setErrors(p => ({...p, floor: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.floor ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.floor && <p className="mt-1 text-xs text-red-500">{errors.floor}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">總樓層 <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="12"
                        value={formData.totalFloors}
                        onChange={(e) => { setFormData({...formData, totalFloors: e.target.value}); setErrors(p => ({...p, totalFloors: ''})); }}
                        className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium", errors.totalFloors ? "border-red-400 bg-red-50" : "border-transparent")}
                      />
                      {errors.totalFloors && <p className="mt-1 text-xs text-red-500">{errors.totalFloors}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">管理費 (元/月)</label>
                      <input 
                        type="number" 
                        placeholder="1500"
                        value={formData.managementFee}
                        onChange={(e) => setFormData({...formData, managementFee: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">押金</label>
                      <input 
                        type="text" 
                        placeholder="兩個月"
                        value={formData.deposit}
                        onChange={(e) => setFormData({...formData, deposit: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(step === 3 || isEditing) && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">提供設施</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {amenitiesList.map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleAmenity(item)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm",
                            formData.amenities.includes(item)
                              ? "border-orange-600 bg-orange-50 text-orange-600"
                              : "border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            formData.amenities.includes(item) ? "border-orange-600 bg-orange-600" : "border-gray-200"
                          )}>
                            {formData.amenities.includes(item) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">房源照片</label>
                        <p className="text-xs text-gray-400">最多上傳15張，支援 JPG、PNG，單張不超過 5MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-orange-600 hover:text-orange-600 transition-all disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        本機上傳照片
                      </button>
                    </div>

                    {formData.images.length === 0 && !uploading ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-16 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-orange-600 hover:text-orange-600 transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-10 h-10" />
                        <p className="font-bold">點擊上傳房源照片</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedImages.size === formData.images.length && formData.images.length > 0}
                              onChange={e => setSelectedImages(e.target.checked ? new Set(formData.images.map((_, i) => i)) : new Set())}
                              className="w-4 h-4 accent-orange-600"
                            />
                            <span className="text-xs font-bold text-gray-500">全選</span>
                            {selectedImages.size > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => !selectedImages.has(i)) }));
                                  setSelectedImages(new Set());
                                }}
                                className="text-xs font-bold text-red-500 hover:text-red-700"
                              >
                                刪除選中（{selectedImages.size}）
                              </button>
                            )}
                          </div>
                          {selectedImages.size === 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = Array.from(selectedImages)[0];
                                if (idx === 0) return;
                                const imgs = [...formData.images];
                                imgs.splice(0, 0, imgs.splice(idx, 1)[0]);
                                setFormData(prev => ({ ...prev, images: imgs }));
                                setSelectedImages(new Set([0]));
                              }}
                              className="text-xs font-bold text-orange-600 hover:text-orange-700"
                            >
                              設為封面
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {formData.images.map((url, index) => (
                            <div
                              key={index}
                              draggable
                              onDragStart={() => { dragIndexRef.current = index; }}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => {
                                const from = dragIndexRef.current;
                                if (from === null || from === index) return;
                                const imgs = [...formData.images];
                                imgs.splice(index, 0, imgs.splice(from, 1)[0]);
                                setFormData(prev => ({ ...prev, images: imgs }));
                                dragIndexRef.current = null;
                              }}
                              className={cn("relative group rounded-2xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing",
                                selectedImages.has(index) ? "border-orange-500" : "border-gray-100 hover:border-orange-300"
                              )}
                            >
                              <div className="aspect-[4/3] bg-gray-100">
                                <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedImages.has(index)}
                                onChange={e => {
                                  const next = new Set(selectedImages);
                                  e.target.checked ? next.add(index) : next.delete(index);
                                  setSelectedImages(next);
                                }}
                                className="absolute top-2 right-2 w-4 h-4 accent-orange-600"
                                onClick={e => e.stopPropagation()}
                              />
                              {index === 0 && (
                                <span className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">封面</span>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex items-center justify-between px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-bold">{index + 1} / {formData.images.length}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
                                    setSelectedImages(prev => { const n = new Set<number>(); prev.forEach(i => i < index ? n.add(i) : i > index ? n.add(i - 1) : null); return n; });
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-white hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {uploading && (
                            <div className="aspect-[4/3] bg-gray-50 rounded-2xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center gap-2 text-orange-600">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <p className="text-xs font-bold">上傳中...</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 影片上傳 */}
                  <div>
                    <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">房源影片</label>
                        <p className="text-xs text-gray-400">最多 1 部，不超過 50MB</p>
                      </div>
                      {!video && (
                        <button type="button" onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo}
                          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-orange-600 hover:text-orange-600 transition-all disabled:opacity-50">
                          {uploadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          上傳影片
                        </button>
                      )}
                    </div>
                    {video ? (
                      <div className="relative rounded-2xl overflow-hidden bg-black">
                        <video src={video} controls className="w-full max-h-64 object-contain" />
                        <button type="button" onClick={() => setVideo('')}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : uploadingVideo && (
                      <div className="h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-orange-200 flex items-center justify-center gap-2 text-orange-600">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs font-bold">上傳中...</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">房源介紹 <span className="text-red-500">*</span></label>
                      <button
                        type="button"
                        onClick={handleAiGenerateDescription}
                        disabled={isAiProcessing || !formData.title}
                        className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50"
                      >
                        {isAiProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        AI 協助生成描述
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      placeholder="詳細描述房源的優點、生活機能、交通狀況等..."
                      value={formData.description}
                      onChange={(e) => { setFormData({...formData, description: e.target.value}); setErrors(p => ({...p, description: ''})); }}
                      className={cn("w-full px-6 py-4 bg-gray-50 border-2 rounded-3xl focus:ring-2 focus:ring-orange-600 font-medium resize-none", errors.description ? "border-red-400 bg-red-50" : "border-transparent")}
                    />
                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">特色標籤</label>
                      <button 
                        type="button"
                        onClick={handleAiGenerateTags}
                        disabled={isAiProcessing || !formData.description}
                        className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50"
                      >
                        {isAiProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        AI 智慧標籤
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {formData.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold flex items-center gap-2 group"
                        >
                          {tag}
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, tags: formData.tags.filter((_, i) => i !== index)})}
                            className="hover:text-orange-800 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="例如：近捷運、全新裝潢 (按 Enter 新增)"
                        className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !formData.tags.includes(val)) {
                              setFormData({...formData, tags: [...formData.tags, val]});
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* 聯絡資訊 */}
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">聯絡資訊</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">聯絡電話</label>
                        <input
                          type="tel"
                          placeholder="例如：0912345678"
                          value={formData.ownerPhone}
                          onChange={e => setFormData({ ...formData, ownerPhone: e.target.value })}
                          className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">LINE ID</label>
                        <input
                          type="text"
                          placeholder="例如：@renthome"
                          value={formData.ownerLineId}
                          onChange={e => setFormData({ ...formData, ownerLineId: e.target.value })}
                          className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-6 bg-green-50 rounded-3xl border-2 border-green-100">
                    <ShieldCheck className="w-8 h-8 text-green-600 shrink-0" />
                    <div>
                      <p className="font-bold text-green-900">免仲介費刊登</p>
                      <p className="text-sm text-green-700">勾選此項將在房源列表顯示「屋主直租」標章，吸引更多租客。</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={formData.isZeroFee}
                      onChange={(e) => setFormData({...formData, isZeroFee: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-green-200 text-green-600 focus:ring-green-600 ml-auto"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-8">
                {!isEditing && step > 1 && (
                  <button
                    type="button"
                    onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex-1 bg-gray-100 text-gray-900 py-5 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    上一步
                  </button>
                )}
                {!isEditing && step < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const errs = validateStep(step);
                      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
                      setErrors({});
                      setStep(step + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-[2] bg-gray-900 text-white py-5 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-orange-600 text-white py-5 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {id ? "更新中..." : "刊登中..."}
                      </>
                    ) : (
                      id ? "確認更新" : "確認刊登"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* AI Auto-fill Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAiProcessing && setShowAiModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">AI 協助填寫</h3>
                    <p className="text-sm text-gray-500">貼上您的原始描述，AI 將自動提取資訊</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)}
                  disabled={isAiProcessing}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              <div className="p-8">
                <textarea 
                  rows={10}
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="例如：我有一間在西屯區的套房要出租，靠近逢甲大學，租金 15000 包含管理費，有電梯、冷氣、洗衣機，格局是一房一衛..."
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-orange-600 font-medium resize-none mb-6"
                />
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowAiModal(false)}
                    disabled={isAiProcessing}
                    className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleAiAutoFill}
                    disabled={isAiProcessing || !aiInput.trim()}
                    className="flex-[2] px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAiProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AI 正在分析中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        開始自動填寫
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
