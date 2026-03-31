import React from 'react';
import FilterBar from '../components/FilterBar';
import PropertyGrid from '../components/PropertyGrid';
import MapComponent from '../components/MapComponent';
import { Map, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/SupabaseContext';

export default function Listings() {
  const [viewMode, setViewMode] = React.useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState({
    city: 'all',
    district: 'all',
    priceRange: 'all',
    type: 'all',
    rooms: 'all',
    area: 'all',
  });
  const { properties, loading } = useFirebase();

  const filteredProperties = properties.filter(p => {
    // Search query check
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // City check
    if (filters.city !== 'all' && p.location.city !== filters.city) return false;

    // District check
    if (filters.district !== 'all' && p.location.district !== filters.district) return false;

    // Price range check
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (filters.priceRange === '30000+') {
        if (p.price < 30000) return false;
      } else {
        if (p.price < min || p.price > max) return false;
      }
    }

    // Type check
    if (filters.type !== 'all' && p.type !== filters.type) return false;

    // Rooms check
    if (filters.rooms !== 'all') {
      if (filters.rooms === '4+') {
        if (p.features.bedrooms < 4) return false;
      } else {
        if (p.features.bedrooms !== Number(filters.rooms)) return false;
      }
    }

    // Area check
    if (filters.area !== 'all') {
      const [min, max] = filters.area.split('-').map(Number);
      if (filters.area === '30+') {
        if (p.features.area < 30) return false;
      } else {
        if (p.features.area < min || p.features.area > max) return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <FilterBar onSearch={setSearchQuery} onFilterChange={setFilters} />

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
              <Map className="w-4 h-4" />
              地圖
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <PropertyGrid properties={filteredProperties} />
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
