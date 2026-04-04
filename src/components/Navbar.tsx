import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, Search, User, Menu, X, LogOut, LayoutDashboard, Users, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { user, login, logout, userRole } = useFirebase();

  const isAdmin = userRole === 'admin';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkClick = (path: string) => {
    if (location.pathname === path) {
      scrollToTop();
    }
    setIsOpen(false);
  };

  const navItems = [
    { label: '首頁', path: '/', icon: Home },
    { label: '找房', path: '/listings', icon: Search },
    ...(isAdmin ? [{ label: '管理室', path: '/manage', icon: Users }] : []),
    { label: '收藏清單', path: '/favorites', icon: Heart },
    ...(userRole === 'agent' ? [{ label: '會員中心', path: '/agent', icon: Briefcase }] : []),
    ...(isAdmin ? [{ label: '會員中心', path: '/admin', icon: LayoutDashboard }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFF8F0]/90 backdrop-blur-md border-b border-[#E5D5C5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* Logo */}
          <Link
            to="/"
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 bg-[#F5A623] rounded-xl flex items-center justify-center shadow-sm">
              <Home className="text-white w-4 h-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#3D2B1F]">暖家</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleLinkClick(item.path)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-[#F5A623] flex items-center gap-1.5",
                  location.pathname === item.path ? "text-[#F5A623]" : "text-[#7A5C48]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-4">
                {(userRole === 'agent' || userRole === 'admin') && (
                  <Link
                    to="/post"
                    className="bg-[#F5A623] text-[#3D2B1F] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#FFB830] transition-colors shadow-sm"
                  >
                    刊登房源
                  </Link>
                )}
                <div className="flex items-center gap-3 pl-4 border-l border-[#E5D5C5]">
                  <Link to="/profile" className="flex items-center gap-2 group">
                    <img
                      src={user.user_metadata?.avatar_url || ''}
                      alt={user.user_metadata?.full_name || ''}
                      className="w-8 h-8 rounded-full border-2 border-[#E5D5C5] group-hover:border-[#F5A623] transition-colors"
                    />
                    <span className="text-sm font-medium text-[#7A5C48] group-hover:text-[#F5A623] transition-colors hidden lg:block">我的帳戶</span>
                  </Link>
                  <button onClick={logout} className="text-[#B8A090] hover:text-[#F5A623] transition-colors ml-1">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 bg-[#F5A623] text-[#3D2B1F] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#FFB830] transition-colors shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                登入 / 註冊
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#7A5C48] p-2 hover:text-[#F5A623] transition-colors"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-[#FFF8F0] border-t border-[#E5D5C5] py-4 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleLinkClick(item.path)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-[#FFE8CC] text-[#F5A623]"
                  : "text-[#7A5C48] hover:bg-[#F2E9DF]"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-[#E5D5C5] mt-2 space-y-2">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-[#F2E9DF] text-[#3D2B1F] py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-sm"
                >
                  <User className="w-4 h-4" />
                  我的帳戶
                </Link>
                {(userRole === 'agent' || userRole === 'admin') && (
                  <Link
                    to="/post"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-[#F5A623] text-[#3D2B1F] py-3 rounded-2xl font-bold flex items-center justify-center text-sm"
                  >
                    刊登房源
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setIsOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 text-[#9A7D6B] py-3 text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </button>
              </>
            ) : (
              <button
                onClick={() => { login(); setIsOpen(false); }}
                className="w-full bg-[#F5A623] text-[#3D2B1F] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                <User className="w-4 h-4" />
                登入 / 註冊
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
