import React from 'react';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Hero() {
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
              <div className="flex-1 flex items-center gap-3 px-4 py-3">
                <MapPin className="text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="你想住在哪裡？"
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400"
                />
              </div>
              <Link
                to="/listings"
                className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all group"
              >
                立即搜尋
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
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
