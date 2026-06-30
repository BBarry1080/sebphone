import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { useGroupedPhones } from '../hooks/useGroupedPhones'
import FilterSidebar, { MobileFilterBar, SortDropdown } from '../components/catalogue/FilterSidebar'
import PhoneListCard from '../components/catalogue/PhoneListCard'
import Spinner from '../components/ui/Spinner'
import { useLanguage } from '../contexts/LanguageContext'
import { IPHONE_ON_DEMAND } from '../data/iphoneOnDemand'
import { IPHONE_DATABASE } from '../data/iphoneDatabase'
import { PHONES_DATABASE } from '../data/phonesDatabase'
import { getPhoneImage } from '../utils/phoneImage'

const IPHONE_STARTING_PRICES = {
  'iPhone 7': 69,
  'iPhone 7 Plus': 79,
  'iPhone 8': 89,
  'iPhone 8 Plus': 99,
  'iPhone SE (2020)': 99,
  'iPhone X': 119,
  'iPhone XS': 119,
  'iPhone XR': 129,
  'iPhone XS Max': 129,
  'iPhone 11': 139,
  'iPhone 11 Pro': 189,
  'iPhone 11 Pro Max': 199,
  'iPhone 12': 179,
  'iPhone 12 Pro': 199,
  'iPhone 12 Pro Max': 289,
  'iPhone 12 mini': 159,
  'iPhone 13': 229,
  'iPhone 13 mini': 229,
  'iPhone 13 Pro': 299,
  'iPhone 13 Pro Max': 349,
  'iPhone 14': 299,
  'iPhone 14 Plus': 309,
  'iPhone 14 Pro': 399,
  'iPhone 14 Pro Max': 429,
  'iPhone 15': 389,
  'iPhone 15 Plus': 399,
  'iPhone 15 Pro': 499,
  'iPhone 15 Pro Max': 549,
  'iPhone 16': 499,
  'iPhone 16 Plus': 549,
  'iPhone 16 Pro': 629,
  'iPhone 16 Pro Max': 689,
  'iPhone 16e': 399,
  'iPhone 17e': 599,
  'iPhone 17': 799,
  'iPhone 17 Air': 649,
  'iPhone 17 Pro': 1099,
  'iPhone 17 Pro Max': 1149,
}

export default function Boutique({ defaultBrand = null }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('list')
  const [searchParams, setSearchParams] = useSearchParams()
  const [allCanonicalModels, setAllCanonicalModels] = useState([])
  const {
    groups, phones, totalPhones, loading, error,
    setSearch: hookSetSearch,
    setFilterCondition: hookSetFilterCondition,
    filterBrand, setFilterBrand,
    setFilterStatus: hookSetFilterStatus,
    filterGrade, setFilterGrade,
    sortBy, setSortBy,
  } = useGroupedPhones(null, defaultBrand)

  const search          = searchParams.get('q')         || ''
  const filterCondition = searchParams.get('condition') || null
  const filterStatus    = searchParams.get('status')    || null

  const updateParam = (key, val) => {
    const params = new URLSearchParams(searchParams)
    if (val) params.set(key, val)
    else params.delete(key)
    setSearchParams(params, { replace: true })
  }

  const setSearch          = (val) => updateParam('q', val)
  const setFilterCondition = (val) => updateParam('condition', val)
  const setFilterStatus    = (val) => updateParam('status', val)

  // Synchronise URL → hook (le hook drive le fetch/filter des phones)
  useEffect(() => { hookSetSearch(search) }, [search])
  useEffect(() => { hookSetFilterCondition(filterCondition) }, [filterCondition])
  useEffect(() => { hookSetFilterStatus(filterStatus) }, [filterStatus])

  useEffect(() => {
    setFilterBrand(defaultBrand || null)
    setFilterGrade(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultBrand])

  useEffect(() => {
    if (defaultBrand === 'Apple') {
      const legacyModels = IPHONE_DATABASE.filter((i) =>
        i.model.startsWith('iPhone 7') ||
        i.model.startsWith('iPhone 8') ||
        i.model === 'iPhone SE (2020)'
      )
      setAllCanonicalModels([
        ...legacyModels.map((i) => ({
          model: i.model,
          brand: 'Apple',
          storages: i.storages,
          colors: i.colors,
        })),
        ...IPHONE_ON_DEMAND.map((i) => ({
          model: i.model,
          brand: 'Apple',
          storages: i.storages,
          colors: i.colors,
        })),
      ])
    } else if (defaultBrand === 'Samsung') {
      const samsungModels = PHONES_DATABASE['Samsung'] || []
      setAllCanonicalModels(samsungModels.map((m) => ({
        model: m.model,
        brand: 'Samsung',
        storages: m.storages,
        colors: m.colors,
      })))
    } else {
      const legacyModels = IPHONE_DATABASE.filter((i) =>
        i.model.startsWith('iPhone 7') ||
        i.model.startsWith('iPhone 8') ||
        i.model === 'iPhone SE (2020)'
      )
      const iphones = [
        ...legacyModels.map((i) => ({
          model: i.model,
          brand: 'Apple',
          storages: i.storages,
          colors: i.colors,
        })),
        ...IPHONE_ON_DEMAND.map((i) => ({
          model: i.model,
          brand: 'Apple',
          storages: i.storages,
          colors: i.colors,
        })),
      ]
      const samsungModels = (PHONES_DATABASE['Samsung'] || []).map((m) => ({
        model: m.model,
        brand: 'Samsung',
        storages: m.storages,
        colors: m.colors,
      }))
      setAllCanonicalModels([...iphones, ...samsungModels])
    }
  }, [defaultBrand])

  const getModelStock = (modelName) => {
    return phones.filter((p) =>
      p.model?.toLowerCase() === modelName.toLowerCase() &&
      p.status === 'disponible'
    )
  }

  const getModelSurCommande = (modelName) => {
    return phones.filter((p) =>
      p.model?.toLowerCase() === modelName.toLowerCase() &&
      p.status === 'sur_commande'
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-24 md:pb-12">
      <div className="mb-6">
        <h1 className="font-poppins font-bold text-3xl md:text-4xl text-[#1B2A4A] mb-1">
          {t('catalogue_title')}
        </h1>
        <p className="text-[#555555]">{t('catalogue_subtitle')}</p>
      </div>

      {error && (
        <div className="text-center py-10 text-red-500 text-sm">
          {t('catalogue_error')}
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
              <span className="font-semibold text-[#1B2A4A]">{groups.length}</span> {t('catalogue_models')}
              {' '}·{' '}
              <span className="font-semibold text-[#1B2A4A]">{totalPhones}</span> {t('catalogue_devices')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('list')} className={`p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#1B2A4A] text-white' : 'text-gray-400 hover:text-[#1B2A4A]'}`}><List size={16} /></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[#1B2A4A] text-white' : 'text-gray-400 hover:text-[#1B2A4A]'}`}><LayoutGrid size={16} /></button>
              </div>
              <SortDropdown sortBy={sortBy} setSortBy={setSortBy} />
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : allCanonicalModels.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allCanonicalModels
                .filter((canonicalModel) => {
                  if (search && !canonicalModel.model
                    .toLowerCase().includes(search.toLowerCase())) return false

                  const modelStock = getModelStock(canonicalModel.model)

                  if (filterCondition) {
                    const hasCondition = modelStock.some(
                      p => p.condition === filterCondition
                    )
                    if (!hasCondition) return false
                  }

                  if (filterStatus === 'disponible') {
                    return modelStock.length > 0
                  }
                  if (filterStatus === 'sur_commande') {
                    return modelStock.length === 0
                  }
                  return true
                })
                .map((canonicalModel) => {
                  const slug = canonicalModel.model
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[()]/g, '')
                    .replace(/[^a-z0-9-]/g, '')
                  const stockPhones = getModelStock(canonicalModel.model)
                  const hasStock = stockPhones.length > 0
                  const stockPrice = hasStock
                    ? Math.min(...stockPhones.map((p) => Number(p.price)).filter((n) => n > 0))
                    : null
                  const fixedPrice = IPHONE_STARTING_PRICES[canonicalModel.model] ?? null
                  const startingPrice = stockPrice != null && fixedPrice != null
                    ? Math.min(stockPrice, fixedPrice)
                    : (stockPrice ?? fixedPrice)

                  return (
                    <div key={canonicalModel.model}
                      onClick={() => navigate(`/modele/${slug}`)}
                      className="bg-white rounded-2xl border-2 border-gray-100 p-4 cursor-pointer hover:border-[#00B4CC] hover:shadow-md transition-all">
                      <img
                        src={getPhoneImage(canonicalModel.model, canonicalModel.colors?.[0] || '')}
                        onError={(e) => { e.target.src = '/images/placeholder.png' }}
                        alt={canonicalModel.model}
                        className="w-full h-32 object-contain mb-3" />
                      <p className="font-bold text-[#1B2A4A] text-sm">
                        {canonicalModel.model}
                      </p>
                      <div className="mt-2">
                        {startingPrice != null && (
                          <p className="text-[#00B4CC] font-black text-lg">
                            À partir de {startingPrice}€
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
