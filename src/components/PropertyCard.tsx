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
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-[#E5D5C5] hover:shadow-xl hover:shadow-[#F5A623]/10 transition-all duration-500">

      {/* 圖片區 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />

        {/* 漸層遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#3D2B1F]/30 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5">
          {property.status === 'archived' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3D2B1F]/80 text-white text-[10px] font-bold tracking-wider rounded-full backdrop-blur-sm">
              已下架
            </span>
          )}
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

        {/* 收藏按鈕 — 44×44px 觸控目標 */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite?.(property.id);
          }}
          className={cn(
            "absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 shadow-md",
            isFavorite
              ? "bg-[#F5A623] text-[#3D2B1F]"
              : "bg-white/85 backdrop-blur-sm text-[#B8A090] hover:text-[#F5A623]"
          )}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>

        {/* 價格標籤 */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-white/90 backdrop-blur-sm text-[#3D2B1F] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold text-base sm:text-lg shadow-sm border border-[#E5D5C5]/50">
          NT$ {property.price.toLocaleString()}
          <span className="text-xs font-normal text-[#9A7D6B] ml-1">/月</span>
        </div>
      </div>

      {/* 內容區 */}
      <Link to={`/property/${property.id}`} className="p-4 sm:p-5 block">
        {/* 位置與樓層 */}
        <div className="flex items-center gap-1.5 text-[#9A7D6B] text-sm font-medium mb-2">
          <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F5A623]" />
          {property.location.city} {property.location.district}
          <div className="ml-auto flex items-center gap-1.5">
            {distance !== undefined && (
              <span className="text-[10px] bg-[#FFE8CC] text-[#8B5E3C] px-2 py-0.5 rounded-lg font-bold">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
            {property.features.floor && (
              <span className="text-[10px] bg-[#F2E9DF] text-[#7A5C48] px-2 py-0.5 rounded-lg">
                {property.features.floor}{property.features.totalFloors ? `/${property.features.totalFloors}` : ''}F
              </span>
            )}
          </div>
        </div>

        {/* 標題 */}
        <h3 className="text-base font-bold text-[#3D2B1F] mb-3 line-clamp-1 group-hover:text-[#F5A623] transition-colors">
          {property.title}
        </h3>

        {/* 房屋特徵 */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F2E9DF]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#B8A090] font-bold">格局</span>
            <div className="flex items-center gap-1 text-[#3D2B1F] font-bold text-sm">
              <Bed className="w-3.5 h-3.5 text-[#F5A623]" />
              {property.features.bedrooms} 房
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#B8A090] font-bold">衛浴</span>
            <div className="flex items-center gap-1 text-[#3D2B1F] font-bold text-sm">
              <Bath className="w-3.5 h-3.5 text-[#F5A623]" />
              {property.features.bathrooms} 衛
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#B8A090] font-bold">坪數</span>
            <div className="flex items-center gap-1 text-[#3D2B1F] font-bold text-sm">
              <Maximize className="w-3.5 h-3.5 text-[#F5A623]" />
              {property.features.area} 坪
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
