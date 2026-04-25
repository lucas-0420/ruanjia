import { API_BASE } from '../lib/api';
import React, { useState, useEffect } from 'react';
import { useFirebase, mapPropertyFromDB } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Users, Smartphone, ShieldCheck, LayoutDashboard, Home, Edit, Trash2, Loader2, CheckCircle, Archive, Search, X, UserCheck, Building2, Crown, ScrollText, RefreshCw, ShieldAlert, ServerCrash, Trash, ArrowLeftRight, Power, AlertTriangle, Link2 } from 'lucide-react';
import { LineSyncPanel } from './AdminSync';
import { Property } from '../types';

interface AppUser { id: string; email: string; displayName: string; photoUrl: string; role: string; createdAt: string; }
interface ConfirmModal { id: string; title: string; nextStatus: 'active' | 'archived'; }
interface AdminEvent {
  id: string;
  type: 'role_change' | 'property_status' | 'property_delete' | 'rate_limit' | 'server_error' | 'server_start' | 'login_fail' | 'line_bind';
  severity: 'info' | 'warning' | 'error';
  actor: string;
  target: string;
  detail: string;
  ip?: string;
  timestamp: string;
}

type Tab = 'users' | 'line' | 'properties' | 'events';

export default function AdminUsers() {
  const { user, userRole, isAuthReady } = useFirebase();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  // 事件紀錄狀態
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // 房源管理狀態
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [propLoading, setPropLoading] = useState(false);
  const [propFilter, setPropFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);
  const [propSearch, setPropSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  // 快取標記：已 fetch 過就不重複打 API
  const [usersFetched, setUsersFetched] = useState(false);
  const [propsFetched, setPropsFetched] = useState(false);

  // 一次取得 session，供多個 fetch 共用
  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  // 用戶管理：進頁面就立刻 fetch（不等切 Tab）
  useEffect(() => {
    if (!isAdmin || usersFetched) return;
    const fetchUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const session = await getSession();
        if (!session) { setUsersError('未登入'); setUsersLoading(false); return; }
        const res = await fetch(API_BASE + '/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) {
          const { users } = await res.json();
          setAppUsers((users || []).map((r: any) => ({ id: r.id, email: r.email, displayName: r.display_name, photoUrl: r.photo_url, role: r.role || 'user', createdAt: r.created_at })));
          setUsersFetched(true);
        } else {
          const txt = await res.text();
          setUsersError(`API 錯誤 ${res.status}: ${txt.slice(0, 100)}`);
        }
      } catch (e: any) {
        setUsersError(`連線失敗: ${e.message}`);
      }
      setUsersLoading(false);
    };
    fetchUsers();
  }, [isAdmin, usersFetched]);

  // 房源管理：進頁面就立刻 fetch（不等切 Tab），與用戶管理平行進行
  useEffect(() => {
    if (!isAdmin || propsFetched) return;
    const fetchAllProperties = async () => {
      setPropLoading(true);
      try {
        const session = await getSession();
        if (!session) { setPropLoading(false); return; }
        const res = await fetch(API_BASE + '/api/admin/properties', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { properties } = await res.json();
          setAllProperties((properties || []).map(mapPropertyFromDB));
          setPropsFetched(true);
        }
      } catch (e: any) {
        console.error('properties fetch error:', e);
      }
      setPropLoading(false);
    };
    fetchAllProperties();
  }, [isAdmin, propsFetched]);

  // 事件紀錄 fetch（切換到 events tab 或手動刷新時觸發）
  const fetchEvents = async () => {
    setEventsLoading(true);
    const session = await getSession();
    if (!session) { setEventsLoading(false); return; }
    const res = await fetch(API_BASE + '/api/admin/events', { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) {
      const { events: data } = await res.json();
      setEvents(data || []);
    }
    setEventsLoading(false);
  };

  useEffect(() => {
    if (activeTab !== 'events' || !isAdmin) return;
    fetchEvents();
    // 每 30 秒自動更新
    const interval = setInterval(fetchEvents, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, isAdmin]);

  if (isAuthReady && !isAdmin) return <Navigate to="/" />;

  const handleRoleChange = async (id: string, role: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ role }),
    });
    setAppUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const handleStatusChange = (id: string, title: string, next: 'active' | 'archived') => {
    setConfirm({ id, title, nextStatus: next });
  };

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
    setAllProperties(prev =>
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
    if (res.ok) setAllProperties(prev => prev.filter(p => p.id !== id));
  };

  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';

  const activeProps = allProperties.filter(p => p.status !== 'archived');
  const archivedProps = allProperties.filter(p => p.status === 'archived');
  const byPropFilter = propFilter === 'active' ? activeProps : propFilter === 'archived' ? archivedProps : allProperties;
  const filteredProps = propSearch.trim()
    ? byPropFilter.filter(p => `${p.title} ${p.location.city}${p.location.district}`.toLowerCase().includes(propSearch.trim().toLowerCase()))
    : byPropFilter;
  const byRoleFilter = roleFilter ? appUsers.filter(u => u.role === roleFilter) : appUsers;
  const filteredUsers = userSearch.trim()
    ? byRoleFilter.filter(u => `${u.displayName} ${u.email}`.toLowerCase().includes(userSearch.trim().toLowerCase()))
    : byRoleFilter;

  // 角色徽章設定
  const roleConfig: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    admin:    { label: '管理員', color: 'bg-gray-900 text-white',              Icon: Crown },
    agent:    { label: '仲介',   color: 'bg-orange-100 text-orange-700',       Icon: Building2 },
    landlord: { label: '屋主',   color: 'bg-yellow-50 text-yellow-700',        Icon: Home },
    user:     { label: '租客',   color: 'bg-blue-50 text-blue-600',            Icon: UserCheck },
  };

  // 各角色人數統計
  const roleCounts = {
    admin:    appUsers.filter(u => u.role === 'admin').length,
    agent:    appUsers.filter(u => u.role === 'agent').length,
    landlord: appUsers.filter(u => u.role === 'landlord').length,
    user:     appUsers.filter(u => u.role === 'user').length,
  };

  // 事件類型設定
  const eventConfig: Record<AdminEvent['type'], { label: string; Icon: React.ElementType; color: string }> = {
    role_change:     { label: '角色變更', Icon: ArrowLeftRight, color: 'text-blue-600 bg-blue-50' },
    property_status: { label: '上下架',   Icon: CheckCircle,    color: 'text-green-600 bg-green-50' },
    property_delete: { label: '刪除房源', Icon: Trash,          color: 'text-red-600 bg-red-50' },
    rate_limit:      { label: '流量限制', Icon: ShieldAlert,    color: 'text-orange-600 bg-orange-50' },
    server_error:    { label: '伺服器錯誤', Icon: ServerCrash,  color: 'text-red-700 bg-red-100' },
    server_start:    { label: '伺服器啟動', Icon: Power,        color: 'text-gray-500 bg-gray-100' },
    login_fail:      { label: '登入失敗', Icon: AlertTriangle,  color: 'text-yellow-600 bg-yellow-50' },
    line_bind:       { label: 'LINE 綁定', Icon: Link2,         color: 'text-green-600 bg-green-50' },
  };
  const severityBorder: Record<AdminEvent['severity'], string> = {
    info: 'border-l-blue-400',
    warning: 'border-l-orange-400',
    error: 'border-l-red-500',
  };

  const navItems = [
    { key: 'users' as Tab, label: '用戶管理', Icon: Users },
    { key: 'properties' as Tab, label: '房源管理', Icon: Home },
    { key: 'events' as Tab, label: '事件紀錄', Icon: ScrollText },
    { key: 'line' as Tab, label: 'LINE 同步', Icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-[#FBF7F3] pt-16">

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
            <h3 className="text-lg font-black text-gray-900 mb-2">確認變更狀態</h3>
            <p className="text-gray-500 text-sm mb-6">
              將「<span className="font-bold text-gray-900">{confirm.title}</span>」
              {confirm.nextStatus === 'active' ? '重新上架' : '下架'}？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-2xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 transition-all">取消</button>
              <button
                onClick={applyStatusChange}
                className={cn('flex-1 py-3 rounded-2xl font-bold text-white transition-all', confirm.nextStatus === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-800')}
              >
                {confirm.nextStatus === 'active' ? '確認上架' : '確認下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 手機版 Tab Bar（桌面隱藏）══ */}
      <div className="lg:hidden bg-white border-b border-[#E5D5C5] px-4 pt-3 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-[#3D2B1F]">管理室</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {navItems.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors',
                activeTab === key
                  ? 'border-[#F5A623] text-[#F5A623]'
                  : 'border-transparent text-[#9A7D6B] hover:text-[#7A5C48]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 gap-8 py-4 lg:py-10">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 shrink-0">
          <div className="sticky top-24 space-y-4">
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

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3 space-y-1">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-50 text-orange-600 mb-1">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-bold">管理室</span>
              </div>
              {navItems.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-colors text-left',
                    activeTab === key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* 用戶管理 */}
          {activeTab === 'users' && (
            <>
              {/* 標題列 + 類別統計 + 搜尋 */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900">用戶管理</span>
                  {/* 全部按鈕 */}
                  <button
                    onClick={() => setRoleFilter(null)}
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full transition-all',
                      roleFilter === null
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    全部 {appUsers.length}
                  </button>
                  {/* 角色人數統計徽章（可點擊篩選） */}
                  {([
                    { role: 'admin',    cfg: roleConfig.admin },
                    { role: 'agent',    cfg: roleConfig.agent },
                    { role: 'landlord', cfg: roleConfig.landlord },
                    { role: 'user',     cfg: roleConfig.user  },
                  ] as { role: keyof typeof roleCounts; cfg: typeof roleConfig[string] }[]).map(({ role, cfg }) => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(f => f === role ? null : role)}
                      className={cn(
                        'flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all',
                        roleFilter === role
                          ? cfg.color + ' ring-2 ring-offset-1 ring-current'
                          : cfg.color + ' opacity-60 hover:opacity-100'
                      )}
                    >
                      <cfg.Icon className="w-3 h-3" />
                      {cfg.label} {roleCounts[role]}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="搜尋用戶..." className="pl-9 pr-8 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-48" />
                  {userSearch && <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#F5A623]" /></div>
                ) : usersError ? (
                  <div className="p-8 text-center">
                    <p className="text-red-500 font-bold text-sm mb-1">載入失敗</p>
                    <p className="text-xs text-gray-400 break-all">{usersError}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-20 text-center text-[#B8A090]">目前沒有用戶</div>
                ) : filteredUsers.map(u => {
                  const rc = roleConfig[u.role] || roleConfig.user;
                  return (
                    <div key={u.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 hover:bg-[#FBF7F3] border-b border-[#F2E9DF] last:border-0">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt="" className="w-9 h-9 rounded-full bg-[#F2E9DF] shrink-0 object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#F2E9DF] shrink-0 flex items-center justify-center text-[#B8A090] font-bold text-sm">
                          {(u.displayName || u.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-[#3D2B1F] truncate">{u.displayName || '未命名'}</p>
                          <span className={cn('flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0', rc.color)}>
                            <rc.Icon className="w-2.5 h-2.5" />{rc.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#9A7D6B] truncate">{u.email}</p>
                      </div>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={cn(
                          'shrink-0 px-2 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer focus:outline-none',
                          u.role === 'admin'    ? 'bg-gray-900 text-white border-gray-900' :
                          u.role === 'agent'    ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          u.role === 'landlord' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-500 border-gray-200'
                        )}
                      >
                        <option value="user">租客</option>
                        <option value="landlord">屋主</option>
                        <option value="agent">仲介</option>
                        <option value="admin">管理員</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 房源管理 - 平台全部房源 */}
          {activeTab === 'properties' && (
            <>
              <div className="flex items-center gap-3 flex-wrap justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-gray-900">平台所有房源</span>
                {/* 篩選按鈕 */}
                {[
                  { key: 'all' as const, label: '全部', icon: Home, color: 'text-blue-600 bg-blue-50', count: allProperties.length },
                  { key: 'active' as const, label: '上架中', icon: CheckCircle, color: 'text-green-600 bg-green-50', count: activeProps.length },
                  { key: 'archived' as const, label: '已下架', icon: Archive, color: 'text-gray-500 bg-gray-100', count: archivedProps.length },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setPropFilter(f => f === s.key ? 'all' : s.key)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border', propFilter === s.key ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}
                  >
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label} ({s.count})
                  </button>
                ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={propSearch} onChange={e => setPropSearch(e.target.value)} placeholder="搜尋房源..." className="pl-9 pr-8 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-48" />
                  {propSearch && <button onClick={() => setPropSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {propLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                  </div>
                ) : filteredProps.length === 0 ? (
                  <div className="p-20 text-center text-gray-400">沒有房源</div>
                ) : filteredProps.map(prop => (
                  <div key={prop.id} className={cn('flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-[#FBF7F3] border-b border-[#F2E9DF] last:border-0', prop.status === 'archived' && 'opacity-55')}>
                    <Link to={`/property/${prop.id}`} className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[#F2E9DF]">
                      <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/property/${prop.id}`} className="text-sm font-bold text-[#3D2B1F] truncate block hover:text-[#F5A623] transition-colors">{prop.title}</Link>
                      <p className="text-xs text-[#9A7D6B] truncate mt-0.5">{prop.location.district} · NT${prop.price.toLocaleString()}</p>
                    </div>
                    <div className="shrink-0">
                      {savingId === prop.id ? <Loader2 className="w-4 h-4 animate-spin text-[#F5A623]" /> : (
                        <select value={prop.status || 'active'} onChange={e => handleStatusChange(prop.id, prop.title, e.target.value as 'active' | 'archived')}
                          className={cn('text-[11px] font-bold px-2 py-1.5 rounded-xl border-2 appearance-none cursor-pointer focus:outline-none',
                            prop.status === 'archived' ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-green-200 bg-green-50 text-green-700')}>
                          <option value="active">✓ 上架中</option>
                          <option value="archived">✕ 已下架</option>
                        </select>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link to={`/admin/edit/${prop.id}`} className="w-8 h-8 rounded-xl border border-[#E5D5C5] flex items-center justify-center text-[#B8A090] hover:text-[#F5A623] hover:border-[#F5A623] transition-all">
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleDelete(prop.id, prop.title)} className="w-8 h-8 rounded-xl border border-[#E5D5C5] flex items-center justify-center text-[#B8A090] hover:text-red-500 hover:border-red-300 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 事件紀錄 */}
          {activeTab === 'events' && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">事件紀錄</span>
                  <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{events.length}</span>
                  <span className="text-xs text-gray-400">每 30 秒自動更新</span>
                </div>
                <button
                  onClick={fetchEvents}
                  disabled={eventsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', eventsLoading && 'animate-spin')} />
                  重新整理
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {eventsLoading && events.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-20 text-center text-gray-400">目前沒有事件紀錄（伺服器重啟後會清空）</div>
                ) : events.map(ev => {
                  const cfg = eventConfig[ev.type] || eventConfig.server_error;
                  const border = severityBorder[ev.severity];
                  return (
                    <div key={ev.id} className={cn('flex items-start gap-4 px-6 py-4 border-b border-gray-50 last:border-0 border-l-4', border)}>
                      {/* 類型圖示 */}
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.color)}>
                        <cfg.Icon className="w-4 h-4" />
                      </div>

                      {/* 內容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', cfg.color)}>{cfg.label}</span>
                          <span className="font-bold text-gray-900 text-sm truncate">{ev.target}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{ev.detail}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>操作者：{ev.actor}</span>
                          {ev.ip && <span>IP：{ev.ip}</span>}
                        </div>
                      </div>

                      {/* 時間 */}
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-gray-400">
                          {new Date(ev.timestamp).toLocaleDateString('zh-TW')}
                        </p>
                        <p className="text-xs font-mono text-gray-400">
                          {new Date(ev.timestamp).toLocaleTimeString('zh-TW')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* LINE 同步 */}
          {activeTab === 'line' && (
            <>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">LINE 訊息同步</span>
              </div>
              <LineSyncPanel />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
