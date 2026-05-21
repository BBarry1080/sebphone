import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPhoneImage } from '../utils/phoneImage'
import { useLanguage } from '../contexts/LanguageContext'
import FilterSidebar, { MobileFilterBar } from '../components/catalogue/FilterSidebar'

const getCategorieConfig = (t) => ({
  tablette: {
    titre: t('cat_tablette_title'),
    description: t('cat_tablette_desc'),
    icon: '📟',
    emoji: '📟',
  },
  montre: {
    titre: t('cat_montre_title'),
    description: t('cat_montre_desc'),
    icon: '⌚',
    emoji: '⌚',
  },
  ecouteur: {
    titre: t('cat_ecouteur_title'),
    description: t('cat_ecouteur_desc'),
    icon: '🎧',
    emoji: '🎧',
  },
  ordinateur: {
    titre: t('cat_ordinateur_title'),
    description: t('cat_ordinateur_desc'),
    icon: '💻',
    emoji: '💻',
  },
  accessoire: {
    titre: t('cat_accessoire_title'),
    description: t('cat_accessoire_desc'),
    icon: '🛍️',
    emoji: '🛍️',
  },
})

export default function CataloguePage() {
  const { categorie } = useParams()
  const [searchParams] = useSearchParams()
  const brandParam = searchParams.get('brand')
  const { t } = useLanguage()
  const config = getCategorieConfig(t)[categorie] || {}
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // États filtres (alimentés par FilterSidebar)
  const [search, setSearch] = useState('')
  const [filterCondition, setFilterCondition] = useState(null)
  const [filterBrand, setFilterBrand] = useState(brandParam || null)
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterMagasin, setFilterMagasin] = useState(null)
  const [filterGrade, setFilterGrade] = useState(null)
  const [sortBy, setSortBy] = useState('alpha_asc')

  // Synchronise brand depuis l'URL
  useEffect(() => {
    setFilterBrand(brandParam || null)
  }, [brandParam])

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('categorie', categorie)
        .eq('status', 'disponible')
        .eq('visible_on_site', true)
        .order('created_at', { ascending: false })
      setProducts(data || [])
      setLoading(false)
    }
    fetchProducts()
  }, [categorie])

  const filtered = products.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.name?.toLowerCase().includes(q) && !p.model?.toLowerCase().includes(q)) return false
    }
    if (filterBrand) {
      const b = filterBrand.toLowerCase()
      if (p.brand?.toLowerCase() !== b && !p.name?.toLowerCase().includes(b)) return false
    }
    if (filterCondition && p.condition !== filterCondition) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterGrade && p.grade !== filterGrade) return false
    if (filterMagasin && !(Array.isArray(p.magasins) && p.magasins.includes(filterMagasin))) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="text-[#00B4CC] text-sm mb-4 inline-block">
            {t('cat_back')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <h1 className="text-3xl font-black">{config.titre}</h1>
              <p className="text-gray-300 mt-1">{config.description}</p>
              {brandParam && (
                <p className="text-sm text-[#00B4CC] mt-1">
                  Marque : <strong>{brandParam}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <MobileFilterBar
          filterBrand={filterBrand} setFilterBrand={setFilterBrand}
          filterCondition={filterCondition} setFilterCondition={setFilterCondition}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterMagasin={filterMagasin} setFilterMagasin={setFilterMagasin}
          filterGrade={filterGrade} setFilterGrade={setFilterGrade}
          sortBy={sortBy} setSortBy={setSortBy}
          total={filtered.length}
          phones={products}
        />

        <div className="flex gap-8 items-start">
          <FilterSidebar
            search={search} setSearch={setSearch}
            filterCondition={filterCondition} setFilterCondition={setFilterCondition}
            filterBrand={filterBrand} setFilterBrand={setFilterBrand}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterMagasin={filterMagasin} setFilterMagasin={setFilterMagasin}
            filterGrade={filterGrade} setFilterGrade={setFilterGrade}
            sortBy={sortBy} setSortBy={setSortBy}
            total={filtered.length}
            phones={products}
          />

          <div className="flex-1 min-w-0 w-full">
            {loading ? (
              <div className="text-center py-12 text-gray-400">{t('cat_loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-5xl">{config.emoji}</span>
                <p className="text-gray-500 mt-3">
                  Aucun {config.titre?.toLowerCase()} disponible pour le moment
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {t('cat_empty_desc')}
                </p>
                <a href="mailto:contact@sebphone.be"
                  className="mt-4 inline-block bg-[#00B4CC] text-white px-6 py-2 rounded-xl font-bold text-sm">
                  {t('cat_contact')}
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((product) => (
                  <div key={product.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4">
                    <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
                      <img
                        src={getPhoneImage(product.name, product.color)}
                        alt={product.name}
                        className="w-24 h-24 object-contain"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = `<span style="font-size:48px">${config.emoji}</span>`
                        }}
                      />
                    </div>
                    <h3 className="font-bold text-[#1B2A4A] text-sm mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {product.storage && `${product.storage} · `}
                      {product.color}
                    </p>
                    <div className="flex gap-1 flex-wrap mb-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg font-medium">
                        {product.condition === 'neuf' ? t('cat_filter_new')
                          : product.condition === 'occasion' ? t('cat_filter_used')
                          : t('cat_filter_refurbished')}
                      </span>
                      {product.grade && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg font-medium">
                          {product.grade}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-[#1B2A4A]">{product.price}€</span>
                      <a href={`mailto:contact@sebphone.be?subject=Intérêt pour ${product.name}`}
                        className="bg-[#00B4CC] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1B2A4A] transition-all">
                        {t('cat_interested')}
                      </a>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-2">{t('cat_guarantee')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
