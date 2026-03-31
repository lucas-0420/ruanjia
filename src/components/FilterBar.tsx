import React from 'react';
import { SlidersHorizontal, Search, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
}

export default function FilterBar({ onSearch, onFilterChange }: FilterBarProps) {
  const [activeFilters, setActiveFilters] = React.useState({
    city: 'all',
    priceRange: 'all',
    type: 'all',
    rooms: 'all',
    area: 'all',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Quick Search */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋地區、街道或關鍵字..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-600/20 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto no-scrollbar">
            <select 
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">所有城市</option>
              <option value="台北市">台北市</option>
              <option value="新北市">新北市</option>
              <option value="桃園市">桃園市</option>
              <option value="新竹市">新竹市</option>
              <option value="新竹縣">新竹縣</option>
              <option value="台中市">台中市</option>
            </select>

            <select 
              onChange={(e) => handleFilterChange('district', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">所有行政區</option>
              {activeFilters.city === '台北市' && (
                <>
                  <option value="信義區">信義區</option>
                  <option value="大安區">大安區</option>
                  <option value="中山區">中山區</option>
                  <option value="內湖區">內湖區</option>
                </>
              )}
              {activeFilters.city === '新北市' && (
                <>
                  <option value="板橋區">板橋區</option>
                  <option value="中和區">中和區</option>
                  <option value="永和區">永和區</option>
                  <option value="三重區">三重區</option>
                </>
              )}
              {activeFilters.city === '新竹市' && (
                <>
                  <option value="東區">東區</option>
                  <option value="北區">北區</option>
                  <option value="香山區">香山區</option>
                </>
              )}
              {activeFilters.city === '新竹縣' && (
                <>
                  <option value="竹北市">竹北市</option>
                  <option value="竹東鎮">竹東鎮</option>
                  <option value="新豐鄉">新豐鄉</option>
                </>
              )}
              {activeFilters.city === '台中市' && (
                <>
                  <option value="西屯區">西屯區</option>
                  <option value="北屯區">北屯區</option>
                  <option value="南屯區">南屯區</option>
                  <option value="北區">北區</option>
                </>
              )}
            </select>

            <select 
              onChange={(e) => handleFilterChange('priceRange', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">租金範圍</option>
              <option value="0-10000">1萬以下</option>
              <option value="10000-20000">1萬 - 2萬</option>
              <option value="20000-30000">2萬 - 3萬</option>
              <option value="30000+">3萬以上</option>
            </select>

            <select 
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">房屋類型</option>
              <option value="apartment">公寓</option>
              <option value="house">住宅</option>
              <option value="studio">套房</option>
            </select>

            <select 
              onChange={(e) => handleFilterChange('rooms', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">格局</option>
              <option value="1">1 房</option>
              <option value="2">2 房</option>
              <option value="3">3 房</option>
              <option value="4+">4 房以上</option>
            </select>

            <select 
              onChange={(e) => handleFilterChange('area', e.target.value)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-all whitespace-nowrap outline-none"
            >
              <option value="all">坪數</option>
              <option value="0-10">10坪以下</option>
              <option value="10-20">10-20坪</option>
              <option value="20-30">20-30坪</option>
              <option value="30+">30坪以上</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
