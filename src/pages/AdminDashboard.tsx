import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import {
  Building2, Calendar, MessageSquare, Trash2, CheckCircle, XCircle,
  ShieldCheck, Edit, Users, Plus, LayoutDashboard, LogOut, Smartphone,
  Home, Archive, TrendingUp, Link2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';
import { LineSyncPanel } from './AdminSync';

interface Booking { id: string; propertyTitle: string; userName: string; userPhone: string; date: string; time: string; status: 'pending' | 'confirmed' | 'cancelled'; }
interface Message { id: string; senderId: string; senderName: string; propertyTitle: string; content: string; isRead: boolean; createdAt: string; }
interface AppUser { id: string; email: string; displayName: string; photoUrl: string; role: string; createdAt: string; }

type Tab = 'properties' | 'bookings' | 'messages' | 'users' | 'line';
export default function AdminDashboard() {
  const { user, userRole, properties, isAuthReady, logout } = useFirebase();
  const [activeTab, setActiveTab] = useState<Tab>('properties');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('bookings').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setBookings((data || []).map(r => ({ id: r.id, propertyTitle: r.property_title, userName: r.user_name, userPhone: r.user_phone, date: r.date, time: r.time, status: r.status }))));
    supabase.from('messages').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setMessages((data || []).map(r => ({ id: r.id, senderId: r.sender_id, senderName: r.sender_name, propertyTitle: r.property_title, content: r.content, isRead: r.is_read, createdAt: r.created_at }))));

    const fetchUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        const { users } = await res.json();
        setAppUsers((users || []).map((r: any) => ({ id: r.id, email: r.email, displayName: r.display_name, photoUrl: r.photo_url, role: r.role || 'user', createdAt: r.created_at })));
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

  const handleToggleStatus = async (id: string, current: string) => {
    await supabase.from('properties').update({ status: current === 'active' ? 'archived' : 'active' }).eq('id', id);
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('確定刪除？')) return;
    await supabase.from('properties').delete().eq('id', id);
  };
  const handleUpdateBooking = async (id: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };
  const handleReadMessage = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
  };
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
  const activeProperties = properties.filter(p => p.status !== 'archived');
  const archivedProperties = properties.filter(p => p.status === 'archived');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const unreadMessages = messages.filter(m => !m.isRead);

  const navItems: { key: Tab; label: string; Icon: any; badge?: number }[] = [
    { key: 'properties', label: '房源管理', Icon: Building2 },
    { key: 'bookings', label: '預約看房', Icon: Calendar, badge: pendingBookings.length },
    { key: 'messages', label: '租客訊息', Icon: MessageSquare, badge: unreadMessages.length },
    { key: 'users', label: '用戶管理', Icon: Users },
    { key: 'line', label: 'LINE 同步', Icon: Smartphone },
  ];

  const tabTitles: Record<Tab, string> = {
    properties: '房源列表',
    bookings: '預約請求',
    messages: '對話紀錄',
    users: '用戶管理',
    line: 'LINE 訊息同步',
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 gap-8 py-10">

        {/* ── Left Sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <div className="sticky top-24 space-y-4">

            {/* Profile */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              {avatar ? (
                <img src={avatar} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-100 mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-8 h-8 text-orange-600" />
                </div>
              )}
              <p className="font-bold text-gray-900 text-sm leading-tight">{name}</p>
              <span className="mt-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-0.5 rounded-full">管理員</span>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-1">
              {[
                { label: '全部房源', value: properties.length, icon: Home, color: 'text-blue-600 bg-blue-50' },
                { label: '上架中', value: activeProperties.length, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                { label: '已下架', value: archivedProperties.length, icon: Archive, color: 'text-gray-500 bg-gray-100' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.color)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm flex-1 font-medium text-gray-600">{s.label}</span>
                  <span className="text-sm font-black text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Nav */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3 space-y-1">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-50 text-orange-600 mb-1">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-bold">管理後台</span>
              </div>
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
              <Link
                to="/post"
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">刊登新房源</span>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">登出</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-gray-900">{tabTitles[activeTab]}</h2>
            </div>
            {activeTab === 'properties' && (
              <Link to="/post" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
                <Plus className="w-4 h-4" />刊登新房源
              </Link>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'line' ? (
            <LineSyncPanel />
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Properties */}
              {activeTab === 'properties' && (
                <div className="divide-y divide-gray-50">
                  {properties.length === 0 && <div className="p-20 text-center text-gray-400">尚無房源</div>}
                  {properties.map(prop => (
                    <div key={prop.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors">
                      <Link to={`/property/${prop.id}`} className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 hover:opacity-80 transition-opacity">
                        <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/property/${prop.id}`} className="font-bold text-gray-900 truncate block hover:text-orange-600 transition-colors">{prop.title}</Link>
                        <p className="text-sm text-gray-500 truncate mt-0.5">{prop.location.city}{prop.location.district} · NT${prop.price.toLocaleString()} / 月</p>
                      </div>
                      <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full', prop.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700')}>
                        {prop.status === 'archived' ? '已下架' : '上架中'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => handleToggleStatus(prop.id, prop.status || 'active')} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:border-orange-400 transition-all" title={prop.status === 'archived' ? '上架' : '下架'}>
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <Link to={`/admin/edit/${prop.id}`} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-all">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(prop.id)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bookings */}
              {activeTab === 'bookings' && (
                <div className="divide-y divide-gray-50">
                  {bookings.length === 0 && <div className="p-20 text-center text-gray-400">目前沒有預約請求</div>}
                  {bookings.map(b => (
                    <div key={b.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{b.userName}</span>
                          <span className="text-xs text-gray-400">({b.userPhone})</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">預約房源：{b.propertyTitle}</p>
                        <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.date}</span>
                          <span>{b.time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {b.status === 'pending' ? (
                          <>
                            <button onClick={() => handleUpdateBooking(b.id, 'confirmed')} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100">
                              <CheckCircle className="w-4 h-4" />確認
                            </button>
                            <button onClick={() => handleUpdateBooking(b.id, 'cancelled')} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">
                              <XCircle className="w-4 h-4" />拒絕
                            </button>
                          </>
                        ) : (
                          <span className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase', b.status === 'confirmed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400')}>
                            {b.status === 'confirmed' ? '已確認' : '已取消'}
                          </span>
                        )}
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
                    <div key={msg.id} className={cn('p-6 hover:bg-gray-50 cursor-pointer', !msg.isRead && 'bg-orange-50/30')} onClick={() => !msg.isRead && handleReadMessage(msg.id)}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{msg.senderName}</span>
                          {!msg.isRead && <span className="w-2 h-2 bg-orange-600 rounded-full" />}
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(msg.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-orange-600 font-bold mb-2">關於：{msg.propertyTitle}</p>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Users */}
              {activeTab === 'users' && (
                <div className="divide-y divide-gray-50">
                  {appUsers.length === 0 && <div className="p-20 text-center text-gray-400">目前沒有用戶</div>}
                  {appUsers.map(u => (
                    <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gray-50">
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
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer',
                          u.role === 'admin' ? 'bg-gray-900 text-white border-gray-900' :
                          u.role === 'agent' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          'bg-gray-50 text-gray-500 border-gray-200'
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
          )}
        </div>
      </div>
    </div>
  );
}
