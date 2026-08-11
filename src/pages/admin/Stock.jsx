// SQL à exécuter dans Supabase si ces colonnes manquent :
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS magasins JSONB DEFAULT '[]'::jsonb;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS color TEXT;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS parts_replaced JSONB DEFAULT '[]'::jsonb;

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Smartphone, Plus, Search, Pencil, Trash2, X, Star, Tag } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useRequirePermission, usePermission, useCurrentUser, useIsAdmin } from '../../hooks/usePermissions'
import {
  updatePhone, updatePhoneStatus, updatePhonePrice,
} from '../../data/phonesApi'
import { phonesMock } from '../../data/phonesMock'
import { IPHONE_DATABASE } from '../../data/iphoneDatabase'
import { IPHONE_ON_DEMAND } from '../../data/iphoneOnDemand'
import { PHONES_DATABASE, findPhoneModel, searchModels, BRANDS } from '../../data/phonesDatabase'
import { MAGASINS_LIST, MAGASINS_PHYSIQUES, MAGASINS_ADMIN, MAGASINS as MAGASINS_MAP } from '../../utils/magasins'
const MAGASINS = MAGASINS_PHYSIQUES

const EMAILJS_SERVICE_ID   = import.meta.env.VITE_EMAILJS_SERVICE_ID         || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY         || 'rqbaYNMIGNP6IQB9O'
const INVOICE_TEMPLATE_ID  = 'template_pzv7w8d'
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage'
import { getStartingPrice } from '../../data/startingPrices'
import { GOOGLE_REVIEW_LINKS } from '../../data/googleReviews'
import { FOURNISSEURS_LIST } from '../../utils/fournisseurs'
import { isEsimModel } from '../../utils/esimModels'
import Etiquette from '../../components/admin/Etiquette'
import PhoneSaleModal from '../../components/admin/PhoneSaleModal'


const CONDITIONS = ['neuf', 'reconditionne', 'occasion']
const CONDITION_LABELS = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const GRADES = ['Bon état', 'Très bon état', 'Comme neuf', 'Neuf']
const CATEGORIES = [
  { value: 'telephone', label: '📱 Téléphone', icon: '📱' },
  { value: 'tablette', label: '📟 Tablette', icon: '📟' },
  { value: 'montre', label: '⌚ Montre connectée', icon: '⌚' },
  { value: 'ecouteur', label: '🎧 Écouteurs / AirPods', icon: '🎧' },
  { value: 'ordinateur', label: '💻 Ordinateur', icon: '💻' },
  { value: 'accessoire', label: '🛍️ Accessoire', icon: '🛍️' },
]

const MODELS_BY_CATEGORIE = {
  tablette: {
    'Apple': [
      'iPad Air 13" M4',
      'iPad Air 11" M4',
      'iPad Air 13" M3',
      'iPad Air 11" M3',
      'iPad Pro 13" M4',
      'iPad Pro 11" M4',
      'iPad 11e génération',
      'iPad 10e génération',
      'iPad 9e génération',
      'iPad mini 7',
      'iPad mini 6',
      'iPad mini 5',
      'iPad Pro 12.9" M2',
      'iPad Pro 11" M2',
      'iPad Pro 12.9" M1',
      'iPad Pro 11" M1',
      'iPad Air M2',
      'iPad Air M1',
      'iPad Air 4',
    ],
    'Samsung': [
      'Samsung Galaxy Tab S11 Ultra',
      'Samsung Galaxy Tab S11',
      'Samsung Galaxy Tab S10 Ultra',
      'Samsung Galaxy Tab S10+',
      'Samsung Galaxy Tab S10 FE+',
      'Samsung Galaxy Tab S10 FE',
      'Samsung Galaxy Tab S10 Lite',
      'Samsung Galaxy Tab S9 Ultra',
      'Samsung Galaxy Tab S9+',
      'Samsung Galaxy Tab S9',
      'Samsung Galaxy Tab S9 FE',
      'Samsung Galaxy Tab A9+',
      'Samsung Galaxy Tab A9',
      'Samsung Galaxy Tab A8',
      'Samsung Galaxy Tab A11+',
    ],
    'Microsoft': [
      'Microsoft Surface Pro 11', 'Microsoft Surface Pro 10',
      'Microsoft Surface Pro 9', 'Microsoft Surface Go 3',
    ],
  },
  montre: {
    'Apple': [
      'Apple Watch Ultra 3',
      'Apple Watch Series 11',
      'Apple Watch SE 3',
      'Apple Watch Ultra 2',
      'Apple Watch Series 10',
      'Apple Watch Series 9',
      'Apple Watch Series 8',
      'Apple Watch Series 7',
      'Apple Watch Series 6',
      'Apple Watch Series 5',
      'Apple Watch Series 4',
      'Apple Watch Series 3',
      'Apple Watch SE 2',
      'Apple Watch SE',
    ],
    'Samsung': [
      'Samsung Galaxy Watch Ultra 2025',
      'Samsung Galaxy Watch 8 Classic',
      'Samsung Galaxy Watch 8',
      'Samsung Galaxy Watch Ultra',
      'Samsung Galaxy Watch 7',
      'Samsung Galaxy Watch 6 Classic',
      'Samsung Galaxy Watch 6',
      'Samsung Galaxy Watch 5 Pro',
      'Samsung Galaxy Watch 5',
      'Samsung Galaxy Watch 4 Classic',
      'Samsung Galaxy Watch 4',
    ],
    'Garmin': [
      'Garmin Fenix 8', 'Garmin Forerunner 965',
      'Garmin Venu 3',
    ],
  },
  ecouteur: {
    'Apple': [
      'AirPods Pro 3',
      'AirPods Pro 2',
      'AirPods 4 ANC',
      'AirPods 4',
      'AirPods Max 2',
      'AirPods Max',
      'AirPods 3',
      'AirPods 2',
    ],
    'Samsung': [
      'Samsung Galaxy Buds3 Pro',
      'Samsung Galaxy Buds3',
      'Samsung Galaxy Buds2 Pro',
      'Samsung Galaxy Buds2',
      'Samsung Galaxy Buds Live',
      'Samsung Galaxy Buds FE',
    ],
    'Sony': [
      'Sony WH-1000XM6',
      'Sony WH-1000XM5',
      'Sony WF-1000XM5',
      'Sony WF-1000XM4',
      'Sony WH-CH720N',
      'Sony WH-CH520',
    ],
    'Bose': [
      'Bose QuietComfort Ultra', 'Bose QuietComfort 45',
      'Bose QuietComfort Earbuds 2',
    ],
    'JBL': [
      'JBL Tour Pro 3', 'JBL Tour Pro 2',
      'JBL Live Pro 2', 'JBL Tune 770NC',
    ],
  },
  ordinateur: {
    'Apple': [
      'MacBook Pro 16" M4', 'MacBook Pro 14" M4',
      'MacBook Air 15" M3', 'MacBook Air 13" M3',
      'MacBook Pro 16" M3', 'MacBook Pro 14" M3',
      'MacBook Air 15" M2', 'MacBook Air 13" M2',
    ],
    'Dell': [
      'Dell XPS 15', 'Dell XPS 13', 'Dell Latitude 14',
      'Dell Inspiron 15', 'Dell Inspiron 14',
    ],
    'HP': [
      'HP Spectre x360 14', 'HP EliteBook 840',
      'HP Pavilion 15', 'HP Envy 13',
    ],
    'Lenovo': [
      'Lenovo ThinkPad X1 Carbon', 'Lenovo ThinkPad T14',
      'Lenovo IdeaPad 5', 'Lenovo Yoga 9i',
    ],
    'Microsoft': [
      'Microsoft Surface Laptop 6', 'Microsoft Surface Laptop 5',
      'Microsoft Surface Pro 11',
    ],
  },
  accessoire: {
    'Apple': [
      'Coque iPhone 16 Pro Max', 'Coque iPhone 16 Pro',
      'Coque iPhone 16', 'Chargeur MagSafe',
      'Câble USB-C Apple', 'Adaptateur Lightning',
    ],
    'Samsung': [
      'Coque Samsung S25 Ultra', 'Coque Samsung S25',
      'Chargeur Samsung 45W', 'Câble USB-C Samsung',
    ],
    'Autre': [
      'Verre trempé', 'Coque universelle',
      'Chargeur rapide', 'Câble USB-C',
      'Câble Lightning', 'Support téléphone',
      'Batterie externe', 'Hub USB-C',
    ],
  },
}

const WATCH_SIZES = {
  'Apple': {
    'Apple Watch Ultra 3': ['49mm'],
    'Apple Watch Series 11': ['42mm', '46mm'],
    'Apple Watch SE 3': ['40mm', '44mm'],
    'Apple Watch Ultra 2': ['49mm'],
    'Apple Watch Series 10': ['42mm', '46mm'],
    'Apple Watch Series 9': ['41mm', '45mm'],
    'Apple Watch Series 8': ['41mm', '45mm'],
    'Apple Watch Series 7': ['41mm', '45mm'],
    'Apple Watch Series 6': ['40mm', '44mm'],
    'Apple Watch Series 5': ['40mm', '44mm'],
    'Apple Watch Series 4': ['40mm', '44mm'],
    'Apple Watch Series 3': ['38mm', '42mm'],
    'Apple Watch SE 2': ['40mm', '44mm'],
    'Apple Watch SE': ['40mm', '44mm'],
    'default': ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '49mm'],
  },
  'Samsung': {
    'Samsung Galaxy Watch Ultra 2025': ['47mm'],
    'Samsung Galaxy Watch 8 Classic': ['46mm'],
    'Samsung Galaxy Watch 8': ['40mm', '44mm'],
    'Samsung Galaxy Watch Ultra': ['47mm'],
    'Samsung Galaxy Watch 7': ['40mm', '44mm'],
    'Samsung Galaxy Watch 6 Classic': ['43mm', '47mm'],
    'Samsung Galaxy Watch 6': ['40mm', '44mm'],
    'Samsung Galaxy Watch 5 Pro': ['45mm'],
    'Samsung Galaxy Watch 5': ['40mm', '44mm'],
    'Samsung Galaxy Watch 4 Classic': ['42mm', '46mm'],
    'Samsung Galaxy Watch 4': ['40mm', '44mm'],
    'default': ['40mm', '42mm', '43mm', '44mm', '45mm', '46mm', '47mm'],
  },
  'Garmin': {
    'default': ['42mm', '45mm', '47mm', '51mm'],
  },
  'default': ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '47mm', '49mm'],
}

const WATCH_COLORS = {
  'Apple': {
    'Apple Watch Ultra 3': ['Titane naturel', 'Titane noir'],
    'Apple Watch Series 11': [
      'Gris sidéral', 'Jet Noir', 'Rose Gold', 'Argent',
      'Titane naturel', 'Titane or', 'Titane ardoise'
    ],
    'Apple Watch SE 3': ['Lumière stellaire', 'Moonlight'],
    'Apple Watch Series 10': ['Jet Noir', 'Rose Gold', 'Argent', 'Titane naturel', 'Titane or', 'Titane ardoise'],
    'Apple Watch Series 9': ['Minuit', 'Lumière stellaire', 'Rose', 'PRODUCT RED', 'Argent', 'Or', 'Graphite'],
    'Apple Watch Series 8': ['Minuit', 'Lumière stellaire', 'PRODUCT RED', 'Argent', 'Or', 'Graphite'],
    'Apple Watch Series 7': ['Minuit', 'Lumière stellaire', 'Bleu', 'Vert', 'PRODUCT RED'],
    'Apple Watch Series 6': ['Bleu', 'PRODUCT RED', 'Or', 'Argent', 'Graphite'],
    'Apple Watch Series 5': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Series 4': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Series 3': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Ultra 2': ['Titane naturel', 'Titane noir'],
    'Apple Watch SE 2': ['Minuit', 'Lumière stellaire', 'Argent'],
    'Apple Watch SE': ['Argent', 'Or', 'Gris sidéral'],
    'default': ['Noir', 'Argent', 'Or', 'Rose Gold', 'Blanc'],
  },
  'Samsung': {
    'Samsung Galaxy Watch Ultra 2025': ['Titane Argent', 'Titane Gris', 'Titane Blanc'],
    'Samsung Galaxy Watch 8 Classic': ['Noir', 'Argent'],
    'Samsung Galaxy Watch 8': ['Graphite', 'Argent'],
    'Samsung Galaxy Watch Ultra': ['Titane Gris', 'Titane Blanc', 'Titane Argent'],
    'Samsung Galaxy Watch 7': ['Vert', 'Crème', 'Argent'],
    'Samsung Galaxy Watch 6 Classic': ['Noir', 'Argent', 'Camel', 'Indigo'],
    'Samsung Galaxy Watch 6': ['Graphite', 'Argent', 'Crème', 'Or', 'Bleu glacier', 'Indigo', 'Menthe'],
    'Samsung Galaxy Watch 5 Pro': ['Noir', 'Gris'],
    'Samsung Galaxy Watch 5': ['Argent', 'Or', 'Saphir'],
    'Samsung Galaxy Watch 4 Classic': ['Noir', 'Argent'],
    'Samsung Galaxy Watch 4': ['Noir', 'Argent', 'Or', 'Vert'],
    'default': ['Noir', 'Argent', 'Or', 'Vert', 'Crème'],
  },
  'Garmin': {
    'default': ['Noir', 'Ardoise', 'Blanc', 'Bleu'],
  },
  'default': ['Noir', 'Blanc', 'Argent', 'Or', 'Rose Gold'],
}

const WATCH_BRACELETS = [
  'Silicone Sport', 'Tissu', 'Cuir', 'Métal Milanais',
  'Métal Link', 'Nylon', 'Caoutchouc', 'Non inclus',
]

const EARPHONE_COLORS = {
  'Apple': {
    'AirPods Pro 2': ['Blanc'],
    'AirPods 4': ['Blanc'],
    'AirPods 3': ['Blanc'],
    'AirPods Max': ['Blanc lumière stellaire', 'Noir minuit', 'Bleu', 'Orange', 'Violet'],
    'default': ['Blanc'],
  },
  'Samsung': {
    'Samsung Galaxy Buds3 Pro': ['Blanc', 'Argent'],
    'Samsung Galaxy Buds3': ['Blanc', 'Argent'],
    'Samsung Galaxy Buds2 Pro': ['Blanc', 'Graphite', 'Violet'],
    'Samsung Galaxy Buds2': ['Blanc', 'Graphite', 'Olive', 'Lavande'],
    'Samsung Galaxy Buds Live': ['Mystic Bronze', 'Mystic Blanc', 'Mystic Noir'],
    'default': ['Blanc', 'Noir'],
  },
  'Sony': {
    'default': ['Noir', 'Blanc', 'Argent'],
  },
  'Bose': {
    'default': ['Noir', 'Blanc', 'Bleu'],
  },
  'default': ['Noir', 'Blanc', 'Gris'],
}

const COMPUTER_COLORS = {
  'Apple': {
    'default': ['Gris sidéral', 'Argent', 'Or', 'Noir sidéral'],
  },
  'Dell': { 'default': ['Noir', 'Argent', 'Blanc'] },
  'HP': { 'default': ['Noir', 'Argent', 'Bleu nuit'] },
  'Lenovo': { 'default': ['Noir', 'Gris', 'Bleu arctique'] },
  'Microsoft': { 'default': ['Platine', 'Noir mat', 'Saphir', 'Forêt'] },
  'default': ['Noir', 'Argent', 'Gris'],
}

const COMPUTER_RAM = ['4Go', '8Go', '16Go', '32Go', '64Go']
const COMPUTER_STORAGE = ['128Go SSD', '256Go SSD', '512Go SSD', '1To SSD', '2To SSD']
const COMPUTER_SCREEN = ['11"', '13"', '13.3"', '14"', '15"', '15.6"', '16"']
const COMPUTER_CPU = [
  'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4',
  'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
  'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
]

const LOCATIONS = ['Molenbeek', 'Louise', 'Anderlecht', 'SebPhone', 'Marrakech', 'Autre']
const STATUSES = ['disponible', 'reserve', 'vendu', 'sur_commande']
const STATUS_LABELS = {
  disponible:   'En stock',
  reserve:      'Réservé',
  vendu:        'Vendu',
  sur_commande: 'Sur commande',
}
const STATUS_COLORS = {
  disponible:   'bg-green-100 text-green-700',
  reserve:      'bg-yellow-100 text-yellow-800',
  vendu:        'bg-gray-100 text-gray-600',
  sur_commande: 'bg-orange-100 text-orange-700',
}
const CONDITION_COLORS = {
  neuf:          'bg-green-100 text-green-700',
  reconditionne: 'bg-cyan-100 text-cyan-700',
  occasion:      'bg-blue-100 text-blue-700',
}
const PARTS = [
  'Écran',
  'Batterie',
  'Vitre arrière',
  'Caméra avant',
  'Caméra arrière',
  'Haut-parleur',
  'Micro',
  'Connecteur de charge',
  'Bouton home',
  'Face ID / Touch ID',
]

/* ─── Sous-composants utilitaires ─── */

function StatusDropdown({ id, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(id, e.target.value)}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[value] || 'bg-gray-100 text-gray-600'}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  )
}

function InlinePrice({ id, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  const save = async () => {
    const price = Number(draft)
    if (!isNaN(price) && price > 0 && price !== value) await onSave(id, price)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') save() }}
        className="w-20 border border-[#00B4CC] rounded px-2 py-0.5 text-sm font-bold text-[#1B2A4A] focus:outline-none"
      />
    )
  }
  return (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="font-bold text-[#1B2A4A] hover:text-[#00B4CC] cursor-pointer transition-colors"
      title="Cliquer pour modifier"
    >
      {value}€
    </button>
  )
}

/* ─── MODAL AJOUT / MODIFICATION ─── */

function PhoneModal({ phone, onClose, onSaved, priceSettings, modelLimits }) {
  const currentUser = useCurrentUser()
  const isEdit = !!phone

  // ── Catégorie ────────────────────────────────────────────────────
  const [categorie, setCategorie]                 = useState(phone?.categorie || 'telephone')

  // ── Brand & visibilité ───────────────────────────────────────────
  const [brand, setBrand]                         = useState(phone?.brand || 'Apple')
  const [visibleOnSite, setVisibleOnSite]         = useState(phone?.visible_on_site ?? true)
  const [phoneStatus, setPhoneStatus]             = useState(phone?.status || 'disponible')
  const [isSurCommande, setIsSurCommande]         = useState(phone?.status === 'sur_commande')

  // ── Model autocomplete ───────────────────────────────────────────
  const [modelSearch, setModelSearch]             = useState(phone?.name || phone?.model || '')
  const [selectedModel, setSelectedModel]         = useState(null)
  const [showModelSuggestions, setShowModelSugg]  = useState(false)

  // ── Color autocomplete ───────────────────────────────────────────
  const [colorSearch, setColorSearch]             = useState(phone?.color || '')
  const [showColorSuggestions, setShowColorSugg]  = useState(false)

  // ── Other fields ─────────────────────────────────────────────────
  const [storage, setStorage]         = useState(phone?.storage || '')
  const [condition, setCondition]     = useState(phone?.condition || 'reconditionne')
  const [grade, setGrade]             = useState(phone?.grade || 'Comme neuf')
  const [batteryHealth, setBatteryHealth] = useState(phone?.battery_health ?? '')
  const [imei, setImei]               = useState(phone?.imei || '')
  const [hasEsim, setHasEsim]         = useState(phone?.has_esim ?? isEsimModel(phone?.name || phone?.model))
  const [price, setPrice]             = useState(phone?.price || '')
  const [pricePro, setPricePro]       = useState(phone?.price_pro ?? '')
  const [purchasePrice, setPurchasePrice] = useState(phone?.purchase_price ?? '')
  const [tvaRegime, setTvaRegime]     = useState(phone?.tva_regime || (phone?.condition === 'neuf' ? 'normale' : 'marge'))
  const [fournisseur, setFournisseur] = useState(phone?.fournisseur || '')
  const [fournisseurCustom, setFournisseurCustom] = useState(
    phone?.fournisseur && !FOURNISSEURS_LIST.includes(phone.fournisseur) ? phone.fournisseur : ''
  )
  const [stockLocation, setStockLocation] = useState(phone?.stock_location || '')
  const [deposit, setDeposit]     = useState(phone?.deposit_amount || 50)
  const [magasinId, setMagasinId] = useState(phone?.magasin_id || phone?.magasins?.[0] || '')
  const [notes, setNotes]         = useState(phone?.notes || '')
  const initialPartsReplaced = (() => {
    const raw = phone?.parts_replaced
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return [] }
    }
    return []
  })()
  const [partsReplaced, setPartsReplaced] = useState(initialPartsReplaced)
  const [faceIdStatus, setFaceIdStatus]   = useState(phone?.face_id_status || null)
  const [saving, setSaving]       = useState(false)

  // ── Suggestions modèles — ordre générationnel strict ────────────
  const IPHONE_ORDER = [
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
    'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus',
    'iPhone SE (2020)', 'iPhone SE (2022)',
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16e', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPhone 17e', 'iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
  ]

  const calculateTVA = (priceVal, purchaseVal, regime) => {
    const p = parseFloat(priceVal) || 0
    if (p <= 0) return { ht: '0.00', tva: '0.00', ttc: 0 }
    if (regime === 'normale') {
      const ht = p / 1.21
      const tva = p - ht
      return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: p }
    }
    const marge = p - (parseFloat(purchaseVal) || 0)
    if (marge <= 0) return { ht: p.toFixed(2), tva: '0.00', ttc: p }
    const margeHT = marge / 1.21
    const tva = marge - margeHT
    const ht = p - tva
    return { ht: ht.toFixed(2), tva: tva.toFixed(2), ttc: p }
  }

  const modelSuggestions = (() => {
    if (!modelSearch || modelSearch.length === 0) return []
    const q = modelSearch.toLowerCase()
    const sortByRelevance = (a, b) => {
      const al = a.toLowerCase(), bl = b.toLowerCase()
      const aExact  = al === q
      const bExact  = bl === q
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      const aStarts = al.startsWith(q)
      const bStarts = bl.startsWith(q)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return a.length - b.length
    }
    if (categorie !== 'telephone') {
      const list = MODELS_BY_CATEGORIE[categorie]?.[brand] || []
      return list.filter((name) => name.toLowerCase().includes(q)).sort(sortByRelevance).slice(0, 8)
    }
    if (brand === 'Apple') {
      return IPHONE_ORDER.filter((name) => name.toLowerCase().includes(q)).sort(sortByRelevance).slice(0, 8)
    }
    if (brand === 'Autre') return []
    return searchModels(brand, modelSearch).sort(sortByRelevance).slice(0, 8)
  })()

  const availableColors   = selectedModel?.colors   || []
  const availableStorages = selectedModel?.storages || []

  const colorSuggestions = selectedModel
    ? selectedModel.colors.filter((c) => c.toLowerCase().includes(colorSearch.toLowerCase()))
    : []

  // ── Close suggestions on outside click ──────────────────────────
  useEffect(() => {
    const handleClickOutside = () => {
      setShowModelSugg(false)
      setShowColorSugg(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectModel = (modelName) => {
    let m = { model: modelName, storages: [], colors: [] }
    if (brand === 'Apple') {
      const apple = IPHONE_ON_DEMAND.find((i) => i.model === modelName)
      if (apple) m = apple
      else {
        const dbEntry = IPHONE_DATABASE.find((d) => d.model === modelName)
        if (dbEntry) m = dbEntry
      }
    } else if (brand !== 'Autre') {
      const found = findPhoneModel(brand, modelName)
      if (found) m = found
    }
    setSelectedModel(m)
    setModelSearch(modelName)
    setShowModelSugg(false)
    setStorage(m.storages?.[0] || '')
    setColorSearch(m.colors?.[0] || '')
    setHasEsim(isEsimModel(modelName))
  }

  // Mode édition : peuple selectedModel pour faire apparaître les pills couleur/stockage,
  // puis restaure les valeurs réelles du phone (handleSelectModel reset au 1er élément).
  useEffect(() => {
    if (isEdit && (phone?.model || phone?.name)) {
      handleSelectModel(phone.model || phone.name)
      setStorage(phone.storage || '')
      setColorSearch(phone.color || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePart = (part) => {
    setPartsReplaced((prev) => {
      const next = prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
      if (part === 'Face ID / Touch ID' && prev.includes(part)) setFaceIdStatus(null)
      return next
    })
  }

  const getPriceLimits = (modelName) => {
    const modelLimit = (modelLimits || []).find((l) => l.model_name === modelName)
    return {
      min: modelLimit?.price_min ?? priceSettings?.min ?? 0,
      max: modelLimit?.price_max ?? priceSettings?.max ?? 5000,
    }
  }

  const handleSave = async () => {
    if (!isEdit && !selectedModel && !modelSearch.trim()) return
    if (!isSurCommande) {
      const limits = getPriceLimits(modelSearch.trim() || selectedModel?.name)
      const priceVal = parseFloat(price)
      if (!isNaN(priceVal)) {
        if (priceVal < limits.min) {
          alert(`⚠️ Prix trop bas. Minimum autorisé : ${limits.min}€`)
          return
        }
        if (priceVal > limits.max) {
          alert(`⚠️ Prix trop élevé. Maximum autorisé : ${limits.max}€`)
          return
        }
      }
    }
    setSaving(true)
    try {
      const tvaCalc = calculateTVA(price, purchasePrice, tvaRegime)
      const phoneData = {
        name:           modelSearch.trim(),
        model:          modelSearch.trim(),
        brand:          brand || 'Apple',
        visible_on_site: phoneStatus === 'sur_commande' && categorie === 'telephone'
          ? true
          : phoneStatus === 'sur_commande'
            ? false
            : visibleOnSite,
        tva_regime:     tvaRegime || 'marge',
        tva_amount:     parseFloat(tvaCalc.tva),
        price_ht:       parseFloat(tvaCalc.ht),
        condition:      condition || 'occasion',
        grade:          condition !== 'neuf' ? (grade || null) : null,
        storage:        storage || null,
        color:          colorSearch.trim() || null,
        price:          parseFloat(price) || 0,
        price_pro:      pricePro !== '' && pricePro != null ? parseFloat(pricePro) : null,
        purchase_price: purchasePrice !== '' ? parseFloat(purchasePrice) : null,
        deposit_amount: parseFloat(deposit) || 50,
        magasin_id:     magasinId || null,
        magasins:       magasinId ? [magasinId] : [],
        notes:          notes || null,
        battery_health: batteryHealth !== '' ? parseInt(batteryHealth) : null,
        imei:           imei.trim() || null,
        fournisseur:    (fournisseur && fournisseur !== '__custom__') ? fournisseur : null,
        stock_location: stockLocation || null,
        parts_replaced: condition === 'reconditionne' ? (partsReplaced || []) : [],
        face_id_status: partsReplaced.includes('Face ID / Touch ID') ? faceIdStatus : null,
        status:         phoneStatus,
        categorie:      categorie || 'telephone',
        has_esim:       hasEsim,
        added_by:         currentUser.name || 'Admin',
        added_by_magasin: currentUser.magasin_id || magasinId || null,
      }

      if (isSurCommande) {
        phoneData.status = 'sur_commande'
        phoneData.visible_on_site = true
        phoneData.condition = 'neuf'
        phoneData.grade = ''
        phoneData.color = 'Toutes'
        phoneData.storage = 'Selon choix'
        phoneData.purchase_price = 0
        phoneData.delai_commande = '1h à 72h'
        phoneData.battery_health = null
        phoneData.magasin_id = null
        phoneData.magasins = []
        phoneData.tva_regime = 'marge'
        phoneData.parts_replaced = []
      }

      if (isEdit) {
        await updatePhone(phone.id, phoneData)
        onSaved()
        onClose()
        return
      }

      const { data, error } = await supabase
        .from('phones')
        .insert([phoneData])
        .select()

      if (error) {
        console.error('Erreur Supabase:', error)
        alert('Erreur: ' + error.message)
        return
      }

      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Erreur inattendue: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto z-10">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-20">
          <h2 className="font-poppins font-bold text-[#1B2A4A]">
            {isEdit ? 'Modifier le téléphone' : 'Ajouter un appareil'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Catégorie ── */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setCategorie(cat.value)
                    setSelectedModel(null)
                    setModelSearch('')
                    setColorSearch('')
                    setStorage('')
                    if (cat.value !== 'telephone') {
                      const brands = Object.keys(MODELS_BY_CATEGORIE[cat.value] || {})
                      setBrand(brands[0] || 'Apple')
                    } else {
                      setBrand('Apple')
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                    categorie === cat.value
                      ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sur commande toggle ── */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
            isSurCommande
              ? 'bg-orange-50 border-orange-300'
              : 'bg-gray-50 border-gray-200'}`}>
            <button
              type="button"
              onClick={() => {
                const next = !isSurCommande
                setIsSurCommande(next)
                setPhoneStatus(next ? 'sur_commande' : 'disponible')
                if (next) setCondition('neuf')
              }}
              className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0
                ${isSurCommande ? 'bg-orange-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full
                                transition-all shadow
                ${isSurCommande ? 'left-7' : 'left-1'}`}/>
            </button>
            <div>
              <p className="text-sm font-bold text-[#1B2A4A]">
                📦 Sur commande
              </p>
              <p className="text-xs text-gray-500">
                Disponible chez le fournisseur — pas en stock physique
              </p>
            </div>
          </div>

          {isSurCommande && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-xs text-orange-700 font-medium">
                📦 Mode Sur Commande
              </p>
              <ul className="text-xs text-orange-600 mt-1 space-y-0.5">
                <li>✓ Batterie affichée : 80-99% selon stock</li>
                <li>✓ Délai : 1h à 72h</li>
                <li>✓ Toutes les couleurs disponibles pour le client</li>
                <li>✓ Le client choisit sa couleur et son magasin</li>
              </ul>
            </div>
          )}

          {/* ── Section 0 — Marque ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Marque</h3>
            <div className="flex flex-wrap gap-2">
              {(categorie === 'telephone'
                ? BRANDS
                : Object.keys(MODELS_BY_CATEGORIE[categorie] || {})
              ).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setBrand(b)
                    setSelectedModel(null)
                    setModelSearch('')
                    setColorSearch('')
                    setStorage('')
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all cursor-pointer ${
                    brand === b
                      ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                      : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 1 — Modèle ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Modèle</h3>
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder={brand === 'Autre' ? 'Modèle libre…' : `Rechercher ${brand}…`}
                value={modelSearch}
                onChange={(e) => { setModelSearch(e.target.value); setShowModelSugg(true); setSelectedModel(null) }}
                onFocus={() => setShowModelSugg(true)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none"
              />
              {showModelSuggestions && modelSearch && modelSuggestions.length > 0 && (categorie !== 'telephone' || brand !== 'Autre') && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-30 max-h-48 overflow-y-auto">
                  {modelSuggestions.map((name) => (
                    <div
                      key={name}
                      onMouseDown={() => handleSelectModel(name)}
                      className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2 — Configuration ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Configuration</h3>
            <div className="grid grid-cols-2 gap-3">

              {/* État */}
              {!isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">État</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  >
                    {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                  </select>
                </div>
              )}

              {/* Grade (sauf accessoire, si pas neuf) */}
              {categorie !== 'accessoire' && condition !== 'neuf' && !isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              )}

              {/* Santé batterie — téléphone/tablette uniquement */}
              {(categorie === 'telephone' || categorie === 'tablette') && condition !== 'neuf' && !isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Santé batterie (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="ex: 92"
                    value={batteryHealth}
                    onChange={(e) => setBatteryHealth(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Vide si inconnu · 100 = neuve</p>
                </div>
              )}

              {/* Stockage dynamique — téléphone/tablette */}
              {(categorie === 'telephone' || categorie === 'tablette') && !isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Stockage</label>
                  {availableStorages.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableStorages.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStorage(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                            storage === s
                              ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                              : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <select
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none bg-white"
                    >
                      <option value="">—</option>
                      {['16Go','32Go','64Go','128Go','256Go','512Go','1To'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Couleur dynamique — téléphone/tablette */}
              {(categorie === 'telephone' || categorie === 'tablette') && !isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Couleur</label>
                  {availableColors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColorSearch(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all cursor-pointer ${
                            colorSearch === c
                              ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                              : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Couleur…"
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none"
                    />
                  )}
                </div>
              )}

              {/* ── MONTRE ── */}
              {categorie === 'montre' && (
                <>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Taille boîtier</label>
                    <div className="flex flex-wrap gap-2">
                      {(WATCH_SIZES[brand]?.[modelSearch] || WATCH_SIZES[brand]?.['default'] || WATCH_SIZES['default']).map((size) => (
                        <button key={size} type="button"
                          onClick={() => setStorage(size)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            storage === size ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {(WATCH_COLORS[brand]?.[modelSearch] || WATCH_COLORS[brand]?.['default'] || WATCH_COLORS['default']).map((c) => (
                        <button key={c} type="button"
                          onClick={() => setColorSearch(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            colorSearch === c ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bracelet</label>
                    <div className="flex flex-wrap gap-2">
                      {WATCH_BRACELETS.map((b) => (
                        <button key={b} type="button"
                          onClick={() => setNotes((prev) => `Bracelet: ${b}. ${prev.replace(/Bracelet:.*?\. ?/, '')}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            notes.includes(`Bracelet: ${b}`) ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={notes.includes('GPS.')}
                        onChange={(e) => setNotes((prev) => e.target.checked ? `GPS. ${prev}` : prev.replace('GPS. ', ''))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-gray-700">GPS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={notes.includes('Cellular.')}
                        onChange={(e) => setNotes((prev) => e.target.checked ? `Cellular. ${prev}` : prev.replace('Cellular. ', ''))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-gray-700">Cellular / LTE</span>
                    </label>
                  </div>
                </>
              )}

              {/* ── ECOUTEUR ── */}
              {categorie === 'ecouteur' && (
                <>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {(EARPHONE_COLORS[brand]?.[modelSearch] || EARPHONE_COLORS[brand]?.['default'] || EARPHONE_COLORS['default']).map((c) => (
                        <button key={c} type="button"
                          onClick={() => setColorSearch(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            colorSearch === c ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={notes.includes('Réduction de bruit active.')}
                        onChange={(e) => setNotes((prev) => e.target.checked ? `Réduction de bruit active. ${prev}` : prev.replace('Réduction de bruit active. ', ''))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-gray-700">Réduction de bruit active (ANC)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={notes.includes('Boîtier inclus.')}
                        onChange={(e) => setNotes((prev) => e.target.checked ? `Boîtier inclus. ${prev}` : prev.replace('Boîtier inclus. ', ''))}
                        className="w-4 h-4 rounded" />
                      <span className="text-sm font-medium text-gray-700">Boîtier inclus</span>
                    </label>
                  </div>
                </>
              )}

              {/* ── ORDINATEUR ── */}
              {categorie === 'ordinateur' && (
                <>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Couleur</label>
                    <div className="flex flex-wrap gap-2">
                      {(COMPUTER_COLORS[brand]?.['default'] || COMPUTER_COLORS['default']).map((c) => (
                        <button key={c} type="button"
                          onClick={() => setColorSearch(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            colorSearch === c ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Stockage SSD</label>
                    <div className="flex flex-wrap gap-2">
                      {COMPUTER_STORAGE.map((s) => (
                        <button key={s} type="button"
                          onClick={() => setStorage(s)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            storage === s ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">RAM</label>
                    <div className="flex flex-wrap gap-2">
                      {COMPUTER_RAM.map((r) => (
                        <button key={r} type="button"
                          onClick={() => setNotes((prev) => `RAM: ${r}. ${prev.replace(/RAM:.*?\. ?/, '')}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            notes.includes(`RAM: ${r}`) ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Taille écran</label>
                    <div className="flex flex-wrap gap-2">
                      {COMPUTER_SCREEN.map((s) => (
                        <button key={s} type="button"
                          onClick={() => setNotes((prev) => `Écran: ${s}. ${prev.replace(/Écran:.*?\. ?/, '')}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            notes.includes(`Écran: ${s}`) ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Processeur</label>
                    <div className="flex flex-wrap gap-2">
                      {COMPUTER_CPU.map((cpu) => (
                        <button key={cpu} type="button"
                          onClick={() => setNotes((prev) => `CPU: ${cpu}. ${prev.replace(/CPU:.*?\. ?/, '')}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                            notes.includes(`CPU: ${cpu}`) ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
                          }`}>
                          {cpu}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── ACCESSOIRE ── */}
              {categorie === 'accessoire' && (
                <>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Couleur</label>
                    <input
                      type="text"
                      placeholder="Couleur…"
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Compatibilité</label>
                    <input
                      type="text"
                      placeholder="ex: iPhone 15 Pro, Samsung S24..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Section 3 — Prix ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Prix</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#555] mb-1 block">Prix de vente (€)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={
                    condition === 'reconditionne' && modelSearch
                      ? `Réf: ${getStartingPrice(modelSearch) || '?'}€`
                      : 'Prix de vente'
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
                {(() => {
                  const limits = getPriceLimits(modelSearch.trim() || selectedModel?.name)
                  return (
                    <p className="text-xs text-gray-400 mt-1">
                      Limites autorisées : {limits.min}€ — {limits.max}€
                    </p>
                  )
                })()}
              </div>
              <div>
                <label className="text-xs text-[#555] mb-1 block">Prix d'achat (€)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="ex: 150"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
                {purchasePrice !== '' && price !== '' && (
                  <p className={`text-[11px] mt-1 font-semibold ${(parseFloat(price) - parseFloat(purchasePrice)) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    Bénéfice : {parseFloat(price) - parseFloat(purchasePrice)}€
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Prix Pro (€) <span className="text-gray-400 normal-case">— réservé revendeurs, masqué du public</span>
                </label>
                <input
                  type="number"
                  value={pricePro}
                  onChange={(e) => setPricePro(e.target.value)}
                  placeholder="Laisser vide = non visible en Pro"
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si défini, l'appareil apparaît dans l'Espace Pro à ce prix.
                </p>
              </div>
              <div>
                <label className="text-xs text-[#555] mb-1 block">Acompte (€)</label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
              </div>
            </div>

            {/* ── TVA ── */}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Régime TVA</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { value: 'marge',   label: '📊 TVA sur marge',   sub: 'Occasion & Reconditionné' },
                  { value: 'normale', label: '💼 TVA normale 21%', sub: 'Téléphones neufs' },
                ].map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTvaRegime(value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      tvaRegime === value ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]'
                    }`}
                  >
                    <p className={`text-xs font-bold ${tvaRegime === value ? 'text-[#00B4CC]' : 'text-[#1B2A4A]'}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>

              {price && (() => {
                const calc = calculateTVA(price, purchasePrice, tvaRegime)
                const marge = (parseFloat(price) || 0) - (parseFloat(purchasePrice) || 0)
                return (
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Prix de vente TTC</span>
                      <span className="font-medium">{(parseFloat(price) || 0).toFixed(2)}€</span>
                    </div>
                    {tvaRegime === 'marge' && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Marge brute</span>
                        <span className="font-medium">{marge.toFixed(2)}€</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>TVA 21% {tvaRegime === 'marge' ? '(sur marge)' : '(sur prix)'}</span>
                      <span className="font-bold">{calc.tva}€</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-[#1B2A4A] border-t border-gray-200 pt-1.5">
                      <span>Prix HT</span>
                      <span>{calc.ht}€</span>
                    </div>
                    {(() => {
                      const beneficeNet = parseFloat(calc.ht) - (parseFloat(purchasePrice) || 0)
                      const positive    = beneficeNet >= 0
                      return (
                        <div className={`flex justify-between text-xs font-bold border-t border-gray-200 pt-1.5 ${positive ? 'text-green-600' : 'text-red-500'}`}>
                          <span>Bénéfice réel après impôts</span>
                          <span>{positive ? '+' : ''}{beneficeNet.toFixed(2)}€</span>
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ── Section 3b — Provenance ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Provenance & localisation</h3>
            <div className="grid grid-cols-2 gap-3">
              {!isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">IMEI</label>
                  <input
                    type="text"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="ex: 356761086758197"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
              )}
              <div className="col-span-2 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <input
                  type="checkbox"
                  id="esim"
                  checked={hasEsim}
                  onChange={(e) => setHasEsim(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#1B2A4A]"
                />
                <label htmlFor="esim" className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-bold text-[#1B2A4A]">Compatible eSIM</span>
                  <span className="text-xs bg-[#1B2A4A] text-white px-2 py-0.5 rounded-lg font-bold">
                    eSIM
                  </span>
                  <span className="text-xs text-blue-600">
                    {isEsimModel(modelSearch) ? '✓ Détecté automatiquement' : ''}
                  </span>
                </label>
              </div>
              <div>
                <label className="text-xs text-[#555] mb-1 block">Fournisseur</label>
                <select
                  value={FOURNISSEURS_LIST.includes(fournisseur) ? fournisseur : (fournisseur ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setFournisseur('__custom__')
                    } else {
                      setFournisseur(e.target.value)
                    }
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none mb-2"
                >
                  <option value="">— Choisir —</option>
                  {FOURNISSEURS_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  <option value="__custom__">+ Ajouter un fournisseur</option>
                </select>
                {(fournisseur === '__custom__' || (fournisseur && !FOURNISSEURS_LIST.includes(fournisseur))) && (
                  <input
                    value={fournisseur === '__custom__' ? fournisseurCustom : fournisseur}
                    onChange={(e) => {
                      setFournisseurCustom(e.target.value)
                      setFournisseur(e.target.value)
                    }}
                    placeholder="Nom du nouveau fournisseur"
                    className="w-full mt-2 px-3 py-2 border border-[#00B4CC] rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                    autoFocus
                  />
                )}
              </div>
              {!isSurCommande && (
                <div>
                  <label className="text-xs text-[#555] mb-1 block">Localisation</label>
                  <select
                    value={stockLocation}
                    onChange={(e) => setStockLocation(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  >
                    <option value="">— Choisir —</option>
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 4 — Magasin ── */}
          {!isSurCommande && (
            <div>
              <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Magasin *</h3>
              <select
                value={magasinId}
                onChange={(e) => setMagasinId(e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none ${
                  !magasinId ? 'border-orange-300' : 'border-gray-200'
                }`}
              >
                <option value="">— Sélectionner le magasin —</option>
                {MAGASINS.map((magasin) => (
                  <option key={magasin.id} value={magasin.id}>{magasin.nom}</option>
                ))}
              </select>
              {!magasinId && (
                <p className="text-xs text-orange-500 mt-1.5">⚠️ Aucun magasin sélectionné</p>
              )}
            </div>
          )}

          {/* ── Section 4.4 — Statut ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-2">Statut</h3>
            <div className="flex flex-wrap gap-2">
              {['disponible', 'sur_commande'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPhoneStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all cursor-pointer ${
                    phoneStatus === s
                      ? s === 'sur_commande'
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#00B4CC]'
                  }`}
                >
                  {s === 'disponible' ? '✅ Disponible' : '📦 Sur commande'}
                </button>
              ))}
            </div>
            {phoneStatus === 'sur_commande' && (
              <p className="text-xs text-orange-600 mt-1">📦 Téléphone non en stock physique — automatiquement masqué du site public</p>
            )}
          </div>

          {/* ── Section 4.5 — Visibilité site ── */}
          {phoneStatus !== 'sur_commande' && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-[#1B2A4A]">Visible sur sebphone.be</p>
                <p className="text-xs text-gray-400 mt-0.5">Désactivez pour un stock interne uniquement</p>
              </div>
              <button
                type="button"
                onClick={() => setVisibleOnSite((v) => !v)}
                className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${
                  visibleOnSite ? 'bg-[#00B4CC]' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  visibleOnSite ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          )}

          {/* ── Section 5 — Pièces remplacées (reconditionné) ── */}
          {condition === 'reconditionne' && (
            <div>
              <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Pièces remplacées</h3>
              <div className="grid grid-cols-2 gap-2">
                {PARTS.map((part) => (
                  <label key={part} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={partsReplaced.includes(part)}
                      onChange={() => togglePart(part)}
                      className="w-4 h-4 accent-[#00B4CC]"
                    />
                    <span className="text-[#333]">{part}</span>
                  </label>
                ))}
              </div>
              {partsReplaced.includes('Face ID / Touch ID') && (
                <div className="mt-3 ml-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFaceIdStatus('fonctionnel')}
                    className={`px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                      faceIdStatus === 'fonctionnel'
                        ? 'bg-green-100 border-green-500 text-green-700 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-500'
                    }`}
                  >
                    ✅ Fonctionnel
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaceIdStatus('non_fonctionnel')}
                    className={`px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                      faceIdStatus === 'non_fonctionnel'
                        ? 'bg-red-100 border-red-500 text-red-700 font-bold'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-red-500'
                    }`}
                  >
                    ❌ Pas fonctionnel
                  </button>
                </div>
              )}
              {partsReplaced.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">Aucune pièce remplacée = État original</p>
              )}
            </div>
          )}

          {/* ── Section 6 — Notes ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-2">Notes internes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Visible uniquement en back-office..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 z-20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-[#555] hover:text-[#1B2A4A] border border-gray-200 rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!isEdit && !selectedModel && !modelSearch.trim())}
            className="px-6 py-2.5 text-sm font-bold bg-[#1B2A4A] hover:bg-[#243a64] text-white rounded-xl cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── PAGE PRINCIPALE ─── */
export default function Stock() {
  useRequirePermission('voir_stock')
  const canAdd    = usePermission('ajouter_stock')
  const canEdit   = usePermission('modifier_stock')
  const isAdmin = useIsAdmin()
  const canDeletePerm = usePermission('supprimer_stock')
  const canDelete = isAdmin || canDeletePerm
  const canStar   = usePermission('offre_semaine')

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} } })()

  const [phones, setPhones]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [priceSettings, setPriceSettings] = useState({ min: 0, max: 5000 })
  const [modelLimits, setModelLimits]     = useState([])
  const [search, setSearch]               = useState('')
  const [filterMagasin, setFilterMagasin] = useState(null)
  const [selectedFournisseur, setSelectedFournisseur] = useState('tous')
  const [selectedTVA, setSelectedTVA] = useState('tous')
  const [selectedCondition, setSelectedCondition] = useState('tous')
  const [selectedStockStatus, setSelectedStockStatus] = useState('tous')
  const [selectedCategorie, setSelectedCategorie] = useState('tous')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingPhone, setEditingPhone]   = useState(null)
  const [etiquettePhone, setEtiquettePhone] = useState(null)

  const [showSaleModal, setShowSaleModal] = useState(false)
  const [salePhone, setSalePhone]         = useState(null)

  const fetchPhones = async () => {
    setLoading(true)
    if (!isSupabaseReady) {
      setPhones(phonesMock)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('phones')
      .select('*')
      .neq('status', 'vendu')
      .or('fournisseur.is.null,fournisseur.neq.Price MyPhone Pro')
      .order('created_at', { ascending: false })
    setPhones(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPhones()
    if (!isSupabaseReady) return
    const channel = supabase
      .channel('admin-stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phones' }, fetchPhones)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const saleId = searchParams.get('sale')
    if (saleId && phones.length > 0) {
      const phone = phones.find((p) => p.id === saleId)
      if (phone) {
        setSalePhone(phone)
        setShowSaleModal(true)
        searchParams.delete('sale')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [phones, searchParams])

  useEffect(() => {
    if (!isSupabaseReady) return
    const fetchLimits = async () => {
      const { data: s } = await supabase
        .from('price_settings').select('*').eq('id', 1).single()
      if (s) setPriceSettings({
        min: Number(s.global_min) || 0,
        max: Number(s.global_max) || 5000,
      })
      const { data: ml } = await supabase
        .from('model_price_limits').select('*')
      setModelLimits((ml || []).map((l) => ({
        ...l,
        price_min: l.price_min != null ? Number(l.price_min) : null,
        price_max: l.price_max != null ? Number(l.price_max) : null,
      })))
    }
    fetchLimits()
  }, [])

  const handleStatusChange = async (id, status) => { await updatePhoneStatus(id, status) }
  const handlePriceChange  = async (id, price)  => { await updatePhonePrice(id, price) }

  const handleToggleOffreSemaine = async (phone) => {
    if (!isSupabaseReady) return
    const isAlready = phone.offre_semaine === true
    // Retire l'étoile de tous les téléphones
    await supabase.from('phones').update({ offre_semaine: false }).neq('id', 0)
    // Si ce n'était pas déjà lui → l'activer
    if (!isAlready) {
      await supabase.from('phones').update({ offre_semaine: true }).eq('id', phone.id)
    }
    setPhones((prev) => prev.map((p) => ({
      ...p,
      offre_semaine: !isAlready && p.id === phone.id,
    })))
  }

  const handleDelete = async (phoneId) => {
    if (!window.confirm('Supprimer ce téléphone ? Cette action est irréversible.')) return
    try {
      await supabase.from('payments').delete().eq('phone_id', phoneId)
      await supabase.from('orders').delete().eq('phone_id', phoneId)
      await supabase.from('weekly_offer').delete().eq('phone_id', phoneId)
      await supabase.from('best_sellers_config').delete().eq('phone_id', phoneId)
      const { error } = await supabase.from('phones').delete().eq('id', phoneId)
      if (error) throw error
      setPhones((prev) => prev.filter((p) => p.id !== phoneId))
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Erreur lors de la suppression')
    }
  }

  const STOCK_ORDER = [
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
    'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus',
    'iPhone SE (2020)', 'iPhone SE (2022)',
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16e', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPhone 17e', 'iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
  ]

  // Trouve l'index du modèle correspondant — nettoie "Apple " préfixe,
  // match exact d'abord, puis substring (match le plus tardif pour
  // qu'iPhone 11 Pro Max ne soit pas classé comme iPhone 11)
  const getModelIndex = (phone) => {
    const cleanName = (phone.name || phone.model || '')
      .replace(/^Apple\s+/i, '')
      .trim()
    const exactIndex = STOCK_ORDER.indexOf(cleanName)
    if (exactIndex !== -1) return exactIndex
    for (let i = STOCK_ORDER.length - 1; i >= 0; i--) {
      if (cleanName.includes(STOCK_ORDER[i])) return i
    }
    return 999
  }

  const filtered = phones
    .filter((p) => {
      const q = search.toLowerCase().trim()
      if (q) {
        const name = (p.name || '').toLowerCase()
        const imeiMatch = p.imei && p.imei.includes(search.trim())
        if (!name.startsWith(q) && !name.includes(' ' + q) && !imeiMatch) return false
      }
      if (filterMagasin) {
        const mags = Array.isArray(p.magasins) ? p.magasins : []
        if (!mags.includes(filterMagasin)) return false
      }
      if (selectedFournisseur !== 'tous' && p.fournisseur !== selectedFournisseur) return false
      if (selectedTVA !== 'tous' && (p.tva_regime || 'marge') !== selectedTVA) return false
      if (selectedCondition !== 'tous' && p.condition !== selectedCondition) return false
      if (selectedStockStatus !== 'tous' && p.status !== selectedStockStatus) return false
      const matchCategorie = selectedCategorie === 'tous' ||
        (p.categorie || 'telephone') === selectedCategorie
      if (!matchCategorie) return false
      return true
    })
    .sort((a, b) => {
      const modelDiff = getModelIndex(a) - getModelIndex(b)
      if (modelDiff !== 0) return modelDiff
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Gestion du stock</h1>
          <p className="text-sm text-[#555555] mt-0.5">{phones.filter((p) => p.status !== 'sur_commande').length} appareils</p>
        </div>
        {canAdd && (
          <button
            onClick={() => { setEditingPhone(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
          >
            <Plus size={16} />
            Ajouter un appareil
          </button>
        )}
      </div>

      {/* Search + Filtres magasins */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
          />
        </div>

        <button
          onClick={() => setFilterMagasin(null)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            filterMagasin === null
              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
              : 'bg-white text-[#555] border-gray-200 hover:border-[#1B2A4A]'
          }`}
        >
          Tous
        </button>

        {MAGASINS_ADMIN.filter((m) => m.id !== 'sebphone').map((mag) => {
          const shortName = mag.nom.replace('Seb Telecom — ', '').replace('Seb Telecom ', '')
          const count = phones.filter((p) =>
            Array.isArray(p.magasins) && p.magasins.includes(mag.id) && p.status === 'disponible'
          ).length
          return (
            <button
              key={mag.id}
              onClick={() => setFilterMagasin(filterMagasin === mag.id ? null : mag.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMagasin === mag.id
                  ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                  : 'bg-white text-[#555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'
              }`}
            >
              {shortName}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filterMagasin === mag.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filtres fournisseur */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 mr-1">Filtrer par fournisseur :</p>
        {[
          'tous',
          'SebPhone',
          ...MAGASINS_PHYSIQUES.map((m) => m.nom.replace('Seb Telecom — ', '')),
        ].map((fournisseur) => {
          const isActive = selectedFournisseur === fournisseur
          const activeBg =
            fournisseur === 'SebPhone'  ? 'bg-cyan-500 text-white' :
            fournisseur === 'Marrakech' ? 'bg-orange-500 text-white' :
                                          'bg-[#1B2A4A] text-white'
          const label =
            fournisseur === 'tous'      ? 'Tous' :
            fournisseur === 'SebPhone'  ? '💻 SebPhone' :
            fournisseur === 'Marrakech' ? '🌍 Marrakech' :
                                          fournisseur
          return (
            <button
              key={fournisseur}
              onClick={() => setSelectedFournisseur(fournisseur)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isActive ? activeBg : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Filtres TVA */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 mr-1">Filtrer par TVA :</p>
        {[
          { value: 'tous',    label: 'Tous',                activeBg: 'bg-[#1B2A4A] text-white' },
          { value: 'marge',   label: '📊 TVA sur marge',    activeBg: 'bg-purple-500 text-white' },
          { value: 'normale', label: '💼 TVA normale 21%',  activeBg: 'bg-blue-500 text-white' },
        ].map(({ value, label, activeBg }) => (
          <button
            key={value}
            onClick={() => setSelectedTVA(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedTVA === value ? activeBg : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-auto">
          {filtered.length} téléphone{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtres état (condition) */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 mr-1">Filtrer par état :</p>
        {[
          { value: 'tous',          label: 'Tous',              activeBg: 'bg-[#1B2A4A] text-white' },
          { value: 'neuf',          label: '🆕 Neuf',           activeBg: 'bg-blue-500 text-white' },
          { value: 'occasion',      label: '📱 Occasion',       activeBg: 'bg-gray-600 text-white' },
          { value: 'reconditionne', label: '🔧 Reconditionné',  activeBg: 'bg-orange-500 text-white' },
        ].map(({ value, label, activeBg }) => (
          <button
            key={value}
            onClick={() => setSelectedCondition(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedCondition === value ? activeBg : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres statut stock */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold text-gray-500 mr-1">Filtrer par statut :</p>
        {[
          { value: 'tous',         label: 'Tous',           activeBg: 'bg-[#1B2A4A] text-white' },
          { value: 'disponible',   label: '✅ Disponible',  activeBg: 'bg-green-500 text-white' },
          { value: 'reserve',      label: '🟡 Réservé',     activeBg: 'bg-yellow-500 text-white' },
          { value: 'sur_commande', label: '📦 Sur commande', activeBg: 'bg-orange-500 text-white' },
        ].map(({ value, label, activeBg }) => (
          <button
            key={value}
            onClick={() => setSelectedStockStatus(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              selectedStockStatus === value ? activeBg : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres catégorie */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Catégorie :</span>
        <button
          onClick={() => setSelectedCategorie('tous')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
            selectedCategorie === 'tous'
              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Tous
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategorie(cat.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
              selectedCategorie === cat.value
                ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="block lg:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#888] text-sm">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun téléphone en stock'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((phone) => (
              <div key={phone.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={getPhoneImage(phone.model || phone.name, phone.color)}
                        alt={phone.name || phone.model}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1B2A4A] text-sm leading-tight truncate">
                        {phone.name || phone.model?.name}
                      </p>
                      {phone.status === 'sur_commande' ? (
                        <p className="text-xs text-orange-500 font-medium mt-0.5">
                          📦 Toutes couleurs — Client choisit
                        </p>
                      ) : (
                        <p className="text-[#888] text-xs mt-0.5">
                          {phone.storage}{phone.color ? ` · ${phone.color}` : ''}
                        </p>
                      )}
                      {phone.imei && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          IMEI : {phone.imei}
                        </p>
                      )}
                      {phone.has_esim && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold bg-[#1B2A4A] text-white px-1.5 py-0.5 rounded-md">
                          eSIM
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-[#00B4CC] text-sm flex-shrink-0">{phone.price}€</span>
                </div>
                {Array.isArray(phone.parts_replaced) && phone.parts_replaced.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {phone.parts_replaced.map((part, i) => (
                      <span key={i}
                        className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-md">
                        {part}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLORS[phone.condition] || 'bg-gray-100 text-gray-600'}`}>
                      {CONDITION_LABELS[phone.condition] || phone.condition}
                    </span>
                    {phone.grade && (
                      <span className="px-2 py-0.5 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-xs font-bold whitespace-nowrap">
                        {phone.grade}
                      </span>
                    )}
                    {phone.fournisseur === 'SebPhone' && (
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">💻 SebPhone</span>
                    )}
                    <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {phone.status === 'sur_commande' && (
                      <button
                        onClick={async () => {
                          if (!window.confirm('Marquer ce téléphone comme reçu et disponible en stock ?')) return
                          await supabase.from('phones').update({ status: 'disponible', visible_on_site: true }).eq('id', phone.id)
                          fetchPhones()
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-all whitespace-nowrap cursor-pointer"
                      >
                        ✅ Recevoir
                      </button>
                    )}
                    {(phone.status === 'disponible' || phone.status === 'reserve') && (
                      <button
                        onClick={() => {
                          setSalePhone(phone)
                          setShowSaleModal(true)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-all whitespace-nowrap cursor-pointer"
                      >
                        💰 Vendu
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => { setEditingPhone(phone); setModalOpen(true) }}
                        className="p-2 text-[#888] hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(phone.id)}
                        className="p-2 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => setEtiquettePhone(phone)}
                      title="Imprimer étiquette"
                      className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      🏷️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#888] text-sm">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun téléphone en stock'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-56">Modèle</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-32">État / Grade</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-16">Bat.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-20">Prix</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-24">Ach./Bén.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-28">Magasin</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-24">Fournis.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide w-32">Statut</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-[#555555] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((phone) => (
                  <tr key={phone.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={getPhoneImage(phone)}
                            alt={phone.name || phone.model}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              e.target.onerror = null
                              const entry = IPHONE_DATABASE.find((p) => p.model?.toLowerCase() === (phone.model || '').toLowerCase())
                              e.target.src = entry?.imageUrl || 'https://placehold.co/200x200/f5f5f5/cccccc?text=iPhone'
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1B2A4A] leading-tight">{phone.name || phone.model?.name}</p>
                          {phone.status === 'sur_commande' ? (
                            <p className="text-xs text-orange-500 font-medium">
                              📦 Toutes couleurs — Client choisit
                            </p>
                          ) : (
                            <p className="text-xs text-[#888]">{phone.storage}{phone.color ? ` · ${phone.color}` : ''}</p>
                          )}
                          {phone.imei && (
                            <p className="text-[10px] text-gray-400 font-mono">IMEI : {phone.imei}</p>
                          )}
                          {phone.has_esim && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold bg-[#1B2A4A] text-white px-1.5 py-0.5 rounded-md">
                              eSIM
                            </span>
                          )}
                          {phone.added_by && (
                            <p className="text-[10px] text-gray-400">
                              👤 {phone.added_by}{phone.added_by_magasin ? ` · ${(MAGASINS.find(m => m.id === phone.added_by_magasin)?.nom || phone.added_by_magasin).replace('Seb Telecom — ', '')}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium w-fit ${CONDITION_COLORS[phone.condition] || 'bg-gray-100 text-gray-700'}`}>
                          {CONDITION_LABELS[phone.condition] || phone.condition}
                        </span>
                        {phone.grade && (
                          <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 w-fit">
                            {phone.grade}
                          </span>
                        )}
                        {Array.isArray(phone.parts_replaced) && phone.parts_replaced.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {phone.parts_replaced.map((part, i) => (
                              <span key={i}
                                className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-md">
                                {part}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {phone.battery_health != null
                        ? <span className={`text-sm font-bold ${phone.battery_health >= 85 ? 'text-green-600' : phone.battery_health >= 75 ? 'text-orange-500' : 'text-red-500'}`}>{phone.battery_health}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <InlinePrice id={phone.id} value={phone.price} onSave={handlePriceChange} />
                    </td>
                    <td className="px-3 py-3">
                      {phone.purchase_price != null ? (
                        <p className="text-xs whitespace-nowrap">
                          <span className="text-[#888]">{phone.purchase_price}€</span>
                          <span className={`font-bold ${(phone.price - phone.purchase_price) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {' / '}{(phone.price - phone.purchase_price) >= 0 ? '+' : ''}{phone.price - phone.purchase_price}€
                          </span>
                        </p>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-gray-700">
                      {phone.magasins?.[0]
                        ? (MAGASINS_MAP[phone.magasins[0]]?.nom?.replace('Seb Telecom — ', '') || phone.magasins[0])
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">
                      {phone.fournisseur || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 flex-nowrap">
                        {(phone.status === 'disponible' || phone.status === 'reserve') && (
                          <button
                            onClick={() => {
                              setSalePhone(phone)
                              setShowSaleModal(true)
                            }}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            title="Vendre"
                          >
                            Vendu
                          </button>
                        )}
                        <button
                          onClick={() => setEtiquettePhone(phone)}
                          title="Imprimer étiquette"
                          className="p-1.5 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Tag size={14} />
                        </button>
                        {canStar && (
                          <button
                            onClick={() => handleToggleOffreSemaine(phone)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              phone.offre_semaine
                                ? 'text-yellow-400 bg-yellow-50'
                                : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'
                            }`}
                            title="Offre de la semaine"
                          >
                            <Star size={14} fill={phone.offre_semaine ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => { setEditingPhone(phone); setModalOpen(true) }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(phone.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <PhoneModal
          phone={editingPhone}
          onClose={() => setModalOpen(false)}
          onSaved={fetchPhones}
          priceSettings={priceSettings}
          modelLimits={modelLimits}
        />
      )}

      {etiquettePhone && (
        <Etiquette
          phone={etiquettePhone}
          onClose={() => setEtiquettePhone(null)}
        />
      )}

      {showSaleModal && salePhone && (
        <PhoneSaleModal
          phone={salePhone}
          onClose={() => { setShowSaleModal(false); setSalePhone(null) }}
          onSold={fetchPhones}
          priceSettings={priceSettings}
          modelLimits={modelLimits}
        />
      )}
    </div>
  )
}
