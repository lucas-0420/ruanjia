import React from 'react';
import { Search, MapPin, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();
  const [query, setQuery]       = React.useState('');
  const [city, setCity]         = React.useState('台中市');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city !== 'all') params.set('city', city);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-20 overflow-hidden bg-[#FFF8F0]">
      {/* 背景裝飾 */}
      <div className="absolute top-0 right-0 -z-10 w-2/3 h-full bg-gradient-to-bl from-[#FFE8CC]/60 to-transparent rounded-bl-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 w-48 h-48 bg-[#FFD4A3]/30 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">

          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 品牌標語 */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 bg-[#FFE8CC] rounded-full">
              <Home className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-xs sm:text-sm font-semibold text-[#8B5E3C] tracking-wide">找到屬於你的溫暖角落</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#3D2B1F] leading-[1.15] mb-4 sm:mb-6">
              讓找房<br />
              <span className="text-[#F5A623]">像回家一樣</span><br />
              自在
            </h1>

            <p className="text-[#7A5C48] text-base sm:text-lg leading-relaxed mb-7 sm:mb-10 max-w-md">
              暖家直接連結房東與租客，省去仲介費用。
              用溫度找到真正適合你的家。
            </p>

            {/* 搜尋框 */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg shadow-[#F5A623]/10 border border-[#E5D5C5] p-2 max-w-xl">
              <div className="flex items-center gap-2">
                {/* 城市選擇 */}
                <div className="flex items-center gap-1 pl-2 shrink-0">
                  <MapPin className="w-4 h-4 text-[#F5A623]" />
                  <select
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="text-sm font-semibold text-[#3D2B1F] bg-transparent outline-none cursor-pointer pr-1"
                  >
                    <option value="all">全台</option>
                    <option value="台北市">台北市</option>
                    <option value="新北市">新北市</option>
                    <option value="桃園市">桃園市</option>
                    <option value="新竹市">新竹市</option>
                    <option value="新竹縣">新竹縣</option>
                    <option value="台中市">台中市</option>
                  </select>
                </div>
                <div className="w-px h-5 bg-[#E5D5C5]" />
                {/* 關鍵字 */}
                <input
                  type="text"
                  placeholder="輸入地址、社區或關鍵字..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2.5 text-sm text-[#3D2B1F] placeholder-[#B8A090] bg-transparent outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="bg-[#F5A623] hover:bg-[#FFB830] text-[#3D2B1F] px-5 py-2.5 rounded-xl sm:rounded-2xl font-bold text-sm flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">搜尋</span>
                </button>
              </div>
            </div>

            {/* 社會證明 */}
            <div className="mt-6 flex items-center gap-4 text-xs sm:text-sm text-[#9A7D6B]">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <img
                    key={i}
                    src={`https://picsum.photos/seed/user${i}/100/100`}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-[#FFF8F0]"
                    alt="User"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <p>已有 <strong className="text-[#3D2B1F]">10,000+</strong> 人在暖家找到溫暖的家</p>
            </div>
          </motion.div>

          {/* Right — 圖片（桌面才顯示） */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#F5A623]/15">
              <img
                src="https://picsum.photos/seed/warm-home/900/1100"
                alt="溫馨的家"
                className="w-full aspect-[3/4] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3D2B1F]/30 to-transparent" />
            </div>

            {/* 浮動資訊卡 */}
            <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl border border-[#E5D5C5] p-5 max-w-[220px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-[#FFE8CC] rounded-xl flex items-center justify-center">
                  <span className="text-[#F5A623] font-bold text-base">零</span>
                </div>
                <div>
                  <p className="text-[9px] text-[#9A7D6B] font-bold uppercase tracking-wider">屋主直租</p>
                  <p className="text-sm font-bold text-[#3D2B1F]">無仲介費</p>
                </div>
              </div>
              <p className="text-xs text-[#7A5C48] leading-relaxed">
                直接聯繫房東，省下高額服務費。
              </p>
            </div>

            {/* 另一個浮動標籤 */}
            <div className="absolute top-6 -right-4 bg-[#F5A623] text-[#3D2B1F] rounded-2xl shadow-lg px-4 py-3">
              <p className="text-xs font-bold">🏡 溫馨房源</p>
              <p className="text-lg font-black">500+</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
