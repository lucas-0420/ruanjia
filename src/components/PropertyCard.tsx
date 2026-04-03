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
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {property.status === 'archived' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
              已下架
            </span>
          )}
          {property.isZeroFee && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
              <ShieldCheck className="w-3 h-3" />
              屋主直租
            </span>
          )}
          <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-gray-900 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
            {property.type === 'apartment' ? '公寓' : property.type === 'house' ? '住宅' : property.type === 'studio' ? '套房' : '雅房'}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite?.(property.id);
          }}
          className={cn(
            "absolute top-4 right-4 p-2.5 rounded-full transition-all duration-300 shadow-lg",
            isFavorite ? "bg-orange-600 text-white" : "bg-white/90 backdrop-blur-sm text-gray-400 hover:text-orange-600"
          )}
        >
          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
        </button>

        {/* Price Tag */}
        <div className="absolute bottom-4 left-4 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-xl">
          NT$ {property.price.toLocaleString()}
          <span className="text-xs font-normal text-gray-400 ml-1">/月</span>
        </div>
      </div>

      {/* Content */}
      <Link to={`/property/${property.id}`} className="p-6 block">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium mb-2">
          <MapPin className="w-3.5 h-3.5" />
          {property.location.city} {property.location.district}
          <div className="ml-auto flex items-center gap-1.5">
            {distance !== undefined && (
              <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
            {property.features.floor && (
              <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                {property.features.floor}{property.features.totalFloors ? `/${property.features.totalFloors}` : ''}F
              </span>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-1 group-hover:text-orange-600 transition-colors">
          {property.title}
        </h3>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">格局</span>
            <div className="flex items-center gap-1.5 text-gray-900 font-bold text-sm">
              <Bed className="w-4 h-4 text-orange-600" />
              {property.features.bedrooms} 房
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">衛浴</span>
            <div className="flex items-center gap-1.5 text-gray-900 font-bold text-sm">
              <Bath className="w-4 h-4 text-orange-600" />
              {property.features.bathrooms} 衛
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">坪數</span>
            <div className="flex items-center gap-1.5 text-gray-900 font-bold text-sm">
              <Maximize className="w-4 h-4 text-orange-600" />
              {property.features.area} 坪
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
