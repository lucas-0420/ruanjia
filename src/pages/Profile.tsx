import { useState, useEffect } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Calendar, MessageSquare, Heart, ChevronRight, Clock, CheckCircle2, XCircle, CheckCircle, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';

interface Booking { id: string; propertyTitle: string; propertyId: string; userName?: string; date: string; time: string; status: 'pending' | 'confirmed' | 'cancelled'; createdAt: string; }
interface Message { id: string; propertyTitle: string; propertyId: string; senderName?: string; content: string; isRead: boolean; createdAt: string; }

export default function Profile() {
  const { user, userRole, isAuthReady, favorites, properties } = useFirebase();
  const [activeTab, setActiveTab] = useState<'bookings' | 'messages' | 'favorites'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      // 管理員看所有預約和訊息
      supabase.from('bookings').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, userName: r.user_name, date: r.date, time: r.time, status: r.status, createdAt: r.created_at }))));
      supabase.from('messages').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, senderName: r.sender_name, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));
    } else {
      // 一般用戶只看自己的
      supabase.from('bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, date: r.date, time: r.time, status: r.status, createdAt: r.created_at }))));
      supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));
    }
  }, [user, isAdmin]);

  const handleUpdateBooking = async (id: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (isAuthReady && !user) return <Navigate to="/" />;
  const favoriteProperties = properties.filter(p => favorites.includes(p.id));
  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const unreadMessages = messages.filter(m => !m.isRead).length;

  const navItems = [
    { key: 'bookings' as const, label: '預約看房', Icon: Calendar, badge: pendingBookings },
    { key: 'messages' as const, label: '租客訊息', Icon: MessageSquare, badge: unreadMessages },
    { key: 'favorites' as const, label: '收藏清單', Icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 gap-8 py-10">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              {avatar ? (
                <img src={avatar} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-100 mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                  <User className="w-8 h-8 text-orange-600" />
                </div>
              )}
              <p className="font-bold text-gray-900 text-sm leading-tight">{name}</p>
              <span className="mt-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-0.5 rounded-full">
                {isAdmin ? '管理員' : '租客'}
              </span>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3 space-y-1">
              {navItems.map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-colors text-left',
                    activeTab === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {badge ? <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">{badge}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-900">
              {activeTab === 'bookings' ? '預約看房' : activeTab === 'messages' ? '租客訊息' : '收藏清單'}
            </h2>
            {isAdmin && activeTab !== 'favorites' && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-bold">全部用戶</span>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Bookings */}
            {activeTab === 'bookings' && (
              <div className="divide-y divide-gray-50">
                {bookings.length === 0 && <div className="p-20 text-center text-gray-400">目前沒有預約紀錄</div>}
                {bookings.map(b => (
                  <div key={b.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      {isAdmin && b.userName && <p className="text-xs font-bold text-orange-600 mb-1">{b.userName}</p>}
                      <h3 className="font-bold text-gray-900 mb-1">{b.propertyTitle}</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                        <span>{b.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isAdmin && b.status === 'pending' ? (
                        <>
                          <button onClick={() => handleUpdateBooking(b.id, 'confirmed')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100">
                            <CheckCircle className="w-3.5 h-3.5" />確認
                          </button>
                          <button onClick={() => handleUpdateBooking(b.id, 'cancelled')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">
                            <XCircle className="w-3.5 h-3.5" />拒絕
                          </button>
                        </>
                      ) : (
                        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase',
                          b.status === 'confirmed' ? 'bg-green-50 text-green-600' : b.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600')}>
                          {b.status === 'confirmed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : b.status === 'cancelled' ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {b.status === 'confirmed' ? '已確認' : b.status === 'cancelled' ? '已取消' : '審核中'}
                        </div>
                      )}
                      <Link to={`/property/${b.propertyId}`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            {activeTab === 'messages' && (
              <div className="divide-y divide-gray-50">
                {messages.length === 0 && <div className="p-20 text-center text-gray-400">目前沒有訊息</div>}
                {messages.map(msg => (
                  <div key={msg.id} className={cn('p-6 hover:bg-gray-50', !msg.isRead && 'bg-orange-50/30')}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {isAdmin && msg.senderName && <p className="text-xs font-bold text-orange-600 mb-1">{msg.senderName}</p>}
                        <h3 className="font-bold text-gray-900">關於：{msg.propertyTitle}</h3>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Favorites */}
            {activeTab === 'favorites' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {favoriteProperties.length === 0 ? (
                  <div className="col-span-full p-20 text-center text-gray-400">目前沒有收藏的房源</div>
                ) : favoriteProperties.map(prop => (
                  <Link key={prop.id} to={`/property/${prop.id}`} className="group block bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all">
                    <div className="aspect-video relative overflow-hidden">
                      <img src={prop.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 truncate">{prop.title}</h3>
                      <p className="text-sm text-gray-500">{prop.location.district}, {prop.location.city}</p>
                      <p className="text-sm font-bold text-orange-600 mt-2">NT$ {prop.price.toLocaleString()} / 月</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
