import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Property } from '../types';
import { Home, Navigation, Search, X } from 'lucide-react';

interface MapComponentProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
  showSearch?: boolean; // 是否顯示搜尋欄，預設 true
}

const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MapComponent({ properties, onPropertyClick, showSearch = true }: MapComponentProps) {
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
        <MapInner properties={properties} onPropertyClick={onPropertyClick} showSearch={showSearch} />
      </APIProvider>
    </div>
  );
}

function MapInner({ properties, onPropertyClick, showSearch = true }: MapComponentProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const map = useMap();

  // Auto-fit: single property → zoom 15 on it; multiple → fitBounds all markers
  useEffect(() => {
    if (!map || properties.length === 0) return;

    if (properties.length === 1) {
      const { lat, lng } = properties[0].location;
      map.panTo({ lat, lng });
      map.setZoom(15);
    } else {
      // filter out default Taipei coords that haven't been geocoded yet
      const geocoded = properties.filter(
        p => !(Math.abs(p.location.lat - 25.033) < 0.001 && Math.abs(p.location.lng - 121.5654) < 0.001)
      );
      const list = geocoded.length > 0 ? geocoded : properties;

      const bounds = new google.maps.LatLngBounds();
      list.forEach(p => bounds.extend({ lat: p.location.lat, lng: p.location.lng }));
      map.fitBounds(bounds, 80);
    }
  }, [map, properties]);

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
        defaultCenter={{ lat: 23.9, lng: 121.0 }} // 台灣中心，fitBounds 後會覆蓋
        defaultZoom={7}
        gestureHandling="greedy"
        disableDefaultUI={true}
        zoomControl={true}
        fullscreenControl={true}
        renderingType="RASTER"
      >
        {properties.map(property => (
          <PropertyMarker
            key={property.id}
            property={property}
            onClick={() => { setSelectedProperty(property); onPropertyClick?.(property); }}
          />
        ))}

        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.location.lat, lng: selectedProperty.location.lng }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="p-2 max-w-[200px]">
              <img
                src={selectedProperty.images[0]}
                alt={selectedProperty.title}
                className="w-full h-24 object-cover rounded-lg mb-2"
                referrerPolicy="no-referrer"
              />
              <h3 className="font-bold text-sm mb-1 truncate">{selectedProperty.title}</h3>
              <p className="text-orange-600 font-bold text-sm">
                NT${selectedProperty.price.toLocaleString()} / 月
              </p>
              <button
                onClick={() => window.location.href = `/property/${selectedProperty.id}`}
                className="mt-2 w-full py-1.5 bg-gray-900 text-white text-xs rounded-md font-bold"
              >
                查看詳情
              </button>
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Search Bar：僅在 showSearch=true 時顯示 */}
      {showSearch && (
        <div className="absolute top-6 left-6 right-6 md:right-auto md:w-96 z-10">
          <GeoSearch onSearch={(lat, lng) => {
            if (!map) return;
            map.panTo({ lat, lng });
            map.setZoom(15);
          }} />
        </div>
      )}

      {/* Locate Me */}
      <button
        onClick={handleLocateMe}
        className="absolute bottom-6 right-6 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-gray-700 hover:text-orange-600 transition-colors z-10 border border-gray-100"
        title="定位我的位置"
      >
        <Navigation className="w-6 h-6" />
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
      const geo = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${addr}&key=${API_KEY}&language=zh-TW`
      );
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
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && doSearch()}
        placeholder="搜尋地點、捷運站或地址... (Enter 搜尋)"
        className="w-full pl-12 pr-20 py-4 bg-white rounded-2xl shadow-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 text-gray-900 font-medium placeholder:text-gray-400 transition-all"
      />
      <div className="absolute inset-y-0 right-3 flex items-center gap-1">
        {value && (
          <button onClick={() => setValue('')} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={doSearch}
          disabled={searching}
          className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          {searching ? '...' : '搜尋'}
        </button>
      </div>
    </div>
  );
}

function PropertyMarker({ property, onClick }: { property: Property; onClick: () => void; key?: string }) {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    const label = `$${(property.price / 10000).toFixed(1)}萬`;
    const marker = new google.maps.Marker({
      position: { lat: property.location.lat, lng: property.location.lng },
      map,
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
    marker.addListener('click', onClick);
    markerRef.current = marker;
    return () => { marker.setMap(null); };
  }, [map, property.location.lat, property.location.lng, property.price]);

  return null;
}
