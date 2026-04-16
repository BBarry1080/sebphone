import { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'recent',      label: 'Plus récents' },
  { value: 'featured',    label: 'En vedette' },
  { value: 'best_seller', label: 'Meilleures ventes' },
  { value: 'alpha_asc',   label: 'Alphabétique, A à Z' },
  { value: 'alpha_desc',  label: 'Alphabétique, Z à A' },
  { value: 'price_asc',   label: 'Prix : faible à élevé' },
  { value: 'price_desc',  label: 'Prix : élevé à faible' },
  { value: 'date_asc',    label: 'Date, plus ancienne' },
  { value: 'date_desc',   label: 'Date, plus récente' },
];

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-[#1B2A4A] mb-3 cursor-pointer"
      >
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && children}
    </div>
  );
}

function CheckRow({ label, count, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer group py-0.5">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-4 h-4 accent-[#00B4CC] cursor-pointer"
        />
        <span className="text-sm text-[#333] group-hover:text-[#00B4CC] transition-colors">{label}</span>
      </span>
      {count !== undefined && (
        <span className="text-xs text-[#888888]">{count}</span>
      )}
    </label>
  );
}

function SidebarContent({
  filterBrand, setFilterBrand,
  filterCondition, setFilterCondition,
  filterStatus, setFilterStatus,
  priceRange, setPriceRange,
  onReset,
}) {
  const brands = [
    { value: 'Apple',   label: 'Apple',   count: 7 },
    { value: 'Samsung', label: 'Samsung', count: 5 },
  ];
  const conditions = [
    { value: 'neuf',          label: 'Neuf',          count: 3 },
    { value: 'reconditionne', label: 'Reconditionné',  count: 6 },
    { value: 'occasion',      label: 'Occasion',       count: 3 },
  ];
  const statuses = [
    { value: 'disponible', label: 'En stock', count: 9 },
    { value: 'reserve',    label: 'Réservé',  count: 2 },
    { value: 'vendu',      label: 'Vendu',    count: 1 },
  ];
  const gradesList = [
    { value: 'parfait',   label: 'Parfait (Grade 4)' },
    { value: 'tres_bon',  label: 'Très bon (Grade 3)' },
    { value: 'correct',   label: 'Correct (Grade 2)' },
    { value: 'imparfait', label: 'Imparfait (Grade 1)' },
  ];

  return (
    <div className="flex flex-col">
      <Section title="Prix">
        <div className="flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={1500}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full accent-[#00B4CC]"
          />
          <div className="flex items-center justify-between text-xs text-[#555555]">
            <span>{priceRange[0]}€</span>
            <span>{priceRange[1]}€</span>
          </div>
        </div>
      </Section>

      <Section title="Disponibilité">
        <div className="flex flex-col gap-1.5">
          {statuses.map((s) => (
            <CheckRow key={s.value} label={s.label} count={s.count}
              checked={filterStatus === s.value}
              onChange={() => setFilterStatus(filterStatus === s.value ? null : s.value)}
            />
          ))}
        </div>
      </Section>

      <Section title="Marque">
        <div className="flex flex-col gap-1.5">
          {brands.map((b) => (
            <CheckRow key={b.value} label={b.label} count={b.count}
              checked={filterBrand === b.value}
              onChange={() => setFilterBrand(filterBrand === b.value ? null : b.value)}
            />
          ))}
        </div>
      </Section>

      <Section title="État">
        <div className="flex flex-col gap-1.5">
          {conditions.map((c) => (
            <CheckRow key={c.value} label={c.label} count={c.count}
              checked={filterCondition === c.value}
              onChange={() => setFilterCondition(filterCondition === c.value ? null : c.value)}
            />
          ))}
        </div>
      </Section>

      <Section title="Grade" defaultOpen={false}>
        <div className="flex flex-col gap-1.5">
          {gradesList.map((g) => (
            <CheckRow key={g.value} label={g.label} checked={false} onChange={() => {}} />
          ))}
        </div>
      </Section>

      <button
        onClick={onReset}
        className="w-full text-center text-sm text-[#555555] hover:text-[#00B4CC] py-2 transition-colors cursor-pointer"
      >
        Effacer tout
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MobileFilterBar — barre filtre + tri, rendue EN DEHORS
   du flex-row catalog (évite le sidebar fantôme)
───────────────────────────────────────────────────────── */
export function MobileFilterBar({
  filterBrand, setFilterBrand,
  filterCondition, setFilterCondition,
  filterStatus, setFilterStatus,
  sortBy, setSortBy,
  total,
}) {
  const [priceRange, setPriceRange] = useState([0, 1500]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const onReset = () => {
    setFilterBrand(null);
    setFilterCondition(null);
    setFilterStatus(null);
    setPriceRange([0, 1500]);
  };

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Trier';

  return (
    /* Visible uniquement < lg */
    <div className="lg:hidden mb-4 flex items-center justify-between gap-3">
      {/* Bouton filtre */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-[#555555] hover:border-[#00B4CC] hover:text-[#00B4CC] transition-colors cursor-pointer"
      >
        <SlidersHorizontal size={14} />
        Filtrer par
      </button>

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortOpen(!sortOpen)}
          className="flex items-center gap-1 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-[#555555] hover:border-[#00B4CC] cursor-pointer"
        >
          <span className="max-w-[120px] truncate">{activeSortLabel}</span>
          <ChevronDown size={13} className="flex-shrink-0" />
        </button>
        {sortOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
            <div className="absolute right-0 top-10 z-30 bg-white border border-gray-200 rounded-xl shadow-lg w-56 overflow-hidden">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { setSortBy(o.value); setSortOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                    sortBy === o.value
                      ? 'bg-[#2563EB] text-white font-medium'
                      : 'text-[#333] hover:bg-gray-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Drawer — fixed, hors du flux */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[85vw] max-w-[320px] bg-white z-50 flex flex-col shadow-2xl
                    transform transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-poppins font-bold text-[#1B2A4A]">Filtres</h3>
          <button onClick={() => setDrawerOpen(false)} className="p-1 cursor-pointer">
            <X size={20} className="text-[#555555]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SidebarContent
            filterBrand={filterBrand} setFilterBrand={setFilterBrand}
            filterCondition={filterCondition} setFilterCondition={setFilterCondition}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            priceRange={priceRange} setPriceRange={setPriceRange}
            onReset={onReset}
          />
        </div>
        <div className="p-5 border-t border-gray-100 bg-white">
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-full bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            Voir les {total} résultats
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FilterSidebar — sidebar desktop SEULEMENT (hidden sur mobile)
   Rendu à l'intérieur du flex-row catalog
───────────────────────────────────────────────────────── */
export default function FilterSidebar({
  filterBrand, setFilterBrand,
  filterCondition, setFilterCondition,
  filterStatus, setFilterStatus,
  search, setSearch,
}) {
  const [priceRange, setPriceRange] = useState([0, 1500]);

  const onReset = () => {
    setFilterBrand(null);
    setFilterCondition(null);
    setFilterStatus(null);
    setPriceRange([0, 1500]);
  };

  return (
    /* hidden par défaut — flex uniquement lg+ */
    <aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-poppins font-bold text-[#1B2A4A]">Filtrer</h3>
        <button onClick={onReset} className="text-xs text-[#555555] hover:text-[#00B4CC] cursor-pointer transition-colors flex items-center gap-1">
          <X size={13} />
          Effacer
        </button>
      </div>

      <input
        type="text"
        value={search || ''}
        onChange={(e) => setSearch?.(e.target.value)}
        placeholder="Rechercher un modèle..."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] mb-5 transition-all"
      />

      <SidebarContent
        filterBrand={filterBrand} setFilterBrand={setFilterBrand}
        filterCondition={filterCondition} setFilterCondition={setFilterCondition}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        priceRange={priceRange} setPriceRange={setPriceRange}
        onReset={onReset}
      />
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────
   SortDropdown — affiché uniquement desktop (lg+)
───────────────────────────────────────────────────────── */
export function SortDropdown({ sortBy, setSortBy }) {
  const [open, setOpen] = useState(false);
  const label = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Trier';

  return (
    <div className="relative hidden lg:block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-[#555555] hover:border-[#1B2A4A] cursor-pointer transition-colors"
      >
        {label}
        <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 bg-white border border-gray-200 rounded-xl shadow-lg w-60 overflow-hidden">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { setSortBy(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                  sortBy === o.value
                    ? 'bg-[#2563EB] text-white font-medium'
                    : 'text-[#333] hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
