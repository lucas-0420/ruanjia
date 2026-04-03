import React from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();
  const [query, setQuery]         = React.useState('');
  const [city, setCity]           = React.useState('台中市');
  const [type, setType]           = React.useState('all');
  const [priceRange, setPriceRange] = React.useState('all');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city !== 'all')       params.set('city', city);
    if (type !== 'all')       params.set('type', type);
    if (priceRange !== 'all') params.set('priceRange', priceRange);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-orange-50/50 rounded-bl-[200px]" />
      <div className="absolute top-40 left-10 -z-10 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-orange-600 uppercase bg-orange-50 rounded-full">
              AI 驅動的租屋平台
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
              用 AI 找到 <br />
              <span className="text-orange-600">理想的家</span>
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-xl leading-relaxed">
              租家讓你直接聯繫屋主。無負擔、更輕鬆。
              我們的 AI 助手能根據你的生活圈，為你推薦最合適的房源。
            </p>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 max-w-2xl">
              <div className="flex-1 flex items-center">
                {/* City Dropdown */}
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="pl-4 pr-2 py-3 text-sm font-semibold text-gray-700 bg-transparent outline-none cursor-pointer border-r border-gray-200 shrink-0"
                >
                  <option value="all">全台</option>
                  <option value="台北市">台北市</option>
                  <option value="新北市">新北市</option>
                  <option value="桃園市">桃園市</option>
                  <option value="新竹市">新竹市</option>
                  <option value="新竹縣">新竹縣</option>
                  <option value="台中市">台中市</option>
                </select>
                {/* Keyword Input */}
                <input
                  type="text"
                  placeholder="輸入地址、社區名稱或關鍵字..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
              <button
                onClick={handleSearch}
                className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors shrink-0"
              >
                <Search className="w-4 h-4" />
                搜尋
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://picsum.photos/seed/user${i}/100/100`}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    alt="User"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <p>已有 10,000+ 用戶在此找到理想租屋</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://picsum.photos/seed/modern-house/1200/1600"
                alt="Modern House"
                className="w-full aspect-[3/4] object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            
            {/* Floating Card */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">$</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">屋主直租</p>
                  <p className="text-sm font-bold text-gray-900">無仲介費</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                直接聯繫房東，省下高額仲介服務費。
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
