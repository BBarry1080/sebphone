import { useState, useEffect, useRef } from 'react'
import { Smartphone, Plus, Search, Pencil, Trash2, X, ChevronDown } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import {
  addPhone, updatePhone, deletePhone, updatePhoneStatus, updatePhonePrice,
} from '../../data/phonesApi'
import { usePhoneModels } from '../../hooks/usePhoneModels'
import { phonesMock } from '../../data/phonesMock'

const CONDITIONS = ['neuf', 'reconditionne', 'occasion']
const CONDITION_LABELS = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const GRADES = ['A+', 'A', 'B', 'C']
const STATUSES = ['disponible', 'reserve', 'vendu']
const STATUS_LABELS = { disponible: 'En stock', reserve: 'Réservé', vendu: 'Vendu' }
const STATUS_COLORS = {
  disponible: 'bg-green-100 text-green-700',
  reserve:    'bg-yellow-100 text-yellow-800',
  vendu:      'bg-gray-100 text-gray-600',
}
const CONDITION_COLORS = {
  neuf:           'bg-blue-100 text-blue-700',
  reconditionne:  'bg-cyan-100 text-cyan-700',
  occasion:       'bg-orange-100 text-orange-700',
}
const PARTS_LIST = [
  { key: 'ecran',       label: 'Écran',        hasQuality: true },
  { key: 'batterie',    label: 'Batterie',      hasQuality: true },
  { key: 'facade',      label: 'Façade arrière', hasQuality: false },
  { key: 'boutons',     label: 'Boutons latéraux', hasQuality: false },
  { key: 'hp',          label: 'Haut-parleur',  hasQuality: false },
  { key: 'micro',       label: 'Micro',         hasQuality: false },
  { key: 'camera',      label: 'Caméra',        hasQuality: false },
  { key: 'autre',       label: 'Autre',         hasQuality: false, isText: true },
]
const EMPLACEMENTS = ['Magasin Belgique', 'Entrepôt', 'Autre']

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
    if (!isNaN(price) && price > 0 && price !== value) {
      await onSave(id, price)
    }
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

/* ─── MODAL ─── */
function PhoneModal({ phone, models, onClose, onSaved }) {
  const isEdit = !!phone
  const getInitialParts = () => {
    const parts = {}
    PARTS_LIST.forEach((p) => {
      parts[p.key] = { checked: false, quality: 'Original', text: '' }
    })
    return parts
  }

  const [modelSearch, setModelSearch] = useState(phone?.model?.name || '')
  const [selectedModel, setSelectedModel] = useState(phone?.model || null)
  const [showModelList, setShowModelList] = useState(false)
  const [condition, setCondition] = useState(phone?.condition || 'reconditionne')
  const [grade, setGrade] = useState(phone?.grade || 'A')
  const [storage, setStorage] = useState(phone?.storage || '')
  const [color, setColor] = useState(phone?.color || '')
  const [price, setPrice] = useState(phone?.price || '')
  const [deposit, setDeposit] = useState(phone?.deposit_amount || 50)
  const [emplacement, setEmplacement] = useState(phone?.emplacement || 'Magasin Belgique')
  const [notes, setNotes] = useState(phone?.notes || '')
  const [parts, setParts] = useState(getInitialParts())
  const [saving, setSaving] = useState(false)

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const handlePartCheck = (key, checked) => {
    setParts((prev) => ({ ...prev, [key]: { ...prev[key], checked } }))
  }
  const handlePartQuality = (key, quality) => {
    setParts((prev) => ({ ...prev, [key]: { ...prev[key], quality } }))
  }
  const handlePartText = (key, text) => {
    setParts((prev) => ({ ...prev, [key]: { ...prev[key], text } }))
  }

  const handleSave = async () => {
    if (!selectedModel && !isEdit) return
    setSaving(true)
    try {
      const phoneData = {
        model_id: selectedModel?.id || phone?.model_id,
        name: selectedModel?.name || phone?.name,
        brand: selectedModel?.brand || phone?.brand,
        condition,
        grade: condition !== 'neuf' ? grade : null,
        storage,
        color,
        price: Number(price),
        deposit_amount: Number(deposit),
        emplacement,
        notes,
        status: phone?.status || 'disponible',
      }

      let savedPhone
      if (isEdit) {
        savedPhone = await updatePhone(phone.id, phoneData)
      } else {
        savedPhone = await addPhone(phoneData)
        if (condition === 'reconditionne' && savedPhone) {
          const partsToInsert = PARTS_LIST
            .filter((p) => parts[p.key]?.checked)
            .map((p) => ({
              phone_id: savedPhone.id,
              part_type: p.key,
              quality: p.hasQuality ? parts[p.key].quality : null,
              note: p.isText ? parts[p.key].text : null,
            }))
          if (partsToInsert.length > 0) {
            await supabase.from('phone_parts').insert(partsToInsert)
          }
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-poppins font-bold text-[#1B2A4A]">
            {isEdit ? 'Modifier le téléphone' : 'Ajouter un téléphone'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1 — Modèle */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Modèle</h3>
            <div className="relative">
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => { setModelSearch(e.target.value); setShowModelList(true) }}
                onFocus={() => setShowModelList(true)}
                placeholder="Rechercher un modèle..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
              />
              {showModelList && filteredModels.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-20 max-h-48 overflow-y-auto">
                  {filteredModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m)
                        setModelSearch(m.name)
                        setShowModelList(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[#888] ml-2">{m.brand}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2 — Configuration */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-xs text-[#555] mb-1 block">Stockage</label>
                <input
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  placeholder="128Go"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#555] mb-1 block">Couleur</label>
                <input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Minuit"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Prix */}
          <div>
            <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Prix & emplacement</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#555] mb-1 block">Prix de vente (€)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="299"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                />
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
              <div className="col-span-2">
                <label className="text-xs text-[#555] mb-1 block">Emplacement</label>
                <select
                  value={emplacement}
                  onChange={(e) => setEmplacement(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-[#00B4CC] outline-none"
                >
                  {EMPLACEMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4 — Pièces (reconditionné seulement) */}
          {condition === 'reconditionne' && !isEdit && (
            <div>
              <h3 className="text-sm font-semibold text-[#1B2A4A] mb-3">Pièces remplacées</h3>
              <div className="space-y-2">
                {PARTS_LIST.map((p) => (
                  <div key={p.key}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={parts[p.key].checked}
                        onChange={(e) => handlePartCheck(p.key, e.target.checked)}
                        className="w-4 h-4 accent-[#00B4CC]"
                      />
                      <span className="text-sm text-[#333]">{p.label}</span>
                    </label>
                    {parts[p.key].checked && p.hasQuality && (
                      <div className="ml-6 mt-1 flex gap-3">
                        {['Original', 'Compatible'].map((q) => (
                          <label key={q} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#555]">
                            <input
                              type="radio"
                              name={`quality_${p.key}`}
                              value={q}
                              checked={parts[p.key].quality === q}
                              onChange={() => handlePartQuality(p.key, q)}
                              className="accent-[#00B4CC]"
                            />
                            {q}
                          </label>
                        ))}
                      </div>
                    )}
                    {parts[p.key].checked && p.isText && (
                      <input
                        type="text"
                        value={parts[p.key].text}
                        onChange={(e) => handlePartText(p.key, e.target.value)}
                        placeholder="Préciser..."
                        className="ml-6 mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-[#00B4CC] outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5 — Notes */}
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
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-[#555] hover:text-[#1B2A4A] border border-gray-200 rounded-xl cursor-pointer transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-bold bg-[#1B2A4A] hover:bg-[#243a64] text-white rounded-xl cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState(null)
  const { models } = usePhoneModels()

  const fetchPhones = async () => {
    setLoading(true)
    if (!isSupabaseReady) {
      setPhones(phonesMock)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('phones')
      .select('*, model:phone_models(*)')
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

  const handleStatusChange = async (id, status) => {
    await updatePhoneStatus(id, status)
  }

  const handlePriceChange = async (id, price) => {
    await updatePhonePrice(id, price)
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
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
                  {['Modèle', 'État', 'Grade', 'Prix', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555555] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((phone) => (
                  <tr key={phone.id} className="hover:bg-[#F8F9FA] transition-colors">
                    {/* Modèle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#F5F5F5] rounded-xl flex items-center justify-center flex-shrink-0">
                          <Smartphone size={22} className="text-[#00B4CC] opacity-40" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1B2A4A]">{phone.name || phone.model?.name}</p>
                          <p className="text-[#888] text-xs">{phone.storage} · {phone.color}</p>
                        </div>
                      </div>
                    </td>
                    {/* État */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CONDITION_COLORS[phone.condition] || 'bg-gray-100 text-gray-600'}`}>
                        {CONDITION_LABELS[phone.condition] || phone.condition}
                      </span>
                    </td>
                    {/* Grade */}
                    <td className="px-4 py-3">
                      {phone.grade ? (
                        <span className="px-2 py-1 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-xs font-bold">
                          {phone.grade}
                        </span>
                      ) : <span className="text-[#bbb]">—</span>}
                    </td>
                    {/* Prix */}
                    <td className="px-4 py-3">
                      <InlinePrice id={phone.id} value={phone.price} onSave={handlePriceChange} />
                    </td>
                    {/* Statut */}
                    <td className="px-4 py-3">
                      <StatusDropdown id={phone.id} value={phone.status} onChange={handleStatusChange} />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
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
          models={models}
          onClose={() => setModalOpen(false)}
          onSaved={fetchPhones}
        />
      )}
    </div>
  )
}
