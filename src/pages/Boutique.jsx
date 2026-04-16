import { usePhones } from '../hooks/usePhones';
import FilterSidebar, { MobileFilterBar, SortDropdown } from '../components/catalogue/FilterSidebar';
import PhoneGrid from '../components/catalogue/PhoneGrid';
import Spinner from '../components/ui/Spinner';

export default function Boutique() {
  const {
    phones, loading, error,
    search, setSearch,
    filterCondition, setFilterCondition,
    filterBrand, setFilterBrand,
    filterStatus, setFilterStatus,
    sortBy, setSortBy,
  } = usePhones();

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-24 md:pb-12">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-poppins font-bold text-3xl md:text-4xl text-[#1B2A4A] mb-1">
          Notre <span className="text-[#00B4CC]">Boutique</span>
        </h1>
        <p className="text-[#555555]">Tous nos téléphones — neufs, reconditionnés et occasions</p>
      </div>

      {error && (
        <div className="text-center py-10 text-red-500 text-sm">
          Erreur de chargement des données. Veuillez réessayer.
        </div>
      )}

      {/* Mobile filter bar — outside flex row */}
      <MobileFilterBar
        filterBrand={filterBrand} setFilterBrand={setFilterBrand}
        filterCondition={filterCondition} setFilterCondition={setFilterCondition}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        sortBy={sortBy} setSortBy={setSortBy}
        total={phones.length}
      />

      {/* Catalog layout */}
      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <FilterSidebar
          search={search} setSearch={setSearch}
          filterCondition={filterCondition} setFilterCondition={setFilterCondition}
          filterBrand={filterBrand} setFilterBrand={setFilterBrand}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          sortBy={sortBy} setSortBy={setSortBy}
          total={phones.length}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 w-full">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[#555555]">
              <span className="font-semibold text-[#1B2A4A]">{phones.length}</span> appareil{phones.length !== 1 ? 's' : ''}
            </p>
            <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
          </div>

          {loading ? <Spinner /> : <PhoneGrid phones={phones} />}
        </div>
      </div>
    </main>
  );
}
