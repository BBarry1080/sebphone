// SQL à exécuter dans Supabase si ces colonnes manquent :
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS magasins JSONB DEFAULT '[]'::jsonb;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS color TEXT;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS parts_replaced JSONB DEFAULT '[]'::jsonb;

import { useState, useEffect, useRef } from 'react'
import { Smartphone, Plus, Search, Pencil, Trash2, X, Star } from 'lucide-react'
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
import emailjs from '@emailjs/browser'
const MAGASINS = MAGASINS_PHYSIQUES

const EMAILJS_SERVICE_ID   = import.meta.env.VITE_EMAILJS_SERVICE_ID         || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY         || 'rqbaYNMIGNP6IQB9O'
const INVOICE_TEMPLATE_ID  = 'template_pzv7w8d'
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage'
import { getStartingPrice } from '../../data/startingPrices'


const CONDITIONS = ['neuf', 'reconditionne', 'occasion']
const CONDITION_LABELS = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const GRADES = ['Bon état', 'Très bon état', 'Comme neuf', 'Neuf']
const FOURNISSEURS = ['SebPhone', 'Marrakech', 'Molenbeek', 'Louise', 'Anderlecht']
const FOURNISSEURS_LIST = [
  'SebPhone',
  'Louise',
  'Anderlecht',
  'Molenbeek',
  'Rue Neuve',
  'Marrakech',
  'Zainab Debboun',
  'Fournisseur externe 1',
  'Fournisseur externe 2',
  'Autre',
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

function PhoneModal({ phone, onClose, onSaved }) {
  const currentUser = useCurrentUser()
  const isEdit = !!phone

  // ── Brand & visibilité ───────────────────────────────────────────
  const [brand, setBrand]                         = useState(phone?.brand || 'Apple')
  const [visibleOnSite, setVisibleOnSite]         = useState(phone?.visible_on_site ?? true)
  const [phoneStatus, setPhoneStatus]             = useState(phone?.status || 'disponible')

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
  const [price, setPrice]             = useState(phone?.price || '')
  const [purchasePrice, setPurchasePrice] = useState(phone?.purchase_price ?? '')
  const [tvaRegime, setTvaRegime]     = useState(phone?.tva_regime || (phone?.condition === 'neuf' ? 'normale' : 'marge'))
  const [fournisseur, setFournisseur] = useState(phone?.fournisseur || '')
  const [fournisseurCustom, setFournisseurCustom] = useState(
    phone?.fournisseur && !FOURNISSEURS_LIST.includes(phone.fournisseur) ? phone.fournisseur : ''
  )
  const [stockLocation, setStockLocation] = useState(phone?.stock_location || '')
  const [deposit, setDeposit]     = useState(phone?.deposit_amount || 50)
  const [magasins, setMagasins]   = useState(phone?.magasins || [])
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
  }

  const handleMagasinToggle = (id) => {
    setMagasins((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const togglePart = (part) => {
    setPartsReplaced((prev) => {
      const next = prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
      if (part === 'Face ID / Touch ID' && prev.includes(part)) setFaceIdStatus(null)
      return next
    })
  }

  const handleSave = async () => {
    if (!isEdit && !selectedModel && !modelSearch.trim()) return
    setSaving(true)
    try {
      const tvaCalc = calculateTVA(price, purchasePrice, tvaRegime)
      const phoneData = {
        name:           modelSearch.trim(),
        model:          modelSearch.trim(),
        brand:          brand || 'Apple',
        visible_on_site: phoneStatus === 'sur_commande' ? false : visibleOnSite,
        tva_regime:     tvaRegime || 'marge',
        tva_amount:     parseFloat(tvaCalc.tva),
        price_ht:       parseFloat(tvaCalc.ht),
        condition:      condition || 'occasion',
        grade:          condition !== 'neuf' ? (grade || null) : null,
        storage:        storage || null,
        color:          colorSearch.trim() || null,
        price:          parseFloat(price) || 0,
        purchase_price: purchasePrice !== '' ? parseFloat(purchasePrice) : null,
        deposit_amount: parseFloat(deposit) || 50,
        magasins:       magasins || [],
        notes:          notes || null,
        battery_health: batteryHealth !== '' ? parseInt(batteryHealth) : null,
        imei:           imei.trim() || null,
        fournisseur:    fournisseur || null,
        stock_location: stockLocation || null,
        parts_replaced: condition === 'reconditionne' ? (partsReplaced || []) : [],
        face_id_status: partsReplaced.includes('Face ID / Touch ID') ? faceIdStatus : null,
        status:         phoneStatus,
        added_by:         currentUser.name || 'Admin',
        added_by_magasin: currentUser.magasin_id || magasins?.[0] || null,
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
            {isEdit ? 'Modifier le téléphone' : 'Ajouter un téléphone'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Section 0 — Marque ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Marque</h3>
            <div className="flex flex-wrap gap-2">
              {BRANDS.map((b) => (
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
              {showModelSuggestions && modelSearch && modelSuggestions.length > 0 && brand !== 'Autre' && (
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

              {/* Grade (si pas neuf) */}
              {condition !== 'neuf' && (
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

              {/* Santé batterie */}
              {condition !== 'neuf' && (
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

              {/* Stockage dynamique */}
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

              {/* Couleur dynamique */}
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
              <div>
                <label className="text-xs text-[#555] mb-1 block">Fournisseur</label>
                <select
                  value={FOURNISSEURS_LIST.includes(fournisseur) ? fournisseur : (fournisseur ? 'Autre' : '')}
                  onChange={(e) => {
                    if (e.target.value === 'Autre') {
                      setFournisseur(fournisseurCustom)
                    } else {
                      setFournisseur(e.target.value)
                    }
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none mb-2"
                >
                  <option value="">— Choisir —</option>
                  {FOURNISSEURS_LIST.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                {(!FOURNISSEURS_LIST.includes(fournisseur)) && (
                  <input
                    value={fournisseurCustom}
                    onChange={(e) => {
                      setFournisseurCustom(e.target.value)
                      setFournisseur(e.target.value)
                    }}
                    placeholder="Nom du fournisseur"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                  />
                )}
              </div>
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
            </div>
          </div>

          {/* ── Section 4 — Magasins ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Disponible en magasin</h3>
            <div className="space-y-2">
              {MAGASINS.map((magasin) => (
                <label
                  key={magasin.id}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    magasins.includes(magasin.id)
                      ? 'border-[#00B4CC] bg-cyan-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={magasins.includes(magasin.id)}
                    onChange={() => handleMagasinToggle(magasin.id)}
                    className="w-4 h-4 accent-[#00B4CC]"
                  />
                  <span className="text-sm text-gray-700">{magasin.nom}</span>
                </label>
              ))}
            </div>
            {magasins.length === 0 && (
              <p className="text-xs text-orange-500 mt-1.5">⚠️ Aucun magasin sélectionné</p>
            )}
          </div>

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
  const [search, setSearch]               = useState('')
  const [filterMagasin, setFilterMagasin] = useState(null)
  const [selectedFournisseur, setSelectedFournisseur] = useState('tous')
  const [selectedTVA, setSelectedTVA] = useState('tous')
  const [selectedCondition, setSelectedCondition] = useState('tous')
  const [selectedStockStatus, setSelectedStockStatus] = useState('tous')
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingPhone, setEditingPhone]   = useState(null)

  const [showSaleModal, setShowSaleModal] = useState(false)
  const [salePhone, setSalePhone]         = useState(null)
  const [saleLoading, setSaleLoading]     = useState(false)
  const [saleForm, setSaleForm]           = useState({
    customer_firstname: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payments: [{ method: 'Cash', amount: '' }],
    sale_price: '',
    sale_magasin: '',
    notes: '',
    discount_value:     '',
    discount_type:      'fixed',
    is_company_sale:    false,
    company_name:       '',
    company_vat:        '',
    company_address:    '',
    company_email:      '',
    company_phone:      '',
    company_tva_regime: 'marge',
    imei_confirm:       '',
  })

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
      .order('created_at', { ascending: false })
    setPhones(data || [])
    setLoading(false)
  }

  const handleSale = async () => {
    if (!saleForm.customer_firstname || !saleForm.customer_name) {
      alert('Prénom et nom obligatoires')
      return
    }
    if (!saleForm.sale_price) {
      alert('Prix de vente obligatoire')
      return
    }
    if (!saleForm.sale_magasin) {
      alert('Sélectionnez le magasin de vente')
      return
    }
    // Vérifie IMEI si téléphone n'en a pas
    const imeiToUse = salePhone?.imei || saleForm.imei_confirm
    if (!imeiToUse || imeiToUse.length < 10) {
      alert('⚠️ Veuillez saisir l\'IMEI du téléphone avant de valider la vente')
      return
    }
    setSaleLoading(true)
    try {
      // Met à jour l'IMEI si nouveau
      if (!salePhone?.imei && saleForm.imei_confirm) {
        await supabase.from('phones')
          .update({ imei: saleForm.imei_confirm })
          .eq('id', salePhone.id)
      }

      const saleDate = new Date().toISOString()
      const reservationCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const salePriceNum = parseFloat(saleForm.sale_price) || 0
      const discountAmount = saleForm.discount_type === 'percent'
        ? salePriceNum * (parseFloat(saleForm.discount_value) || 0) / 100
        : (parseFloat(saleForm.discount_value) || 0)
      const finalPrice = Math.max(salePriceNum - discountAmount, 0)

      const { error: phoneError } = await supabase
        .from('phones')
        .update({
          status: 'vendu',
          price: finalPrice,
        })
        .eq('id', salePhone.id)
      if (phoneError) throw phoneError

      const { error: orderError } = await supabase
        .from('orders')
        .insert([{
          phone_id:           salePhone.id,
          customer_name:      `${saleForm.customer_firstname} ${saleForm.customer_name}`,
          customer_email:     saleForm.customer_email || null,
          customer_phone:     saleForm.customer_phone || null,
          phone_name:         salePhone.name || salePhone.model,
          phone_storage:      salePhone.storage,
          phone_color:        salePhone.color,
          phone_grade:        salePhone.grade,
          delivery_mode:      'collect',
          magasin_id:         saleForm.sale_magasin,
          payment_mode:       'total',
          total_amount:       finalPrice,
          deposit_amount:     0,
          reservation_code:   reservationCode,
          status:             'recupere',
          encaisse_at:        saleDate,
          notes:              saleForm.notes || null,
          discount_value:     parseFloat(saleForm.discount_value) || 0,
          discount_type:      saleForm.discount_type,
          final_price:        finalPrice,
          is_company_sale:    saleForm.is_company_sale,
          company_name:       saleForm.company_name || null,
          company_vat:        saleForm.company_vat || null,
          company_address:    saleForm.company_address || null,
          company_email:      saleForm.company_email || null,
          company_phone:      saleForm.company_phone || null,
          company_tva_regime: saleForm.company_tva_regime,
        }])
      if (orderError) throw orderError

      const normalizeMethod = (m) => {
        if (m === 'Cash')               return 'cash'
        if (m === 'Virement bancaire')  return 'virement bancaire'
        if (m === 'Bancontact')         return 'bancontact'
        return (m || '').toLowerCase()
      }

      const paymentRows = saleForm.payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          phone_id:       salePhone.id,
          magasin_id:     saleForm.sale_magasin,
          payment_method: normalizeMethod(p.method),
          amount:         parseFloat(p.amount),
          purchase_price: salePhone.purchase_price || 0,
          description:    `Vente ${salePhone.name || salePhone.model} — ${saleForm.customer_firstname} ${saleForm.customer_name}`,
          payment_date:   saleDate,
        }))

      if (paymentRows.length > 0) {
        await supabase
          .from('payments')
          .insert(paymentRows)
          .select()
      }

      const paymentMethodLabel = saleForm.payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => p.method)
        .join(' + ') || 'Cash'

      if (saleForm.customer_email) {
        try {
          const now      = new Date()
          const expiry   = new Date(now)
          expiry.setMonth(expiry.getMonth() + 24)
          const magasin  = MAGASINS_MAP[saleForm.sale_magasin]

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            INVOICE_TEMPLATE_ID,
            {
              to_email:         saleForm.customer_email,
              to_name:          `${saleForm.customer_firstname} ${saleForm.customer_name}`,
              email_type:       'facture',
              phone_name:       salePhone.name || salePhone.model,
              phone_color:      salePhone.color || '—',
              phone_storage:    salePhone.storage || '—',
              phone_condition:  salePhone.condition || '—',
              phone_grade:      salePhone.grade || '—',
              phone_imei:       salePhone.imei || '—',
              price_total:      `${finalPrice.toFixed(2)}€`,
              price_original:   `${salePriceNum.toFixed(2)}€`,
              discount_amount:  discountAmount > 0 ? `${discountAmount.toFixed(2)}€` : '0€',
              deposit_paid:     `${finalPrice.toFixed(2)}€`,
              remaining:        '0€',
              payment_label:    'Montant total payé ✓',
              accessories_total: '0€',
              accessory_pack:   'Aucun',
              battery_replace:  'Non',
              warning_message:  '',
              payment_method:   paymentMethodLabel,
              tva_mention:      salePhone.tva_regime === 'marge'
                ? "Régime particulier — Biens d'occasion (Art. 313-343 Code TVA belge)"
                : 'TVA 21% incluse',
              magasin_nom:      magasin?.nom || 'SebPhone',
              magasin_adresse:  magasin?.adresse || 'sebphone.be',
              reservation_code: reservationCode,
              reservation_url:  `https://sebphone.be/commande/${reservationCode}`,
              invoice_url:      `https://sebphone.be/facture/${reservationCode}`,
              pickup_date:      now.toLocaleDateString('fr-BE'),
              warranty_expiry:  expiry.toLocaleDateString('fr-BE'),
            },
            EMAILJS_PUBLIC_KEY
          )
        } catch (emailErr) {
          console.warn('Email facture non envoyé:', emailErr)
        }
      }

      /*
        ────────────────────────────────────────────────────────────────
        TEMPLATE EMAILJS — `template_societe` (à créer dans EmailJS)
        ────────────────────────────────────────────────────────────────
        Subject: Facture {{company_name}} — {{phone_name}}

        Variables disponibles :
          to_email, to_name
          company_name, company_vat, company_address, company_phone
          company_tva_regime  ('marge' ou 'normale')
          phone_name, phone_color, phone_storage, phone_condition,
          phone_grade, phone_imei
          price_original     (ex: '499.00€')
          discount_amount    (ex: '50.00€' ou '0€')
          discount_label     (ex: 'Remise 10%' ou 'Remise' ou '')
          price_final        (ex: '449.00€')
          payment_method     (ex: 'Cash', 'Bancontact', 'Virement')
          tva_regime         ('marge' ou 'normale')
          tva_mention        (texte légal complet)
          magasin_nom, magasin_adresse
          sale_date, reservation_code, invoice_url
          warranty_expiry

        Suggestion HTML :
          <h2>Facture professionnelle — SebPhone</h2>
          <p>À l'attention de <b>{{company_name}}</b> — TVA {{company_vat}}</p>
          <p>{{company_address}}</p>
          <hr/>
          <h3>{{phone_name}}</h3>
          <p>{{phone_color}} · {{phone_storage}} · {{phone_grade}} · IMEI {{phone_imei}}</p>
          <p>Prix : {{price_original}}<br/>
             {{discount_label}} : -{{discount_amount}}<br/>
             <b>Total : {{price_final}}</b></p>
          <p style="font-style:italic">{{tva_mention}}</p>
          <p>Paiement : {{payment_method}} · {{magasin_nom}} · {{sale_date}}</p>
          <p>Garantie 24 mois (jusqu'au {{warranty_expiry}})</p>
          <a href="{{invoice_url}}">Télécharger ma facture PDF</a>
        ────────────────────────────────────────────────────────────────
      */

      // ── Email facture société (si différent du client) ──
      if (saleForm.is_company_sale && saleForm.company_email && saleForm.company_email !== saleForm.customer_email) {
        try {
          const now     = new Date()
          const expiry  = new Date(now)
          expiry.setMonth(expiry.getMonth() + 24)
          const magasin = MAGASINS_MAP[saleForm.sale_magasin]

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            'template_qukek6a',
            {
              to_email:           saleForm.company_email,
              to_name:            saleForm.company_name,
              company_name:       saleForm.company_name,
              company_vat:        saleForm.company_vat,
              company_address:    saleForm.company_address,
              company_phone:      saleForm.company_phone,
              company_tva_regime: saleForm.company_tva_regime,
              phone_name:         salePhone.name || salePhone.model,
              phone_color:        salePhone.color || '—',
              phone_storage:      salePhone.storage || '—',
              phone_condition:    salePhone.condition || '—',
              phone_grade:        salePhone.grade || '—',
              phone_imei:         salePhone.imei || '—',
              price_original:     `${salePriceNum.toFixed(2)}€`,
              discount_amount:    discountAmount > 0 ? `${discountAmount.toFixed(2)}€` : '0€',
              discount_label:     discountAmount > 0
                ? (saleForm.discount_type === 'percent' ? `Remise ${saleForm.discount_value}%` : 'Remise')
                : '',
              price_final:        `${finalPrice.toFixed(2)}€`,
              payment_method:     paymentMethodLabel,
              tva_regime:         saleForm.company_tva_regime,
              tva_mention:        saleForm.company_tva_regime === 'marge'
                ? "Régime particulier — Biens d'occasion (Art. 313-343 Code TVA belge)"
                : 'TVA 21% incluse',
              magasin_nom:        magasin?.nom || 'SebPhone',
              magasin_adresse:    magasin?.adresse || 'sebphone.be',
              sale_date:          now.toLocaleDateString('fr-BE'),
              reservation_code:   reservationCode,
              invoice_url:        `https://sebphone.be/facture/${reservationCode}`,
              warranty_expiry:    expiry.toLocaleDateString('fr-BE'),
            },
            EMAILJS_PUBLIC_KEY
          )
        } catch (err) {
          console.warn('Email société non envoyé:', err)
        }
      }

      setShowSaleModal(false)
      setSalePhone(null)
      fetchPhones()
      alert(`✅ Vente enregistrée ! Code: ${reservationCode}`)
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSaleLoading(false)
    }
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
      const { error } = await supabase.from('phones').delete().eq('id', phoneId)
      if (error) throw error
      fetchPhones()
      setTimeout(() => window.location.reload(), 500)
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
        if (!name.startsWith(q) && !name.includes(' ' + q)) return false
      }
      if (filterMagasin) {
        const mags = Array.isArray(p.magasins) ? p.magasins : []
        if (!mags.includes(filterMagasin)) return false
      }
      if (selectedFournisseur !== 'tous' && p.fournisseur !== selectedFournisseur) return false
      if (selectedTVA !== 'tous' && (p.tva_regime || 'marge') !== selectedTVA) return false
      if (selectedCondition !== 'tous' && p.condition !== selectedCondition) return false
      if (selectedStockStatus !== 'tous' && p.status !== selectedStockStatus) return false
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
          <p className="text-sm text-[#555555] mt-0.5">{phones.length} appareils</p>
        </div>
        {canAdd && (
          <button
            onClick={() => { setEditingPhone(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
          >
            <Plus size={16} />
            Ajouter un téléphone
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
                      <p className="text-[#888] text-xs mt-0.5">
                        {phone.storage}{phone.color ? ` · ${phone.color}` : ''}
                      </p>
                      {phone.imei && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          IMEI : {phone.imei}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-[#00B4CC] text-sm flex-shrink-0">{phone.price}€</span>
                </div>
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
                          setSaleForm({
                            customer_firstname: '',
                            customer_name: '',
                            customer_phone: '',
                            customer_email: '',
                            payments: [{ method: 'Cash', amount: '' }],
                            sale_price: phone.price?.toString() || '',
                            sale_magasin: phone.magasins?.[0] || '',
                            notes: '',
                            discount_value: '',
                            discount_type: 'fixed',
                            is_company_sale: false,
                            company_name: '',
                            company_vat: '',
                            company_address: '',
                            company_email: '',
                            company_phone: '',
                            company_tva_regime: 'marge',
                            imei_confirm: phone.imei || '',
                          })
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
                  {['Modèle', 'État', 'Grade', 'Batterie', 'Prix', 'Achat / Bénéf.', 'Localisation', 'Fournisseur', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555555] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((phone) => (
                  <tr key={phone.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={getPhoneImage(phone)}
                            alt={phone.name || phone.model}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.target.onerror = null
                              const entry = IPHONE_DATABASE.find((p) => p.model?.toLowerCase() === (phone.model || '').toLowerCase())
                              e.target.src = entry?.imageUrl || 'https://placehold.co/200x200/f5f5f5/cccccc?text=iPhone'
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1B2A4A] leading-tight">{phone.name || phone.model?.name}</p>
                          <p className="text-[#888] text-xs">{phone.storage}{phone.color ? ` · ${phone.color}` : ''}</p>
                          {phone.imei && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              IMEI : {phone.imei}
                            </p>
                          )}
                          {phone.added_by && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              👤 {phone.added_by}{phone.added_by_magasin ? ` · 📍 ${(MAGASINS.find(m => m.id === phone.added_by_magasin)?.nom || phone.added_by_magasin).replace('Seb Telecom — ', '')}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CONDITION_COLORS[phone.condition] || 'bg-gray-100 text-gray-600'}`}>
                        {CONDITION_LABELS[phone.condition] || phone.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {phone.grade
                        ? <span className="inline-block px-2 py-0.5 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-[11px] font-bold whitespace-nowrap">{phone.grade}</span>
                        : <span className="text-[#bbb]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#555]">
                      {phone.battery_health != null
                        ? <span className={`font-semibold ${phone.battery_health >= 85 ? 'text-green-600' : phone.battery_health >= 75 ? 'text-orange-500' : 'text-red-500'}`}>{phone.battery_health}%</span>
                        : <span className="text-[#bbb]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <InlinePrice id={phone.id} value={phone.price} onSave={handlePriceChange} />
                    </td>
                    <td className="px-4 py-3">
                      {phone.purchase_price != null ? (
                        <div>
                          <p className="text-xs text-[#888]">Achat : {phone.purchase_price}€</p>
                          <p className={`text-xs font-bold ${(phone.price - phone.purchase_price) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {(phone.price - phone.purchase_price) >= 0 ? '+' : ''}{phone.price - phone.purchase_price}€
                          </p>
                        </div>
                      ) : <span className="text-[#bbb]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#555]">
                      <div>
                        <p className="font-medium">{phone.stock_location || <span className="text-[#bbb]">—</span>}</p>
                        {phone.fournisseur && <p className="text-[#aaa] text-[11px]">{phone.fournisseur}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {phone.fournisseur || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(phone.status === 'disponible' || phone.status === 'reserve') && (
                          <button
                            onClick={() => {
                              setSalePhone(phone)
                              setSaleForm({
                                customer_firstname: '',
                                customer_name: '',
                                customer_phone: '',
                                customer_email: '',
                                payments: [{ method: 'Cash', amount: '' }],
                                sale_price: phone.price?.toString() || '',
                                sale_magasin: phone.magasins?.[0] || '',
                                notes: '',
                                discount_value: '',
                                discount_type: 'fixed',
                                is_company_sale: false,
                                company_name: '',
                                company_vat: '',
                                company_address: '',
                                company_email: '',
                                company_phone: '',
                                company_tva_regime: 'marge',
                                imei_confirm: phone.imei || '',
                              })
                              setShowSaleModal(true)
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-all whitespace-nowrap cursor-pointer"
                            title="Vendre"
                          >
                            💰 Vendu
                          </button>
                        )}
                        {canStar && (
                          <button
                            onClick={() => handleToggleOffreSemaine(phone)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              phone.offre_semaine
                                ? 'text-yellow-500 bg-yellow-50'
                                : 'text-[#888] hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                            title="Offre de la semaine"
                          >
                            <Star size={14} fill={phone.offre_semaine ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => { setEditingPhone(phone); setModalOpen(true) }}
                            className="p-1.5 text-[#888] hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(phone.id)}
                            className="p-1.5 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
        />
      )}

      {/* Modal vente manuelle */}
      {showSaleModal && salePhone && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-[#1B2A4A] text-lg">💰 Enregistrer une vente</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {salePhone.name || salePhone.model}
                  {salePhone.color ? ` · ${salePhone.color}` : ''}
                  {salePhone.storage ? ` · ${salePhone.storage}` : ''}
                </p>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="cursor-pointer">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-[#f8fafc] rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">📱 Téléphone vendu</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Modèle', salePhone.name || salePhone.model],
                    ['Couleur', salePhone.color || '—'],
                    ['Stockage', salePhone.storage || '—'],
                    ['Grade', salePhone.grade || '—'],
                    ['IMEI', salePhone.imei || '—'],
                    ['Prix achat', salePhone.purchase_price ? `${salePhone.purchase_price}€` : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-xs font-semibold text-[#1B2A4A] truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#1B2A4A] uppercase mb-3">👤 Informations client</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Prénom *</label>
                    <input
                      type="text"
                      value={saleForm.customer_firstname}
                      onChange={(e) => setSaleForm((f) => ({ ...f, customer_firstname: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Mohamed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nom *</label>
                    <input
                      type="text"
                      value={saleForm.customer_name}
                      onChange={(e) => setSaleForm((f) => ({ ...f, customer_name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                    <input
                      type="tel"
                      value={saleForm.customer_phone}
                      onChange={(e) => setSaleForm((f) => ({ ...f, customer_phone: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="+32 472 12 34 56"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                    <input
                      type="email"
                      value={saleForm.customer_email}
                      onChange={(e) => setSaleForm((f) => ({ ...f, customer_email: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="client@email.com"
                    />
                    {saleForm.customer_email ? (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        📧 La facture sera envoyée automatiquement à cette adresse
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        💡 Ajoutez un email pour envoyer la facture automatiquement
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin de vente *</label>
                <select
                  value={saleForm.sale_magasin}
                  onChange={(e) => setSaleForm((f) => ({ ...f, sale_magasin: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                >
                  <option value="">— Sélectionner le magasin —</option>
                  <option value="sebphone">💻 SebPhone (en ligne)</option>
                  {MAGASINS_PHYSIQUES.map((m) => (
                    <option key={m.id} value={m.id}>📍 {m.nom.replace('Seb Telecom — ', '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#1B2A4A] uppercase mb-3">💳 Paiement</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Prix de vente (€) *</label>
                    <input
                      type="number"
                      value={saleForm.sale_price}
                      onChange={(e) => setSaleForm((f) => ({ ...f, sale_price: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-bold"
                    />
                    {salePhone.purchase_price && saleForm.sale_price && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Bénéfice : +{(Math.max(
                          parseFloat(saleForm.sale_price) -
                          (saleForm.discount_type === 'percent'
                            ? parseFloat(saleForm.sale_price) * parseFloat(saleForm.discount_value || 0) / 100
                            : parseFloat(saleForm.discount_value || 0)),
                          0
                        ) - salePhone.purchase_price).toFixed(0)}€
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      IMEI {!salePhone?.imei && <span className="text-red-500">*</span>}
                    </label>
                    {salePhone?.imei ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-xl flex-1">
                          {salePhone.imei}
                        </p>
                        <span className="text-green-500 text-xs font-bold">✓ Déjà renseigné</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={saleForm.imei_confirm}
                        onChange={(e) => setSaleForm((f) => ({ ...f, imei_confirm: e.target.value }))}
                        placeholder="Saisir l'IMEI avant de vendre"
                        maxLength={15}
                        className="w-full px-3 py-2 border border-orange-300 rounded-xl text-sm font-mono focus:border-[#00B4CC] outline-none"
                      />
                    )}
                  </div>

                  {/* Multi-paiements */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-2 block">Modes de paiement</label>
                    <div className="space-y-2">
                      {saleForm.payments.map((pay, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex flex-1 border border-gray-200 rounded-xl overflow-hidden">
                            {['Cash', 'Bancontact', 'Virement bancaire'].map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setSaleForm((f) => ({
                                  ...f,
                                  payments: f.payments.map((p, i) => i === idx ? { ...p, method } : p),
                                }))}
                                className={`flex-1 px-2 py-2 text-xs font-medium transition-all cursor-pointer ${
                                  pay.method === method ? 'bg-[#1B2A4A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {method === 'Cash' ? '💵' : method === 'Bancontact' ? '💳' : '🏦'}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            value={pay.amount}
                            onChange={(e) => setSaleForm((f) => ({
                              ...f,
                              payments: f.payments.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p),
                            }))}
                            className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                            placeholder="€"
                          />
                          {saleForm.payments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSaleForm((f) => ({
                                ...f,
                                payments: f.payments.filter((_, i) => i !== idx),
                              }))}
                              className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setSaleForm((f) => ({
                          ...f,
                          payments: [...f.payments, { method: 'Cash', amount: '' }],
                        }))}
                        className="text-xs text-[#00B4CC] hover:text-cyan-700 font-semibold cursor-pointer"
                      >
                        + Ajouter un mode de paiement
                      </button>
                    </div>

                    {/* Récap dynamique */}
                    {(() => {
                      const sp = parseFloat(saleForm.sale_price) || 0
                      const dv = parseFloat(saleForm.discount_value) || 0
                      const da = saleForm.discount_type === 'percent' ? sp * dv / 100 : dv
                      const fp = Math.max(sp - da, 0)
                      const total = saleForm.payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
                      if (sp === 0) return null
                      if (Math.abs(total - fp) < 0.01) {
                        return (
                          <div className="mt-2 bg-green-50 rounded-xl p-2 text-xs font-bold text-green-700 text-center">
                            ✓ Paiement complet — {total.toFixed(2)}€
                          </div>
                        )
                      }
                      if (total > fp) {
                        return (
                          <div className="mt-2 bg-red-50 rounded-xl p-2 text-xs font-bold text-red-600 flex justify-between">
                            <span>Total : {total.toFixed(2)}€ / {fp.toFixed(2)}€</span>
                            <span>Dépassement : +{(total - fp).toFixed(2)}€</span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>

              {/* REMISE */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Remise (optionnel)</label>
                <div className="flex gap-2">
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                    {['fixed', 'percent'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSaleForm((f) => ({ ...f, discount_type: type }))}
                        className={`px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                          saleForm.discount_type === type ? 'bg-[#1B2A4A] text-white' : 'bg-white text-gray-600'
                        }`}
                      >
                        {type === 'fixed' ? '€' : '%'}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={saleForm.discount_value}
                    onChange={(e) => setSaleForm((f) => ({ ...f, discount_value: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
                {(() => {
                  const sp = parseFloat(saleForm.sale_price) || 0
                  const dv = parseFloat(saleForm.discount_value) || 0
                  if (dv <= 0) return null
                  const da = saleForm.discount_type === 'percent' ? sp * dv / 100 : dv
                  const fp = Math.max(sp - da, 0)
                  return (
                    <div className="mt-2 bg-green-50 rounded-xl p-2 flex justify-between text-sm">
                      <span className="text-gray-500">Prix après remise :</span>
                      <span className="font-bold text-green-600">
                        {fp.toFixed(2)}€
                        <span className="text-xs text-gray-400 ml-1">(-{da.toFixed(2)}€)</span>
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* VENTE SOCIÉTÉ */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={saleForm.is_company_sale}
                    onChange={(e) => setSaleForm((f) => ({ ...f, is_company_sale: e.target.checked }))}
                    className="w-4 h-4 accent-[#00B4CC]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1B2A4A]">🏢 Vente à une société</p>
                    <p className="text-xs text-gray-400">Facture professionnelle envoyée à la société</p>
                  </div>
                </label>

                {saleForm.is_company_sale && (
                  <div className="mt-3 border-2 border-[#00B4CC] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-[#00B4CC] uppercase">Informations société</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Nom de la société *</label>
                        <input
                          type="text"
                          value={saleForm.company_name}
                          onChange={(e) => setSaleForm((f) => ({ ...f, company_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                          placeholder="ACME SRL"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">N° TVA *</label>
                        <input
                          type="text"
                          value={saleForm.company_vat}
                          onChange={(e) => setSaleForm((f) => ({ ...f, company_vat: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                          placeholder="BE 1234.567.890"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone société</label>
                        <input
                          type="tel"
                          value={saleForm.company_phone}
                          onChange={(e) => setSaleForm((f) => ({ ...f, company_phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                          placeholder="+32 2 123 45 67"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Siège social</label>
                        <input
                          type="text"
                          value={saleForm.company_address}
                          onChange={(e) => setSaleForm((f) => ({ ...f, company_address: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                          placeholder="Rue de la Loi 1, 1000 Bruxelles"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Email société *</label>
                        <input
                          type="email"
                          value={saleForm.company_email}
                          onChange={(e) => setSaleForm((f) => ({ ...f, company_email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                          placeholder="comptabilite@societe.be"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-2 block">Régime TVA facture</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'marge',   label: '📊 TVA sur marge',    sub: "Biens d'occasion" },
                            { value: 'normale', label: '💼 TVA normale 21%',  sub: 'Standard' },
                          ].map(({ value, label, sub }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setSaleForm((f) => ({ ...f, company_tva_regime: value }))}
                              className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                saleForm.company_tva_regime === value ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]'
                              }`}
                            >
                              <p className={`text-xs font-bold ${saleForm.company_tva_regime === value ? 'text-[#00B4CC]' : 'text-[#1B2A4A]'}`}>{label}</p>
                              <p className="text-xs text-gray-400">{sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optionnel)</label>
                <textarea
                  value={saleForm.notes}
                  onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none resize-none"
                  placeholder="Remarques sur la vente..."
                />
              </div>

              <button
                onClick={handleSale}
                disabled={
                  saleLoading ||
                  !saleForm.customer_firstname ||
                  !saleForm.customer_name ||
                  !saleForm.sale_price ||
                  !saleForm.sale_magasin
                }
                className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saleLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement...
                  </span>
                ) : '✅ Confirmer la vente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
