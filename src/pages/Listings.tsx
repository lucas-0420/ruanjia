import React from 'react';
import FilterBar, { DEFAULT_FILTERS, Filters } from '../components/FilterBar';
import PropertyGrid from '../components/PropertyGrid';
import MapComponent from '../components/MapComponent';
import { Map as MapIcon, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';
import { useSearchParams } from 'react-router-dom';

function priceInRange(price: number, ranges: string[], customMin: string, customMax: string): boolean {
  // Custom range check
  const min = customMin ? Number(customMin) : null;
  const max = customMax ? Number(customMax) : null;
  if (min !== null || max !== null) {
    const aboveMin = min === null || price >= min;
    const belowMax = max === null || price <= max;
    if (aboveMin && belowMax) return true;
  }
  // Preset ranges
  if (ranges.length === 0 && !customMin && !customMax) return true;
  return ranges.some(r => {
    if (r === '30000+') return price >= 30000;
    const [lo, hi] = r.split('-').map(Number);
    return price >= lo && price <= hi;
  });
}

function areaInRanges(area: number, ranges: string[]): boolean {
  if (ranges.length === 0) return true;
  return ranges.some(r => {
    if (r === '50+') return area >= 50;
    const [lo, hi] = r.split('-').map(Number);
    return area >= lo && area <= hi;
  });
}

function floorInRanges(floor: number, ranges: string[]): boolean {
  if (ranges.length === 0) return true;
  return ranges.some(r => {
    if (r === '12+') return floor >= 12;
    if (r === '1') return floor === 1;
    const [lo, hi] = r.split('-').map(Number);
    return floor >= lo && floor <= hi;
  });
}

function bathroomsMatch(baths: number, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some(r => r === '4+' ? baths >= 4 : baths === Number(r));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Listings() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialFilters: Partial<Filters> = {
    city: searchParams.get('city') || '台中市',
  };
  const [viewMode, setViewMode] = React.useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = React.useState(initialQ);
  const [filters, setFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [distanceCenter, setDistanceCenter] = React.useState<{ lat: number; lng: number } | null>(null);
  const { properties, loading } = useFirebase();

  // Geocode 距離篩選地址
  React.useEffect(() => {
    const addr = filters.distanceAddress.trim();
    if (!addr) { setDistanceCenter(null); return; }
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr + ' 台灣')}&key=${apiKey}`);
        const json = await res.json();
        const loc = json.results?.[0]?.geometry?.location;
        if (loc) setDistanceCenter({ lat: loc.lat, lng: loc.lng });
      } catch (_) {}
    }, 600);
    return () => clearTimeout(timer);
  }, [filters.distanceAddress]);

  const filteredProperties = properties.filter(p => {
    const q = searchQuery.toLowerCase();
    if (q && !(
      p.title.toLowerCase().includes(q) ||
      p.location.city.toLowerCase().includes(q) ||
      p.location.district.toLowerCase().includes(q) ||
      p.location.address.toLowerCase().includes(q)
    )) return false;

    if (filters.city !== 'all' && p.location.city !== filters.city) return false;
    if (filters.district.length > 0 && !filters.district.includes(p.location.district)) return false;
    if (!priceInRange(p.price, filters.priceRange, filters.customPriceMin, filters.customPriceMax)) return false;
    if (filters.type.length > 0 && !filters.type.includes(p.type)) return false;
    if (filters.rooms.length > 0) {
      const beds = p.features.bedrooms;
      const match = filters.rooms.some(r => r === '4+' ? beds >= 4 : beds === Number(r));
      if (!match) return false;
    }
    if (!areaInRanges(p.features.area, filters.area)) return false;
    if (!floorInRanges(p.features.floor, filters.floor)) return false;
    if (!bathroomsMatch(p.features.bathrooms, filters.bathrooms)) return false;
    if (filters.equipment.length > 0) {
      const amenities: string[] = p.amenities ?? [];
      if (!filters.equipment.every(e => amenities.includes(e))) return false;
    }

    if (distanceCenter && filters.maxDistance) {
      const km = haversineKm(distanceCenter.lat, distanceCenter.lng, p.location.lat, p.location.lng);
      if (km > Number(filters.maxDistance)) return false;
    }

    return true;
  });

  // 計算每個物件到距離篩選點的距離
  const distanceMap = React.useMemo(() => {
    if (!distanceCenter) return new Map<string, number>();
    return new Map(filteredProperties.map(p => [
      p.id,
      haversineKm(distanceCenter.lat, distanceCenter.lng, p.location.lat, p.location.lng)
    ]));
  }, [distanceCenter, filteredProperties]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <FilterBar onSearch={setSearchQuery} onFilterChange={setFilters} initialSearch={initialQ} initialFilters={{ ...DEFAULT_FILTERS, ...initialFilters }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              所有房源
            </h1>
            <p className="text-gray-500 font-medium">
              目前共有 {filteredProperties.length} 間房源可供選擇
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl self-start">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'grid' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              列表
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                viewMode === 'map' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MapIcon className="w-4 h-4" />
              地圖
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <PropertyGrid properties={filteredProperties} distanceMap={distanceMap} />
        ) : (
          <div className="h-[700px] w-full">
            <MapComponent 
              properties={filteredProperties} 
              onPropertyClick={(property) => {
                console.log('Clicked property:', property.title);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
