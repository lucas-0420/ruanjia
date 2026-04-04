import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import {
  Trash2, ShieldCheck, Edit,
  Plus, LayoutDashboard, LogOut, Home, CheckCircle, Archive, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';

export default function AdminDashboard() {
  const { user, userRole, properties, isAuthReady, logout } = useFirebase();
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const isAdmin = userRole === 'admin';

  if (isAuthReady && !isAdmin) return <Navigate to="/" />;

  const handleToggleStatus = async (id: string, current: string) => {
    await supabase.from('properties').update({ status: current === 'active' ? 'archived' : 'active' }).eq('id', id);
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('確定刪除？')) return;
    await supabase.from('properties').delete().eq('id', id);
  };

  const avatar = user?.user_metadata?.avatar_url || '';
  const name = user?.user_metadata?.full_name || user?.email || '';
  const activeProps = properties.filter(p => p.status !== 'archived');
  const archivedProps = properties.filter(p => p.status === 'archived');
  const filtered = filter === 'active' ? activeProps : filter === 'archived' ? archivedProps : properties;

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
                {filter === 'active' ? '上架中房源' : filter === 'archived' ? '已下架房源' : '所有房源列表'}
              </h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
              {filter !== 'all' && <button onClick={() => setFilter('all')} className="text-xs text-orange-600 hover:underline font-medium">清除篩選</button>}
            </div>
            <Link to="/post" className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100">
              <Plus className="w-4 h-4" />刊登新房源
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-20 text-center text-gray-400">沒有房源</div>
            ) : filtered.map(prop => (
              <div key={prop.id} className={cn('flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors border-b border-gray-50 last:border-0', prop.status === 'archived' && 'opacity-60')}>
                <Link to={`/property/${prop.id}`} className="w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 hover:opacity-80 transition-opacity">
                  <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${prop.id}`} className="font-bold text-gray-900 truncate block hover:text-orange-600 transition-colors">{prop.title}</Link>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{prop.location.city}{prop.location.district} · NT${prop.price.toLocaleString()} / 月</p>
                </div>
                <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full shrink-0', prop.status === 'archived' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700')}>
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
        </div>
      </div>
    </div>
  );
}
