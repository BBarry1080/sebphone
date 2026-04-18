import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

const FALLBACK = [
  { id: '1', code: 'SEBPHONE10', type: 'percent', value: 10, min_order: 0, max_uses: null, uses_count: 0, active: true, expires_at: null },
  { id: '2', code: 'BIENVENUE',  type: 'percent', value: 15, min_order: 100, max_uses: null, uses_count: 0, active: true, expires_at: null },
  { id: '3', code: 'PROMO20',    type: 'fixed',   value: 20, min_order: 150, max_uses: null, uses_count: 0, active: true, expires_at: null },
]

const EMPTY_FORM = { code: '', type: 'percent', value: '', min_order: '', max_uses: '', expires_at: '', active: true }

function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.code.trim() || !form.value) { setError('Code et valeur requis.'); return }
    setSaving(true)
    const payload = {
      code:       form.code.trim().toUpperCase(),
      type:       form.type,
      value:      parseFloat(form.value),
      min_order:  form.min_order !== '' ? parseFloat(form.min_order) : 0,
      max_uses:   form.max_uses !== '' ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active:     form.active,
    }
    if (isSupabaseReady) {
      const { error: err } = await supabase.from('promo_codes').insert([payload])
      if (err) { setError(err.message); setSaving(false); return }
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-poppins font-bold text-[#1B2A4A]">Nouveau code promo</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#555] mb-1">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] font-mono"
                placeholder="EX: PROMO10"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] bg-white"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1">
                Valeur * {form.type === 'percent' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => set('value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                placeholder={form.type === 'percent' ? '10' : '20'}
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1">Commande min. (€)</label>
              <input
                type="number"
                value={form.min_order}
                onChange={(e) => set('min_order', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#555] mb-1">Utilisations max</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => set('max_uses', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                placeholder="Illimité"
                min="1"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#555] mb-1">Expire le</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => set('expires_at', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
                className="w-4 h-4 accent-[#00B4CC]"
              />
              <label htmlFor="active" className="text-sm font-medium text-[#1B2A4A]">Actif immédiatement</label>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
          >
            {saving ? 'Enregistrement...' : 'Créer le code'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PromoCodes() {
  const [codes, setCodes]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchCodes = async () => {
    setLoading(true)
    if (!isSupabaseReady) {
      setCodes(FALLBACK)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setCodes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCodes() }, [])

  const toggleActive = async (code) => {
    if (!isSupabaseReady) return
    await supabase.from('promo_codes').update({ active: !code.active }).eq('id', code.id)
    fetchCodes()
  }

  const deleteCode = async (code) => {
    if (!window.confirm(`Supprimer le code "${code.code}" ?`)) return
    if (!isSupabaseReady) return
    await supabase.from('promo_codes').delete().eq('id', code.id)
    fetchCodes()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Codes promo</h1>
          <p className="text-sm text-[#555555] mt-0.5">{codes.length} code{codes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Nouveau code
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 text-sm text-[#888]">Aucun code promo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-gray-100">
                <tr>
                  {['Code', 'Remise', 'Min. commande', 'Utilisations', 'Expiration', 'Statut', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#1B2A4A] bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#1B2A4A]">
                      {c.type === 'percent' ? `${c.value}%` : `${c.value}€`}
                    </td>
                    <td className="px-4 py-3 text-[#555]">
                      {c.min_order > 0 ? `${c.min_order}€` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#555]">
                      {c.uses_count || 0}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-[#555]">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('fr-BE') : '∞'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          c.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {c.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteCode(c)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaved={fetchCodes}
        />
      )}
    </div>
  )
}
