import React, { useState, useEffect } from 'react';
import { useFirebase, mapPropertyFromDB } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Building2, Calendar, MessageSquare, Trash2, CheckCircle, XCircle, ChevronRight, ShieldCheck, Edit, Smartphone, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';

interface Booking { id: string; propertyTitle: string; userName: string; userPhone: string; date: string; time: string; status: 'pending' | 'confirmed' | 'cancelled'; }
interface Message { id: string; senderId: string; senderName: string; propertyTitle: string; content: string; isRead: boolean; createdAt: string; }
interface AppUser { id: string; email: string; displayName: string; photoUrl: string; role: string; createdAt: string; }
const ADMIN_EMAIL = '0420.lucas111@gmail.com';

export default function AdminDashboard() {
  const { user, properties, isAuthReady } = useFirebase();
  const [activeTab, setActiveTab] = useState<'properties' | 'bookings' | 'messages' | 'users'>('properties');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [userDebug, setUserDebug] = useState('');
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('bookings').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, userName: r.user_name, userPhone: r.user_phone, date: r.date, time: r.time, status: r.status }))));
    supabase.from('messages').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, senderId: r.sender_id, senderName: r.sender_name, propertyTitle: r.property_title, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));

    const fetchUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUserDebug('session 為空，未登入'); return; }
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const text = await res.text();
      if (res.ok) {
        const { users } = JSON.parse(text);
        setAppUsers((users || []).map((r: any) => ({ id: r.id, email: r.email, displayName: r.display_name, photoUrl: r.photo_url, role: r.role || 'user', createdAt: r.created_at })));
        setUserDebug(`成功取得 ${users?.length} 個用戶`);
      } else {
        setUserDebug(`API 錯誤 ${res.status}: ${text}`);
      }
    };
    fetchUsers();

    const ch = supabase.channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        supabase.from('bookings').select('*').order('created_at', { ascending: false }).then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, userName: r.user_name, userPhone: r.user_phone, date: r.date, time: r.time, status: r.status }))));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        supabase.from('messages').select('*').order('created_at', { ascending: false }).then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, senderId: r.sender_id, senderName: r.sender_name, propertyTitle: r.property_title, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  if (isAuthReady && !isAdmin) return <Navigate to="/" />;

  const handleToggleStatus = async (id: string, current: string) => { await supabase.from('properties').update({ status: current === 'active' ? 'archived' : 'active' }).eq('id', id); };
  const handleDelete = async (id: string) => { if (!window.confirm('確定刪除？')) return; await supabase.from('properties').delete().eq('id', id); };
  const handleUpdateBooking = async (id: string, status: 'confirmed' | 'cancelled') => { await supabase.from('bookings').update({ status }).eq('id', id); setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b)); };
  const handleReadMessage = async (id: string) => { await supabase.from('messages').update({ is_read: true }).eq('id', id); setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m)); };
  const handleRoleChange = async (id: string, role: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ role }),
    });
    setAppUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 space-y-2">
            <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={avatar} alt="" className="w-10 h-10 rounded-full" />
                <div><p className="font-bold text-gray-900 text-sm truncate">{name}</p><p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">管理員</p></div>
              </div>
            </div>
            <nav className="space-y-1">
              {[{ key: 'users', label: '用戶管理', Icon: Users }, { key: 'properties', label: '房源管理', Icon: Building2 }, { key: 'bookings', label: '預約看房', Icon: Calendar }, { key: 'messages', label: '租客訊息', Icon: MessageSquare }].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as any)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all", activeTab === key ? "bg-gray-900 text-white shadow-lg" : "text-gray-500 hover:bg-white hover:text-gray-900")}><Icon className="w-5 h-5" />{label}</button>
              ))}
              <Link to="/admin/sync" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-gray-500 hover:bg-white hover:text-gray-900"><Smartphone className="w-5 h-5" />LINE 同步</Link>
            </nav>
          </aside>
          <main className="flex-1">
            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">{activeTab === 'properties' && '房源列表'}{activeTab === 'bookings' && '預約請求'}{activeTab === 'messages' && '對話紀錄'}{activeTab === 'users' && '用戶管理'}</h2>
                {activeTab === 'properties' && <Link to="/post" className="bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-700 transition-colors">刊登新房源</Link>}
              </div>
              <div className="p-0">
                {activeTab === 'properties' && (<div className="divide-y divide-gray-50">{properties.map(prop => (<div key={prop.id} className="p-6 flex items-center justify-between hover:bg-gray-50"><div className="flex items-center gap-4"><img src={prop.images[0]} alt="" className="w-16 h-16 rounded-2xl object-cover" /><div><h3 className="font-bold text-gray-900">{prop.title}</h3><p className="text-sm text-gray-500">{prop.location.district}, {prop.location.city}</p><p className="text-sm font-bold text-orange-600 mt-1">NT$ {prop.price.toLocaleString()} / 月</p></div></div><div className="flex items-center gap-2"><button onClick={() => handleToggleStatus(prop.id, prop.status || 'active')} className={cn("p-2 rounded-lg transition-colors", (prop.status || 'active') === 'active' ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50" : "text-orange-600 bg-orange-50")}><ShieldCheck className="w-5 h-5" /></button><Link to={`/admin/edit/${prop.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-5 h-5" /></Link><Link to={`/property/${prop.id}`} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><ChevronRight className="w-5 h-5" /></Link><button onClick={() => handleDelete(prop.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button></div></div>))}</div>)}
                {activeTab === 'bookings' && (<div className="divide-y divide-gray-50">{bookings.length === 0 ? <div className="p-20 text-center text-gray-400">目前沒有預約請求</div> : bookings.map(b => (<div key={b.id} className="p-6 flex items-center justify-between hover:bg-gray-50"><div><div className="flex items-center gap-2 mb-1"><span className="font-bold text-gray-900">{b.userName}</span><span className="text-xs text-gray-400">({b.userPhone})</span></div><p className="text-sm text-gray-500 mb-2">預約房源：{b.propertyTitle}</p><div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest"><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span><span>{b.time}</span></div></div><div className="flex items-center gap-3">{b.status === 'pending' ? (<><button onClick={() => handleUpdateBooking(b.id, 'confirmed')} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100"><CheckCircle className="w-4 h-4" />確認</button><button onClick={() => handleUpdateBooking(b.id, 'cancelled')} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100"><XCircle className="w-4 h-4" />拒絕</button></>) : (<span className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest", b.status === 'confirmed' ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400")}>{b.status === 'confirmed' ? '已確認' : '已取消'}</span>)}</div></div>))}</div>)}
                {activeTab === 'messages' && (<div className="divide-y divide-gray-50">{messages.length === 0 ? <div className="p-20 text-center text-gray-400">目前沒有訊息</div> : messages.map(msg => (<div key={msg.id} className={cn("p-6 hover:bg-gray-50 cursor-pointer", !msg.isRead && "bg-orange-50/30")} onClick={() => !msg.isRead && handleReadMessage(msg.id)}><div className="flex justify-between items-start mb-2"><div className="flex items-center gap-2"><span className="font-bold text-gray-900">{msg.senderName}</span>{!msg.isRead && <span className="w-2 h-2 bg-orange-600 rounded-full" />}</div><span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(msg.createdAt).toLocaleDateString()}</span></div><p className="text-xs text-orange-600 font-bold mb-2">關於：{msg.propertyTitle}</p><p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">{msg.content}</p></div>))}</div>)}
                {activeTab === 'users' && (
                  <div className="divide-y divide-gray-50">
                    {userDebug && <div className="p-4 text-xs text-blue-600 bg-blue-50">{userDebug}</div>}
                    {appUsers.length === 0 ? (
                      <div className="p-20 text-center text-gray-400">目前沒有用戶</div>
                    ) : appUsers.map(u => (
                      <div key={u.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <img src={u.photoUrl || ''} alt="" className="w-10 h-10 rounded-full bg-gray-100" />
                          <div>
                            <p className="font-bold text-gray-900">{u.displayName || '未命名'}</p>
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </div>
                        </div>
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer",
                            u.role === 'admin' ? "bg-gray-900 text-white border-gray-900" :
                            u.role === 'agent' ? "bg-orange-50 text-orange-600 border-orange-200" :
                            "bg-gray-50 text-gray-500 border-gray-200"
                          )}
                        >
                          <option value="user">租客</option>
                          <option value="agent">仲介</option>
                          <option value="admin">管理員</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
