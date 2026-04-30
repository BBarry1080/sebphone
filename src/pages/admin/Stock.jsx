// SQL à exécuter dans Supabase si ces colonnes manquent :
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS magasins JSONB DEFAULT '[]'::jsonb;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS color TEXT;
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS parts_replaced JSONB DEFAULT '[]'::jsonb;

import { useState, useEffect, useRef } from 'react'
import { Smartphone, Plus, Search, Pencil, Trash2, X, Star } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import {
  addPhone, updatePhone, deletePhone, updatePhoneStatus, updatePhonePrice,
} from '../../data/phonesApi'
import { phonesMock } from '../../data/phonesMock'
import { IPHONE_DATABASE } from '../../data/iphoneDatabase'
import { MAGASINS_LIST as MAGASINS } from '../../utils/magasins'
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage'
import { getStartingPrice } from '../../data/startingPrices'


const CONDITIONS = ['neuf', 'reconditionne', 'occasion']
const CONDITION_LABELS = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const GRADES = ['Bon état', 'Très bon état', 'Comme neuf', 'Neuf']
const FOURNISSEURS = ['SebPhone', 'Molenbeek', 'Louise', 'Anderlecht']
const LOCATIONS = ['Molenbeek', 'Louise', 'Anderlecht', 'SebPhone', 'Autre']
const STATUSES = ['disponible', 'reserve', 'vendu']
const STATUS_LABELS = { disponible: 'En stock', reserve: 'Réservé', vendu: 'Vendu' }
const STATUS_COLORS = {
  disponible: 'bg-green-100 text-green-700',
  reserve:    'bg-yellow-100 text-yellow-800',
  vendu:      'bg-gray-100 text-gray-600',
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
  const isEdit = !!phone

  // ── Model autocomplete ───────────────────────────────────────────
  const [modelSearch, setModelSearch]             = useState(phone?.name?.split(' ').slice(0, 3).join(' ') || '')
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
  const [fournisseur, setFournisseur] = useState(phone?.fournisseur || '')
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
  const [saving, setSaving]       = useState(false)

  console.log('PhoneModal - condition:', phone?.condition || 'reconditionne')
  console.log('PhoneModal - parts_replaced raw:', phone?.parts_replaced)
  console.log('PhoneModal - parts_replaced init:', initialPartsReplaced)

  // ── Filtered suggestions ─────────────────────────────────────────
  const modelSuggestions = IPHONE_DATABASE
    .filter((m) => m.model.toLowerCase().includes(modelSearch.toLowerCase()))
    .slice(0, 8)

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
  const handleSelectModel = (m) => {
    setSelectedModel(m)
    setModelSearch(m.model)
    setShowModelSugg(false)
    setStorage('')
    setColorSearch('')
  }

  const handleMagasinToggle = (id) => {
    setMagasins((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const togglePart = (part) => {
    setPartsReplaced((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    )
  }

  const handleSave = async () => {
    if (!isEdit && !selectedModel && !modelSearch.trim()) return
    setSaving(true)
    try {
      console.log('parts_replaced à sauvegarder:', partsReplaced)
      console.log('condition:', condition, '→ inclus si reconditionne ?', condition === 'reconditionne')

      const phoneData = {
        name:           modelSearch.trim(),
        model:          modelSearch.trim(),
        brand:          modelSearch.toLowerCase().includes('samsung') ? 'Samsung' : 'Apple',
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
        status:         'disponible',
      }

      console.log('updateData complet:', phoneData)
      console.log('phoneData.parts_replaced:', phoneData.parts_replaced)

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

      console.log('Succès:', data)

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

          {/* ── Section 1 — Modèle ── */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Modèle</h3>
            <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Rechercher un modèle... (ex : iPhone 13 Pro)"
                value={modelSearch}
                onChange={(e) => { setModelSearch(e.target.value); setShowModelSugg(true); setSelectedModel(null) }}
                onFocus={() => setShowModelSugg(true)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none"
              />
              {showModelSuggestions && modelSearch && modelSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-30 max-h-48 overflow-y-auto">
                  {modelSuggestions.map((m) => (
                    <div
                      key={m.model}
                      onMouseDown={() => handleSelectModel(m)}
                      className="px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      {m.model}
                      <span className="text-xs text-gray-400 ml-2">
                        jusqu'à {m.storages[m.storages.length - 1]}
                      </span>
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
                <select
                  disabled={!selectedModel}
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedModel ? 'Choisir la capacité' : 'Sélectionnez d\'abord un modèle'}
                  </option>
                  {selectedModel && selectedModel.storages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Couleur autocomplete dynamique */}
              <div>
                <label className="text-xs text-[#555] mb-1 block">Couleur</label>
                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder={selectedModel ? 'Rechercher une couleur...' : 'Sélectionnez d\'abord un modèle'}
                    disabled={!selectedModel}
                    value={colorSearch}
                    onChange={(e) => { setColorSearch(e.target.value); setShowColorSugg(true) }}
                    onFocus={() => setShowColorSugg(true)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#00B4CC] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {showColorSuggestions && colorSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-30 max-h-40 overflow-y-auto">
                      {colorSuggestions.map((c) => (
                        <div
                          key={c}
                          onMouseDown={() => { setColorSearch(c); setShowColorSugg(false) }}
                          className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                  value={fournisseur}
                  onChange={(e) => setFournisseur(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                >
                  <option value="">— Choisir —</option>
                  {FOURNISSEURS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
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
  const [phones, setPhones]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState(null)

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

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce téléphone ?')) return
    await deletePhone(id)
    fetchPhones()
  }

  const filtered = phones.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Gestion du stock</h1>
          <p className="text-sm text-[#555555] mt-0.5">{phones.length} appareils</p>
        </div>
        <button
          onClick={() => { setEditingPhone(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
        >
          <Plus size={16} />
          Ajouter un téléphone
        </button>
      </div>

      {/* Search */}
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
                      <span className="px-2 py-0.5 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-xs font-bold">
                        {phone.grade}
                      </span>
                    )}
                    <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingPhone(phone); setModalOpen(true) }}
                      className="p-2 text-[#888] hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(phone.id)}
                      className="p-2 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
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
                  {['Modèle', 'État', 'Grade', 'Batterie', 'Prix', 'Achat / Bénéf.', 'Localisation', 'Statut', 'Actions'].map((h) => (
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
                        ? <span className="px-2 py-1 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-xs font-bold">{phone.grade}</span>
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
                    <td className="px-4 py-3">
                      <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
                        <button
                          onClick={() => { setEditingPhone(phone); setModalOpen(true) }}
                          className="p-1.5 text-[#888] hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(phone.id)}
                          className="p-1.5 text-[#888] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
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
    </div>
  )
}
