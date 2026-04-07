import { API_BASE } from '../lib/api';
import { useFirebase, mapPropertyFromDB } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import {
  Trash2, Edit, ShieldCheck,
  Plus, LayoutDashboard, LogOut, Home, CheckCircle, Archive, TrendingUp, Loader2, Search, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Property } from '../types';

interface ConfirmModal {
  id: string;
  title: string;
  nextStatus: 'active' | 'archived';
}

export default function AdminDashboard() {
  const { user, userRole, isAuthReady, logout } = useFirebase();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);
  const isAdmin = userRole === 'admin';

  // 只抓管理員自己的房源
  useEffect(() => {
    if (!user || !isAdmin) return;
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
  }, [user, isAdmin]);

  if (isAuthReady && !isAdmin) return <Navigate to="/" />;

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

  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';
  const activeProps = properties.filter(p => p.status !== 'archived');
  const archivedProps = properties.filter(p => p.status === 'archived');
  const byFilter = filter === 'active' ? activeProps : filter === 'archived' ? archivedProps : properties;
  const filtered = search.trim()
    ? byFilter.filter(p => `${p.title} ${p.location.city}${p.location.district}`.toLowerCase().includes(search.trim().toLowerCase()))
    : byFilter;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">

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
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={applyStatusChange}
                className={cn(
                  'flex-1 py-3 rounded-2xl font-bold text-white transition-all',
                  confirm.nextStatus === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-800'
                )}
              >
                {confirm.nextStatus === 'active' ? '確認上架' : '確認下架'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 gap-8 py-10">

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

            {/* Stats */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-1">
              {[
                { label: '全部房源', value: properties.length, key: 'all' as const, icon: Home, color: 'text-blue-600 bg-blue-50' },
                { label: '上架中', value: activeProps.length, key: 'active' as const, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
                { label: '已下架', value: archivedProps.length, key: 'archived' as const, icon: Archive, color: 'text-gray-500 bg-gray-100' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left', filter === s.key ? 'bg-orange-50 ring-2 ring-orange-200' : 'hover:bg-gray-50')}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.color)}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <span className={cn('text-sm flex-1', filter === s.key ? 'font-bold text-orange-700' : 'font-medium text-gray-600')}>{s.label}</span>
                  <span className={cn('text-sm font-black', filter === s.key ? 'text-orange-600' : 'text-gray-900')}>{s.value}</span>
                </button>
              ))}
            </div>

            {/* Nav */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-3 space-y-1">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-50 text-orange-600">
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-bold">會員中心</span>
              </div>
              <Link to="/post" className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">刊登新房源</span>
              </Link>
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">登出</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-gray-900">
                {filter === 'active' ? '上架中房源' : filter === 'archived' ? '已下架房源' : '我的房源列表'}
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
              {filter !== 'all' && <button onClick={() => setFilter('all')} className="text-xs text-orange-600 hover:underline font-medium">清除篩選</button>}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋房源..." className="pl-9 pr-8 py-2 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 w-48" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <Link to="/post" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
                <Plus className="w-4 h-4" />刊登新房源
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <p className="font-bold text-gray-400 mb-2">尚無房源</p>
                <Link to="/post" className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all mt-4">
                  <Plus className="w-4 h-4" />立即刊登
                </Link>
              </div>
            ) : filtered.map(prop => (
              <div key={prop.id} className={cn('flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors border-b border-gray-50 last:border-0', prop.status === 'archived' && 'opacity-60')}>
                <Link to={`/property/${prop.id}`} className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 hover:opacity-80 transition-opacity">
                  <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${prop.id}`} className="font-bold text-gray-900 truncate block hover:text-orange-600 transition-colors">{prop.title}</Link>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{prop.location.city}{prop.location.district} · NT${prop.price.toLocaleString()} / 月</p>
                </div>
                <div className="shrink-0">
                  {savingId === prop.id ? (
                    <div className="w-28 h-9 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    </div>
                  ) : (
                    <select
                      value={prop.status || 'active'}
                      onChange={e => handleStatusChange(prop.id, prop.title, e.target.value as 'active' | 'archived')}
                      className={cn(
                        'text-xs font-bold px-3 py-2 rounded-xl border-2 appearance-none cursor-pointer focus:outline-none transition-all',
                        prop.status === 'archived'
                          ? 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400'
                          : 'border-green-200 bg-green-50 text-green-700 hover:border-green-400'
                      )}
                    >
                      <option value="active">✓ 上架中</option>
                      <option value="archived">✕ 已下架</option>
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link to={`/admin/edit/${prop.id}`} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-all">
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button onClick={() => handleDelete(prop.id, prop.title)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
