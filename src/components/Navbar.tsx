import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, Search, User, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { user, login, logout } = useFirebase();

  const isAdmin = user?.email === "0420.lucas111@gmail.com";

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
    { label: '收藏清單', path: '/favorites', icon: Heart },
  ];

  if (isAdmin) {
    navItems.push({ label: '管理後台', path: '/admin', icon: LayoutDashboard });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link 
            to="/" 
            onClick={() => handleLinkClick('/')}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Home className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">租家</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleLinkClick(item.path)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-orange-600 flex items-center gap-2",
                  location.pathname === item.path ? "text-orange-600" : "text-gray-600"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/post" className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                  刊登房源
                </Link>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                  <Link to="/profile" className="flex items-center gap-2 group">
                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-orange-600 transition-colors" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-orange-600 transition-colors hidden lg:block">我的帳戶</span>
                  </Link>
                  <button onClick={logout} className="text-gray-400 hover:text-orange-600 transition-colors ml-2">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={login}
                className="flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium text-sm transition-colors"
              >
                <User className="w-4 h-4" />
                登入 / 註冊
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4 space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleLinkClick(item.path)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium",
                location.pathname === item.path ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          
          {user ? (
            <div className="space-y-4">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full bg-gray-50 text-gray-900 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                我的帳戶
              </Link>
              <Link
                to="/post"
                onClick={() => setIsOpen(false)}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center"
              >
                刊登房源
              </Link>
              <button 
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full flex items-center justify-center gap-2 text-gray-600 py-3 font-medium"
              >
                <LogOut className="w-5 h-5" />
                登出
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { login(); setIsOpen(false); }}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              登入 / 註冊
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
