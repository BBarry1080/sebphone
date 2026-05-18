import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPhoneImage } from '../utils/phoneImage'
import { useLanguage } from '../contexts/LanguageContext'

const CATEGORIE_CONFIG = {
  tablette: {
    titre: 'Tablettes',
    description: 'iPad, Galaxy Tab et plus — neufs, reconditionnés et occasions',
    icon: '📟',
    emoji: '📟',
  },
  montre: {
    titre: 'Montres connectées',
    description: 'Apple Watch, Galaxy Watch — autonomie et fonctions vérifiées',
    icon: '⌚',
    emoji: '⌚',
  },
  ecouteur: {
    titre: 'Écouteurs & AirPods',
    description: 'AirPods, Galaxy Buds, Sony — qualité audio testée et garantie',
    icon: '🎧',
    emoji: '🎧',
  },
  ordinateur: {
    titre: 'Ordinateurs',
    description: 'MacBook, Dell, HP — reconditionnés testés avec garantie',
    icon: '💻',
    emoji: '💻',
  },
  accessoire: {
    titre: 'Accessoires',
    description: 'Coques, chargeurs, câbles — compatibles iPhone et Samsung',
    icon: '🛍️',
    emoji: '🛍️',
  },
}

export default function CataloguePage() {
  const { categorie } = useParams()
  const { t } = useLanguage()
  const config = CATEGORIE_CONFIG[categorie] || {}
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCondition, setFilterCondition] = useState('tous')

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

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.model?.toLowerCase().includes(search.toLowerCase())
    const matchCondition = filterCondition === 'tous' || p.condition === filterCondition
    return matchSearch && matchCondition
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="text-[#00B4CC] text-sm mb-4 inline-block">
            {t('cat_back')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{config.emoji}</span>
            <div>
              <h1 className="text-3xl font-black">{config.titre}</h1>
              <p className="text-gray-300 mt-1">{config.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('cat_search')}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm
                       focus:border-[#00B4CC] outline-none flex-1 min-w-48 bg-white"
          />
          {['tous', 'neuf', 'occasion', 'reconditionne'].map(c => (
            <button key={c}
              onClick={() => setFilterCondition(c)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border
                ${filterCondition === c
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'bg-white text-gray-600 border-gray-200'}`}>
              {c === 'tous' ? t('cat_filter_all')
                : c === 'neuf' ? t('cat_filter_new')
                : c === 'occasion' ? t('cat_filter_used')
                : t('cat_filter_refurbished')}
            </button>
          ))}
        </div>

        {/* Résultats */}
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
              className="mt-4 inline-block bg-[#00B4CC] text-white
                         px-6 py-2 rounded-xl font-bold text-sm">
              {t('cat_contact')}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(product => (
              <div key={product.id}
                className="bg-white rounded-2xl border border-gray-100
                           shadow-sm hover:shadow-md transition-all p-4">

                {/* Image */}
                <div className="aspect-square bg-gray-50 rounded-xl
                                flex items-center justify-center mb-3 overflow-hidden">
                  <img
                    src={getPhoneImage(product.name, product.color)}
                    alt={product.name}
                    className="w-24 h-24 object-contain"
                    onError={e => {
                      e.target.onerror = null
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML =
                        `<span style="font-size:48px">${config.emoji}</span>`
                    }}
                  />
                </div>

                {/* Infos */}
                <h3 className="font-bold text-[#1B2A4A] text-sm mb-1">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  {product.storage && `${product.storage} · `}
                  {product.color}
                </p>

                {/* Badges */}
                <div className="flex gap-1 flex-wrap mb-3">
                  <span className="text-xs px-2 py-0.5 bg-gray-100
                                   text-gray-600 rounded-lg font-medium">
                    {product.condition === 'neuf' ? t('cat_filter_new')
                      : product.condition === 'occasion' ? t('cat_filter_used')
                      : t('cat_filter_refurbished')}
                  </span>
                  {product.grade && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50
                                     text-blue-600 rounded-lg font-medium">
                      {product.grade}
                    </span>
                  )}
                </div>

                {/* Prix + CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-[#1B2A4A]">
                    {product.price}€
                  </span>
                  <a href={`mailto:contact@sebphone.be?subject=Intérêt pour ${product.name}`}
                    className="bg-[#00B4CC] text-white text-xs font-bold
                               px-3 py-1.5 rounded-lg hover:bg-[#1B2A4A] transition-all">
                    {t('cat_interested')}
                  </a>
                </div>

                {/* Garantie */}
                <p className="text-xs text-green-600 font-medium mt-2">
                  {t('cat_guarantee')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
