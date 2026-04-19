import React from 'react';
import { Search, ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Filters {
  city: string;
  district: string[];
  priceRange: string[];
  customPriceMin: string;
  customPriceMax: string;
  type: string[];
  rooms: string[];
  area: string[];
  floor: string[];
  bathrooms: string[];
  equipment: string[];
  distanceAddress: string;
  maxDistance: string;
}

export const DEFAULT_FILTERS: Filters = {
  city: '台中市',
  district: [],
  priceRange: [],
  customPriceMin: '',
  customPriceMax: '',
  type: [],
  rooms: [],
  area: [],
  floor: [],
  bathrooms: [],
  equipment: [],
  distanceAddress: '',
  maxDistance: '',
};

interface FilterBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: Filters) => void;
  initialSearch?: string;
  initialFilters?: Partial<Filters>;
  searchPlaceholder?: string;
  onMapSearch?: (query: string) => void; // 地圖模式：搜尋地標
  isMapMode?: boolean;
}

const DISTRICTS: Record<string, string[]> = {
  '台北市': ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
  '新北市': ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區', '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'],
  '基隆市': ['仁愛區', '信義區', '中正區', '中山區', '安樂區', '暖暖區', '七堵區'],
  '桃園市': ['桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區', '復興區'],
  '新竹市': ['東區', '北區', '香山區'],
  '新竹縣': ['竹北市', '湖口鄉', '新豐鄉', '新埔鎮', '關西鎮', '芎林鄉', '寶山鄉', '竹東鎮', '五峰鄉', '橫山鄉', '尖石鄉', '北埔鄉', '峨眉鄉'],
  '苗栗縣': ['苗栗市', '頭份市', '竹南鎮', '後龍鎮', '通霄鎮', '苑裡鎮', '造橋鄉', '頭屋鄉', '公館鄉', '銅鑼鄉', '三義鄉', '西湖鄉', '卓蘭鎮', '大湖鄉', '獅潭鄉', '泰安鄉', '南庄鄉', '三灣鄉'],
  '台中市': ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '大里區', '太平區', '東勢區', '大甲區', '清水區', '沙鹿區', '梧棲區', '后里區', '神岡區', '潭子區', '大雅區', '新社區', '石岡區', '外埔區', '大安區', '烏日區', '大肚區', '龍井區', '霧峰區', '和平區'],
  '彰化縣': ['彰化市', '鹿港鎮', '和美鎮', '員林市', '溪湖鎮', '田中鎮', '北斗鎮', '二林鎮', '線西鄉', '伸港鄉', '福興鄉', '秀水鄉', '花壇鄉', '芬園鄉', '大村鄉', '埔鹽鄉', '埔心鄉', '永靖鄉', '社頭鄉', '二水鄉', '田尾鄉', '埤頭鄉', '芳苑鄉', '大城鄉', '竹塘鄉', '溪州鄉'],
  '南投縣': ['南投市', '埔里鎮', '草屯鎮', '竹山鎮', '集集鎮', '名間鄉', '鹿谷鄉', '中寮鄉', '魚池鄉', '國姓鄉', '水里鄉', '信義鄉', '仁愛鄉'],
  '雲林縣': ['斗六市', '斗南鎮', '虎尾鎮', '西螺鎮', '土庫鎮', '北港鎮', '古坑鄉', '大埤鄉', '莿桐鄉', '林內鄉', '二崙鄉', '崙背鄉', '麥寮鄉', '東勢鄉', '褒忠鄉', '台西鄉', '元長鄉', '四湖鄉', '口湖鄉', '水林鄉'],
  '嘉義市': ['東區', '西區'],
  '嘉義縣': ['太保市', '朴子市', '布袋鎮', '大林鎮', '民雄鄉', '溪口鄉', '新港鄉', '六腳鄉', '東石鄉', '義竹鄉', '鹿草鄉', '水上鄉', '中埔鄉', '竹崎鄉', '梅山鄉', '番路鄉', '大埔鄉', '阿里山鄉'],
  '台南市': ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'],
  '高雄市': ['三民區', '鹽埕區', '鼓山區', '左營區', '楠梓區', '苓雅區', '前金區', '新興區', '前鎮區', '旗津區', '小港區', '鳳山區', '林園區', '大寮區', '鳥松區', '仁武區', '大社區', '岡山區', '茄萣區', '永安區', '橋頭區', '彌陀區', '梓官區', '路竹區', '燕巢區', '田寮區', '阿蓮區', '大樹區', '旗山區', '美濃區', '六龜區', '甲仙區', '杉林區', '內門區', '茂林區', '桃源區', '那瑪夏區'],
  '屏東縣': ['屏東市', '潮州鎮', '東港鎮', '恆春鎮', '萬丹鄉', '長治鄉', '麟洛鄉', '九如鄉', '里港鄉', '鹽埔鄉', '高樹鄉', '萬巒鄉', '內埔鄉', '竹田鄉', '新埤鄉', '枋寮鄉', '新園鄉', '崁頂鄉', '林邊鄉', '南州鄉', '佳冬鄉', '琉球鄉', '車城鄉', '滿州鄉', '枋山鄉', '三地門鄉', '霧台鄉', '瑪家鄉', '泰武鄉', '來義鄉', '春日鄉', '獅子鄉', '牡丹鄉'],
  '宜蘭縣': ['宜蘭市', '頭城鎮', '礁溪鄉', '壯圍鄉', '員山鄉', '羅東鎮', '三星鄉', '大同鄉', '五結鄉', '冬山鄉', '蘇澳鎮', '南澳鄉'],
  '花蓮縣': ['花蓮市', '新城鄉', '秀林鄉', '吉安鄉', '壽豐鄉', '鳳林鎮', '光復鄉', '豐濱鄉', '瑞穗鄉', '萬榮鄉', '玉里鎮', '卓溪鄉', '富里鄉'],
  '台東縣': ['台東市', '成功鎮', '關山鎮', '卑南鄉', '鹿野鄉', '池上鄉', '東河鄉', '長濱鄉', '太麻里鄉', '大武鄉', '綠島鄉', '海端鄉', '延平鄉', '金峰鄉', '達仁鄉', '蘭嶼鄉'],
  '澎湖縣': ['馬公市', '湖西鄉', '白沙鄉', '西嶼鄉', '望安鄉', '七美鄉'],
  '金門縣': ['金城鎮', '金湖鎮', '金沙鎮', '金寧鄉', '烈嶼鄉', '烏坵鄉'],
  '連江縣': ['南竿鄉', '北竿鄉', '莒光鄉', '東引鄉'],
};

/* ── 地區分組（用於 CityRegionPicker） ── */
const REGIONS = [
  { label: '北部', cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'] },
  { label: '中部', cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'] },
  { label: '南部', cities: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'] },
  { label: '東部離島', cities: ['花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'] },
];

/* ── 城市地區選擇器：橫向地區分組 + 城市 Pill ── */
function CityRegionPicker({
  city,
  onChange,
}: {
  city: string;
  onChange: (city: string) => void;
}) {
  const matchedRegion = REGIONS.find(r => r.cities.includes(city))?.label ?? null;
  const [selectedRegion, setSelectedRegion] = React.useState<string | null>(matchedRegion);

  // 當外部 city 變更時同步 region
  React.useEffect(() => {
    const r = REGIONS.find(r => r.cities.includes(city));
    setSelectedRegion(r ? r.label : null);
  }, [city]);

  const regionCities = selectedRegion
    ? REGIONS.find(r => r.label === selectedRegion)?.cities ?? []
    : [];

  return (
    <div className="space-y-1.5">
      {/* 地區標籤列 */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => { setSelectedRegion(null); onChange('all'); }}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-colors',
            city === 'all'
              ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F]'
              : 'bg-white border-[#E5D5C5] text-[#7A5C48] hover:border-[#F5A623]'
          )}
        >
          全台
        </button>
        {REGIONS.map(r => (
          <button
            key={r.label}
            onClick={() => setSelectedRegion(selectedRegion === r.label ? null : r.label)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold shrink-0 border transition-colors',
              selectedRegion === r.label
                ? 'bg-[#3D2B1F] border-[#3D2B1F] text-white'
                : 'bg-white border-[#E5D5C5] text-[#7A5C48] hover:border-[#3D2B1F]'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 城市 Pill 列（展開地區後出現） */}
      {regionCities.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {regionCities.map(c => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className={cn(
                'px-3 py-1 rounded-full text-xs shrink-0 border transition-colors',
                city === c
                  ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
                  : 'bg-[#FBF7F3] border-[#E5D5C5] text-[#7A5C48] hover:border-[#F5A623]'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 桌面版：Inline checkbox row ── */
function FilterRow({
  label, options, selected, onChange, extra,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  extra?: React.ReactNode;
}) {
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm font-medium text-gray-500 w-10 shrink-0">{label}</span>
      <button
        onClick={() => onChange([])}
        className={cn('text-sm shrink-0', selected.length === 0 ? 'text-orange-500 font-bold' : 'text-gray-400 hover:text-orange-500')}
      >
        不限
      </button>
      <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 flex-1">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="w-3.5 h-3.5 accent-orange-600 rounded"
            />
            <span className={cn('text-sm', selected.includes(opt.value) ? 'text-orange-600 font-medium' : 'text-gray-700')}>
              {opt.label}
            </span>
          </label>
        ))}
        {extra}
      </div>
    </div>
  );
}

/* ── 桌面版：Compact dropdown for top bar ── */
function TopDropdown({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all whitespace-nowrap',
          selected.length > 0
            ? 'border-orange-500 bg-orange-50 text-orange-600'
            : 'border-gray-200 bg-white text-gray-600 hover:border-orange-400 hover:text-orange-600'
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[9999] min-w-[160px] max-h-72 overflow-y-auto"
        >
          {options.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-4 h-4 accent-orange-600 rounded"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <div className="border-t border-gray-100 mt-1 pt-1 px-4">
              <button onClick={() => onChange([])} className="text-xs text-red-400 hover:text-red-600 font-medium">清除</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 手機版：Bottom Sheet 內的 Pill 選項 ── */
function PillGroup({
  label, options, selected, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-bold text-[#3D2B1F]">{label}</span>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-[#B8A090] hover:text-[#F5A623]">清除</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange([])}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
            selected.length === 0
              ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
              : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
          )}
        >
          不限
        </button>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
              selected.includes(opt.value)
                ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
                : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 行政區選擇（超過 10 個時加搜尋框）── */
function DistrictPillGroup({
  districts, selected, onChange,
}: {
  districts: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [q, setQ] = React.useState('');
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  const filtered = q ? districts.filter(d => d.includes(q)) : districts;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-bold text-[#3D2B1F]">行政區</span>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-xs text-[#B8A090] hover:text-[#F5A623]">清除</button>
        )}
      </div>
      {districts.length > 10 && (
        <input
          type="text"
          placeholder="搜尋區域..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full px-3 py-2 mb-3 text-sm border border-[#E5D5C5] rounded-xl outline-none focus:border-[#F5A623] bg-[#FBF7F3] text-[#3D2B1F] placeholder-[#B8A090]"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange([])}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
            selected.length === 0
              ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
              : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
          )}
        >
          不限
        </button>
        {filtered.map(d => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
              selected.includes(d)
                ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
                : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
            )}
          >
            {d}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#B8A090] py-2">找不到符合的區域</p>
        )}
      </div>
    </div>
  );
}

/* ── Main FilterBar ── */
export default function FilterBar({ onSearch, onFilterChange, initialSearch = '', initialFilters, isMapMode = false, onMapSearch }: FilterBarProps) {
  const [searchValue, setSearchValue] = React.useState(initialSearch);
  const [filters, setFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [expanded, setExpanded] = React.useState(false);       // 桌面版展開
  const [sheetOpen, setSheetOpen] = React.useState(false);     // 手機版底部 Sheet
  const [sheetFilters, setSheetFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [cityPickerOpen, setCityPickerOpen] = React.useState(false); // 城市選擇器展開
  const cityPickerRef = React.useRef<HTMLDivElement>(null);

  // 點擊外部關閉城市選擇器
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityPickerRef.current && !cityPickerRef.current.contains(e.target as Node))
        setCityPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    const next = { ...DEFAULT_FILTERS, ...initialFilters };
    setFilters(next);
    setSheetFilters(next);
    onFilterChange(next);
    if (initialSearch) { setSearchValue(initialSearch); onSearch(initialSearch); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch, JSON.stringify(initialFilters)]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    if ('city' in patch) next.district = [];
    setFilters(next);
    onFilterChange(next);
  };

  const updateSheet = (patch: Partial<Filters>) => {
    const next = { ...sheetFilters, ...patch };
    if ('city' in patch) next.district = [];
    setSheetFilters(next);
  };

  const applySheet = () => {
    setFilters(sheetFilters);
    onFilterChange(sheetFilters);
    setSheetOpen(false);
  };

  const clearSheet = () => {
    setSheetFilters(DEFAULT_FILTERS);
  };

  const activeCount = [
    filters.district, filters.priceRange, filters.type, filters.rooms,
    filters.area, filters.floor, filters.bathrooms, filters.equipment,
  ].filter(a => a.length > 0).length + (filters.customPriceMin || filters.customPriceMax ? 1 : 0);

  const sheetActiveCount = [
    sheetFilters.district, sheetFilters.priceRange, sheetFilters.type, sheetFilters.rooms,
    sheetFilters.area, sheetFilters.floor, sheetFilters.bathrooms, sheetFilters.equipment,
  ].filter(a => a.length > 0).length + (sheetFilters.distanceAddress ? 1 : 0);

  return (
    <>
      <div ref={cityPickerRef} className="bg-white shadow-sm sticky top-16 z-30">

        {/* ══════════════════════════════
            手機版搜尋列 (md 以上隱藏)
        ══════════════════════════════ */}
        <div className="md:hidden px-4 py-3 flex gap-2">
          {/* 搜尋欄 */}
          <div className="flex-1 flex items-center bg-[#FBF7F3] border border-[#E5D5C5] rounded-2xl overflow-hidden min-h-[48px]">
            {/* 左側城市按鈕 */}
            <button
              onClick={() => setCityPickerOpen(o => !o)}
              className="flex items-center gap-1 border-r border-[#E5D5C5] px-3 shrink-0 h-full"
            >
              <span className="text-xs font-bold text-[#3D2B1F] whitespace-nowrap max-w-[60px] truncate">
                {filters.city === 'all' ? '全台' : filters.city}
              </span>
              <ChevronDown className={cn('w-3 h-3 text-[#7A5C48] transition-transform shrink-0', cityPickerOpen && 'rotate-180')} />
            </button>
            <Search className="w-4 h-4 text-[#B8A090] ml-2 shrink-0" />
            <input
              type="text"
              placeholder={isMapMode ? '搜尋地標、捷運站...' : '地址、社區或關鍵字...'}
              value={searchValue}
              onChange={e => { setSearchValue(e.target.value); if (!isMapMode) onSearch(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter') { isMapMode ? onMapSearch?.(searchValue) : onSearch(searchValue); } }}
              className="flex-1 px-2 py-3 text-sm text-[#3D2B1F] placeholder-[#B8A090] bg-transparent outline-none"
            />
            {searchValue && (
              <button
                onClick={() => { setSearchValue(''); onSearch(''); }}
                className="p-2 mr-1"
              >
                <X className="w-4 h-4 text-[#B8A090]" />
              </button>
            )}
          </div>

          {/* 篩選按鈕 */}
          <button
            onClick={() => { setSheetFilters(filters); setSheetOpen(true); }}
            className={cn(
              'flex items-center gap-1.5 px-4 rounded-2xl border font-bold text-sm min-h-[48px] shrink-0 transition-colors',
              activeCount > 0
                ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F]'
                : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            篩選
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#3D2B1F] text-white text-[10px] flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════
            桌面版篩選列 (md 以下隱藏)
        ══════════════════════════════ */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">

              {/* Search */}
              <div className="flex items-stretch bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0">
                {/* 左側城市按鈕 */}
                <button
                  onClick={() => setCityPickerOpen(o => !o)}
                  className="flex items-center gap-1.5 border-r border-gray-200 px-3 shrink-0 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    {filters.city === 'all' ? '全台' : filters.city}
                  </span>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', cityPickerOpen && 'rotate-180')} />
                </button>
                <input
                  type="text"
                  placeholder={isMapMode ? '搜尋地標、捷運站...' : '地址、社區或關鍵字...'}
                  value={searchValue}
                  onChange={e => { setSearchValue(e.target.value); if (!isMapMode) onSearch(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Enter') { isMapMode ? onMapSearch?.(searchValue) : onSearch(searchValue); } }}
                  className="w-28 sm:w-44 px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                />
                <button
                  onClick={() => isMapMode ? onMapSearch?.(searchValue) : onSearch(searchValue)}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-4 font-bold text-sm transition-colors shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  搜尋
                </button>
              </div>

              <div className="w-px h-5 bg-gray-200 shrink-0" />

              {(DISTRICTS[filters.city] || []).length > 0 && (
                <TopDropdown
                  label="行政區"
                  options={(DISTRICTS[filters.city] || []).map(d => ({ value: d, label: d }))}
                  selected={filters.district}
                  onChange={v => update({ district: v })}
                />
              )}

              <TopDropdown
                label="租金"
                options={[
                  { value: '0-10000', label: '1萬以下' },
                  { value: '10000-20000', label: '1-2萬' },
                  { value: '20000-30000', label: '2-3萬' },
                  { value: '30000+', label: '3萬以上' },
                ]}
                selected={filters.priceRange}
                onChange={v => update({ priceRange: v })}
              />

              <TopDropdown
                label="類型"
                options={[
                  { value: 'apartment', label: '整層住家' },
                  { value: 'studio', label: '獨立套房' },
                  { value: 'room', label: '分租雅房' },
                  { value: 'house', label: '別墅住宅' },
                ]}
                selected={filters.type}
                onChange={v => update({ type: v })}
              />

              <TopDropdown
                label="格局"
                options={[
                  { value: '1', label: '1 房' },
                  { value: '2', label: '2 房' },
                  { value: '3', label: '3 房' },
                  { value: '4+', label: '4 房以上' },
                ]}
                selected={filters.rooms}
                onChange={v => update({ rooms: v })}
              />

              <div className="w-px h-5 bg-gray-200 shrink-0" />

              <button
                onClick={() => setExpanded(o => !o)}
                className={cn(
                  'flex items-center gap-1 text-sm transition-colors whitespace-nowrap shrink-0',
                  expanded || activeCount > 0 ? 'text-orange-600 font-medium' : 'text-gray-500 hover:text-orange-600'
                )}
              >
                {expanded ? '收起選項' : '展開選項'}
                {activeCount > 0 && !expanded && (
                  <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold ml-0.5">{activeCount}</span>
                )}
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {(activeCount > 0 || searchValue) && (
                <button
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setSearchValue('');
                    onFilterChange(DEFAULT_FILTERS);
                    onSearch('');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" />
                  清除
                </button>
              )}
            </div>
          </div>

          {/* 桌面展開面板 */}
          {expanded && (
            <div className="border-t border-gray-100 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

                <FilterRow
                  label="坪數"
                  options={[
                    { value: '0-10', label: '10坪以下' },
                    { value: '10-20', label: '10-20坪' },
                    { value: '20-30', label: '20-30坪' },
                    { value: '30-40', label: '30-40坪' },
                    { value: '40-50', label: '40-50坪' },
                    { value: '50+', label: '50坪以上' },
                  ]}
                  selected={filters.area}
                  onChange={v => update({ area: v })}
                  extra={
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="number"
                        placeholder="最小坪"
                        value={filters.customPriceMin}
                        onChange={e => update({ customPriceMin: e.target.value })}
                        className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-400 text-center"
                      />
                      <span className="text-gray-400 text-xs">—</span>
                      <input
                        type="number"
                        placeholder="最大坪"
                        value={filters.customPriceMax}
                        onChange={e => update({ customPriceMax: e.target.value })}
                        className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-400 text-center"
                      />
                      <span className="text-xs text-gray-400">坪</span>
                    </div>
                  }
                />

                <FilterRow
                  label="樓層"
                  options={[
                    { value: '1', label: '1層' },
                    { value: '2-6', label: '2-6層' },
                    { value: '6-12', label: '6-12層' },
                    { value: '12+', label: '12層以上' },
                  ]}
                  selected={filters.floor}
                  onChange={v => update({ floor: v })}
                />

                <FilterRow
                  label="衛浴"
                  options={[
                    { value: '1', label: '1衛' },
                    { value: '2', label: '2衛' },
                    { value: '3', label: '3衛' },
                    { value: '4+', label: '4衛及以上' },
                  ]}
                  selected={filters.bathrooms}
                  onChange={v => update({ bathrooms: v })}
                />

                <FilterRow
                  label="設備"
                  options={[
                    { value: '冷氣', label: '有冷氣' },
                    { value: '洗衣機', label: '有洗衣機' },
                    { value: '冰箱', label: '有冰箱' },
                    { value: '熱水器', label: '有熱水器' },
                    { value: '天然瓦斯', label: '有天然瓦斯' },
                    { value: '網路', label: '有網路' },
                    { value: '床鋪', label: '床' },
                  ]}
                  selected={filters.equipment}
                  onChange={v => update({ equipment: v })}
                />

                <div className="flex items-center gap-4 py-2.5">
                  <span className="text-sm font-medium text-gray-500 w-10 shrink-0">距離</span>
                  <input
                    type="text"
                    placeholder="輸入地址或地標（如：台中車站）"
                    value={filters.distanceAddress}
                    onChange={e => update({ distanceAddress: e.target.value })}
                    className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400"
                  />
                  <select
                    value={filters.maxDistance}
                    onChange={e => update({ maxDistance: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-400 bg-white"
                  >
                    <option value="">不限</option>
                    <option value="0.5">500m 內</option>
                    <option value="1">1km 內</option>
                    <option value="2">2km 內</option>
                    <option value="3">3km 內</option>
                    <option value="5">5km 內</option>
                    <option value="10">10km 內</option>
                  </select>
                  {filters.distanceAddress && (
                    <button
                      onClick={() => update({ distanceAddress: '', maxDistance: '' })}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      清除
                    </button>
                  )}
                </div>

                <div className="pt-3 text-center">
                  <button
                    onClick={() => setExpanded(false)}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 mx-auto"
                  >
                    收起選項
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════
            城市選擇器展開面板（手機 & 桌面共用，永遠在最下方）
        ══════════════════════════════ */}
        {cityPickerOpen && (
          <div className="px-4 pt-1 pb-3 border-t border-[#F2E9DF] md:max-w-7xl md:mx-auto md:px-8">
            <CityRegionPicker
              city={filters.city}
              onChange={city => { update({ city }); setCityPickerOpen(false); }}
            />
          </div>
        )}
      </div>

      {/* ══════════════════════════════
          手機版篩選底部 Sheet
      ══════════════════════════════ */}
      {sheetOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet 本體 */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* 把手 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#E5D5C5] rounded-full" />
            </div>

            {/* 標題列 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F2E9DF]">
              <h2 className="text-base font-bold text-[#3D2B1F]">篩選條件</h2>
              <button
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2E9DF] text-[#7A5C48]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 篩選內容（可滾動） */}
            <div className="flex-1 overflow-y-auto px-5 py-4">

              {/* 城市（橫向地區選擇器） */}
              <div className="mb-5">
                <span className="text-sm font-bold text-[#3D2B1F] block mb-2.5">城市</span>
                <CityRegionPicker
                  city={sheetFilters.city}
                  onChange={city => updateSheet({ city })}
                />
              </div>

              {/* 行政區 */}
              {(DISTRICTS[sheetFilters.city] || []).length > 0 && (
                <DistrictPillGroup
                  districts={DISTRICTS[sheetFilters.city] || []}
                  selected={sheetFilters.district}
                  onChange={v => updateSheet({ district: v })}
                />
              )}

              <PillGroup
                label="租金"
                options={[
                  { value: '0-10000', label: '1萬以下' },
                  { value: '10000-20000', label: '1–2萬' },
                  { value: '20000-30000', label: '2–3萬' },
                  { value: '30000+', label: '3萬以上' },
                ]}
                selected={sheetFilters.priceRange}
                onChange={v => updateSheet({ priceRange: v })}
              />

              <PillGroup
                label="類型"
                options={[
                  { value: 'apartment', label: '整層住家' },
                  { value: 'studio', label: '獨立套房' },
                  { value: 'room', label: '分租雅房' },
                  { value: 'house', label: '別墅住宅' },
                ]}
                selected={sheetFilters.type}
                onChange={v => updateSheet({ type: v })}
              />

              <PillGroup
                label="格局"
                options={[
                  { value: '1', label: '1 房' },
                  { value: '2', label: '2 房' },
                  { value: '3', label: '3 房' },
                  { value: '4+', label: '4 房以上' },
                ]}
                selected={sheetFilters.rooms}
                onChange={v => updateSheet({ rooms: v })}
              />

              <PillGroup
                label="坪數"
                options={[
                  { value: '0-10', label: '10坪以下' },
                  { value: '10-20', label: '10–20坪' },
                  { value: '20-30', label: '20–30坪' },
                  { value: '30-40', label: '30–40坪' },
                  { value: '40-50', label: '40–50坪' },
                  { value: '50+', label: '50坪以上' },
                ]}
                selected={sheetFilters.area}
                onChange={v => updateSheet({ area: v })}
              />

              <PillGroup
                label="樓層"
                options={[
                  { value: '1', label: '1層' },
                  { value: '2-6', label: '2–6層' },
                  { value: '6-12', label: '6–12層' },
                  { value: '12+', label: '12層以上' },
                ]}
                selected={sheetFilters.floor}
                onChange={v => updateSheet({ floor: v })}
              />

              <PillGroup
                label="衛浴"
                options={[
                  { value: '1', label: '1衛' },
                  { value: '2', label: '2衛' },
                  { value: '3', label: '3衛' },
                  { value: '4+', label: '4衛以上' },
                ]}
                selected={sheetFilters.bathrooms}
                onChange={v => updateSheet({ bathrooms: v })}
              />

              <PillGroup
                label="設備"
                options={[
                  { value: '冷氣', label: '冷氣' },
                  { value: '洗衣機', label: '洗衣機' },
                  { value: '冰箱', label: '冰箱' },
                  { value: '熱水器', label: '熱水器' },
                  { value: '天然瓦斯', label: '天然瓦斯' },
                  { value: '網路', label: '網路' },
                  { value: '床鋪', label: '床鋪' },
                ]}
                selected={sheetFilters.equipment}
                onChange={v => updateSheet({ equipment: v })}
              />

              {/* 距離篩選 */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-bold text-[#3D2B1F]">距離</span>
                  {sheetFilters.distanceAddress && (
                    <button
                      onClick={() => updateSheet({ distanceAddress: '', maxDistance: '' })}
                      className="text-xs text-[#B8A090] hover:text-[#F5A623]"
                    >
                      清除
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="輸入地址或地標（如：台中車站）"
                  value={sheetFilters.distanceAddress}
                  onChange={e => updateSheet({ distanceAddress: e.target.value })}
                  className="w-full px-3 py-2.5 mb-3 text-sm border border-[#E5D5C5] rounded-xl outline-none focus:border-[#F5A623] bg-[#FBF7F3] text-[#3D2B1F] placeholder-[#B8A090]"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: '', label: '不限' },
                    { value: '0.5', label: '500m 內' },
                    { value: '1', label: '1km 內' },
                    { value: '2', label: '2km 內' },
                    { value: '3', label: '3km 內' },
                    { value: '5', label: '5km 內' },
                    { value: '10', label: '10km 內' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateSheet({ maxDistance: opt.value })}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px]',
                        sheetFilters.maxDistance === opt.value
                          ? 'bg-[#F5A623] border-[#F5A623] text-[#3D2B1F] font-bold'
                          : 'bg-white border-[#E5D5C5] text-[#7A5C48]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="px-5 py-4 border-t border-[#F2E9DF] flex gap-3 safe-area-pb">
              <button
                onClick={clearSheet}
                className="flex-1 py-3.5 rounded-2xl border border-[#E5D5C5] text-[#7A5C48] font-bold text-sm"
              >
                清除全部 {sheetActiveCount > 0 && `(${sheetActiveCount})`}
              </button>
              <button
                onClick={applySheet}
                className="flex-2 flex-[2] py-3.5 rounded-2xl bg-[#F5A623] text-[#3D2B1F] font-bold text-sm"
              >
                套用篩選
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
