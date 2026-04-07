import { API_BASE } from '../lib/api';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

interface Place {
  name: string;
  distance: number;
}

interface NearbyPlacesPanelProps {
  lat: number;
  lng: number;
  className?: string;
}

/* ── Haversine 距離（公尺） ── */
function calcDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number) {
  return m < 1000 ? `約${Math.round(m / 5) * 5}公尺` : `約${(m / 1000).toFixed(1)}公里`;
}

/* ── 類別定義 ── */
const CATEGORIES = [
  {
    id: 'transit',
    label: '交通',
    emoji: '🚌',
    subs: [
      { id: 'subway', label: '捷運', types: ['subway_station', 'transit_station'] },
      { id: 'bus',    label: '公車', types: ['bus_station'] },
    ],
  },
  {
    id: 'life',
    label: '生活',
    emoji: '☕',
    subs: [
      { id: 'shopping', label: '購物', types: ['supermarket', 'shopping_mall', 'convenience_store'] },
      { id: 'food',     label: '餐飲', types: ['restaurant', 'cafe'] },
    ],
  },
  {
    id: 'education',
    label: '教育',
    emoji: '🎓',
    subs: [
      { id: 'primary',   label: '國小', types: ['primary_school'] },
      { id: 'secondary', label: '國中', types: ['secondary_school'] },
      { id: 'uni',       label: '大學', types: ['university'] },
    ],
  },
] as const;

/* ── 透過 server 代理呼叫 Places Nearby Search ── */
async function fetchNearby(lat: number, lng: number, type: string): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng), type, radius: '2000' });
  const res = await fetch(`${API_BASE}/api/nearby?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((p: any) => p.lat && p.lng && p.name)
    .map((p: any) => ({
      name: p.name,
      distance: calcDist(lat, lng, p.lat, p.lng),
    }));
}

export default function NearbyPlacesPanel({ lat, lng, className }: NearbyPlacesPanelProps) {
  const cacheRef = useRef<Map<string, Place[]>>(new Map());

  const [activeTab, setActiveTab] = useState(0);
  const [activeSub, setActiveSub] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cat = CATEGORIES[activeTab];
    const sub = cat.subs[Math.min(activeSub, cat.subs.length - 1)];
    const cacheKey = `${activeTab}-${sub.id}`;

    if (cacheRef.current.has(cacheKey)) {
      setPlaces(cacheRef.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError('');

    Promise.all(sub.types.map(t => fetchNearby(lat, lng, t)))
      .then(results => {
        const merged = results.flat().sort((a, b) => a.distance - b.distance);

        // 去重（同名地點只留最近的）
        const seen = new Set<string>();
        const unique = merged.filter(p => {
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        }).slice(0, 8);

        cacheRef.current.set(cacheKey, unique);
        setPlaces(unique);
        setLoading(false);
      })
      .catch(() => {
        setError('載入失敗');
        setLoading(false);
      });
  }, [activeTab, activeSub, lat, lng]);

  const handleTabChange = (i: number) => { setActiveTab(i); setActiveSub(0); };
  const cat = CATEGORIES[activeTab];
  const subs = cat.subs;

  return (
    <div className={cn('flex flex-col bg-white overflow-hidden', className)}>

      {/* 主 Tab */}
      <div className="flex border-b border-[#F2E9DF] shrink-0">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            onClick={() => handleTabChange(i)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-3 text-[11px] font-bold transition-colors',
              activeTab === i
                ? 'text-[#F5A623] border-b-2 border-[#F5A623] -mb-px'
                : 'text-[#B8A090]'
            )}
          >
            <span className="text-xl leading-none">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* 子 Tab */}
      {subs.length > 1 && (
        <div className="flex gap-2 px-3 py-2 border-b border-[#F2E9DF] bg-[#FBF7F3] shrink-0">
          {subs.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveSub(i)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                activeSub === i
                  ? 'bg-[#F5A623] text-[#3D2B1F]'
                  : 'bg-white border border-[#E5D5C5] text-[#9A7D6B]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 地點列表 */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-[#B8A090] text-sm">搜尋中…</div>
        ) : error ? (
          <div className="flex items-center justify-center h-20 text-red-400 text-sm">{error}</div>
        ) : places.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[#B8A090] text-sm">附近無資料</div>
        ) : (
          places.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3.5 border-b border-[#F2E9DF] last:border-0"
            >
              <span className="text-sm text-[#3D2B1F] font-medium truncate pr-3">{p.name}</span>
              <span className="text-sm text-[#9A7D6B] shrink-0 tabular-nums">{fmtDist(p.distance)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
