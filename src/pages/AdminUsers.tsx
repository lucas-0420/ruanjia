import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Navigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Users, Smartphone, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { LineSyncPanel } from './AdminSync';

interface AppUser { id: string; email: string; displayName: string; photoUrl: string; role: string; createdAt: string; }

type Tab = 'users' | 'line';

export default function AdminUsers() {
  const { user, userRole, isAuthReady } = useFirebase();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  if (isAuthReady && !isAdmin) return <Navigate to="/" />;

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

  const navItems = [
    { key: 'users' as Tab, label: '用戶管理', Icon: Users },
    { key: 'line' as Tab, label: 'LINE 同步', Icon: Smartphone },
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
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900">
              {activeTab === 'users' ? '用戶管理' : 'LINE 訊息同步'}
            </span>
          </div>

          {activeTab === 'line' ? (
            <LineSyncPanel />
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {appUsers.length === 0 ? (
                <div className="p-20 text-center text-gray-400">目前沒有用戶</div>
              ) : appUsers.map(u => (
                <div key={u.id} className="p-5 flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 last:border-0">
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
                      'px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer',
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
      </div>
    </div>
  );
}
