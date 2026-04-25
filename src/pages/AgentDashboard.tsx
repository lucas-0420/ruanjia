import { API_BASE } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useFirebase, mapPropertyFromDB } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import {
  Building2, Plus, Edit, Trash2, TrendingUp,
  Home, CheckCircle, Archive, Loader2, LayoutDashboard, LogOut, Search, X,
  MessageSquare, Phone, Clock, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Property } from '../types';

interface ConfirmModal {
  id: string;
  title: string;
  nextStatus: 'active' | 'archived';
}

interface Inquiry {
  id: string;
  sender_name: string;
  sender_phone: string;
  property_id: string;
  property_title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  user_name: string;
  user_phone: string;
  property_id: string;
  property_title: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export default function AgentDashboard() {
  const { user, userRole, isAuthReady, logout } = useFirebase();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'properties' | 'inquiries' | 'bookings'>('properties');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const canAccess = userRole === 'agent' || userRole === 'admin' || userRole === 'landlord';
  const isLandlord = userRole === 'landlord';

  useEffect(() => {
    if (!user || !canAccess) return;
    setLoading(true);
    supabase
      .from('properties')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setProperties(data.map(mapPropertyFromDB));
        setLoading(false);
      });
  }, [user, canAccess]);

  // ── 載入詢問紀錄 ──
  useEffect(() => {
    if (!user || !canAccess) return;
    setInquiryLoading(true);
    supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('inquiries fetch error:', error);
        } else if (data) {
          setInquiries(data as Inquiry[]);
          setUnreadCount(data.filter((m: Inquiry) => !m.is_read).length);
        }
        setInquiryLoading(false);
      });
  }, [user, canAccess, activeTab]);

  // ── 標記已讀 ──
  const markRead = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setInquiries(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // ── 載入預約 ──
  useEffect(() => {
    if (!user || !canAccess) return;
    setBookingLoading(true);
    supabase
      .from('bookings')
      .select('*')
      .eq('receiver_id', user.id)
      .order('date', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setBookings(data as Booking[]);
        setBookingLoading(false);
      });
  }, [user, canAccess, activeTab]);

  // ── 更新預約狀態 ──
  const updateBookingStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  if (isAuthReady && (!user || !canAccess)) return <Navigate to="/" />;

  /* ── status select change → show confirm modal ── */
  const handleStatusChange = (id: string, title: string, next: 'active' | 'archived') => {
    setConfirm({ id, title, nextStatus: next });
  };

  /* ── confirmed: apply status change ── */
  const applyStatusChange = async () => {
    if (!confirm) return;
    setSavingId(confirm.id);
    setConfirm(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch(`${API_BASE}/api/properties/${confirm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: confirm.nextStatus }),
      });
    }
    setProperties(prev =>
      prev.map(p => p.id === confirm.id ? { ...p, status: confirm.nextStatus } as any : p)
    );
    setSavingId(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`確定要刪除「${title}」嗎？此操作無法復原。`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${API_BASE}/api/properties/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setProperties(prev => prev.filter(p => p.id !== id));
  };

  const active = properties.filter(p => p.status !== 'archived');
  const archived = properties.filter(p => p.status === 'archived');
  const byFilter = filter === 'active' ? active : filter === 'archived' ? archived : properties;
  const filtered = search.trim()
    ? byFilter.filter(p => `${p.title} ${p.location.city}${p.location.district}`.toLowerCase().includes(search.trim().toLowerCase()))
    : byFilter;
  const name = user?.user_metadata?.full_name || user?.email || '仲介';
  const avatar = user?.user_metadata?.avatar_url || '';

  /* ── 共用：每一行房源卡片 ── */
  const renderRow = (property: Property) => {
    const isArchived = property.status === 'archived';
    const isSaving = savingId === property.id;
    return (
      <div key={property.id} className={cn('flex items-center gap-3 px-4 py-3 border-b border-[#F2E9DF] last:border-0', isArchived && 'opacity-55')}>
        <Link to={`/property/${property.id}`} className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[#F2E9DF]">
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/property/${property.id}`} className="text-sm font-bold text-[#3D2B1F] truncate block hover:text-[#F5A623] transition-colors">
            {property.title}
          </Link>
          <p className="text-xs text-[#9A7D6B] truncate mt-0.5">{property.location.district} · NT${property.price.toLocaleString()}</p>
        </div>
        <div className="shrink-0">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-[#F5A623]" /> : (
            <select
              value={property.status || 'active'}
              onChange={e => handleStatusChange(property.id, property.title, e.target.value as 'active' | 'archived')}
              className={cn('text-[11px] font-bold px-2 py-1.5 rounded-xl border-2 appearance-none cursor-pointer focus:outline-none',
                isArchived ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-green-200 bg-green-50 text-green-700')}
            >
              <option value="active">✓ 上架中</option>
              <option value="archived">✕ 已下架</option>
            </select>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link to={`/admin/edit/${property.id}`} className="w-8 h-8 rounded-xl border border-[#E5D5C5] flex items-center justify-center text-[#B8A090] hover:text-[#F5A623] hover:border-[#F5A623] transition-all">
            <Edit className="w-3.5 h-3.5" />
          </Link>
          <button onClick={() => handleDelete(property.id, property.title)} className="w-8 h-8 rounded-xl border border-[#E5D5C5] flex items-center justify-center text-[#B8A090] hover:text-red-500 hover:border-red-300 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBF7F3] pt-16">

      {/* ── Confirm Modal ── */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
            <h3 className="text-lg font-black text-[#3D2B1F] mb-2">確認變更狀態</h3>
            <p className="text-[#9A7D6B] text-sm mb-6">
              將「<span className="font-bold text-[#3D2B1F]">{confirm.title}</span>」
              {confirm.nextStatus === 'active' ? '重新上架' : '下架'}？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-2xl border-2 border-[#E5D5C5] font-bold text-[#7A5C48]">取消</button>
              <button onClick={applyStatusChange} className={cn('flex-1 py-3 rounded-2xl font-bold text-white', confirm.nextStatus === 'active' ? 'bg-green-600' : 'bg-[#3D2B1F]')}>
                {confirm.nextStatus === 'active' ? '確認上架' : '確認下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          手機版（lg 以下）
      ══════════════════════════════ */}
      <div className="lg:hidden flex flex-col h-[calc(100vh-64px)]">

        {/* 固定頂部區塊 */}
        <div className="bg-[#FBF7F3] px-4 pt-4 pb-3 space-y-3 shrink-0">
          {/* 標題列 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#3D2B1F]">
                {activeTab === 'properties' ? '我的房源' : '詢問收件匣'}
              </h1>
              {activeTab === 'properties' && (
                <span className="text-xs font-bold text-[#9A7D6B] bg-[#F2E9DF] px-2 py-0.5 rounded-full">{filtered.length}</span>
              )}
            </div>
            {activeTab === 'properties' && (
              <Link to="/post" className="flex items-center gap-1.5 bg-[#FFB830] text-[#3D2B1F] px-3 py-2 rounded-xl text-sm font-bold">
                <Plus className="w-4 h-4" />
                刊登
              </Link>
            )}
          </div>
          {/* 主 Tab：房源 / 詢問 */}
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('properties')}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center justify-center gap-1',
                activeTab === 'properties' ? 'bg-[#FFE8CC] text-[#F5A623] border-[#FFE8CC]' : 'bg-white text-[#9A7D6B] border-[#E5D5C5]')}>
              <Building2 className="w-3.5 h-3.5" /> 房源
            </button>
            <button onClick={() => setActiveTab('inquiries')}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center justify-center gap-1.5',
                activeTab === 'inquiries' ? 'bg-[#FFE8CC] text-[#F5A623] border-[#FFE8CC]' : 'bg-white text-[#9A7D6B] border-[#E5D5C5]')}>
              <MessageSquare className="w-3.5 h-3.5" /> 詢問
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('bookings')}
              className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center justify-center gap-1',
                activeTab === 'bookings' ? 'bg-[#FFE8CC] text-[#F5A623] border-[#FFE8CC]' : 'bg-white text-[#9A7D6B] border-[#E5D5C5]')}>
              <Calendar className="w-3.5 h-3.5" /> 預約
            </button>
          </div>
          {/* 搜尋欄 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8A090]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋房源..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E5D5C5] bg-white text-sm focus:outline-none focus:border-[#F5A623]" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A090]"><X className="w-4 h-4" /></button>}
          </div>
          {/* 篩選 Tabs */}
          <div className="flex gap-2">
            {([['all','全部', properties.length], ['active','上架中', active.length], ['archived','已下架', archived.length]] as const).map(([key, label, count]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={cn('flex-1 py-2 rounded-xl text-xs font-bold transition-colors border',
                  filter === key ? 'bg-[#FFE8CC] text-[#F5A623] border-[#FFE8CC]' : 'bg-white text-[#9A7D6B] border-[#E5D5C5]')}>
                {label} {count}
              </button>
            ))}
          </div>
        </div>

        {/* 可捲動列表 */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === 'properties' ? (
            loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <Building2 className="w-10 h-10 text-[#E5D5C5] mb-3" />
                <p className="font-bold text-[#9A7D6B]">沒有符合的房源</p>
              </div>
            ) : filtered.map(renderRow)
          ) : (
            /* 詢問收件匣 */
            inquiryLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" /></div>
            ) : inquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <MessageSquare className="w-10 h-10 text-[#E5D5C5] mb-3" />
                <p className="font-bold text-[#9A7D6B]">還沒有詢問</p>
                <p className="text-xs text-[#B8A090] mt-1">當租客送出詢問，會在這裡顯示</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2E9DF]">
                {inquiries.map(inq => (
                  <div
                    key={inq.id}
                    onClick={() => !inq.is_read && markRead(inq.id)}
                    className={cn('px-4 py-4 cursor-pointer transition-colors', !inq.is_read ? 'bg-[#FFFBF5]' : 'bg-white')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {!inq.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />}
                        <span className="text-sm font-bold text-[#3D2B1F]">{inq.sender_name || '訪客'}</span>
                        {inq.sender_phone && (
                          <a href={`tel:${inq.sender_phone}`} onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#F5A623] font-bold">
                            <Phone className="w-3 h-3" />{inq.sender_phone}
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-[#B8A090] shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inq.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#9A7D6B] mb-1 truncate">📍 {inq.property_title}</p>
                    <p className="text-sm text-[#3D2B1F] leading-relaxed line-clamp-2">{inq.content}</p>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* 手機版預約行事曆 */
            bookingLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" /></div>
            ) : (
              <BookingCalendar bookings={bookings} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onUpdateStatus={updateBookingStatus} mobile />
            )
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          桌面版（lg 以上）
      ══════════════════════════════ */}
      <div className="hidden lg:flex max-w-6xl mx-auto px-8 gap-8 py-10">

        {/* ── Left Sidebar (sticky) ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <div className="sticky top-24 space-y-4">

            {/* Profile Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              {avatar ? (
                <img src={avatar} alt={name} className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-100 mb-3" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
                  <Building2 className="w-8 h-8 text-orange-600" />
                </div>
              )}
              <p className="font-bold text-gray-900 text-sm leading-tight">{name}</p>
              <span className="mt-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-0.5 rounded-full">
                {isLandlord ? '屋主' : '仲介'}
              </span>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-1">
              {[
                { label: '全部房源', value: properties.length, key: 'all' as const, iconColor: 'text-blue-600 bg-blue-50', icon: Home },
                { label: '上架中',   value: active.length,     key: 'active' as const, iconColor: 'text-green-600 bg-green-50', icon: CheckCircle },
                { label: '已下架',   value: archived.length,   key: 'archived' as const, iconColor: 'text-gray-500 bg-gray-100', icon: Archive },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left',
                    filter === s.key ? 'bg-orange-50 ring-2 ring-orange-200' : 'hover:bg-gray-50'
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.iconColor)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className={cn('text-sm flex-1', filter === s.key ? 'font-bold text-orange-700' : 'font-medium text-gray-600')}>{s.label}</span>
                  <span className={cn('text-sm font-black', filter === s.key ? 'text-orange-600' : 'text-gray-900')}>{s.value}</span>
                </button>
              ))}
            </div>

            {/* Nav */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3 space-y-1">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-50 text-orange-600">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-bold">房源管理</span>
              </div>
              <Link
                to="/post"
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">刊登新房源</span>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">登出</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Desktop Tab 切換 */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('properties')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-colors',
                  activeTab === 'properties' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50')}>
                <Building2 className="w-4 h-4" /> 房源管理
              </button>
              <button onClick={() => setActiveTab('inquiries')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-colors',
                  activeTab === 'inquiries' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50')}>
                <MessageSquare className="w-4 h-4" /> 詢問收件匣
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{unreadCount}</span>
                )}
              </button>
              <button onClick={() => setActiveTab('bookings')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-colors',
                  activeTab === 'bookings' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-50')}>
                <Calendar className="w-4 h-4" /> 預約行事曆
              </button>
            </div>
            {activeTab === 'properties' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋房源..."
                    className="pl-9 pr-8 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-48" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                </div>
                <Link to="/post" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
                  <Plus className="w-4 h-4" /> 刊登新房源
                </Link>
              </div>
            )}
          </div>

          {/* 房源列表 or 詢問收件匣 */}
          {activeTab === 'properties' ? (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" />
                </div>
              ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                  <Building2 className="w-10 h-10 text-[#E5D5C5] mb-4" />
                  <p className="font-bold text-[#9A7D6B] mb-2">尚無房源</p>
                  <Link to="/post" className="flex items-center gap-2 bg-[#FFB830] text-[#3D2B1F] px-6 py-3 rounded-2xl font-bold mt-4">
                    <Plus className="w-4 h-4" />立即刊登
                  </Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="font-bold text-[#9A7D6B]">此分類沒有房源</p>
                  <button onClick={() => setFilter('all')} className="text-sm text-[#F5A623] mt-2">顯示全部</button>
                </div>
              ) : filtered.map(renderRow)}
            </div>
          ) : (
            /* 桌面版詢問列表 */
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {inquiryLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" /></div>
              ) : inquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MessageSquare className="w-10 h-10 text-[#E5D5C5] mb-4" />
                  <p className="font-bold text-[#9A7D6B]">還沒有詢問</p>
                  <p className="text-sm text-[#B8A090] mt-1">當租客送出詢問，會在這裡顯示</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {inquiries.map(inq => (
                    <div key={inq.id} onClick={() => !inq.is_read && markRead(inq.id)}
                      className={cn('px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors', !inq.is_read && 'bg-orange-50/40')}>
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          {!inq.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />}
                          <span className="font-bold text-gray-900">{inq.sender_name || '訪客'}</span>
                          {inq.sender_phone && (
                            <a href={`tel:${inq.sender_phone}`} onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-sm text-orange-600 font-bold hover:underline">
                              <Phone className="w-3.5 h-3.5" />{inq.sender_phone}
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(inq.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1.5">📍 {inq.property_title}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{inq.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* 桌面版預約行事曆 */
            bookingLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#F5A623]" /></div>
            ) : (
              <BookingCalendar bookings={bookings} calendarDate={calendarDate} setCalendarDate={setCalendarDate} onUpdateStatus={updateBookingStatus} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 預約行事曆元件 ── */
function BookingCalendar({ bookings, calendarDate, setCalendarDate, onUpdateStatus, mobile = false }: {
  bookings: Booking[];
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  onUpdateStatus: (id: string, status: 'confirmed' | 'cancelled') => void;
  mobile?: boolean;
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=日
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 該月的預約 map：date string → bookings[]
  const bookingMap: Record<string, Booking[]> = {};
  bookings.forEach(b => {
    if (!bookingMap[b.date]) bookingMap[b.date] = [];
    bookingMap[b.date].push(b);
  });

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const selectedBookings = selectedDate ? (bookingMap[selectedDate] || []) : [];

  const statusColor = (s: string) =>
    s === 'confirmed' ? 'bg-green-100 text-green-700' : s === 'cancelled' ? 'bg-gray-100 text-gray-400 line-through' : 'bg-orange-100 text-orange-700';

  return (
    <div className={cn('bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden', mobile && 'rounded-none border-0 shadow-none')}>
      {/* 月份導覽 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-50 rounded-xl">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="font-bold text-gray-900">{year} 年 {month + 1} 月</span>
        <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-50 rounded-xl">
          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 星期標題 */}
      <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 px-2 pt-3 pb-1">
        {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-3">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayBookings = bookingMap[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          return (
            <button key={day} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={cn('relative flex flex-col items-center py-1.5 rounded-xl transition-colors text-sm',
                isSelected ? 'bg-[#F5A623] text-[#3D2B1F]' : isToday ? 'bg-orange-50 text-orange-600 font-bold' : 'hover:bg-gray-50 text-gray-700'
              )}>
              {day}
              {dayBookings.length > 0 && (
                <span className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-[#3D2B1F]' : 'bg-orange-400')} />
              )}
            </button>
          );
        })}
      </div>

      {/* 選中日期的預約列表 */}
      {selectedDate && (
        <div className="border-t border-gray-50 px-4 py-4 space-y-3">
          <p className="text-xs font-bold text-gray-400">{selectedDate} 的預約</p>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">這天沒有預約</p>
          ) : selectedBookings.map(b => (
            <div key={b.id} className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-bold text-gray-900 text-sm">{b.user_name || '訪客'}</span>
                  {b.user_phone && (
                    <a href={`tel:${b.user_phone}`} className="flex items-center gap-1 text-xs text-orange-600 font-bold mt-0.5">
                      <Phone className="w-3 h-3" />{b.user_phone}
                    </a>
                  )}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-bold', statusColor(b.status))}>
                  {b.status === 'confirmed' ? '已確認' : b.status === 'cancelled' ? '已取消' : '待確認'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">📍 {b.property_title} · ⏰ {b.time}</p>
              {b.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => onUpdateStatus(b.id, 'confirmed')}
                    className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors">
                    確認
                  </button>
                  <button onClick={() => onUpdateStatus(b.id, 'cancelled')}
                    className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-colors">
                    取消
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
