import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS, MAGASINS_PHYSIQUES } from '../../utils/magasins'
import { CheckCircle, Clock, X, Wrench } from 'lucide-react'
import { useCurrentUser, useRequirePermission } from '../../hooks/usePermissions'

const PARTS_LIST = [
  'Écran', 'Batterie', 'Vitre arrière',
  'Caméra avant', 'Caméra arrière',
  'Haut-parleur', 'Micro',
  'Connecteur de charge', 'Bouton home',
  'Face ID / Touch ID',
]

export default function StockReconditionnement() {
  useRequirePermission('stock_reconditionnement')
  const currentUser = useCurrentUser()

  const [entries, setEntries]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [selectedEntry, setSelectedEntry]   = useState(null)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [repairForm, setRepairForm]         = useState({
    parts_replaced: [],
    final_grade: 'Très bon état',
    sale_price_estimated: '',
    magasin_id: 'anderlecht',
    reconditioning_notes: '',
  })

  useEffect(() => { fetchEntries() }, [])

  const fetchEntries = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('purchase_registry')
      .select('*')
      .eq('phone_condition', 'reconditionne')
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  const openRepairModal = (entry) => {
    setSelectedEntry(entry)
    setRepairForm({
      parts_replaced: entry.parts_replaced || [],
      final_grade: entry.final_grade || 'Très bon état',
      sale_price_estimated: entry.sale_price_estimated || '',
      magasin_id: entry.magasin_id || 'anderlecht',
      reconditioning_notes: '',
    })
    setShowRepairModal(true)
  }

  const handleRepairDone = async () => {
    if (!repairForm.sale_price_estimated) {
      alert('Prix de vente estimé obligatoire')
      return
    }
    setSubmitting(true)
    try {
      const { error: regError } = await supabase
        .from('purchase_registry')
        .update({
          reconditioning_status: 'termine',
          parts_replaced: repairForm.parts_replaced,
          final_grade: repairForm.final_grade,
          sale_price_estimated: parseFloat(repairForm.sale_price_estimated),
          reconditioning_notes: repairForm.reconditioning_notes,
          reconditioning_done_at: new Date().toISOString(),
          added_to_stock: true,
        })
        .eq('id', selectedEntry.id)
      if (regError) throw regError

      const { error: stockError } = await supabase
        .from('phones')
        .insert([{
          name:             `${selectedEntry.brand} ${selectedEntry.model}`,
          model:            selectedEntry.model,
          brand:            selectedEntry.brand,
          color:            selectedEntry.color || '',
          storage:          selectedEntry.storage || '',
          condition:        'reconditionne',
          grade:            repairForm.final_grade,
          price:            parseFloat(repairForm.sale_price_estimated),
          purchase_price:   selectedEntry.purchase_price,
          imei:             selectedEntry.imei,
          status:           'disponible',
          magasins:         [repairForm.magasin_id],
          fournisseur:      `${selectedEntry.seller_first_name} ${selectedEntry.seller_last_name}`,
          parts_replaced:   repairForm.parts_replaced,
          notes:            repairForm.reconditioning_notes || null,
          added_by:         currentUser?.name || 'Admin',
          added_by_magasin: repairForm.magasin_id,
        }])
      if (stockError) throw stockError

      setShowRepairModal(false)
      fetchEntries()
      alert('✅ Téléphone reconditionné ajouté au stock !')
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const enAttente = entries.filter((e) => e.reconditioning_status === 'en_attente' || !e.reconditioning_status)
  const termines  = entries.filter((e) => e.reconditioning_status === 'termine')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Stock Reconditionnement</h1>
          <p className="text-sm text-gray-500 mt-1">{enAttente.length} en attente · {termines.length} terminés</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-600">{enAttente.length}</p>
          <p className="text-xs text-orange-500 font-medium mt-1">En attente de réparation</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-600">{termines.length}</p>
          <p className="text-xs text-green-500 font-medium mt-1">Reconditionnés et en stock</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-[#1B2A4A]">
            {enAttente.reduce((a, e) => a + (e.purchase_price || 0), 0).toLocaleString('fr-BE')}€
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">Prix d'achat en attente</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Clock size={18} className="text-orange-500" />
          <h3 className="font-bold text-[#1B2A4A]">En attente de reconditionnement</h3>
        </div>
        {enAttente.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Aucun téléphone en attente</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date rachat', 'Téléphone', 'IMEI', 'Vendeur', 'Prix achat', 'Magasin', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enAttente.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100 hover:bg-orange-50/30">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(entry.transaction_date || entry.created_at).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2A4A] text-sm">{entry.brand} {entry.model}</p>
                      <p className="text-xs text-gray-400">{entry.color}{entry.color && entry.storage ? ' · ' : ''}{entry.storage}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{entry.imei}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{entry.seller_first_name} {entry.seller_last_name}</p>
                      <p className="text-xs text-gray-400">{entry.seller_phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{entry.purchase_price}€</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {MAGASINS[entry.magasin_id]?.nom?.replace('Seb Telecom — ', '') || entry.magasin_id}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openRepairModal(entry)}
                        className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-600 transition-all whitespace-nowrap cursor-pointer"
                      >
                        <Wrench size={12} />
                        Réparation terminée
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {termines.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            <h3 className="font-bold text-[#1B2A4A]">Reconditionnés — En stock</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Téléphone', 'IMEI', 'Pièces remplacées', 'Grade final', 'Prix vente'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {termines.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-100 hover:bg-green-50/30">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {entry.reconditioning_done_at ? new Date(entry.reconditioning_done_at).toLocaleDateString('fr-BE') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2A4A] text-sm">{entry.brand} {entry.model}</p>
                      <p className="text-xs text-gray-400">{entry.color}{entry.color && entry.storage ? ' · ' : ''}{entry.storage}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{entry.imei}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(entry.parts_replaced || []).map((part) => (
                          <span key={part} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{part}</span>
                        ))}
                        {(!entry.parts_replaced || entry.parts_replaced.length === 0) && (
                          <span className="text-xs text-gray-400">Aucune</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-1 rounded-full">{entry.final_grade}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">{entry.sale_price_estimated}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showRepairModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-[#1B2A4A] text-lg">🔧 Réparation terminée</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedEntry.brand} {selectedEntry.model} · {selectedEntry.imei}</p>
              </div>
              <button onClick={() => setShowRepairModal(false)} className="cursor-pointer">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-xs font-semibold text-[#1B2A4A] uppercase mb-2 block">Pièces remplacées</label>
                <div className="grid grid-cols-2 gap-2">
                  {PARTS_LIST.map((part) => (
                    <label key={part} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={repairForm.parts_replaced.includes(part)}
                        onChange={() => {
                          const current = repairForm.parts_replaced
                          const updated = current.includes(part) ? current.filter((p) => p !== part) : [...current, part]
                          setRepairForm((f) => ({ ...f, parts_replaced: updated }))
                        }}
                        className="w-4 h-4 accent-[#00B4CC]"
                      />
                      {part}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1B2A4A] uppercase mb-2 block">Grade final</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Comme neuf', 'Très bon état', 'Bon état'].map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setRepairForm((f) => ({ ...f, final_grade: grade }))}
                      className={`py-2 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                        repairForm.final_grade === grade
                          ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                          : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prix de vente estimé (€) *</label>
                <input
                  type="number"
                  value={repairForm.sale_price_estimated}
                  onChange={(e) => setRepairForm((f) => ({ ...f, sale_price_estimated: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="Ex: 299"
                />
                {repairForm.sale_price_estimated && selectedEntry.purchase_price && (
                  <p className="text-xs text-green-600 mt-1">
                    Bénéfice estimé : +{(parseFloat(repairForm.sale_price_estimated) - selectedEntry.purchase_price).toFixed(0)}€
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin de destination</label>
                <select
                  value={repairForm.magasin_id}
                  onChange={(e) => setRepairForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                >
                  {MAGASINS_PHYSIQUES.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes de reconditionnement</label>
                <textarea
                  value={repairForm.reconditioning_notes}
                  onChange={(e) => setRepairForm((f) => ({ ...f, reconditioning_notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none resize-none"
                  placeholder="Remarques sur la réparation..."
                />
              </div>

              <button
                onClick={handleRepairDone}
                disabled={submitting || !repairForm.sale_price_estimated}
                className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ajout au stock...
                  </span>
                ) : '✅ Confirmer — Ajouter au stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
