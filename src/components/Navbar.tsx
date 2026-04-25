import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Heart, Search, User, LogOut, LayoutDashboard, Users, Briefcase, MessageSquare, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';

/* ── 底部導覽列單一 Tab ── */
function BottomTab({
  to, icon: Icon, label, active, onClick,
}: {
  to?: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const base = cn(
    'flex flex-col items-center justify-center flex-1 gap-0.5 py-2 min-h-[56px] transition-colors',
    active ? 'text-[#FFB830]' : 'text-[#9A7D6B]'
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={base}>
        <Icon className={cn('w-6 h-6', active && 'stroke-[2.5]')} />
        <span className="text-[11px] font-semibold">{label}</span>
        {active && <span className="absolute bottom-0 w-8 h-0.5 bg-[#FFB830] rounded-full" />}
      </button>
    );
  }

  return (
    <Link to={to!} className={base}>
      <Icon className={cn('w-6 h-6', active && 'stroke-[2.5]')} />
      <span className="text-[11px] font-semibold">{label}</span>
      {active && <span className="absolute bottom-0 w-8 h-0.5 bg-[#FFB830] rounded-full" />}
    </Link>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout, userRole } = useFirebase();

  const isAdmin = userRole === 'admin';
  const p = location.pathname;

  // 未讀訊息數
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const ch = supabase.channel('navbar-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const [menuOpen, setMenuOpen] = useState(false);
  // 路由切換時自動關閉選單
  useEffect(() => { setMenuOpen(false); }, [p]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleLink = (path: string) => { if (p === path) scrollToTop(); };

  /* ── 桌面版導覽項目 ── */
  const desktopItems = [
    { label: '首頁',   path: '/',        icon: Home },
    { label: '找房',   path: '/listings', icon: Search },
    ...(isAdmin         ? [{ label: '管理室', path: '/manage', icon: Users }] : []),
    { label: '收藏清單', path: '/favorites', icon: Heart },
    ...(userRole === 'agent' || userRole === 'landlord' ? [{ label: '會員中心', path: '/agent',  icon: Briefcase }] : []),
    ...(isAdmin         ? [{ label: '會員中心', path: '/admin',  icon: LayoutDashboard }] : []),
  ];

  return (
    <>
      {/* ══════════════════════════════
          頂部導覽列（桌面 + 手機 Logo）
      ══════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFF8F0]/95 backdrop-blur-md border-b border-[#E5D5C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo */}
            <Link
              to="/"
              onClick={() => handleLink('/')}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 bg-[#FFB830] rounded-xl flex items-center justify-center shadow-sm">
                <Home className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#3D2B1F]">暖家</span>
            </Link>

            {/* 桌面導覽 */}
            <div className="hidden md:flex items-center gap-7">
              {desktopItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleLink(item.path)}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-[#FFB830] flex items-center gap-1.5',
                    p === item.path ? 'text-[#FFB830]' : 'text-[#7A5C48]'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}

              {user ? (
                <div className="flex items-center gap-4">
                  {(userRole === 'agent' || userRole === 'admin' || userRole === 'landlord') && (
                    <Link
                      to="/post"
                      className="bg-[#FFB830] text-[#3D2B1F] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#F5A623] transition-colors shadow-sm"
                    >
                      刊登房源
                    </Link>
                  )}
                  {/* 訊息圖示 */}
                  <Link to="/messages" className="relative p-2 text-[#7A5C48] hover:text-[#F5A623] transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F5A623] text-white text-[9px] flex items-center justify-center font-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center gap-3 pl-4 border-l border-[#E5D5C5]">
                    <Link to="/profile" className="flex items-center gap-2 group">
                      <img
                        src={user.user_metadata?.avatar_url || ''}
                        alt={user.user_metadata?.full_name || ''}
                        className="w-8 h-8 rounded-full border-2 border-[#E5D5C5] group-hover:border-[#FFB830] transition-colors"
                      />
                      <span className="text-sm font-medium text-[#7A5C48] group-hover:text-[#FFB830] transition-colors hidden lg:block">
                        我的帳戶
                      </span>
                    </Link>
                    <button
                      onClick={logout}
                      className="text-[#B8A090] hover:text-[#FFB830] transition-colors ml-1"
                      title="登出"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={login}
                  className="flex items-center gap-2 bg-[#FFB830] text-[#3D2B1F] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#F5A623] transition-colors shadow-sm"
                >
                  <User className="w-3.5 h-3.5" />
                  登入 / 註冊
                </button>
              )}
            </div>

            {/* 手機頂部右側：刊登 + 漢堡選單 */}
            <div className="md:hidden flex items-center gap-2">
              {user && (userRole === 'agent' || userRole === 'admin' || userRole === 'landlord') && (
                <Link to="/post" className="bg-[#FFB830] text-[#3D2B1F] px-3 py-1.5 rounded-xl text-sm font-bold">
                  刊登
                </Link>
              )}
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-[#7A5C48] hover:bg-[#F2E9DF] transition-colors"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ══ 手機漢堡選單抽屜 ══ */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          {/* 抽屜本體 */}
          <div
            className="absolute top-16 right-0 bottom-0 w-72 bg-[#FFF8F0] shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 使用者資訊 */}
            {user ? (
              <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E5D5C5]">
                <img
                  src={user.user_metadata?.avatar_url || ''}
                  alt=""
                  className="w-11 h-11 rounded-full border-2 border-[#E5D5C5]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3D2B1F] truncate">{user.user_metadata?.full_name || '用戶'}</p>
                  <p className="text-[11px] text-[#9A7D6B] truncate">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-5 border-b border-[#E5D5C5]">
                <button
                  onClick={() => { login(); setMenuOpen(false); }}
                  className="w-full py-2.5 bg-[#FFB830] text-[#3D2B1F] rounded-xl font-bold text-sm"
                >
                  登入 / 註冊
                </button>
              </div>
            )}

            {/* 導覽項目 */}
            <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1">
              {[
                { label: '首頁',   path: '/',          icon: Home },
                { label: '找房',   path: '/listings',  icon: Search },
                { label: '收藏',   path: '/favorites', icon: Heart },
                ...(user ? [{ label: '訊息', path: '/messages', icon: MessageSquare }] : []),
                ...(userRole === 'agent' ? [{ label: '仲介後台', path: '/agent', icon: Briefcase }] : []),
                ...(userRole === 'landlord' ? [{ label: '屋主後台', path: '/agent', icon: Briefcase }] : []),
                ...(isAdmin ? [{ label: '管理室', path: '/manage', icon: Users }] : []),
                ...(isAdmin ? [{ label: '後台總覽', path: '/admin', icon: LayoutDashboard }] : []),
                ...(user ? [{ label: '個人帳戶', path: '/profile', icon: User }] : []),
              ].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                    p === item.path
                      ? 'bg-[#FFE8CC] text-[#F5A623]'
                      : 'text-[#7A5C48] hover:bg-[#F2E9DF]'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* 登出 */}
            {user && (
              <div className="px-3 py-4 border-t border-[#E5D5C5]">
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-[#B8A090] hover:bg-[#F2E9DF] hover:text-[#7A5C48] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          手機底部導覽列 (md 以上隱藏、物件詳細頁不渲染)
      ══════════════════════════════ */}
      {!p.startsWith('/property/') && <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFF8F0]/95 backdrop-blur-md border-t border-[#E5D5C5]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 登入後：首頁 / 找房 / 訊息（帶未讀） / 我的
            未登入：首頁 / 找房 / 收藏 / 我的 */}
        <div className="flex items-stretch relative">
          <BottomTab to="/"         icon={Home}   label="首頁" active={p === '/'} />
          <BottomTab to="/listings" icon={Search} label="找房" active={p === '/listings'} />

          {user ? (
            /* 訊息 Tab + 未讀 badge */
            <div className="flex-1 relative flex">
              <BottomTab to="/messages" icon={MessageSquare} label="訊息" active={p === '/messages'} />
              {unreadCount > 0 && (
                <span className="absolute top-2 left-[calc(50%+8px)] w-4 h-4 rounded-full bg-[#F5A623] text-white text-[9px] flex items-center justify-center font-black pointer-events-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          ) : (
            <BottomTab to="/favorites" icon={Heart} label="收藏" active={p === '/favorites'} />
          )}

          <BottomTab
            to={user ? '/profile' : undefined}
            icon={User}
            label="我的"
            active={p === '/profile'}
            onClick={!user ? login : undefined}
          />
        </div>
      </nav>}
    </>
  );
}
