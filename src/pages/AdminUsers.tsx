import React, { useState, useEffect } from 'react';
import { useFirebase } from '../context/SupabaseContext';
import { supabase } from '../supabase';
import { Navigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface AppUser { id: string; email: string; displayName: string; photoUrl: string; role: string; createdAt: string; }
const ADMIN_EMAIL = '0420.lucas111@gmail.com';

export default function AdminUsers() {
  const { user, isAuthReady } = useFirebase();
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [debug, setDebug] = useState('');
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUsers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setDebug('session 為空'); return; }
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const text = await res.text();
      if (res.ok) {
        const { users } = JSON.parse(text);
        setAppUsers((users || []).map((r: any) => ({ id: r.id, email: r.email, displayName: r.display_name, photoUrl: r.photo_url, role: r.role || 'user', createdAt: r.created_at })));
      } else {
        setDebug(`API 錯誤 ${res.status}: ${text}`);
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

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">管理室 · 用戶管理</h1>
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          {debug && <div className="p-4 text-xs text-blue-600 bg-blue-50">{debug}</div>}
          <div className="divide-y divide-gray-50">
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
        </div>
      </div>
    </div>
  );
}
