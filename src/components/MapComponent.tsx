import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer, GridAlgorithm } from '@googlemaps/markerclusterer';
import { Property } from '../types';
import { Home, Navigation, Search, X } from 'lucide-react';

interface MapBounds {
  north: number; south: number; east: number; west: number;
}

interface MapComponentProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  showSearch?: boolean;
  showMapTypeControl?: boolean;
  enableClustering?: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
}

const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MapComponent({ properties, onPropertyClick, showSearch = true, showMapTypeControl = false, enableClustering = false, onBoundsChange }: MapComponentProps) {
  if (!API_KEY) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-[40px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
          <Home className="w-10 h-10 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">地圖功能需要 API 金鑰</h2>
        <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
          請在環境變數中設定 <code>VITE_GOOGLE_MAPS_API_KEY</code> 以啟用互動式地圖。
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-[40px] overflow-hidden shadow-2xl border border-gray-100 relative">
      <APIProvider apiKey={API_KEY} libraries={['places']}>
        <MapInner
          properties={properties}
          onPropertyClick={onPropertyClick}
          showSearch={showSearch}
          showMapTypeControl={showMapTypeControl}
          enableClustering={enableClustering}
          onBoundsChange={onBoundsChange}
        />
      </APIProvider>
    </div>
  );
}

function MapInner({ properties, onPropertyClick, showSearch = true, showMapTypeControl = false, enableClustering = false, onBoundsChange }: MapComponentProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const map = useMap();

  // refs for clustering (避免 React re-render 重建 markers)
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const individualMarkersRef = useRef<google.maps.Marker[]>([]);
  const districtMarkersRef = useRef<google.maps.Marker[]>([]);
  const isDistrictLayerRef = useRef<boolean>(true);

  // Auto-fit
  useEffect(() => {
    if (!map || properties.length === 0) return;
    if (properties.length === 1) {
      map.panTo({ lat: properties[0].location.lat, lng: properties[0].location.lng });
      map.setZoom(15);
    } else {
      const geocoded = properties.filter(
        p => !(Math.abs(p.location.lat - 25.033) < 0.001 && Math.abs(p.location.lng - 121.5654) < 0.001)
      );
      const list = geocoded.length > 0 ? geocoded : properties;
      const bounds = new google.maps.LatLngBounds();
      list.forEach(p => bounds.extend({ lat: p.location.lat, lng: p.location.lng }));
      map.fitBounds(bounds, 80);
    }
  }, [map, properties]);

  // bounds 回呼（dragend + zoom_changed），不觸發 marker 重建
  useEffect(() => {
    if (!map || !onBoundsChange) return;
    const update = () => {
      const b = map.getBounds();
      if (b) onBoundsChange({
        north: b.getNorthEast().lat(),
        south: b.getSouthWest().lat(),
        east: b.getNorthEast().lng(),
        west: b.getSouthWest().lng(),
      });
    };
    const l1 = map.addListener('dragend', update);
    const l2 = map.addListener('zoom_changed', update);
    return () => { google.maps.event.removeListener(l1); google.maps.event.removeListener(l2); };
  }, [map, onBoundsChange]);

  // 聚合模式：建立所有 markers 一次，透過 setMap 切換層，不重建
  useEffect(() => {
    if (!map || !enableClustering) return;

    // ── 行政區 markers ──
    const districtMap: Record<string, { count: number; lat: number; lng: number; lats: number[]; lngs: number[] }> = {};
    properties.forEach(p => {
      const d = p.location.district || '未知';
      if (!districtMap[d]) districtMap[d] = { count: 0, lat: 0, lng: 0, lats: [], lngs: [] };
      districtMap[d].count++;
      districtMap[d].lats.push(p.location.lat);
      districtMap[d].lngs.push(p.location.lng);
    });
    Object.values(districtMap).forEach(d => {
      d.lat = d.lats.reduce((a, b) => a + b, 0) / d.lats.length;
      d.lng = d.lngs.reduce((a, b) => a + b, 0) / d.lngs.length;
    });

    const dMarkers = Object.entries(districtMap).map(([name, { count, lat, lng }]) => {
      const w = Math.max(name.length * 13 + 30, 64);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="52">
        <circle cx="${w/2}" cy="26" r="24" fill="#FFB830" fill-opacity="0.95" stroke="white" stroke-width="2"/>
        <text x="${w/2}" y="21" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="white">${name}</text>
        <text x="${w/2}" y="36" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="white">${count}間</text>
      </svg>`;
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: isDistrictLayerRef.current ? map : null,
        icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(w, 52), anchor: new google.maps.Point(w/2, 26) },
        zIndex: 1000,
      });
      marker.addListener('click', () => { map.setZoom(14); map.panTo({ lat, lng }); });
      return marker;
    });
    districtMarkersRef.current = dMarkers;

    // ── 個別物件 markers（給 clusterer 用）──
    const iMarkers = properties.map(property => {
      const label = `$${(property.price / 10000).toFixed(1)}萬`;
      const marker = new google.maps.Marker({
        position: { lat: property.location.lat, lng: property.location.lng },
        title: property.title,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="68" height="30">
              <rect x="1" y="1" width="66" height="22" rx="11" fill="white" stroke="#E8650A" stroke-width="2"/>
              <text x="34" y="16" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="#1a1a1a">${label}</text>
              <polygon points="29,23 39,23 34,30" fill="#E8650A"/>
            </svg>`
          )}`,
          scaledSize: new google.maps.Size(68, 30),
          anchor: new google.maps.Point(34, 30),
        },
      });
      marker.addListener('click', () => { setSelectedProperty(property); onPropertyClick?.(property); });
      return marker;
    });
    individualMarkersRef.current = iMarkers;

    // ── MarkerClusterer（縮小時自動聚合）──
    const clusterer = new MarkerClusterer({
      map: isDistrictLayerRef.current ? null as any : map,
      markers: iMarkers,
      algorithm: new GridAlgorithm({ gridSize: 60 }),
      renderer: {
        render: ({ count, position }) => {
          const size = count > 100 ? 56 : count > 20 ? 48 : count > 5 ? 40 : 34;
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="#FFB830" fill-opacity="0.9" stroke="white" stroke-width="2"/>
            <text x="${size/2}" y="${size/2+4}" text-anchor="middle" font-size="12" font-weight="700" font-family="sans-serif" fill="white">${count}</text>
          </svg>`;
          return new google.maps.Marker({
            position,
            icon: { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new google.maps.Size(size, size), anchor: new google.maps.Point(size/2, size/2) },
            zIndex: 999,
          });
        },
      },
    });
    clustererRef.current = clusterer;

    // ── zoom 切層（用 setMap，不重建）──
    const zListener = map.addListener('zoom_changed', () => {
      const z = map.getZoom() ?? 7;
      const wantDistrict = z < 14;
      if (wantDistrict === isDistrictLayerRef.current) return;
      isDistrictLayerRef.current = wantDistrict;
      if (wantDistrict) {
        dMarkers.forEach(m => m.setMap(map));
        iMarkers.forEach(m => m.setMap(null));
        clusterer.setMap(null as any);
      } else {
        dMarkers.forEach(m => m.setMap(null));
        iMarkers.forEach(m => m.setMap(map));
        clusterer.setMap(map);
      }
    });

    return () => {
      google.maps.event.removeListener(zListener);
      clusterer.clearMarkers();
      dMarkers.forEach(m => m.setMap(null));
      iMarkers.forEach(m => m.setMap(null));
    };
  }, [map, enableClustering, properties]);

  const handleLocateMe = () => {
    if (!map) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(15); },
        () => alert('無法取得您的位置。請確保已開啟定位權限。')
      );
    } else {
      alert('您的瀏覽器不支援定位功能。');
    }
  };

  return (
    <>
      <Map
        defaultCenter={{ lat: 23.9, lng: 121.0 }}
        defaultZoom={7}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControlOptions={{ style: 0, position: 6 }}
      >
        {/* 非聚合模式（詳細頁）用 React 渲染單一 marker */}
        {!enableClustering && properties.map(property => (
          <PropertyMarker
            key={property.id}
            property={property}
            isSingle={properties.length === 1}
            onClick={() => { setSelectedProperty(property); onPropertyClick?.(property); }}
          />
        ))}

        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.location.lat, lng: selectedProperty.location.lng }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="p-2 max-w-[200px]">
              <img src={selectedProperty.images[0]} alt={selectedProperty.title} className="w-full h-24 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
              <h3 className="font-bold text-sm mb-1 truncate">{selectedProperty.title}</h3>
              <p className="text-orange-600 font-bold text-sm">NT${selectedProperty.price.toLocaleString()} / 月</p>
              <button onClick={() => window.location.href = `/property/${selectedProperty.id}`} className="mt-2 w-full py-1.5 bg-gray-900 text-white text-xs rounded-md font-bold">查看詳情</button>
            </div>
          </InfoWindow>
        )}
      </Map>

      {showSearch && (
        <div className="absolute top-6 left-6 right-6 md:right-auto md:w-96 z-10">
          <GeoSearch onSearch={(lat, lng) => { if (!map) return; map.panTo({ lat, lng }); map.setZoom(15); }} />
        </div>
      )}

      <button
        onClick={handleLocateMe}
        className="absolute bottom-24 right-4 w-9 h-9 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:text-orange-600 transition-colors z-10 border border-gray-100"
        title="定位我的位置"
      >
        <Navigation className="w-4 h-4" />
      </button>
    </>
  );
}

function GeoSearch({ onSearch }: { onSearch: (lat: number, lng: number) => void }) {
  const [value, setValue] = useState('');
  const [searching, setSearching] = useState(false);

  const doSearch = async () => {
    if (!value.trim()) return;
    setSearching(true);
    try {
      const addr = encodeURIComponent(value);
      const geo = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=${API_KEY}&language=zh-TW`);
      const json = await geo.json();
      const loc = json.results?.[0]?.geometry?.location;
      if (loc) onSearch(loc.lat, loc.lng);
    } catch (_) {}
    setSearching(false);
  };

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
      </div>
      <input
        type="text" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && doSearch()}
        placeholder="搜尋地點、捷運站或地址... (Enter 搜尋)"
        className="w-full pl-12 pr-20 py-4 bg-white rounded-2xl shadow-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 text-gray-900 font-medium placeholder:text-gray-400 transition-all"
      />
      <div className="absolute inset-y-0 right-3 flex items-center gap-1">
        {value && <button onClick={() => setValue('')} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>}
        <button onClick={doSearch} disabled={searching} className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors disabled:opacity-50">
          {searching ? '...' : '搜尋'}
        </button>
      </div>
    </div>
  );
}

function PropertyMarker({ property, onClick, isSingle }: { property: Property; onClick: () => void; isSingle?: boolean; key?: string }) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const label = `$${(property.price / 10000).toFixed(1)}萬`;
    const icon = isSingle ? undefined : {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="68" height="30">
          <rect x="1" y="1" width="66" height="22" rx="11" fill="white" stroke="#E8650A" stroke-width="2"/>
          <text x="34" y="16" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="#1a1a1a">${label}</text>
          <polygon points="29,23 39,23 34,30" fill="#E8650A"/>
        </svg>`
      )}`,
      scaledSize: new google.maps.Size(68, 30),
      anchor: new google.maps.Point(34, 30),
    };
    const marker = new google.maps.Marker({ position: { lat: property.location.lat, lng: property.location.lng }, map, title: property.title, icon });
    marker.addListener('click', onClick);
    markerRef.current = marker;
    return () => { marker.setMap(null); };
  }, [map, property.location.lat, property.location.lng, property.price]);

  return null;
}
