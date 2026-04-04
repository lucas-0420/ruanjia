import React from 'react';
import Hero from '../components/Hero';
import PropertyGrid from '../components/PropertyGrid';
import { ArrowRight, Sparkles, ShieldCheck, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../context/SupabaseContext';

export default function Home() {
  const { properties, loading } = useFirebase();

  return (
    <main className="bg-white">
      <Hero />

      {/* Features Section */}
      <section className="py-12 sm:py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-3 sm:mb-4">
              為什麼選擇租家？
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              我們結合現代科技與人性化設計，重新定義您的租屋體驗。
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-8">
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-green-600" />}
              title="屋主直租"
              description="直接聯繫屋主，省下高達一個月租金的仲介服務費。"
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-orange-600" />}
              title="AI 智慧媒合"
              description="AI 助手分析您的生活習慣，為您推薦最理想的鄰里與房源。"
            />
            <FeatureCard
              icon={<Map className="w-6 h-6 text-blue-600" />}
              title="地圖找房"
              description="直觀的地圖介面，輕鬆掌握捷運、學區與工作地點的距離。"
            />
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-6 sm:mb-12">
            <div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-2 sm:mb-4">
                精選房源
              </h2>
              <p className="text-gray-600">
                為您挑選位於熱門地段的高品質物件。
              </p>
            </div>
            <Link
              to="/listings"
              className="hidden md:flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all"
            >
              查看全部
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <PropertyGrid properties={properties.slice(0, 3)} />
          )}

          <div className="mt-12 text-center md:hidden">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold"
            >
              查看所有房源
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-900 rounded-3xl sm:rounded-[40px] p-6 sm:p-8 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-600/10 rounded-bl-full -z-0" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                準備好找到 <br />
                理想的家了嗎？
              </h2>
              <p className="text-gray-400 text-sm sm:text-lg mb-6 sm:mb-10 leading-relaxed">
                加入上萬名快樂租客的行列。立即開始搜尋，體驗地產科技帶來的便利。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/listings"
                  className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-center hover:bg-orange-700 transition-colors"
                >
                  立即開始搜尋
                </Link>
                <Link
                  to="/post"
                  className="bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-center hover:bg-white/20 transition-colors backdrop-blur-sm"
                >
                  刊登您的房源
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-500">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
        {icon}
      </div>
      <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-2 sm:mb-4">{title}</h3>
      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
