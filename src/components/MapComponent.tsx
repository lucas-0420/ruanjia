import React, { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useAdvancedMarkerRef, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Property } from '../types';
import { Home, Navigation, Search, X } from 'lucide-react';

interface MapComponentProps {
  properties: Property[];
  onPropertyClick?: (property: Property) => void;
}

const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MapComponent({ properties, onPropertyClick }: MapComponentProps) {
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
        <MapInner properties={properties} onPropertyClick={onPropertyClick} />
      </APIProvider>
    </div>
  );
}

function MapInner({ properties, onPropertyClick }: MapComponentProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const map = useMap();

  // Default center: Taipei
  const defaultCenter = { lat: 25.0330, lng: 121.5654 };

  const handleLocateMe = () => {
    if (!map) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.panTo(pos);
          map.setZoom(15);
        },
        () => {
          alert('無法取得您的位置。請確保已開啟定位權限。');
        }
      );
    } else {
      alert('您的瀏覽器不支援定位功能。');
    }
  };

  return (
    <>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={13}
        mapId="DEMO_MAP_ID"
        gestureHandling={'greedy'}
        disableDefaultUI={false}
      >
        {properties.map((property) => (
          <PropertyMarker 
            key={property.id} 
            property={property} 
            onClick={() => {
              setSelectedProperty(property);
              onPropertyClick?.(property);
            }}
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
                ${selectedProperty.price.toLocaleString()} / 月
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
      
      {/* Search Bar */}
      <div className="absolute top-6 left-6 right-6 md:right-auto md:w-96 z-10">
        <PlaceAutocomplete onPlaceSelect={(place) => {
          if (!map || !place.geometry?.location) return;
          map.panTo(place.geometry.location);
          map.setZoom(15);
        }} />
      </div>

      {/* Custom Locate Me Button */}
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

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

function PlaceAutocomplete({ onPlaceSelect }: PlaceAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['geometry', 'name', 'formatted_address'],
    };

    const autocomplete = new places.Autocomplete(inputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      setInputValue(place.formatted_address || place.name || '');
      onPlaceSelect(place);
    });
  }, [places, onPlaceSelect]);

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="搜尋地點、捷運站或地址..."
        className="w-full pl-12 pr-12 py-4 bg-white rounded-2xl shadow-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 text-gray-900 font-medium placeholder:text-gray-400 transition-all"
      />
      {inputValue && (
        <button
          onClick={() => setInputValue('')}
          className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function PropertyMarker({ property, onClick }: { property: Property; onClick: () => void; key?: string }) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: property.location.lat, lng: property.location.lng }}
      onClick={onClick}
      title={property.title}
    >
      <div className="relative group">
        <div className="bg-white px-2 py-1 rounded-full shadow-lg border-2 border-orange-600 flex items-center gap-1 transform transition-transform group-hover:scale-110">
          <span className="text-[10px] font-bold text-gray-900">
            ${(property.price / 10000).toFixed(1)}萬
          </span>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-orange-600 mx-auto -mt-0.5"></div>
      </div>
    </AdvancedMarker>
  );
}
