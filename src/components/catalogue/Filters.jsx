import { Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const conditionFilters = [
  { value: null,          labelKey: 'cat_filter_all' },
  { value: 'neuf',        labelKey: 'condition_new' },
  { value: 'reconditionne', labelKey: 'condition_refurbished' },
  { value: 'occasion',    labelKey: 'condition_used' },
];

const brandFilters = [
  { value: null,     labelKey: 'filter_all_brands' },
  { value: 'Apple',  label: 'Apple' },
  { value: 'Samsung', label: 'Samsung' },
];

const sortOptions = [
  { value: 'recent',     labelKey: 'sort_newest' },
  { value: 'price_asc',  labelKey: 'sort_price_asc' },
  { value: 'price_desc', labelKey: 'sort_price_desc' },
];

export default function Filters({
  search, setSearch,
  filterCondition, setFilterCondition,
  filterBrand, setFilterBrand,
  sortBy, setSortBy,
  total,
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('cat_search')}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 text-[#555555]">
          <SlidersHorizontal size={16} />
          <span className="text-sm font-medium">{t('filter_filters')} :</span>
        </div>

        {/* Condition pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {conditionFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilterCondition(f.value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer
                ${filterCondition === f.value
                  ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                  : 'bg-white text-[#555555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'}`}
            >
              {f.labelKey ? t(f.labelKey) : f.label}
            </button>
          ))}
        </div>

        {/* Brand pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {brandFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setFilterBrand(f.value)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer
                ${filterBrand === f.value
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'bg-white text-[#555555] border-gray-200 hover:border-[#1B2A4A] hover:text-[#1B2A4A]'}`}
            >
              {f.labelKey ? t(f.labelKey) : f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="ml-auto px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-[#555555] outline-none focus:border-[#00B4CC] cursor-pointer bg-white"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <p className="text-sm text-[#555555]">
        <span className="font-semibold text-[#1B2A4A]">{total}</span> {t('filter_phones_found')}
      </p>
    </div>
  );
}
