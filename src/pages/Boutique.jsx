import { useGroupedPhones } from '../hooks/useGroupedPhones'
import FilterSidebar, { MobileFilterBar, SortDropdown } from '../components/catalogue/FilterSidebar'
import PhoneListCard from '../components/catalogue/PhoneListCard'
import Spinner from '../components/ui/Spinner'

export default function Boutique({ defaultBrand = null }) {
  const {
    groups, phones, totalPhones, loading, error,
    search, setSearch,
    filterCondition, setFilterCondition,
    filterBrand, setFilterBrand,
    filterStatus, setFilterStatus,
    filterGrade, setFilterGrade,
    sortBy, setSortBy,
  } = useGroupedPhones(null, defaultBrand)

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-24 md:pb-12">
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

      <MobileFilterBar
        filterBrand={filterBrand} setFilterBrand={setFilterBrand}
        filterCondition={filterCondition} setFilterCondition={setFilterCondition}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterGrade={filterGrade} setFilterGrade={setFilterGrade}
        sortBy={sortBy} setSortBy={setSortBy}
        total={totalPhones}
        phones={phones}
        hideBrandFilter={!!defaultBrand}
      />

      <div className="flex gap-8 items-start">
        <FilterSidebar
          search={search} setSearch={setSearch}
          filterCondition={filterCondition} setFilterCondition={setFilterCondition}
          filterBrand={filterBrand} setFilterBrand={setFilterBrand}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterGrade={filterGrade} setFilterGrade={setFilterGrade}
          sortBy={sortBy} setSortBy={setSortBy}
          total={totalPhones}
          phones={phones}
          hideBrandFilter={!!defaultBrand}
        />

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-[#555555]">
              <span className="font-semibold text-[#1B2A4A]">{groups.length}</span> modèle{groups.length !== 1 ? 's' : ''}
              {' '}·{' '}
              <span className="font-semibold text-[#1B2A4A]">{totalPhones}</span> appareil{totalPhones !== 1 ? 's' : ''}
            </p>
            <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
          </div>

          {loading ? (
            <Spinner />
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-4xl mb-4">📱</p>
              <p className="text-[#1B2A4A] font-semibold text-lg">Aucun téléphone trouvé</p>
              <p className="text-[#555555] text-sm mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {groups.map((group) => (
                <PhoneListCard key={group.model} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
