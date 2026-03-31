import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Bed, Bath, Maximize, MapPin, Heart, 
  Share2, Phone, MessageSquare, ChevronLeft, CheckCircle2,
  Calendar, Info, Layers, XCircle, Loader2
} from 'lucide-react';
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

  useEffect(() => {
    async function fetchProperty() {
      if (!id) return;
      try {
        const { data: row, error } = await supabase.from('properties').select('*').eq('id', id).single();
        if (error) { console.error(error); return; }
        if (row) {
          const { mapPropertyFromDB } = await import('../context/SupabaseContext');
          const propData = mapPropertyFromDB(row);
          setProperty(propData);
          const { data: similar } = await supabase.from('properties').select('*').eq('city', propData.location.city).neq('id', id).limit(4);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/listings" className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="text-sm font-medium text-gray-400">
            <Link to="/listings" className="hover:text-gray-900">房源列表</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{property.title}</span>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12 h-[400px] md:h-[600px]">
          <div className="md:col-span-2 h-full rounded-[32px] overflow-hidden shadow-xl">
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden md:grid grid-rows-2 gap-4 h-full">
            <div className="rounded-[32px] overflow-hidden shadow-lg">
              <img
                src={property.images[1] || property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="rounded-[32px] overflow-hidden shadow-lg">
              <img
                src={property.images[2] || property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="hidden md:block h-full rounded-[32px] overflow-hidden shadow-lg relative">
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover blur-[2px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <span className="text-3xl font-bold mb-2">+ 8</span>
              <span className="text-sm font-medium uppercase tracking-widest">更多照片</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[1fr_400px] gap-12">
          {/* Left Column */}
          <div className="space-y-12">
            {/* Header Info */}
            <div className="border-b border-gray-100 pb-12">
              <div className="flex flex-wrap gap-2 mb-6">
                {property.isZeroFee && (
                  <span className="px-4 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                    免仲介費
                  </span>
                )}
                <span className="px-4 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {property.type === 'apartment' ? '公寓' : property.type === 'house' ? '住宅' : property.type === 'studio' ? '套房' : '雅房'}
                </span>
                {property.tags?.map(tag => (
                  <span key={tag} className="px-4 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {property.title}
              </h1>
              
              <div className="flex items-center gap-2 text-gray-500 text-lg mb-8">
                <MapPin className="w-6 h-6 text-orange-600" />
                {property.location.address}, {property.location.district}, {property.location.city}
              </div>

              <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[32px]">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">月租金</span>
                  <div className="text-4xl font-black text-gray-900">
                    NT$ {property.price.toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => property && toggleFavorite(property.id)}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                      property && favorites.includes(property.id) ? "bg-orange-600 text-white" : "bg-white text-gray-400 hover:text-orange-600"
                    )}
                  >
                    <Heart className={cn("w-6 h-6", property && favorites.includes(property.id) && "fill-current")} />
                  </button>
                  <button 
                    onClick={handleShare}
                    className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-lg"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Bed className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">格局</p>
                  <p className="text-lg font-bold text-gray-900">{property.features.bedrooms} 房</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Bath className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">衛浴</p>
                  <p className="text-lg font-bold text-gray-900">{property.features.bathrooms} 衛</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Maximize className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">坪數</p>
                  <p className="text-lg font-bold text-gray-900">{property.features.area} 坪</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                  <Layers className="w-6 h-6 text-gray-900" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">樓層</p>
                  <p className="text-lg font-bold text-gray-900">{property.features.floor}/{property.features.totalFloors || '--'} F</p>
                </div>
              </div>
            </div>

            {/* Detailed Info Table */}
            <div className="bg-gray-50 rounded-[40px] p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <Info className="w-6 h-6 text-orange-600" />
                詳細資訊
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">管理費</span>
                  <span className="text-gray-900 font-bold">{property.features.managementFee ? `${property.features.managementFee.toLocaleString()} 元/月` : '無'}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">押金</span>
                  <span className="text-gray-900 font-bold">{property.features.deposit || '面議'}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">最短租期</span>
                  <span className="text-gray-900 font-bold">一年</span>
                </div>
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">開伙</span>
                  <span className="text-gray-900 font-bold">可</span>
                </div>
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">養寵物</span>
                  <span className="text-gray-900 font-bold">{property.amenities.includes('可養寵物') ? '可' : '不可'}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">身分限制</span>
                  <span className="text-gray-900 font-bold">無</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">房源介紹</h2>
              <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">設施設備</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {property.amenities.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700 font-bold text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">周邊環境</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-blue-900">交通運輸</span>
                  </div>
                  <ul className="space-y-2 text-sm text-blue-800/80 font-medium">
                    <li>• 捷運站 (步行 5 分鐘)</li>
                    <li>• 公車站 (步行 2 分鐘)</li>
                    <li>• YouBike 站點 (步行 3 分鐘)</li>
                  </ul>
                </div>
                <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-orange-900">生活機能</span>
                  </div>
                  <ul className="space-y-2 text-sm text-orange-800/80 font-medium">
                    <li>• 便利商店 (步行 1 分鐘)</li>
                    <li>• 超級市場 (步行 8 分鐘)</li>
                    <li>• 傳統市場 (步行 10 分鐘)</li>
                  </ul>
                </div>
                <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-green-900">休閒教育</span>
                  </div>
                  <ul className="space-y-2 text-sm text-green-800/80 font-medium">
                    <li>• 公園綠地 (步行 5 分鐘)</li>
                    <li>• 國民小學 (步行 12 分鐘)</li>
                    <li>• 健身中心 (步行 7 分鐘)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Location Map */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">地理位置</h2>
              <div className="h-[400px] w-full rounded-[40px] overflow-hidden border border-gray-100 shadow-xl">
                <MapComponent properties={[property]} />
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Owner Card */}
            <div className="sticky top-32 p-10 bg-white rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50">
              <div className="flex items-center gap-5 mb-10">
                <div className="relative">
                  <img
                    src={property.owner.avatar}
                    alt={property.owner.name}
                    className="w-20 h-20 rounded-[24px] object-cover shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-widest rounded">
                      {property.owner.role || '屋主'}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-gray-900">{property.owner.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => setShowBookingModal(true)}
                  className="w-full h-16 flex items-center justify-center gap-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20"
                >
                  <Calendar className="w-6 h-6" />
                  預約看房
                </button>
                <button className="w-full h-16 flex items-center justify-center gap-3 bg-[#06C755] text-white rounded-2xl font-bold hover:bg-[#05b34c] transition-all shadow-xl shadow-green-600/10">
                  <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[#06C755]">
                    <span className="text-[12px] font-black">L</span>
                  </div>
                  LINE 聯繫屋主
                </button>
                <button className="w-full h-16 flex items-center justify-center gap-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10">
                  <Phone className="w-6 h-6" />
                  致電屋主
                </button>
                <button 
                  onClick={() => setShowMessageModal(true)}
                  className="w-full h-16 flex items-center justify-center gap-3 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition-all"
                >
                  <MessageSquare className="w-6 h-6" />
                  發送訊息
                </button>
              </div>

              <div className="mt-10 pt-10 border-t border-gray-50">
                <div className="flex items-center justify-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                  <Calendar className="w-4 h-4" />
                  平均回覆時間：2 小時內
                </div>
              </div>
            </div>
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

      <AIAssistant property={property} />
    </div>
  );
}
