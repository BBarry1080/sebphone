import { useGroupedPhones } from '../hooks/useGroupedPhones'
import FilterSidebar, { MobileFilterBar, SortDropdown } from '../components/catalogue/FilterSidebar'
import PhoneListCard from '../components/catalogue/PhoneListCard'
import GradeSystem from '../components/ui/GradeSystem'
import WeeklyOffer from '../components/catalogue/WeeklyOffer'
import Spinner from '../components/ui/Spinner'

export default function Reconditiones() {
  const {
    groups, phones, totalPhones, loading, error,
    search, setSearch,
    filterCondition, setFilterCondition,
    filterBrand, setFilterBrand,
    filterStatus, setFilterStatus,
    filterMagasin, setFilterMagasin,
    sortBy, setSortBy,
  } = useGroupedPhones('reconditionne')

  return (
    <main className="pb-24 md:pb-12">
      <WeeklyOffer />

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-cyan-50 text-[#00B4CC] text-xs font-medium px-3 py-1.5 rounded-full mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00B4CC]" />
            Certifiés &amp; Garantis
          </div>
          <h1 className="font-poppins font-bold text-3xl md:text-4xl text-[#1B2A4A] mb-1">
            Téléphones <span className="text-[#00B4CC]">Reconditionnés</span>
          </h1>
          <p className="text-[#555555]">Testés, réparés, garantis — comme neufs à prix réduit</p>
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
          filterMagasin={filterMagasin} setFilterMagasin={setFilterMagasin}
          sortBy={sortBy} setSortBy={setSortBy}
          total={totalPhones}
          phones={phones}
        />

        <div className="flex gap-8 items-start">
          <FilterSidebar
            search={search} setSearch={setSearch}
            filterCondition={filterCondition} setFilterCondition={setFilterCondition}
            filterBrand={filterBrand} setFilterBrand={setFilterBrand}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterMagasin={filterMagasin} setFilterMagasin={setFilterMagasin}
            sortBy={sortBy} setSortBy={setSortBy}
            total={totalPhones}
            phones={phones}
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
      </div>

      <GradeSystem />
    </main>
  )
}
