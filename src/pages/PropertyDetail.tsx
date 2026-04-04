import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bed, Bath, Maximize, MapPin, Heart,
  Share2, Phone, MessageSquare, ChevronLeft, CheckCircle2,
  Calendar, Info, Layers, XCircle, Loader2, Expand, X
} from 'lucide-react';
import NearbyPlacesPanel from '../components/NearbyPlacesPanel';
import { cn } from '../lib/utils';
import AIAssistant from '../components/AIAssistant';
import MapComponent from '../components/MapComponent';
import { supabase } from '../supabase';
import { Property } from '../types';
import { useFirebase } from '../context/SupabaseContext';

export default function PropertyDetail() {
  const { id } = useParams();
  const { user, favorites, toggleFavorite } = useFirebase();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function fetchProperty() {
      if (!id) return;
      try {
        const { data: row, error } = await supabase.from('properties').select('*').eq('id', id).single();
        if (error) { console.error(error); return; }
        if (row) {
          const { mapPropertyFromDB } = await import('../context/SupabaseContext');
          const propData = mapPropertyFromDB(row);

          // 取得真實屋主資訊（透過 server API 繞過 RLS）
          if (row.owner_id) {
            try {
              const res = await fetch(`/api/users/${row.owner_id}`);
              if (res.ok) {
                const ownerRow = await res.json();
                propData.owner = {
                  ...propData.owner,
                  name: ownerRow.display_name || propData.owner.name || '屋主',
                  avatar: ownerRow.photo_url || propData.owner.avatar || '',
                  role: ownerRow.role === 'agent' ? '仲介' : ownerRow.role === 'admin' ? '管理員' : '屋主',
                  uid: row.owner_id,
                  phone: row.owner_phone || propData.owner.phone || '',
                  lineId: row.owner_line_id || propData.owner.lineId || '',
                };
              }
            } catch (_) {}
          }

          // Geocode 地址取得真實座標
          const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey) {
            const addr = encodeURIComponent(
              `${propData.location.city}${propData.location.district}${propData.location.address}台灣`
            );
            try {
              const geo = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=${apiKey}`
              );
              const geoJson = await geo.json();
              const loc = geoJson.results?.[0]?.geometry?.location;
              if (loc) {
                propData.location = { ...propData.location, lat: loc.lat, lng: loc.lng };
              }
            } catch (_) { /* geocode 失敗不影響頁面 */ }
          }

          setProperty(propData);
          const { data: similar } = await supabase.from('properties').select('*').neq('status', 'archived').eq('city', propData.location.city).neq('id', id).limit(4);
          setSimilarProperties((similar || []).map(mapPropertyFromDB));
        }
      } catch (error) {
        console.error('fetchProperty error:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProperty();
  }, [id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: property?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('網址已複製到剪貼簿！');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('請先登入以預約看房');
      return;
    }
    if (!property) return;

    setIsBooking(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        property_id: property.id,
        property_title: property.title,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || '',
        user_phone: '',
        date: bookingDate,
        time: bookingTime,
        status: 'pending',
      });
      if (error) throw error;
      alert('預約成功！管理員將會與您聯繫。');
      setShowBookingModal(false);
    } catch (error) {
      console.error('Booking error:', error);
      alert('預約失敗，請稍後再試。');
    } finally {
      setIsBooking(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('請先登入以發送訊息');
      return;
    }
    if (!property) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || '',
        receiver_id: property.owner.uid || 'admin',
        property_id: property.id,
        property_title: property.title,
        content: messageContent,
        is_read: false,
      });
      if (error) throw error;
      alert('訊息已發送！');
      setShowMessageModal(false);
      setMessageContent('');
    } catch (error) {
      console.error('Message error:', error);
      alert('發送失敗，請稍後再試。');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? Math.min(i + 1, property!.images.length - 1) : null);
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, property]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">找不到房源</h1>
        <Link to="/listings" className="text-orange-600 font-bold flex items-center gap-2">
          <ChevronLeft className="w-5 h-5" />
          回到房源列表
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/listings" className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="text-sm font-medium text-gray-400 flex-1">
            <Link to="/listings" className="hover:text-gray-900">房源列表</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{property.title}</span>
          </div>
          <button
            onClick={() => property && toggleFavorite(property.id)}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border",
              property && favorites.includes(property.id) ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-400 hover:text-orange-600 border-gray-100"
            )}
          >
            <Heart className={cn("w-5 h-5", property && favorites.includes(property.id) && "fill-current")} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm border border-gray-100"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>


        {/* ══ 貫穿兩欄：左65%內容 + 右sticky卡片 ══ */}
        <div className="grid lg:grid-cols-[65%_1fr] gap-8 mb-14 items-start">

          {/* ── 左欄：照片 + 詳細內容 ── */}
          <div className="space-y-10">

            {/* 主圖 */}
            <div className="space-y-3">
              <div
                className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#F2E9DF] cursor-zoom-in relative group"
                onClick={() => setLightboxIndex(activeImageIndex)}
              >
                <img
                  src={property.images[activeImageIndex]}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {activeImageIndex + 1} / {property.images.length}
                </div>
              </div>
              {/* 縮圖列 */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {property.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={cn(
                      'shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all',
                      activeImageIndex === i
                        ? 'border-[#F5A623] shadow-md'
                        : 'border-transparent opacity-55 hover:opacity-90'
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            {/* 房源介紹 */}
            <div className="border-t border-[#F2E9DF] pt-8">
              <h2 className="text-xl font-bold text-[#3D2B1F] mb-4">房源介紹</h2>
              <p className="text-[#7A5C48] text-base leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* 設施設備 */}
            <div>
              <h2 className="text-xl font-bold text-[#3D2B1F] mb-4">設施設備</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map(item => (
                  <span key={item} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5D5C5] rounded-xl text-sm text-[#3D2B1F] font-medium shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E9E5A]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 地理位置 */}
            <div>
              <h2 className="text-xl font-bold text-[#3D2B1F] mb-4">地理位置</h2>
              <div className="relative rounded-2xl overflow-hidden border border-[#E5D5C5] shadow-sm" style={{ height: 300 }}>
                {property.location.lat && property.location.lng ? (
                  <>
                    <iframe
                      title="地圖"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${property.location.lat},${property.location.lng}&z=16&output=embed&hl=zh-TW`}
                    />
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm hover:bg-white text-[#3D2B1F] text-xs font-bold px-3 py-2 rounded-xl shadow-md border border-[#E5D5C5] transition-all"
                    >
                      <Expand className="w-3.5 h-3.5" />
                      展開地圖與周邊
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FBF7F3] text-[#9A7D6B]">尚未設定地址座標</div>
                )}
              </div>
            </div>

            {/* 全螢幕地圖 Modal */}
            {showMapModal && property.location.lat && property.location.lng && (
              <div className="fixed inset-0 z-[200] flex flex-col">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMapModal(false)} />
                <div className="relative m-3 md:m-6 flex-1 flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2E9DF] bg-white shrink-0">
                    <div>
                      <p className="text-xs text-[#9A7D6B] font-medium">地理位置與周邊</p>
                      <p className="text-sm font-bold text-[#3D2B1F] line-clamp-1">{property.title}</p>
                    </div>
                    <button
                      onClick={() => setShowMapModal(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F2E9DF] text-[#7A5C48] hover:bg-[#E5D5C5] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="flex-1 min-h-[240px] md:min-h-0">
                      <MapComponent properties={[property]} />
                    </div>
                    <div className="w-full md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-[#E5D5C5] overflow-hidden flex flex-col">
                      <NearbyPlacesPanel lat={property.location.lat} lng={property.location.lng} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 右欄：sticky 資訊卡（滾動到相似房源前停止）── */}
          <div className="sticky top-24 flex flex-col gap-5">

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {property.status === 'archived' && (
                <span className="px-3 py-1 bg-[#3D2B1F]/80 text-white text-[10px] font-bold rounded-full">已下架</span>
              )}
              {property.isZeroFee && (
                <span className="px-3 py-1 bg-[#F5A623] text-[#3D2B1F] text-[10px] font-bold rounded-full">屋主直租</span>
              )}
              <span className="px-3 py-1 bg-[#F2E9DF] text-[#7A5C48] text-[10px] font-bold rounded-full">
                {property.type === 'apartment' ? '公寓' : property.type === 'house' ? '住宅' : property.type === 'studio' ? '套房' : '雅房'}
              </span>
              {property.tags?.map(tag => (
                <span key={tag} className="px-3 py-1 bg-[#FFE8CC] text-[#8B5E3C] text-[10px] font-bold rounded-full">{tag}</span>
              ))}
            </div>

            {/* 標題 */}
            <h1 className="text-2xl md:text-3xl font-bold text-[#3D2B1F] leading-snug">{property.title}</h1>

            {/* 地址 */}
            <div className="flex items-center gap-1.5 text-[#9A7D6B] text-sm">
              <MapPin className="w-4 h-4 text-[#F5A623] shrink-0" />
              {property.location.address}, {property.location.district}, {property.location.city}
            </div>

            {/* 租金 */}
            <div className="bg-[#FFF8F0] rounded-2xl px-5 py-4 border border-[#FFE8CC]">
              <p className="text-xs text-[#B8A090] font-bold mb-1">月租金</p>
              <p className="text-3xl font-black text-[#F5A623]">
                NT$ {property.price.toLocaleString()}
                <span className="text-sm font-normal text-[#9A7D6B] ml-1">/月</span>
              </p>
              {property.features.managementFee ? (
                <p className="text-xs text-[#9A7D6B] mt-1">管理費 NT$ {property.features.managementFee.toLocaleString()}/月</p>
              ) : null}
            </div>

            {/* 規格 4 格 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Bed,      label: '格局', value: `${property.features.bedrooms} 房` },
                { icon: Bath,     label: '衛浴', value: `${property.features.bathrooms} 衛` },
                { icon: Maximize, label: '坪數', value: `${property.features.area} 坪` },
                { icon: Layers,   label: '樓層', value: `${property.features.floor}/${property.features.totalFloors || '--'}F` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-[#FBF7F3] rounded-xl py-3 border border-[#F2E9DF]">
                  <Icon className="w-4 h-4 text-[#F5A623]" />
                  <p className="text-[10px] text-[#B8A090] font-bold">{label}</p>
                  <p className="text-sm font-bold text-[#3D2B1F]">{value}</p>
                </div>
              ))}
            </div>

            {/* 詳細資訊 */}
            <div className="bg-[#FBF7F3] rounded-2xl p-4 border border-[#F2E9DF]">
              <p className="text-xs font-bold text-[#B8A090] mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#F5A623]" />
                詳細資訊
              </p>
              <div>
                {[
                  { label: '管理費', value: property.features.managementFee ? `${property.features.managementFee.toLocaleString()} 元/月` : '無' },
                  { label: '押金',   value: property.features.deposit || '面議' },
                  { label: '最短租期', value: '一年' },
                  { label: '開伙',   value: '可' },
                  { label: '養寵物', value: property.amenities.includes('可養寵物') ? '可' : '不可' },
                  { label: '身分限制', value: '無' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-[#F2E9DF] last:border-0">
                    <span className="text-xs text-[#9A7D6B]">{label}</span>
                    <span className="text-xs font-bold text-[#3D2B1F]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[#F2E9DF]" />

            {/* 屋主資訊 */}
            <div className="flex items-center gap-3">
              {property.owner.avatar ? (
                <img src={property.owner.avatar} alt={property.owner.name} className="w-11 h-11 rounded-full object-cover border-2 border-[#E5D5C5]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#FFE8CC] flex items-center justify-center border-2 border-[#E5D5C5]">
                  <span className="text-base font-black text-[#F5A623]">{property.owner.name?.charAt(0) || '屋'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#9A7D6B]">{property.owner.role || '屋主'}</p>
                <p className="text-sm font-bold text-[#3D2B1F] truncate">{property.owner.name}</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#2E9E5A] bg-[#F0FAF4] px-2 py-1 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E9E5A] inline-block" />
                在線
              </span>
            </div>

            {/* 聯絡按鈕 */}
            <div className="space-y-2.5">
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#FFB830] text-[#3D2B1F] rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                預約看房
              </button>
              {(property.owner.lineId || property.owner.phone) && (
                <a
                  href={property.owner.lineId
                    ? `https://line.me/ti/p/~${property.owner.lineId.replace(/^@/, '')}`
                    : `https://line.me/ti/p/+886${property.owner.phone!.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center text-[#06C755] text-[11px] font-black">L</div>
                  LINE 聯繫屋主
                </a>
              )}
              <div className="grid grid-cols-2 gap-2">
                {property.owner.phone ? (
                  <a href={`tel:${property.owner.phone}`} className="h-12 flex items-center justify-center gap-2 bg-[#F2E9DF] hover:bg-[#E5D5C5] text-[#3D2B1F] rounded-xl font-bold text-sm transition-colors">
                    <Phone className="w-4 h-4" />
                    電話
                  </a>
                ) : (
                  <div className="h-12 flex items-center justify-center gap-2 bg-[#F2E9DF] text-[#B8A090] rounded-xl font-bold text-sm opacity-50">
                    <Phone className="w-4 h-4" />
                    電話
                  </div>
                )}
                <button onClick={() => setShowMessageModal(true)} className="h-12 flex items-center justify-center gap-2 bg-[#F2E9DF] hover:bg-[#E5D5C5] text-[#3D2B1F] rounded-xl font-bold text-sm transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  留言
                </button>
              </div>
            </div>

            <p className="text-xs text-[#9A7D6B] text-center">押金：{property.features.deposit || '面議'} ・ 平均回覆：2 小時內</p>
          </div>
        </div>


        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-gray-900 mb-12">相似房源推薦</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {similarProperties.map(prop => (
                <Link 
                  key={prop.id} 
                  to={`/property/${prop.id}`}
                  className="group bg-white rounded-[32px] overflow-hidden border border-gray-100 hover:shadow-2xl transition-all"
                >
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={prop.images[0]} 
                      alt={prop.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">{prop.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-600 font-black">NT$ {prop.price.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">{prop.location.district}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBookingModal(false)} />
          <div className="relative bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl">
            <button 
              onClick={() => setShowBookingModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">預約看房</h3>
            <p className="text-gray-500 mb-8">請選擇您方便的時間，我們將盡快與您聯繫。</p>

            <form onSubmit={handleBooking} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">預約日期</label>
                <input 
                  type="date" 
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">預約時間</label>
                <input 
                  type="time" 
                  required
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium"
                />
              </div>
              <button 
                type="submit"
                disabled={isBooking}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {isBooking ? '預約中...' : '確認預約'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMessageModal(false)} />
          <div className="relative bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl">
            <button 
              onClick={() => setShowMessageModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">發送訊息</h3>
            <p className="text-gray-500 mb-8">詢問屋主關於這間房源的更多細節。</p>

            <form onSubmit={handleSendMessage} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">訊息內容</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="例如：請問什麼時候方便看房？"
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-600 font-medium resize-none"
                />
              </div>
              <button 
                type="submit"
                disabled={isSending}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    傳送中...
                  </>
                ) : (
                  "確認傳送"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2" onClick={() => setLightboxIndex(null)}>
            <XCircle className="w-8 h-8" />
          </button>
          <button
            className="absolute left-4 text-white/70 hover:text-white p-4 disabled:opacity-20"
            disabled={lightboxIndex === 0}
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => Math.max(0, (i ?? 0) - 1)); }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img
            src={property.images[lightboxIndex]}
            alt=""
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl"
            referrerPolicy="no-referrer"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/70 hover:text-white p-4 disabled:opacity-20"
            disabled={lightboxIndex === property.images.length - 1}
            onClick={e => { e.stopPropagation(); setLightboxIndex(i => Math.min(property!.images.length - 1, (i ?? 0) + 1)); }}
          >
            <ChevronLeft className="w-8 h-8 rotate-180" />
          </button>
          <div className="absolute bottom-6 text-white/60 text-sm font-medium">
            {lightboxIndex + 1} / {property.images.length}
          </div>
        </div>
      )}

      <AIAssistant property={property} />
    </div>
  );
}
