import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Calendar, MessageSquare, Heart, ChevronRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';

interface Booking { id: string; propertyTitle: string; propertyId: string; date: string; time: string; status: 'pending' | 'confirmed' | 'cancelled'; createdAt: string; }
interface Message { id: string; propertyTitle: string; propertyId: string; content: string; isRead: boolean; createdAt: string; }

export default function Profile() {
  const { user, isAuthReady, favorites, properties } = useFirebase();
  const [activeTab, setActiveTab] = useState<'bookings' | 'messages' | 'favorites'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('bookings').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, date: r.date, time: r.time, status: r.status, createdAt: r.created_at }))));
    supabase.from('messages').select('*').eq('sender_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, propertyId: r.property_id, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));
  }, [user]);

  if (isAuthReady && !user) return <Navigate to="/" />;
  const favoriteProperties = properties.filter(p => favorites.includes(p.id));
  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-2">
            <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={avatar} alt="" className="w-12 h-12 rounded-2xl object-cover shadow-md" />
                <div className="overflow-hidden"><p className="font-bold text-gray-900 text-sm truncate">{name}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">一般用戶</p></div>
              </div>
            </div>
            <nav className="space-y-1">
              {[{key:'bookings',label:'我的預約',Icon:Calendar},{key:'messages',label:'我的訊息',Icon:MessageSquare},{key:'favorites',label:'收藏清單',Icon:Heart}].map(({key,label,Icon})=>(
                <button key={key} onClick={() => setActiveTab(key as any)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all", activeTab===key?"bg-gray-900 text-white shadow-lg":"text-gray-500 hover:bg-white hover:text-gray-900")}><Icon className="w-5 h-5" />{label}</button>
              ))}
            </nav>
          </aside>
          <main className="flex-1">
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden min-h-[600px]">
              <div className="p-8 border-b border-gray-50"><h2 className="text-2xl font-bold text-gray-900">{activeTab==='bookings'&&'預約看房紀錄'}{activeTab==='messages'&&'已發送訊息'}{activeTab==='favorites'&&'收藏的房源'}</h2></div>
              <div className="p-0">
                {activeTab==='bookings'&&(<div className="divide-y divide-gray-50">{bookings.length===0?<div className="p-20 text-center text-gray-400">目前沒有預約紀錄</div>:bookings.map(b=>(<div key={b.id} className="p-6 flex items-center justify-between hover:bg-gray-50"><div><h3 className="font-bold text-gray-900 mb-1">{b.propertyTitle}</h3><div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span><span>{b.time}</span></div></div><div className="flex items-center gap-4"><div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest",b.status==='confirmed'?"bg-green-50 text-green-600":b.status==='cancelled'?"bg-red-50 text-red-600":"bg-orange-50 text-orange-600")}>{b.status==='confirmed'?<CheckCircle2 className="w-4 h-4"/>:b.status==='cancelled'?<XCircle className="w-4 h-4"/>:<Clock className="w-4 h-4"/>}{b.status==='confirmed'?'已確認':b.status==='cancelled'?'已取消':'審核中'}</div><Link to={`/property/${b.propertyId}`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><ChevronRight className="w-5 h-5" /></Link></div></div>))}</div>)}
                {activeTab==='messages'&&(<div className="divide-y divide-gray-50">{messages.length===0?<div className="p-20 text-center text-gray-400">目前沒有發送過的訊息</div>:messages.map(msg=>(<div key={msg.id} className="p-6 hover:bg-gray-50"><div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-900">關於：{msg.propertyTitle}</h3><span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(msg.createdAt).toLocaleDateString()}</span></div><p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">{msg.content}</p></div>))}</div>)}
                {activeTab==='favorites'&&(<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">{favoriteProperties.length===0?<div className="col-span-full p-20 text-center text-gray-400">目前沒有收藏的房源</div>:favoriteProperties.map(prop=>(<Link key={prop.id} to={`/property/${prop.id}`} className="group block bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all"><div className="aspect-video relative overflow-hidden"><img src={prop.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div><div className="p-4"><h3 className="font-bold text-gray-900 truncate">{prop.title}</h3><p className="text-sm text-gray-500">{prop.location.district}, {prop.location.city}</p><p className="text-sm font-bold text-orange-600 mt-2">NT$ {prop.price.toLocaleString()} / 月</p></div></Link>))}</div>)}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
