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
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence as MotionAnimatePresence } from 'motion/react';

export default function App() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SupabaseProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-white font-sans selection:bg-orange-100 selection:text-orange-900">
          <Navbar />
          <ConfigStatusBanner />
          
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/manage" element={<AdminUsers />} />
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/sync" element={<AdminSync />} />
              <Route path="/admin/edit/:id" element={<PostProperty />} />
              <Route path="/post" element={<PostProperty />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </AnimatePresence>

          {/* Global AI Assistant (only on pages that don't have a specific one) */}
          <Routes>
            <Route path="/" element={<AIAssistant />} />
            <Route path="/listings" element={<AIAssistant />} />
            <Route path="/favorites" element={<AIAssistant />} />
          </Routes>

          {/* Footer */}
          <footer className="bg-gray-50 border-t border-gray-100 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">Z</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-gray-900">租家</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    台灣現代化租屋的首選平台。
                    屋主直租，並提供 AI 智慧房源見解。
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">平台功能</h4>
                  <ul className="space-y-4 text-sm text-gray-500">
                    <li><Link to="/listings" className="hover:text-orange-600">瀏覽房源</Link></li>
                    <li><Link to="/post" className="hover:text-orange-600">刊登房源</Link></li>
                    <li><button className="hover:text-orange-600">地圖找房</button></li>
                    <li><button className="hover:text-orange-600">AI 助手</button></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">客戶支援</h4>
                  <ul className="space-y-4 text-sm text-gray-500">
                    <li><button className="hover:text-orange-600">幫助中心</button></li>
                    <li><button className="hover:text-orange-600">安全指南</button></li>
                    <li><button className="hover:text-orange-600">聯繫我們</button></li>
                    <li><button className="hover:text-orange-600">隱私權政策</button></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6">社群媒體</h4>
                  <ul className="space-y-4 text-sm text-gray-500">
                    <li><button className="hover:text-orange-600">Instagram</button></li>
                    <li><button className="hover:text-orange-600">Facebook</button></li>
                    <li><button className="hover:text-orange-600">Twitter</button></li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-gray-400">
                  © 2024 租家 AI 地產。保留所有權利。
                </p>
                <div className="flex items-center gap-6 text-xs text-gray-400">
                  <button className="hover:text-gray-900">服務條款</button>
                  <button className="hover:text-gray-900">隱私政策</button>
                  <button className="hover:text-gray-900">Cookie 設定</button>
                </div>
              </div>
            </div>
          </footer>

          {/* Back to Top Button */}
          <MotionAnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-white shadow-2xl rounded-full flex items-center justify-center text-gray-900 hover:bg-orange-600 hover:text-white transition-all border border-gray-100"
              >
                <ChevronUp className="w-6 h-6" />
              </motion.button>
            )}
          </MotionAnimatePresence>
        </div>
      </Router>
    </SupabaseProvider>
  );
}
