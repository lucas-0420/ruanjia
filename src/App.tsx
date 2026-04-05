import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Listings from './pages/Listings';
import PropertyDetail from './pages/PropertyDetail';
import Favorites from './pages/Favorites';
import AdminDashboard from './pages/AdminDashboard';
import AdminSync from './pages/AdminSync';
import AdminUsers from './pages/AdminUsers';
import AgentDashboard from './pages/AgentDashboard';
import PostProperty from './pages/PostProperty';
import Profile from './pages/Profile';
import AIAssistant from './components/AIAssistant';
import ConfigStatusBanner from './components/ConfigStatusBanner';
import { AnimatePresence } from 'motion/react';
import { SupabaseProvider } from './context/SupabaseContext';
import { useState, useEffect } from 'react';
import { ChevronUp, Home as HomeIcon } from 'lucide-react';
import { motion, AnimatePresence as MotionAnimatePresence } from 'motion/react';

export default function App() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <SupabaseProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-[#FBF7F3] font-sans selection:bg-[#FFE8CC] selection:text-[#3D2B1F]">
          <Navbar />
          <ConfigStatusBanner />

          {/* 主要內容：手機版底部留白以避免被底部導覽列遮住 */}
          <div className="pb-20 md:pb-0">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/"              element={<Home />} />
                <Route path="/listings"      element={<Listings />} />
                <Route path="/property/:id"  element={<PropertyDetail />} />
                <Route path="/favorites"     element={<Favorites />} />
                <Route path="/manage"        element={<AdminUsers />} />
                <Route path="/agent"         element={<AgentDashboard />} />
                <Route path="/admin"         element={<AdminDashboard />} />
                <Route path="/admin/sync"    element={<AdminSync />} />
                <Route path="/admin/edit/:id" element={<PostProperty />} />
                <Route path="/post"          element={<PostProperty />} />
                <Route path="/profile"       element={<Profile />} />
              </Routes>
            </AnimatePresence>
          </div>

          {/* AI 助手（特定頁面） */}
          <Routes>
            <Route path="/"         element={<AIAssistant />} />
            <Route path="/listings" element={<AIAssistant />} />
            <Route path="/favorites" element={<AIAssistant />} />
          </Routes>

          {/* Footer */}
          <footer className="bg-[#FFF8F0] border-t border-[#E5D5C5] py-16 md:py-20 mb-16 md:mb-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">

                {/* 品牌 */}
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#FFB830] rounded-xl flex items-center justify-center">
                      <HomeIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xl font-bold text-[#3D2B1F]">暖家</span>
                  </div>
                  <p className="text-sm text-[#9A7D6B] leading-relaxed">
                    讓找房像回家一樣自在。<br />
                    屋主直租，溫暖不冰冷。
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#7A5C48] uppercase tracking-wider mb-4">平台功能</h4>
                  <ul className="space-y-3 text-sm text-[#9A7D6B]">
                    <li><Link to="/listings" className="hover:text-[#FFB830] transition-colors">瀏覽房源</Link></li>
                    <li><Link to="/post"     className="hover:text-[#FFB830] transition-colors">刊登房源</Link></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">地圖找房</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">AI 助手</button></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#7A5C48] uppercase tracking-wider mb-4">客戶支援</h4>
                  <ul className="space-y-3 text-sm text-[#9A7D6B]">
                    <li><button className="hover:text-[#FFB830] transition-colors">幫助中心</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">安全指南</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">聯繫我們</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">隱私政策</button></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#7A5C48] uppercase tracking-wider mb-4">社群媒體</h4>
                  <ul className="space-y-3 text-sm text-[#9A7D6B]">
                    <li><button className="hover:text-[#FFB830] transition-colors">Instagram</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">Facebook</button></li>
                    <li><button className="hover:text-[#FFB830] transition-colors">LINE</button></li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 border-t border-[#E5D5C5] flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-[#B8A090]">© 2024 暖家。保留所有權利。</p>
                <div className="flex items-center gap-6 text-xs text-[#B8A090]">
                  <button className="hover:text-[#7A5C48] transition-colors">服務條款</button>
                  <button className="hover:text-[#7A5C48] transition-colors">隱私政策</button>
                  <button className="hover:text-[#7A5C48] transition-colors">Cookie 設定</button>
                </div>
              </div>
            </div>
          </footer>

          {/* 回到頂部按鈕 — 手機版在底部導覽列上方 */}
          <MotionAnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={scrollToTop}
                className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 w-11 h-11 bg-white shadow-lg rounded-full flex items-center justify-center text-[#7A5C48] hover:bg-[#FFB830] hover:text-white transition-all border border-[#E5D5C5]"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
            )}
          </MotionAnimatePresence>
        </div>
      </Router>
    </SupabaseProvider>
  );
}
