import React from 'react';
import PropertyGrid from '../components/PropertyGrid';
import { Heart, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../context/SupabaseContext';

export default function Favorites() {
  const { properties, favorites } = useFirebase();

  const favoriteProperties = properties.filter(p => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              收藏清單
            </h1>
            <p className="text-gray-500 font-medium">
              您已收藏了 {favoriteProperties.length} 間房源
            </p>
          </div>
        </div>

        {favoriteProperties.length > 0 ? (
          <PropertyGrid properties={favoriteProperties} />
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-orange-50 rounded-[40px] flex items-center justify-center mb-8">
              <Heart className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">目前沒有收藏</h2>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-10">
              瀏覽房源並點擊愛心圖示，將您感興趣的物件加入收藏。
              我們會為您保存在這裡，方便您隨時比較。
            </p>
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all group"
            >
              <Search className="w-5 h-5" />
              瀏覽房源
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
