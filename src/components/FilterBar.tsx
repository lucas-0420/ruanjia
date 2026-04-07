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
}

const DISTRICTS: Record<string, string[]> = {
  '台北市': ['信義區', '大安區', '中山區', '內湖區', '士林區', '文山區'],
  '新北市': ['板橋區', '中和區', '永和區', '三重區', '新莊區', '土城區'],
  '桃園市': ['桃園區', '中壢區', '平鎮區', '八德區'],
  '新竹市': ['東區', '北區', '香山區'],
  '新竹縣': ['竹北市', '竹東鎮', '新豐鄉'],
  '台中市': ['西屯區', '北屯區', '南屯區', '北區', '西區', '中區', '大里區', '太平區'],
};

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
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-[9999] min-w-[160px]"
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

/* ── Main FilterBar ── */
export default function FilterBar({ onSearch, onFilterChange, initialSearch = '', initialFilters }: FilterBarProps) {
  const [searchValue, setSearchValue] = React.useState(initialSearch);
  const [filters, setFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [expanded, setExpanded] = React.useState(false);       // 桌面版展開
  const [sheetOpen, setSheetOpen] = React.useState(false);     // 手機版底部 Sheet
  const [sheetFilters, setSheetFilters] = React.useState<Filters>({ ...DEFAULT_FILTERS, ...initialFilters });

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
  ].filter(a => a.length > 0).length;

  return (
    <>
      <div className="bg-white shadow-sm sticky top-16 z-30">

        {/* ══════════════════════════════
            手機版搜尋列 (md 以上隱藏)
        ══════════════════════════════ */}
        <div className="md:hidden px-4 py-3 flex gap-2">
          {/* 搜尋欄 */}
          <div className="flex-1 flex items-center bg-[#FBF7F3] border border-[#E5D5C5] rounded-2xl overflow-hidden min-h-[48px]">
            <Search className="w-4 h-4 text-[#B8A090] ml-3 shrink-0" />
            <input
              type="text"
              placeholder="地址、社區或關鍵字..."
              value={searchValue}
              onChange={e => { setSearchValue(e.target.value); onSearch(e.target.value); }}
              onKeyDown={e => e.key === 'Enter' && onSearch(searchValue)}
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
                <div className="flex items-center border-r border-gray-200 px-1">
                  <select
                    value={filters.city}
                    onChange={e => update({ city: e.target.value })}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="all">全台</option>
                    <option value="台北市">台北市</option>
                    <option value="新北市">新北市</option>
                    <option value="桃園市">桃園市</option>
                    <option value="新竹市">新竹市</option>
                    <option value="新竹縣">新竹縣</option>
                    <option value="台中市">台中市</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="地址、社區或關鍵字..."
                  value={searchValue}
                  onChange={e => { setSearchValue(e.target.value); onSearch(e.target.value); }}
                  onKeyDown={e => e.key === 'Enter' && onSearch(searchValue)}
                  className="w-28 sm:w-44 px-3 sm:px-4 py-2 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                />
                <button
                  onClick={() => onSearch(searchValue)}
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

              {/* 城市 */}
              <div className="mb-5">
                <span className="text-sm font-bold text-[#3D2B1F] block mb-2.5">城市</span>
                <select
                  value={sheetFilters.city}
                  onChange={e => updateSheet({ city: e.target.value })}
                  className="w-full px-4 py-3 text-sm font-semibold text-[#3D2B1F] bg-[#FBF7F3] border border-[#E5D5C5] rounded-xl outline-none"
                >
                  <option value="all">全台</option>
                  <option value="台北市">台北市</option>
                  <option value="新北市">新北市</option>
                  <option value="桃園市">桃園市</option>
                  <option value="新竹市">新竹市</option>
                  <option value="新竹縣">新竹縣</option>
                  <option value="台中市">台中市</option>
                </select>
              </div>

              {/* 行政區 */}
              {(DISTRICTS[sheetFilters.city] || []).length > 0 && (
                <PillGroup
                  label="行政區"
                  options={(DISTRICTS[sheetFilters.city] || []).map(d => ({ value: d, label: d }))}
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
