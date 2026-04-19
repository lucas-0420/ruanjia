import React from 'react';
import { GOOGLE_MAPS_API_KEY } from '../env';
import FilterBar, { DEFAULT_FILTERS, Filters } from '../components/FilterBar';
import PropertyGrid from '../components/PropertyGrid';
import MapComponent from '../components/MapComponent';
import { Map as MapIcon, LayoutGrid, List, MapPin, Search, X, BedDouble, Bath, Maximize2, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

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

/** 列表卡片的圖片滑動元件 */
function ListImageSlider({ images, title }: { images: string[]; title: string }) {
  const [cur, setCur] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-full" onClick={e => e.stopPropagation()}>
      <div
        ref={ref}
        onScroll={() => {
          if (!ref.current) return;
          setCur(Math.round(ref.current.scrollLeft / ref.current.offsetWidth));
        }}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full"
      >
        {images.map((img, i) => (
          <div key={i} className="snap-start shrink-0 w-full h-full">
            <img src={img} alt={`${title} ${i + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              draggable={false}
              onError={e => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (() => {
        const total = images.length;
        let start = cur - 2, end = cur + 2;
        if (start < 0) { end -= start; start = 0; }
        if (end >= total) { start -= (end - total + 1); end = total - 1; }
        start = Math.max(0, start);
        const dots = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        return (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 pointer-events-none">
            {dots.map(idx => {
              const dist = Math.abs(idx - cur);
              const cls = dist === 0 ? 'w-2.5 h-2.5 bg-white shadow-sm' : dist === 1 ? 'w-1.5 h-1.5 bg-white/60' : 'w-1 h-1 bg-white/30';
              return <div key={idx} className={`rounded-full transition-all duration-300 ${cls}`} />;
            })}
          </div>
        );
      })()}
    </div>
  );
}

export default function Listings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialFilters: Partial<Filters> = {
    city: searchParams.get('city') || '台中市',
  };
  const [, setSearchParamsState] = useSearchParams();
  const initialView = (searchParams.get('view') as 'grid' | 'list' | 'map') || 'list';
  const [viewMode, setViewModeState] = React.useState<'grid' | 'list' | 'map'>(initialView);
  const setViewMode = (mode: 'grid' | 'list' | 'map') => {
    setViewModeState(mode);
    setSearchParamsState(prev => { const p = new URLSearchParams(prev); p.set('view', mode); return p; }, { replace: true });
  };
  const [searchQuery, setSearchQuery] = React.useState(initialQ);
  const [filters, setFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [mapBounds, setMapBounds] = React.useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = React.useState('');
  const [mapCenter, setMapCenter] = React.useState<{ lat: number; lng: number } | null>(null);

  const handleMapSearch = React.useCallback(async (q: string) => {
    if (!q.trim()) return;
    const apiKey = GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q.trim() + ' 台灣')}&key=${apiKey}`);
      const json = await res.json();
      const loc = json.results?.[0]?.geometry?.location;
      if (loc) setMapCenter({ lat: loc.lat, lng: loc.lng });
    } catch (_) {}
  }, []);
  const handleBoundsChange = React.useCallback((b: { north: number; south: number; east: number; west: number }) => {
    setMapBounds(b);
  }, []);
  const [distanceCenter, setDistanceCenter] = React.useState<{ lat: number; lng: number } | null>(null);
  const { properties, loading } = useFirebase();

  // Geocode 距離篩選地址
  React.useEffect(() => {
    const addr = filters.distanceAddress.trim();
    if (!addr) { setDistanceCenter(null); return; }
    const apiKey = GOOGLE_MAPS_API_KEY;
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
      const isDefaultCoord = Math.abs(p.location.lat - 25.033) < 0.001 && Math.abs(p.location.lng - 121.5654) < 0.001;
      if (isDefaultCoord) return false; // 無真實座標的物件不納入距離篩選
      const km = haversineKm(distanceCenter.lat, distanceCenter.lng, p.location.lat, p.location.lng);
      if (km > Number(filters.maxDistance)) return false;
    }

    return true;
  });

  // 計算每個物件到距離篩選點的距離（跳過預設座標的物件）
  const distanceMap = React.useMemo(() => {
    if (!distanceCenter) return new Map<string, number>();
    const map = new Map<string, number>();
    filteredProperties.forEach(p => {
      const isDefaultCoord = Math.abs(p.location.lat - 25.033) < 0.001 && Math.abs(p.location.lng - 121.5654) < 0.001;
      if (!isDefaultCoord) {
        map.set(p.id, haversineKm(distanceCenter.lat, distanceCenter.lng, p.location.lat, p.location.lng));
      }
    });
    return map;
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
      <FilterBar
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
        initialSearch={initialQ}
        initialFilters={{ ...DEFAULT_FILTERS, ...initialFilters }}
        isMapMode={viewMode === 'map'}
        onMapSearch={handleMapSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-0.5 sm:mb-2">
              所有房源
            </h1>
            <p className="text-gray-500 text-sm sm:text-base font-medium">
              共 {filteredProperties.length} 間可選擇
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'grid' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">格狀</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">列表</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'map' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">地圖</span>
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <PropertyGrid properties={filteredProperties} distanceMap={distanceMap} />
        ) : viewMode === 'list' ? (
          <div className="sm:flex sm:gap-5">
            {/* 左側列表 */}
            <div className="flex flex-col gap-3 sm:flex-1 sm:min-w-0">
            {filteredProperties.map(p => {
              const roadName = p.location.address.match(/[\u4e00-\u9fff]+[路街道巷弄]/)?.[0] || '';
              const dist = distanceMap?.get(p.id);
              const typeLabel = p.type === 'apartment' ? '公寓' : p.type === 'house' ? '住宅' : p.type === 'studio' ? '套房' : '雅房';
              return (
                <div key={p.id}
                  className="group flex flex-row h-[150px] sm:h-auto bg-white rounded-2xl border border-[#E5D5C5] overflow-hidden hover:shadow-xl hover:shadow-[#F5A623]/10 hover:border-[#F5A623]/30 transition-all duration-300 cursor-pointer"
                >
                  {/* 圖片區 */}
                  <div className="relative shrink-0 w-[110px] sm:w-52 md:w-60 overflow-hidden">
                    {/* 手機：左右滑動＋點點指示器 */}
                    <div className="sm:hidden h-full">
                      <ListImageSlider images={p.images} title={p.title} />
                    </div>
                    {/* 電腦：單張靜態圖 */}
                    <img src={p.images[0]} alt={p.title}
                      className="hidden sm:block w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    {/* badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                      {p.isZeroFee && (
                        <span className="text-[9px] sm:text-[10px] font-bold bg-[#F5A623] text-[#3D2B1F] px-2 py-0.5 rounded-full shadow-sm">屋主直租</span>
                      )}
                      {p.status === 'archived' && (
                        <span className="text-[9px] sm:text-[10px] font-bold bg-[#3D2B1F]/80 text-white px-2 py-0.5 rounded-full">已下架</span>
                      )}
                      <span className="text-[9px] sm:text-[10px] font-bold bg-white/85 backdrop-blur-sm text-[#3D2B1F] px-2 py-0.5 rounded-full">{typeLabel}</span>
                    </div>
                  </div>

                  {/* 資訊區：點擊導航 */}
                  <div className="flex-1 min-w-0 px-3 py-3 sm:px-5 sm:py-4 flex flex-col justify-between gap-2"
                    onClick={() => navigate(`/property/${p.id}`)}
                  >

                    {/* 第一行：標題（左）+ 價格（右） */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[#3D2B1F] line-clamp-1 group-hover:text-[#F5A623] transition-colors flex-1 min-w-0">
                        {p.title}
                      </h3>
                      <div className="text-right shrink-0">
                        <p className="text-base sm:text-xl font-black text-[#F5A623] leading-none whitespace-nowrap">
                          NT$ {p.price.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-[#B8A090] mt-0.5">/月</p>
                      </div>
                    </div>

                    {/* 地址 */}
                    <div className="flex items-center gap-1 text-[#9A7D6B] text-[10px] sm:text-xs">
                      <MapPin className="w-3 h-3 text-[#F5A623] shrink-0" />
                      <span className="line-clamp-1">{p.location.city} {p.location.district}{roadName ? ` · ${roadName}` : ''}</span>
                      {dist !== undefined && (
                        <span className="shrink-0 text-[#8B5E3C] bg-[#FFE8CC] px-1.5 py-0.5 rounded-full font-bold text-[9px]">
                          {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                        </span>
                      )}
                    </div>

                    {/* 標籤 */}
                    {((p.tags && p.tags.length > 0) || p.amenities.length > 0) && (
                      <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden">
                        {(p.tags && p.tags.length > 0 ? p.tags : p.amenities).slice(0, 4).map(tag => (
                          <span key={tag} className="text-[9px] sm:text-[10px] font-bold text-[#7A5C48] bg-[#FBF7F3] border border-[#E5D5C5] px-2 py-0.5 rounded-full whitespace-nowrap">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 規格格狀（全寬） */}
                    <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                      {[
                        { icon: BedDouble, label: '格局', value: `${p.features.bedrooms} 房` },
                        { icon: Bath,      label: '衛浴', value: `${p.features.bathrooms} 衛` },
                        { icon: Maximize2, label: '坪數', value: `${p.features.area} 坪` },
                        { icon: Layers,    label: '樓層', value: p.features.floor ? `${p.features.floor}F` : '—' },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center bg-[#FBF7F3] rounded-lg sm:rounded-xl border border-[#F2E9DF] py-1 sm:py-2 gap-px sm:gap-0.5">
                          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F5A623]" />
                          <p className="hidden sm:block text-[9px] text-[#B8A090] font-bold leading-none">{label}</p>
                          <p className="text-[9px] sm:text-[11px] font-bold text-[#3D2B1F] leading-none">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            {/* 右側：預留圖卡區（電腦才顯示） */}
            <div className="hidden sm:block w-[320px] shrink-0">
              <div className="sticky top-24 rounded-2xl border border-dashed border-[#E5D5C5] bg-[#FBF7F3] h-[400px] flex items-center justify-center">
                <p className="text-[#C4A882] text-sm font-bold">圖卡區域</p>
              </div>
            </div>
          </div>
        ) : (
          /* 桌面：左右分割 / 手機：地圖全螢幕 + 底部上拉列表 */
          <div className="relative md:flex md:flex-row md:gap-4 h-[calc(100vh-280px)] md:h-[calc(100vh-180px)]">

            {/* 地圖：手機全螢幕，桌面右側 */}
            <div className="absolute inset-0 md:relative md:flex-1 md:order-2">
              <MapComponent
                properties={filteredProperties}
                showSearch={false}
                showMapTypeControl={true}
                enableClustering={true}
                onBoundsChange={handleBoundsChange}
                filterCity={filters.city !== 'all' ? filters.city : undefined}
                filterDistricts={filters.district.length > 0 ? filters.district : undefined}
                externalCenter={mapCenter}
                onPropertyClick={(property) => {
                  window.open(`/property/${property.id}`, '_blank');
                }}
              />
            </div>

            {/* 手機：底部上拉抽屜 */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 z-10
                            bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)]
                            max-h-[45vh] flex flex-col">
              {/* 把手 */}
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="w-8 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="px-4 pb-1 shrink-0">
                <p className="text-xs font-bold text-gray-400">此範圍 {
                  (mapBounds ? filteredProperties.filter(p =>
                    p.location.lat <= mapBounds.north && p.location.lat >= mapBounds.south &&
                    p.location.lng <= mapBounds.east && p.location.lng >= mapBounds.west
                  ) : filteredProperties).length
                } 間</p>
              </div>
              {/* 橫滑列表 */}
              <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-1 no-scrollbar">
                {(() => {
                  const inBounds = mapBounds
                    ? filteredProperties.filter(p =>
                        p.location.lat <= mapBounds.north && p.location.lat >= mapBounds.south &&
                        p.location.lng <= mapBounds.east && p.location.lng >= mapBounds.west
                      )
                    : filteredProperties;
                  return inBounds.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 w-full text-center">此範圍內無物件</p>
                  ) : inBounds.map(p => (
                    <a key={p.id} href={`/property/${p.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm shrink-0 w-72 active:scale-[0.98] transition-transform"
                    >
                      <img src={p.images[0]} alt={p.title} className="w-16 h-16 object-cover rounded-xl shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{p.location.district} · {p.features.area}坪</p>
                        <p className="text-sm font-bold text-[#F5A623] mt-1">{p.price.toLocaleString()} 元/月</p>
                      </div>
                    </a>
                  ));
                })()}
              </div>
            </div>

            {/* 桌面：左側垂直列表 */}
            <div className="hidden md:flex md:flex-col md:order-1 md:w-80 md:shrink-0 md:overflow-y-auto gap-3 pr-1">
              {(() => {
                const inBounds = mapBounds
                  ? filteredProperties.filter(p =>
                      p.location.lat <= mapBounds.north && p.location.lat >= mapBounds.south &&
                      p.location.lng <= mapBounds.east && p.location.lng >= mapBounds.west
                    )
                  : filteredProperties;
                return inBounds.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center pt-8">此範圍內無物件</p>
                ) : inBounds.map(p => (
                  <a key={p.id} href={`/property/${p.id}`} target="_blank" rel="noopener noreferrer"
                    className="flex gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                  >
                    <img src={p.images[0]} alt={p.title} className="w-20 h-20 object-cover rounded-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{p.location.district} · {p.features.area}坪</p>
                      <p className="text-sm font-bold text-orange-600 mt-1">{p.price.toLocaleString()} 元/月</p>
                    </div>
                  </a>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
