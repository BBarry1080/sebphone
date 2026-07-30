// SQL à exécuter dans Supabase si la colonne manque :
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS battery_health INTEGER DEFAULT NULL;

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Smartphone, CheckCircle, MapPin, ShoppingCart, Check } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { useCart } from '../contexts/CartContext'
import { phonesMock } from '../data/phonesMock'
import Spinner from '../components/ui/Spinner'
import { colorToHex } from '../components/catalogue/PhoneListCard'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { getCanonicalModel, getCanonicalImage, colorsMatch } from '../data/canonicalCatalog'
import { getStartingPrice } from '../data/startingPrices'
import { charmPrice } from '../utils/charmPrice'

const PRIORITY_PARTS = ['Vitre arrière', 'Batterie', 'Écran']
// Ces valeurs servent au matching sur les données ; l'affichage passe par translateRepair().

const getPublicParts = (parts) => {
  if (!parts || parts.length === 0) return []
  return PRIORITY_PARTS
    .filter((priority) => parts.some((p) => typeof p === 'string' && p.startsWith(priority)))
    .slice(0, 3)
}

function gradeScore(phone) {
  if (!phone) return 0
  if (phone.condition === 'reconditionne') {
    return { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 }[phone.grade] || 0
  }
  return { 'Neuf': 4, 'Comme neuf': 3, 'Très bon état': 2, 'État correct': 1 }[phone.grade] || 0
}

const GRADE_STYLE = {
  'Neuf':          'bg-green-100 text-green-700 border-green-200',
  'Comme neuf':    'bg-green-100 text-green-700 border-green-200',
  'Très bon état': 'bg-blue-100 text-blue-700 border-blue-200',
  'Bon état':      'bg-cyan-100 text-cyan-700 border-cyan-200',
  'A+':            'bg-green-100 text-green-700 border-green-200',
  'A':             'bg-blue-100 text-blue-700 border-blue-200',
  'B':             'bg-cyan-100 text-cyan-700 border-cyan-200',
  'C':             'bg-cyan-100 text-cyan-700 border-cyan-200',
}

const CONDITION_STYLE = {
  'neuf':          'bg-green-50 text-green-700 border-green-200',
  'reconditionne': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'occasion':      'bg-blue-50 text-blue-700 border-blue-200',
}
const CONDITION_KEY = {
  'neuf':          'condition_new',
  'reconditionne': 'condition_refurbished',
  'occasion':      'condition_used',
}

import { MAGASINS } from '../utils/magasins'
import { useLanguage } from '../contexts/LanguageContext'
import { translateColor } from '../utils/translateColor'
import { getSurCommandeColors, getSurCommandeStorages } from '../utils/surCommandeColors'
import { IPHONE_ON_DEMAND } from '../data/iphoneOnDemand'
import { IPHONE_DATABASE } from '../data/iphoneDatabase'
import { PHONES_DATABASE } from '../data/phonesDatabase'

const translateRepair = (name, t) => {
  const map = {
    'batterie': t('repair_battery'),
    'battery': t('repair_battery'),
    'écran': t('repair_screen'),
    'screen': t('repair_screen'),
    'caméra': t('repair_camera'),
    'camera': t('repair_camera'),
    'bouton': t('repair_button'),
    'button': t('repair_button'),
    'haut-parleur': t('repair_speaker'),
    'speaker': t('repair_speaker'),
    'connecteur': t('repair_charging'),
    'charging': t('repair_charging'),
    'vitre arrière': t('part_back_glass'),
    'vitre arriere': t('part_back_glass'),
    'back glass': t('part_back_glass'),
  }
  return map[name?.toLowerCase()] || name
}

const translateGrade = (grade, t) => {
  const map = {
    'comme neuf': t('grade_comme_neuf'),
    'bon état': t('grade_bon_etat'),
    'très bon état': t('grade_tres_bon'),
    'parfait état': t('grade_parfait'),
    'like new': t('grade_comme_neuf'),
    'good condition': t('grade_bon_etat'),
  }
  return map[grade?.toLowerCase()] || grade
}


function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
          : 'bg-white text-[#555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'
      }`}
    >
      {label}
    </button>
  )
}

const COLOR_HEX = {
  'Noir': '#1a1a1a',
  'Blanc': '#f5f5f0',
  'Bleu': '#3d6b8c',
  'Bleu azur': '#4a90d9',
  'Rose': '#e8b4b8',
  'Rose Gold': '#f4c2c2',
  'Vert': '#4a7c59',
  'Vert jade': '#2d6a4f',
  'Violet': '#7b5ea7',
  'Ultraviolet': '#5c4b8a',
  'Or': '#d4a017',
  'Argent': '#c0c0c0',
  'Gris sidéral': '#4a4a4a',
  'Graphite': '#383838',
  'Minuit': '#1c1c1e',
  'Lumière stellaire': '#f2e8d9',
  'Titane naturel': '#8c7b6b',
  'Titane blanc': '#e8e0d8',
  'Titane noir': '#2c2c2e',
  'Titane du désert': '#c4a882',
  'Titane bleu': '#5b7fa6',
  'PRODUCT RED': '#ff3b30',
  'Jaune': '#ffd60a',
  'Orange cosmique': '#ff6b35',
  'Menthe': '#98d8c8',
}

export default function ModelDetailPage() {
  const { modelSlug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const filterStatus = searchParams.get('status') // 'disponible' | 'sur_commande' | null
  const { t } = useLanguage()
  const { addToCart, isInCart } = useCart()
  const [phones, setPhones]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStorage, setFilterStorage] = useState(null)
  const [filterColor, setFilterColor]   = useState(null)
  const [selectedSurCommandeColor, setSelectedSurCommandeColor] = useState('')
  const [selectedSurCommandeStorage, setSelectedSurCommandeStorage] = useState('')
  const [surCommandeImageUrl, setSurCommandeImageUrl] = useState('')

  const [alertEmail, setAlertEmail]     = useState('')
  const [alertPhone, setAlertPhone]     = useState('')
  const [alertStatus, setAlertStatus]   = useState(null)
  const [alertLoading, setAlertLoading] = useState(false)

  const handleStockAlert = async () => {
    if (!alertEmail || !alertEmail.includes('@')) {
      setAlertStatus('error')
      return
    }
    setAlertLoading(true)
    try {
      const decodedModel = modelSlug.replace(/-/g, ' ')
      const { error } = await supabase
        .from('interested_clients')
        .insert({
          customer_name:  alertEmail.split('@')[0],
          customer_email: alertEmail.toLowerCase().trim(),
          customer_phone: alertPhone.trim() || null,
          categorie:      phones[0]?.categorie || 'telephone',
          brand:          phones[0]?.brand || 'Apple',
          model:          decodedModel,
          status:         'en_attente',
        })

      if (error && error.code !== '23505') {
        setAlertStatus('error')
      } else {
        setAlertStatus('success')
        setAlertEmail('')
        setAlertPhone('')
      }
    } catch {
      setAlertStatus('error')
    }
    setAlertLoading(false)
  }

  useEffect(() => {
    async function fetchPhones() {
      setLoading(true)
      const rawDecoded = decodeURIComponent(modelSlug).replace(/-/g, ' ')

      const findCanonicalModel = (slug) => {
        const slugNorm = slug.toLowerCase().replace(/[^a-z0-9]/g, '')

        const fromIphone = IPHONE_ON_DEMAND.find((i) =>
          i.model.toLowerCase().replace(/[^a-z0-9]/g, '') === slugNorm
        )
        if (fromIphone) return fromIphone.model

        const fromLegacy = IPHONE_DATABASE.find((i) =>
          i.model.toLowerCase().replace(/[^a-z0-9]/g, '') === slugNorm
        )
        if (fromLegacy) return fromLegacy.model

        const fromOther = Object.values(PHONES_DATABASE).flat().find((p) =>
          p.model.toLowerCase().replace(/[^a-z0-9]/g, '') === slugNorm
        )
        if (fromOther) return fromOther.model

        return rawDecoded
      }

      const decodedModel = findCanonicalModel(decodeURIComponent(modelSlug))

      if (!isSupabaseReady) {
        const result = phonesMock.filter((p) => {
          const name = (typeof p.model === 'string' ? p.model : p.model?.name) || p.name || ''
          return name.toLowerCase().includes(decodedModel.toLowerCase())
        })
        setPhones(result)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('phones')
        .select('*')
        .ilike('model', decodedModel)
        .in('status', ['disponible', 'sur_commande'])
        .or('visible_on_site.eq.true,visible_on_site.is.null,status.eq.sur_commande')
        .order('price', { ascending: false })

      const canonicalIphone = IPHONE_ON_DEMAND.find((i) =>
        i.model.toLowerCase() === decodedModel.toLowerCase()
      )
      const canonicalLegacy = IPHONE_DATABASE.find((i) =>
        i.model.toLowerCase() === decodedModel.toLowerCase()
      )
      const canonicalOther = Object.values(PHONES_DATABASE)
        .flat()
        .find((p) => p.model.toLowerCase() === decodedModel.toLowerCase())
      const canonicalFromCatalog = getCanonicalModel(decodedModel)

      const canonical = canonicalIphone || canonicalLegacy ||
        canonicalOther || canonicalFromCatalog

      if (canonical && (!data || data.length === 0)) {
        setPhones([{
          id:          null,
          name:        canonical.model || decodedModel,
          model:       decodedModel,
          brand:       'Apple',
          status:      'sur_commande',
          surCommande: true,
          storages:    canonical.storages ||
            Object.values(canonical.colors || {}).map(() => '').filter(Boolean),
          colors:      Array.isArray(canonical.colors)
            ? canonical.colors
            : (canonical.colors ? Object.keys(canonical.colors) : []),
          price:       0,
          categorie:   'telephone',
        }])
      } else {
        setPhones(data || [])
      }
      setLoading(false)
    }
    fetchPhones()
  }, [modelSlug])

  // Initialise le stockage sur commande selon le modèle chargé
  useEffect(() => {
    const sc = phones.filter((p) => p.status === 'sur_commande')
    if (sc.length > 0) {
      const storages = getSurCommandeStorages(sc[0]?.name || sc[0]?.model)
      setSelectedSurCommandeStorage(storages[0] || '')
    }
  }, [phones])

  useEffect(() => {
    const scLength = phones.filter((p) => p.status === 'sur_commande').length
    if (filterColor && scLength > 0) {
      setSelectedSurCommandeColor(filterColor)
    }
    if (filterStorage && scLength > 0) {
      setSelectedSurCommandeStorage(filterStorage)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterColor, filterStorage, phones.length])

  // Sépare le stock physique des téléphones sur commande
  const stockPhones       = phones.filter((p) => p.status === 'disponible')
  const surCommandePhones = phones.filter((p) => p.status === 'sur_commande')
  const hasSurCommande    = surCommandePhones.length > 0
  const hasStock          = stockPhones.length > 0

  // Filtre status venant de l'URL : ?status=sur_commande masque le stock
  // physique, ?status=disponible masque le bloc sur commande.
  const showStock        = filterStatus !== 'sur_commande' && hasStock
  const showSurCommande  = filterStatus !== 'disponible'   && hasSurCommande

  const modelName = phones[0]
    ? (typeof phones[0].model === 'string' ? phones[0].model : phones[0].model?.name) || phones[0].name
    : modelSlug.replace(/-/g, ' ')

  const canonicalModelData2 = getCanonicalModel(modelName)

  const allColors = canonicalModelData2
    ? Object.keys(canonicalModelData2.colors)
    : (() => {
        const fallback =
          IPHONE_ON_DEMAND.find(i =>
            i.model.toLowerCase() === modelName.toLowerCase()
          ) ||
          IPHONE_DATABASE.find(i =>
            i.model.toLowerCase() === modelName.toLowerCase()
          ) ||
          Object.values(PHONES_DATABASE).flat().find(p =>
            p.model.toLowerCase() === modelName.toLowerCase()
          )
        return fallback?.colors?.length
          ? fallback.colors
          : [...new Set(stockPhones.map(p => p.color).filter(Boolean))]
      })()

  const allStorages = canonicalModelData2
    ? canonicalModelData2.storages
    : (() => {
        const fallback =
          IPHONE_ON_DEMAND.find(i =>
            i.model.toLowerCase() === modelName.toLowerCase()
          ) ||
          IPHONE_DATABASE.find(i =>
            i.model.toLowerCase() === modelName.toLowerCase()
          ) ||
          Object.values(PHONES_DATABASE).flat().find(p =>
            p.model.toLowerCase() === modelName.toLowerCase()
          )
        return fallback?.storages?.length
          ? fallback.storages
          : [...new Set(stockPhones.map(p => p.storage).filter(Boolean))]
      })()

  const inStockStorages = new Set(
    stockPhones.map(p => p.storage).filter(Boolean)
  )

  const storages = allStorages
  const colors = allColors

  const filtered = stockPhones.filter((p) => {
    if (filterStorage && p.storage !== filterStorage) return false
    if (filterColor && !colorsMatch(p.color, filterColor, modelName))
      return false
    return true
  })

  // La combinaison exacte choisie par le client est-elle
  // en stock physique ?
  const isCurrentSelectionInStock = stockPhones.some(p =>
    (!filterStorage || p.storage === filterStorage) &&
    (!filterColor || colorsMatch(p.color, filterColor, modelName))
  )

  // Si rien en stock direct mais des options sont sélectionnées
  // → mode "Sur commande" pour cette combinaison précise
  const isOnDemand = hasStock
    && !isCurrentSelectionInStock
    && (filterColor || filterStorage)

  const bestPhone = filtered.reduce((best, p) => {
    if (!best) return p
    const scoreP    = gradeScore(p) * 100 + (p.battery_health || 0)
    const scoreBest = gradeScore(best) * 100 + (best.battery_health || 0)
    return scoreP > scoreBest ? p : best
  }, null)

  const isStorageAvailable = (storage) => {
    if (!hasStock) return false
    if (!filterColor) return inStockStorages.has(storage)
    return stockPhones.some(
      (p) => p.color?.toLowerCase() === filterColor.toLowerCase() && p.storage === storage
    )
  }

  const isColorAvailable = (color) => {
    if (!hasStock) return false
    if (!filterStorage) {
      return stockPhones.some(p =>
        colorsMatch(p.color, color, modelName)
      )
    }
    return stockPhones.some(
      p => p.storage === filterStorage &&
      colorsMatch(p.color, color, modelName)
    )
  }

  // Tous les magasins où ce modèle est disponible
  const availableMagasins = [...new Set(
    stockPhones
      .filter((p) => p.status === 'disponible')
      .flatMap((p) => p.magasins || [])
  )]

  const minPrice = filtered.length > 0 ? Math.min(...filtered.map((p) => p.price)) : null
  const isAllReconditionne = filtered.length > 0 && filtered.every((p) => p.condition === 'reconditionne')
  const refPrice = isAllReconditionne ? getStartingPrice(modelName) : null

  const surCommandeModel    = surCommandePhones[0]?.name || surCommandePhones[0]?.model || modelName
  const canonicalSurCommande = getCanonicalModel(surCommandeModel)
  const isWatch = modelName.toLowerCase().includes('watch')
  const storageLabel = isWatch ? t('model_size_label') : t('phone_capacity')
  const surCommandeStorageLabel = isWatch ? t('model_size_label') : t('model_capacity')
  const surCommandeColors = canonicalSurCommande?.colors
    ? Object.keys(canonicalSurCommande.colors)
    : getSurCommandeColors(surCommandeModel)
  const surCommandeStorages = canonicalSurCommande?.storages?.length >= 0
    ? canonicalSurCommande.storages
    : getSurCommandeStorages(surCommandeModel)
  const surCommandeDisplayImage = selectedSurCommandeColor
    ? getPhoneImage(surCommandeModel, selectedSurCommandeColor)
    : getPhoneImage(surCommandeModel, surCommandeColors[0])

  const canonicalModelData = getCanonicalModel(modelName)

  const imageUrl = !showStock && showSurCommande
    ? surCommandeDisplayImage
    : (canonicalModelData
        ? getCanonicalImage(modelName, filterColor)
          || getCanonicalImage(modelName, bestPhone?.color)
          || getPhoneImage(modelName, filterColor || bestPhone?.color)
        : getPhoneImage(modelName, filterColor || bestPhone?.color))

  const handleSurCommandeColorClick = (color) => {
    setSelectedSurCommandeColor(color)
    const img = getPhoneImage(
      surCommandePhones[0]?.name || surCommandePhones[0]?.model,
      color
    )
    setSurCommandeImageUrl(img)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#555] hover:text-[#1B2A4A] mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft size={16} />
        {t('back')}
      </button>

      {loading ? (
        <Spinner message={t('model_loading')} />
      ) : phones.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📱</p>
          <p className="text-[#1B2A4A] font-semibold text-lg">{t('model_not_found')}</p>
          <p className="text-[#555] text-sm mt-1">{t('model_not_available')}</p>
          <button
            onClick={() => navigate('/boutique')}
            className="mt-6 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold cursor-pointer"
          >
            {t('model_see_all_phones')}
          </button>
        </div>
      ) : (
        <>
          {/* ── SECTION HAUTE ── */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            {/* Image */}
            <div className="w-full sm:w-48 h-48 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {imageUrl !== PLACEHOLDER ? (
                <img
                  src={!showStock && showSurCommande && surCommandeImageUrl ? surCommandeImageUrl : imageUrl}
                  alt={modelName}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                />
              ) : (
                <Smartphone size={80} className="text-[#00B4CC] opacity-20" strokeWidth={1} />
              )}
            </div>

            {/* Infos */}
            <div className="flex-1">
              <h1 className="font-poppins font-bold text-2xl md:text-3xl text-[#1B2A4A] mb-1">
                {modelName}
              </h1>
              {minPrice !== null && (
                <p className="text-[#555] text-sm mb-4">
                  {t('model_from')}{' '}
                  <span className="font-bold text-xl text-[#1B2A4A]">
                    {charmPrice(refPrice ?? minPrice)}€
                  </span>
                </p>
              )}

              {/* Filtre stockage */}
              {showStock && storages.length >= 1 &&
               storages.some(s => s && s.trim() !== '') && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
                    {storageLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill
                      label={t('phone_all')}
                      active={!filterStorage}
                      onClick={() => setFilterStorage(null)}
                    />
                    {storages.map((s) => {
                      const available = isStorageAvailable(s)
                      return (
                        <button
                          key={s}
                          onClick={() => setFilterStorage(filterStorage === s ? null : s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold
                                      border-2 transition-all cursor-pointer
                            ${filterStorage === s
                              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                              : available
                                ? 'bg-white text-[#1B2A4A] border-gray-200 hover:border-[#1B2A4A]'
                                : 'bg-white text-gray-400 border-dashed border-gray-300 hover:border-orange-400'
                            }`}
                          title={!available
                            ? `${s} — ${t('filter_on_order')}${filterColor ? ` (${translateColor(filterColor, t)})` : ''}`
                            : s}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Filtre couleur */}
              {showStock && colors.length >= 1 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">
                    {t('phone_color')}
                    {filterColor && (
                      <span className="ml-2 normal-case text-[#1B2A4A] font-bold">
                        — {translateColor(filterColor, t)}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setFilterColor(null)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all
                        ${!filterColor
                          ? 'border-[#1B2A4A]'
                          : 'border-gray-300 hover:border-gray-400'}`}
                      title={t('model_all')}
                    >
                      <span className="text-[10px] text-gray-500">∀</span>
                    </button>
                    {colors.map((c) => {
                      const available = isColorAvailable(c)
                      return (
                        <div key={c} className="relative">
                          <button
                            onClick={() => {
                              const newColor = filterColor === c ? null : c
                              setFilterColor(newColor)
                              if (newColor && filterStorage) {
                                const storageStillAvailable = stockPhones.some(
                                  p => p.color === newColor && p.storage === filterStorage
                                )
                                if (!storageStillAvailable) {
                                  // Garde le storage sélectionné — le mode "sur commande"
                                  // va s'activer automatiquement, ne reset plus
                                }
                              }
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer
                              ${filterColor === c
                                ? 'border-[#1B2A4A] scale-110'
                                : available
                                  ? 'border-gray-300 hover:border-gray-400'
                                  : 'border-dashed border-gray-300 hover:border-orange-400'
                              }`}
                            style={{ background: colorToHex(c, modelName) }}
                            title={available
                              ? translateColor(c, t)
                              : `${translateColor(c, t)} ${t('model_on_order_suffix')}`}
                          />
                          {filterColor === c && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#1B2A4A] rounded-full" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {showStock && isOnDemand && (
                <div className="mt-4 bg-orange-50 border border-orange-200
                                rounded-2xl p-4">
                  <p className="text-sm font-bold text-orange-700 mb-1">
                    {t('model_combo_unavailable')}
                  </p>
                  <p className="text-xs text-orange-600 mb-3">
                    {filterColor && `${t('model_colour_prefix')} ${translateColor(filterColor, t)}`}
                    {filterColor && filterStorage && ' · '}
                    {filterStorage && `${t('model_storage_prefix')} ${filterStorage}`}
                    {' '}{t('model_order_delay_note')}
                  </p>
                  <button
                    onClick={() => {
                      navigate('/reservation-commande', {
                        state: {
                          phone: {
                            id: null,
                            name: modelName,
                            model: modelName,
                            brand: phones[0]?.brand || 'Apple',
                            status: 'sur_commande',
                            surCommande: true,
                            storages: storages,
                            colors: colors,
                            price: 0,
                            categorie: 'telephone',
                          },
                          selectedColor: filterColor,
                          selectedStorage: filterStorage,
                        }
                      })
                    }}
                    className="w-full py-2.5 bg-orange-500 text-white rounded-xl
                               text-sm font-bold hover:bg-orange-600
                               transition-all">
                    {t('model_place_order')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Neuf badges */}
          {showStock && bestPhone?.condition === 'neuf' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {[t('model_sealed'), t('model_guarantee_apple'), t('model_guarantee_seb')].map((label) => (
                <span key={label} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle size={11} />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Magasins Click & Collect */}
          {showStock && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#00B4CC]" /> {t('phone_click_collect')}
            </p>
            {availableMagasins.length > 0 ? (
              <div>
                <p className="text-xs text-[#555] mb-2">
                  {t('phone_click_collect_desc')}
                </p>
                <div className="mt-3 space-y-2">
                  {availableMagasins.map((magasinId) => {
                    const mag = MAGASINS[magasinId];
                    if (!mag) return null;
                    return (
                      <div key={magasinId} className="flex items-start gap-2 mt-2">
                        <MapPin size={14} className="text-[#00B4CC] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-[#1B2A4A]">
                            {mag.nom}
                          </p>
                          {mag.adresse && (
                            <p className="text-xs text-gray-400">{mag.adresse}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t('model_available_stores')}</p>
            )}
          </div>

          )}

          {/* ── SECTION BASSE — Tableau de sélection ── */}
          {showStock && (
          <div>
            <div className="mb-4">
              <h2 className="font-poppins font-bold text-xl text-[#1B2A4A]">{t('phone_choose')}</h2>
              <p className="text-sm text-[#555]">
                {filtered.length} {t('phone_devices_available')}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[#888] text-sm">
                {t('model_no_device_sel')}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8F9FA] border-b border-gray-100">
                      <tr>
                        {[t('phone_condition_grade'), t('phone_battery'), t('phone_details'), t('phone_price'), ''].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555] uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((phone) => {
                        const isBest = phone.id === bestPhone?.id
                        const parts  = phone.parts || []
                        const partsReplaced = Array.isArray(phone.parts_replaced)
                          ? phone.parts_replaced
                          : (typeof phone.parts_replaced === 'string'
                              ? (() => { try { return JSON.parse(phone.parts_replaced) } catch { return [] } })()
                              : [])
                        const allParts = parts.length > 0 ? parts.map((p) => p.part_type) : partsReplaced
                        return (
                          <tr key={phone.id} className={`hover:bg-gray-50 transition-colors ${isBest ? 'bg-cyan-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <span className={`px-2 py-0.5 rounded border text-xs font-semibold w-fit ${CONDITION_STYLE[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {CONDITION_KEY[phone.condition] ? t(CONDITION_KEY[phone.condition]) : phone.condition}
                                </span>
                                {phone.grade && (
                                  <span className={`px-2 py-0.5 rounded border text-xs font-bold w-fit ${GRADE_STYLE[phone.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {translateGrade(phone.grade, t)}
                                  </span>
                                )}
                                {isBest && (
                                  <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                    ★ {t('phone_best_choice')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {phone.status === 'sur_commande' ? (
                                <span className="text-sm italic text-gray-400">
                                  {t('model_battery_range')}
                                </span>
                              ) : phone.condition !== 'neuf' && phone.battery_health ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-2 rounded-full transition-all"
                                      style={{
                                        width: `${phone.battery_health}%`,
                                        backgroundColor: phone.battery_health >= 85
                                          ? '#22c55e' : phone.battery_health >= 75
                                          ? '#f59e0b' : '#ef4444'
                                      }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold ${
                                    phone.battery_health >= 85 ? 'text-green-600'
                                    : phone.battery_health >= 75 ? 'text-orange-500'
                                    : 'text-red-500'}`}>
                                    {phone.battery_health}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[220px]">
                              {(() => {
                                const publicParts = getPublicParts(allParts)
                                if (phone.condition === 'neuf') {
                                  return <span className="text-xs text-blue-600 font-medium">Neuf sous scellé</span>
                                }
                                if (publicParts.length > 0) {
                                  return (
                                    <div>
                                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                                        {t('model_parts_replaced')}
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {publicParts.map((part) => (
                                          <span key={part}
                                            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                                            {translateRepair(part, t)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                }
                                if (phone.condition === 'occasion') {
                                  return <span className="text-green-600 text-xs font-medium">✓ {t('phone_no_repair')}</span>
                                }
                                return null
                              })()}
                              {(phone.storage || phone.color) && (
                                <p className="text-[11px] text-[#888] mt-1">
                                  {[phone.storage, translateColor(phone.color, t)].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              {phone.has_esim && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-[#1B2A4A] text-white px-2 py-0.5 rounded-lg">
                                  eSIM
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-[#1B2A4A] text-base">{charmPrice(phone.price)}€</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => addToCart(phone)}
                                  disabled={isInCart(phone.id)}
                                  className={`p-2 rounded-xl border transition-all ${
                                    isInCart(phone.id)
                                      ? 'bg-green-50 border-green-200 text-green-600'
                                      : 'border-gray-200 text-gray-500 hover:border-[#00B4CC] hover:text-[#00B4CC]'
                                  }`}
                                  title={isInCart(phone.id) ? t('model_already_in_cart') : t('model_add_to_cart')}
                                >
                                  {isInCart(phone.id) ? <Check size={18} /> : <ShoppingCart size={18} />}
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('Téléphone choisi:', phone);
                                    console.log('Magasins:', phone.magasins);
                                    navigate(`/reservation/${phone.id}`, { state: { phone } });
                                  }}
                                  className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  {t('model_choose_btn')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map((phone) => {
                    const isBest = phone.id === bestPhone?.id
                    const parts  = phone.parts || []
                    const partsReplaced = Array.isArray(phone.parts_replaced)
                      ? phone.parts_replaced
                      : (typeof phone.parts_replaced === 'string'
                          ? (() => { try { return JSON.parse(phone.parts_replaced) } catch { return [] } })()
                          : [])
                    const allParts = parts.length > 0 ? parts.map((p) => p.part_type) : partsReplaced
                    return (
                      <div
                        key={phone.id}
                        className={`bg-white rounded-2xl border p-4 ${isBest ? 'border-[#00B4CC] bg-cyan-50/30' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold w-fit ${CONDITION_STYLE[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {CONDITION_KEY[phone.condition] ? t(CONDITION_KEY[phone.condition]) : phone.condition}
                            </span>
                            {phone.grade && (
                              <span className={`px-2.5 py-0.5 rounded border text-xs font-bold w-fit ${GRADE_STYLE[phone.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {translateGrade(phone.grade, t)}
                              </span>
                            )}
                            {isBest && (
                              <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                ★ {t('model_best_choice')}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[#1B2A4A] text-lg">{charmPrice(phone.price)}€</span>
                        </div>

                        <div className="space-y-1.5 mb-3 text-xs text-[#555]">
                          {(phone.storage || phone.color) && (
                            <p>{[phone.storage, translateColor(phone.color, t)].filter(Boolean).join(' · ')}</p>
                          )}
                          {phone.has_esim && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-[#1B2A4A] text-white px-2 py-0.5 rounded-lg">
                              eSIM
                            </span>
                          )}
                          {(() => {
                            const publicParts = getPublicParts(allParts)
                            if (phone.condition === 'neuf') {
                              return <p className="text-blue-700 font-medium">{t('model_sealed_warranty')}</p>
                            }
                            if (publicParts.length > 0) {
                              return (
                                <div>
                                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                                    {t('model_parts_replaced')}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {publicParts.map((part) => (
                                      <span key={part}
                                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                                        {translateRepair(part, t)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                            if (phone.condition === 'occasion') {
                              return <p className="text-green-600 font-medium">✓ {t('phone_no_repair')}</p>
                            }
                            return null
                          })()}
                          {phone.status === 'sur_commande' ? (
                            <span className="text-xs italic text-gray-400">
                              {t('model_battery_range')}
                            </span>
                          ) : phone.condition !== 'neuf' && phone.battery_health ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${phone.battery_health}%`,
                                    backgroundColor: phone.battery_health >= 85
                                      ? '#22c55e' : phone.battery_health >= 75
                                      ? '#f59e0b' : '#ef4444'
                                  }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${
                                phone.battery_health >= 85 ? 'text-green-600'
                                : phone.battery_health >= 75 ? 'text-orange-500'
                                : 'text-red-500'}`}>
                                {phone.battery_health}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addToCart(phone)}
                            disabled={isInCart(phone.id)}
                            className={`p-2.5 rounded-xl border transition-all flex-shrink-0 ${
                              isInCart(phone.id)
                                ? 'bg-green-50 border-green-200 text-green-600'
                                : 'border-gray-200 text-gray-500 hover:border-[#00B4CC] hover:text-[#00B4CC]'
                            }`}
                            title={isInCart(phone.id) ? t('model_already_in_cart') : t('model_add_to_cart')}
                          >
                            {isInCart(phone.id) ? <Check size={18} /> : <ShoppingCart size={18} />}
                          </button>
                          <button
                            onClick={() => {
                              console.log('ID téléphone:', phone.id, phone);
                              navigate(`/reservation/${phone.id}`);
                            }}
                            className="flex-1 py-2.5 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                          >
                            {t('model_choose_btn')}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          )}

          {showSurCommande && (
            <div className={`space-y-4 ${showStock ? 'border-t border-gray-100 pt-8 mt-8' : 'mt-6'}`}>

              {showStock && (
                <h3 className="text-lg font-bold text-[#1B2A4A] mb-4">
                  {t('model_also_on_order')}
                </h3>
              )}

              {/* Badge Neuf */}
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-xl font-bold">
                  ✨ Neuf
                </span>
                <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-xl font-bold">
                  {t('model_delay_prefix')} {surCommandePhones[0]?.delai_commande || '1h à 72h'}
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-xl font-bold">
                  🔋 80-99% selon stock
                </span>
              </div>

              {/* Sélecteur couleur — ronds colorés */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  {t('model_color')}
                  {selectedSurCommandeColor && (
                    <span className="ml-2 font-normal normal-case text-[#1B2A4A]">
                      — {translateColor(selectedSurCommandeColor, t)}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-3">
                  {surCommandeColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleSurCommandeColorClick(color)}
                      title={translateColor(color, t)}
                      className={`relative w-9 h-9 rounded-full border-2 transition-all
                        ${selectedSurCommandeColor === color
                          ? 'border-[#1B2A4A] scale-110 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'}`}
                      style={{ backgroundColor: colorToHex(color, surCommandeModel) }}>
                      {selectedSurCommandeColor === color && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                          style={{
                            textShadow: COLOR_HEX[color] === '#f5f5f0' || COLOR_HEX[color] === '#f2e8d9'
                              ? '0 0 2px #000' : 'none',
                            color: COLOR_HEX[color] === '#f5f5f0' || COLOR_HEX[color] === '#f2e8d9'
                              ? '#1a1a1a' : 'white',
                          }}>
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélecteur stockage */}
              {surCommandeStorages.length > 0 &&
               surCommandeStorages.some(s => s && s.trim() !== '') && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  {surCommandeStorageLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {surCommandeStorages.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSurCommandeStorage(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                        ${selectedSurCommandeStorage === s
                          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Prix + Bouton */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div>
                  <p className="text-2xl font-black text-[#1B2A4A]">
                    {surCommandePhones[0]?.price}€
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('model_deposit_note')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/reservation-commande', {
                    state: {
                      phone: surCommandePhones[0],
                      selectedColor: selectedSurCommandeColor,
                      selectedStorage: surCommandeStorages.includes(selectedSurCommandeStorage)
                        ? selectedSurCommandeStorage
                        : surCommandeStorages[0],
                    },
                  })}
                  disabled={!selectedSurCommandeColor}
                  className="bg-[#1B2A4A] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('model_choose_btn')}
                </button>
              </div>

              {/* Note */}
              <p className="text-xs text-gray-400 text-center">
                {t('model_supplier_note')} {surCommandePhones[0]?.delai_commande || '1h à 72h'}
              </p>
            </div>
          )}

          {stockPhones.length === 0 && surCommandePhones.length === 0 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-bold text-[#1B2A4A] mb-1">
                {t('model_alert_title')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('model_alert_desc')}
              </p>

              {alertStatus === 'success' ? (
                <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-3 text-green-700 text-sm font-medium">
                  {t('model_alert_success')}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => { setAlertEmail(e.target.value); setAlertStatus(null) }}
                    placeholder={t('model_alert_email_ph')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                  <input
                    type="tel"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                    placeholder={t('model_alert_phone_ph')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                  {alertStatus === 'error' && (
                    <p className="text-red-500 text-xs">
                      {t('model_alert_bad_email')}
                    </p>
                  )}
                  <button
                    onClick={handleStockAlert}
                    disabled={alertLoading}
                    className="w-full py-2.5 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all disabled:opacity-50"
                  >
                    {alertLoading ? t('model_alert_saving') : t('model_alert_cta')}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
