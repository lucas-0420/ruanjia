import React from 'react';
import { Bed, Bath, Maximize, MapPin, Heart, ShieldCheck } from 'lucide-react';
import { Property } from '../types';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface PropertyCardProps {
  property: Property;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  distance?: number;
}

export default function PropertyCard({ property, isFavorite, onToggleFavorite, distance }: PropertyCardProps) {
  const [currentImg, setCurrentImg] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
    setCurrentImg(idx);
  };

  return (
    <Link to={`/property/${property.id}`} className="group bg-white rounded-3xl overflow-hidden border border-[#E5D5C5] hover:shadow-xl hover:shadow-[#F5A623]/10 transition-all duration-500 block">

      {/* 圖片區 */}
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden">
        {/* 手機：左右滑動 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="sm:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full h-full"
        >
          {property.images.map((img, i) => (
            <div key={i} className="snap-start shrink-0 w-full h-full">
              <img
                src={img}
                alt={`${property.title} ${i + 1}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                draggable={false}
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            </div>
          ))}
        </div>
        {/* 電腦：靜態單圖 */}
        <img
          src={property.images[0]}
          alt={property.title}
          className="hidden sm:block w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
          onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
        />
        {/* 點點指示器（手機，滑動窗口最多 5 點） */}
        {property.images.length > 1 && (() => {
          const total = property.images.length;
          const cur = currentImg;
          let start = cur - 2, end = cur + 2;
          if (start < 0) { end -= start; start = 0; }
          if (end >= total) { start -= (end - total + 1); end = total - 1; }
          start = Math.max(0, start);
          const dots = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          return (
            <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
              {dots.map(idx => {
                const dist = Math.abs(idx - cur);
                const cls = dist === 0 ? 'w-2.5 h-2.5 bg-white shadow-sm' : dist === 1 ? 'w-1.5 h-1.5 bg-white/60' : 'w-1 h-1 bg-white/30';
                return <div key={idx} className={`rounded-full transition-all duration-300 ${cls}`} />;
              })}
            </div>
          );
        })()}

        {/* 手機：只留收藏 + 下架標籤，移除其他 badge */}
        {property.status === 'archived' && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-[#3D2B1F]/80 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
            已下架
          </span>
        )}

        {/* 桌面：保留完整 badge */}
        <div className="hidden sm:flex absolute top-4 left-4 flex-col gap-1.5">
          {property.isZeroFee && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5A623] text-[#3D2B1F] text-[10px] font-bold tracking-wider rounded-full shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              屋主直租
            </span>
          )}
          <span className="px-3 py-1.5 bg-white/85 backdrop-blur-sm text-[#3D2B1F] text-[10px] font-bold tracking-wider rounded-full shadow-sm">
            {property.type === 'apartment' ? '公寓' : property.type === 'house' ? '住宅' : property.type === 'studio' ? '套房' : '雅房'}
          </span>
        </div>

        {/* 收藏按鈕 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite?.(property.id);
          }}
          className={cn(
            "absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-full transition-all duration-300 shadow-md",
            isFavorite
              ? "bg-[#F5A623] text-[#3D2B1F]"
              : "bg-white/85 backdrop-blur-sm text-[#B8A090] hover:text-[#F5A623]"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", isFavorite && "fill-current")} />
        </button>

        {/* 桌面：圖片上的價格標籤 */}
        <div className="hidden sm:block absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-[#3D2B1F] px-4 py-2 rounded-xl font-bold text-lg shadow-sm border border-[#E5D5C5]/50">
          NT$ {property.price.toLocaleString()}
          <span className="text-xs font-normal text-[#9A7D6B] ml-1">/月</span>
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-3 sm:p-5">
        {/* 標題 */}
        <h3 className="text-xs sm:text-base font-bold text-[#3D2B1F] mb-1.5 line-clamp-1 group-hover:text-[#F5A623] transition-colors">
          {property.title}
        </h3>

        {/* 手機：價格在這裡顯示 */}
        <p className="sm:hidden text-sm font-black text-[#F5A623] mb-1">
          NT$ {property.price.toLocaleString()}<span className="text-[10px] font-normal text-[#9A7D6B] ml-0.5">/月</span>
        </p>

        {/* 位置與樓層 */}
        <div className="flex items-center gap-1 text-[#9A7D6B] text-xs sm:text-sm font-medium mb-1.5">
          <MapPin className="w-3 h-3 text-[#F5A623] shrink-0" />
          <span className="truncate">
            {property.location.district}
            {(() => {
              const m = property.location.address.match(/[\u4e00-\u9fff]+[路街道巷弄]/);
              return m ? ` ${m[0]}` : '';
            })()}
          </span>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {distance !== undefined && (
              <span className="text-[9px] sm:text-[10px] bg-[#FFE8CC] text-[#8B5E3C] px-1.5 py-0.5 rounded-lg font-bold">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
            {property.features.floor && (
              <span className="text-[9px] sm:text-[10px] bg-[#F2E9DF] text-[#7A5C48] px-1.5 py-0.5 rounded-lg">
                {property.features.floor}F
              </span>
            )}
          </div>
        </div>

        {/* 房屋特徵 */}
        <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-2 border-t border-[#F2E9DF]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] sm:text-xs text-[#B8A090] font-bold">格局</span>
            <div className="flex items-center gap-0.5 text-[#3D2B1F] font-bold text-xs sm:text-sm">
              <Bed className="w-3 h-3 text-[#F5A623]" />
              {property.features.bedrooms}房
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] sm:text-xs text-[#B8A090] font-bold">衛浴</span>
            <div className="flex items-center gap-0.5 text-[#3D2B1F] font-bold text-xs sm:text-sm">
              <Bath className="w-3 h-3 text-[#F5A623]" />
              {property.features.bathrooms}衛
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] sm:text-xs text-[#B8A090] font-bold">坪數</span>
            <div className="flex items-center gap-0.5 text-[#3D2B1F] font-bold text-xs sm:text-sm">
              <Maximize className="w-3 h-3 text-[#F5A623]" />
              {property.features.area}坪
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
