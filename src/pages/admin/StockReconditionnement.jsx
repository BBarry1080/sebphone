import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS, MAGASINS_ADMIN } from '../../utils/magasins'
import { IPHONE_ON_DEMAND } from '../../data/iphoneOnDemand'
import { CheckCircle, Clock, X, Wrench, Plus, Trash2 } from 'lucide-react'
import { useCurrentUser, useRequirePermission } from '../../hooks/usePermissions'
import { FOURNISSEURS_LIST } from '../../utils/fournisseurs'

const PARTS_LIST = [
  'Écran', 'Batterie', 'Vitre arrière',
  'Caméra avant', 'Caméra arrière',
  'Haut-parleur', 'Micro',
  'Connecteur de charge', 'Bouton home',
  'Face ID / Touch ID',
]

const SCREEN_QUALITIES = [
  'Originale',
  'Qualite originale',
  'Compatible',
]

export default function StockReconditionnement() {
  useRequirePermission('stock_reconditionnement')
  const currentUser = useCurrentUser()

  const [entries, setEntries]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [selectedEntry, setSelectedEntry]   = useState(null)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [submitting, setSubmitting]         = useState(false)

  const [showStockModal, setShowStockModal] = useState(false)
  const [stockEntry, setStockEntry]         = useState(null)
  const [stockPrice, setStockPrice]         = useState('')
  const [stockPricePro, setStockPricePro]   = useState('')
  const [stockMagasin, setStockMagasin]     = useState('')
  const [stockLoading, setStockLoading]     = useState(false)
  const [repairForm, setRepairForm]         = useState({
    parts_replaced: [],
    parts_prices: {},
    parts_quality: {},
    final_grade: 'Très bon état',
    sale_price_estimated: '',
    magasin_id: 'anderlecht',
    reconditioning_notes: '',
    face_id_status: null,
    battery_health: '',
  })
  const [screenQuality, setScreenQuality] = useState('')
  const [repairPricePro, setRepairPricePro] = useState('')

  const totalPartsCost = Object.values(repairForm.parts_prices)
    .reduce((acc, price) => acc + (parseFloat(price) || 0), 0)
  const totalCost = (selectedEntry?.purchase_price || 0) + totalPartsCost

  useEffect(() => {
    if (totalCost > 0) {
      const suggested = Math.round(totalCost * 1.3)
      setRepairForm((f) => ({ ...f, sale_price_estimated: suggested.toString() }))
    }
  }, [totalCost])

  const [showAddModal, setShowAddModal] = useState(false)
  const initialAddForm = {
    brand: 'Apple',
    model: '',
    color: '',
    storage: '',
    imei: '',
    purchase_price: '',
    fournisseur: 'SebPhone',
    fournisseur_custom: '',
    magasin_id: 'anderlecht',
    notes: '',
    phone_grade: 'Bon état',
    battery_health: '',
  }
  const [addForm, setAddForm] = useState(initialAddForm)
  const [modelSearch, setModelSearch]                   = useState('')
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)
  const [availableColors, setAvailableColors]           = useState([])

  useEffect(() => {
    const close = () => setShowModelSuggestions(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const modelSuggestions = addForm.brand === 'Apple' && modelSearch.length > 0
    ? IPHONE_ON_DEMAND.filter((iphone) =>
        iphone.model.toLowerCase().includes(modelSearch.toLowerCase())
      )
    : []

  const handleSelectModel = (iphone) => {
    setAddForm((f) => ({ ...f, model: iphone.model, color: '' }))
    setModelSearch(iphone.model)
    setAvailableColors(iphone.colors || [])
    setShowModelSuggestions(false)
  }

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
      parts_prices: entry.parts_prices || {},
      parts_quality: entry.parts_quality || {},
      final_grade: entry.final_grade || 'Très bon état',
      sale_price_estimated: entry.sale_price_estimated || '',
      magasin_id: entry.magasin_id || 'anderlecht',
      reconditioning_notes: '',
      face_id_status: entry.face_id_status || null,
      battery_health: entry.battery_health || '',
    })
    const savedScreen = entry.parts_quality?.['Écran']
    setScreenQuality(SCREEN_QUALITIES.includes(savedScreen) ? savedScreen : '')
    setRepairPricePro('')
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
          parts_prices: repairForm.parts_prices,
          total_parts_cost: totalPartsCost,
          final_grade: repairForm.final_grade,
          sale_price_estimated: parseFloat(repairForm.sale_price_estimated),
          reconditioning_notes: repairForm.reconditioning_notes,
          reconditioning_done_at: new Date().toISOString(),
          face_id_status: repairForm.face_id_status,
          added_to_stock: true,
        })
        .eq('id', selectedEntry.id)
      if (regError) throw regError

      const partsWithQuality = (repairForm.parts_replaced || []).map((p) => {
        if (p === 'Écran' && screenQuality) return `Écran (${screenQuality})`
        const q = repairForm.parts_quality?.[p]
        const qLabel = q === 'compatible' ? ' (Compatible)'
          : q === 'qualite_originale' ? ' (Qualité originale)'
          : ' (Originale)'
        return p + qLabel
      })

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
          price_pro:        repairPricePro ? Number(repairPricePro) : null,
          purchase_price:   totalCost,
          imei:             selectedEntry.imei,
          status:           'disponible',
          visible_on_site:  true,
          battery_health:   repairForm.battery_health ? parseInt(repairForm.battery_health) : null,
          magasins:         [repairForm.magasin_id],
          fournisseur:      `${selectedEntry.seller_first_name} ${selectedEntry.seller_last_name}`,
          parts_replaced:   partsWithQuality,
          face_id_status:   repairForm.face_id_status,
          notes:            repairForm.reconditioning_notes || null,
          added_by:         currentUser?.name || 'Admin',
          added_by_magasin: repairForm.magasin_id,
        }])
      if (stockError) throw stockError

      setShowRepairModal(false)
      setRepairPricePro('')
      fetchEntries()
      alert('✅ Téléphone reconditionné ajouté au stock !')
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddToStock = (entry) => {
    setStockEntry(entry)
    setStockPrice(Math.round(Number(entry.purchase_price) * 1.3) || '')
    setStockPricePro('')
    setStockMagasin(entry.magasin_id || '')
    setShowStockModal(true)
  }

  const confirmAddToStock = async () => {
    if (!stockPrice || Number(stockPrice) <= 0) {
      alert('Veuillez entrer un prix de vente valide.')
      return
    }
    if (!stockMagasin) {
      alert('Veuillez sélectionner un magasin.')
      return
    }
    setStockLoading(true)

    const sellerLabel = `${stockEntry.seller_first_name || ''} ${stockEntry.seller_last_name || ''}`.trim()
      || stockEntry.fournisseur || 'Reconditionnement'

    const { data: newPhone, error: phoneErr } = await supabase
      .from('phones')
      .insert({
        name:             `${stockEntry.brand} ${stockEntry.model}`,
        model:            stockEntry.model,
        brand:            stockEntry.brand,
        color:            stockEntry.color || '—',
        storage:          stockEntry.storage || '—',
        condition:        'reconditionne',
        grade:            stockEntry.phone_grade || 'Bon état',
        purchase_price:   Number(stockEntry.purchase_price) || 0,
        price:            Number(stockPrice),
        price_pro:        stockPricePro ? Number(stockPricePro) : null,
        imei:             stockEntry.imei,
        status:           'disponible',
        visible_on_site:  true,
        battery_health:   stockEntry.battery_health ? parseInt(stockEntry.battery_health) : null,
        magasins:         [stockMagasin],
        added_by_magasin: stockMagasin,
        fournisseur:      sellerLabel,
        tva_regime:       'marge',
        parts_replaced:   [],
        added_by:         currentUser?.name || 'Admin',
        categorie:        'telephone',
      })
      .select()
      .single()

    if (phoneErr) {
      alert('Erreur : ' + phoneErr.message)
      setStockLoading(false)
      return
    }

    await supabase
      .from('purchase_registry')
      .update({
        reconditioning_status:  'termine',
        added_to_stock:         true,
        reconditioning_done_at: new Date().toISOString(),
        final_grade:            stockEntry.phone_grade || 'Bon état',
        sale_price_estimated:   Number(stockPrice),
        phone_id:               newPhone.id,
      })
      .eq('id', stockEntry.id)

    setShowStockModal(false)
    setStockEntry(null)
    setStockPrice('')
    setStockPricePro('')
    setStockMagasin('')
    setStockLoading(false)
    fetchEntries()
  }

  const handleDelete = async (entryId) => {
    if (!window.confirm('Supprimer cette entrée du reconditionnement ?')) return
    const { error } = await supabase
      .from('purchase_registry')
      .delete()
      .eq('id', entryId)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }

  const handleAdd = async () => {
    if (!addForm.model || !addForm.purchase_price) {
      alert('Modèle et prix obligatoires')
      return
    }
    const fournisseurFinal = addForm.fournisseur === '__custom__'
      ? addForm.fournisseur_custom
      : addForm.fournisseur
    const { error } = await supabase
      .from('purchase_registry')
      .insert([{
        seller_first_name:     fournisseurFinal,
        seller_last_name:      '',
        seller_address:        'Fournisseur professionnel',
        seller_id_number:      'PRO',
        seller_birth_date:     '2000-01-01',
        brand:                 addForm.brand,
        model:                 addForm.model,
        color:                 addForm.color || '',
        storage:               addForm.storage || '',
        imei:                  addForm.imei || `PRO-${Date.now()}`,
        purchase_price:        parseFloat(addForm.purchase_price),
        payment_method:        'Cash',
        magasin_id:            addForm.magasin_id,
        fournisseur:           fournisseurFinal,
        phone_condition:       'reconditionne',
        phone_grade:           addForm.phone_grade,
        battery_health:        addForm.battery_health ? parseInt(addForm.battery_health) : null,
        reconditioning_status: 'en_attente',
        added_to_stock:        false,
        notes:                 addForm.notes || null,
        transaction_date:      new Date().toISOString(),
      }])
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    setShowAddModal(false)
    setAddForm(initialAddForm)
    setModelSearch('')
    setAvailableColors([])
    fetchEntries()
    alert('✅ Téléphone ajouté au stock reconditionnement !')
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
        <button
          onClick={() => {
            setAddForm(initialAddForm)
            setModelSearch('')
            setAvailableColors([])
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 bg-[#00B4CC] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Ajouter un téléphone
        </button>
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

      {(() => {
        const prixAchatParFournisseur = enAttente.reduce((acc, e) => {
          const f = e.fournisseur || 'Inconnu'
          acc[f] = (acc[f] || 0) + (e.purchase_price || 0)
          return acc
        }, {})
        const entries = Object.entries(prixAchatParFournisseur)
        if (entries.length === 0) return null
        return (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Prix achat par fournisseur</p>
            {entries.map(([fournisseur, total]) => (
              <div key={fournisseur} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0 text-sm">
                <span className="text-gray-600">
                  {fournisseur === 'SebPhone' ? '💻 ' : fournisseur === 'Marrakech' ? '🌍 ' : '📍 '}
                  {fournisseur}
                </span>
                <span className="font-bold text-orange-600">{total.toLocaleString('fr-BE')}€</span>
              </div>
            ))}
          </div>
        )
      })()}

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
                  {['Date rachat', 'Téléphone', 'IMEI', 'Vendeur', 'Prix achat', 'Fournisseur', 'Magasin', 'Action'].map((h) => (
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
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.fournisseur === 'SebPhone' || entry.fournisseur === 'Marrakech'
                          ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.fournisseur === 'SebPhone' ? '💻 ' : entry.fournisseur === 'Marrakech' ? '🌍 ' : '📍 '}
                        {entry.fournisseur || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {MAGASINS[entry.magasin_id]?.nom?.replace('Seb Telecom — ', '') || entry.magasin_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => openRepairModal(entry)}
                          className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-600 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <Wrench size={12} />
                          Réparation terminée
                        </button>
                        <button
                          onClick={() => handleAddToStock(entry)}
                          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-700 transition-all whitespace-nowrap cursor-pointer"
                        >
                          + Ajouter au stock
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
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
                <label className="text-xs font-semibold text-[#1B2A4A] uppercase mb-2 block">Pièces remplacées + Prix</label>
                <div className="space-y-2">
                  {PARTS_LIST.map((part) => {
                    const isChecked = repairForm.parts_replaced.includes(part)
                    return (
                      <div key={part}>
                        <div
                          className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                            isChecked ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = repairForm.parts_replaced
                              const updated = current.includes(part) ? current.filter((p) => p !== part) : [...current, part]
                              const newPrices = { ...repairForm.parts_prices }
                              if (!updated.includes(part)) delete newPrices[part]
                              const resetFaceId = part === 'Face ID / Touch ID' && current.includes(part)
                              const resetScreen = part === 'Écran' && current.includes(part)
                              setRepairForm((f) => ({
                                ...f,
                                parts_replaced: updated,
                                parts_prices: newPrices,
                                ...(resetFaceId ? { face_id_status: null } : {}),
                              }))
                              if (resetScreen) setScreenQuality('')
                            }}
                            className="w-4 h-4 accent-[#00B4CC] flex-shrink-0"
                          />
                          <span className={`text-sm flex-1 ${isChecked ? 'font-medium text-orange-700' : 'text-gray-600'}`}>
                            {part}
                          </span>
                          {isChecked && (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={repairForm.parts_prices[part] || ''}
                                onChange={(e) => setRepairForm((f) => ({
                                  ...f,
                                  parts_prices: { ...f.parts_prices, [part]: e.target.value },
                                }))}
                                className="w-20 px-2 py-1 border border-orange-300 rounded-lg text-sm text-right focus:border-[#00B4CC] outline-none"
                                placeholder="0"
                                min="0"
                              />
                              <span className="text-xs text-gray-500">€</span>
                            </div>
                          )}
                        </div>
                        {isChecked && part === 'Écran' && (
                          <div className="ml-6 mt-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                              Qualité écran
                            </label>
                            <select
                              value={screenQuality}
                              onChange={(e) => setScreenQuality(e.target.value)}
                              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
                            >
                              <option value="">Sélectionner...</option>
                              {SCREEN_QUALITIES.map((q) => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {isChecked && part !== 'Écran' && (
                          <div className="ml-6 mt-1 flex gap-2 flex-wrap">
                            {[
                              { value: 'compatible', label: 'Compatible' },
                              { value: 'qualite_originale', label: 'Qualité originale' },
                              { value: 'originale', label: 'Originale' },
                            ].map((q) => (
                              <button
                                key={q.value}
                                type="button"
                                onClick={() => setRepairForm((f) => ({
                                  ...f,
                                  parts_quality: {
                                    ...(f.parts_quality || {}),
                                    [part]: q.value,
                                  },
                                }))}
                                className={`px-2 py-1 rounded-lg text-xs font-medium border
                                  ${(repairForm.parts_quality?.[part] || 'originale') === q.value
                                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                                    : 'bg-white text-gray-600 border-gray-200'}`}>
                                {q.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {part === 'Face ID / Touch ID' && isChecked && (
                          <div className="mt-2 ml-6 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setRepairForm((f) => ({ ...f, face_id_status: 'fonctionnel' }))}
                              className={`px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                                repairForm.face_id_status === 'fonctionnel'
                                  ? 'bg-green-100 border-green-500 text-green-700 font-bold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-500'
                              }`}
                            >
                              ✅ Fonctionnel
                            </button>
                            <button
                              type="button"
                              onClick={() => setRepairForm((f) => ({ ...f, face_id_status: 'non_fonctionnel' }))}
                              className={`px-2 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                                repairForm.face_id_status === 'non_fonctionnel'
                                  ? 'bg-red-100 border-red-500 text-red-700 font-bold'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-red-500'
                              }`}
                            >
                              ❌ Pas fonctionnel
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {repairForm.parts_replaced.length > 0 && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Prix d'achat téléphone</span>
                      <span>{selectedEntry?.purchase_price || 0}€</span>
                    </div>
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>Coût des pièces ({repairForm.parts_replaced.length})</span>
                      <span>+{totalPartsCost}€</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-[#1B2A4A] border-t border-gray-200 pt-1.5">
                      <span>Prix de revient total</span>
                      <span>{totalCost}€</span>
                    </div>
                  </div>
                )}
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
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Batterie (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={repairForm.battery_health}
                  onChange={e => setRepairForm(f => ({
                    ...f, battery_health: e.target.value
                  }))}
                  placeholder="ex: 87"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                />
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
                {totalCost > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Prix de revient : {totalCost}€ — Marge suggérée 30 % : {Math.round(totalCost * 1.3)}€
                  </p>
                )}
                {repairForm.sale_price_estimated && totalCost > 0 && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Bénéfice estimé : +{(parseFloat(repairForm.sale_price_estimated) - totalCost).toFixed(0)}€
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Prix Pro (€)
                  <span className="text-gray-400 normal-case ml-1">
                    — optionnel
                  </span>
                </label>
                <input type="number" value={repairPricePro}
                  onChange={(e) => setRepairPricePro(e.target.value)}
                  placeholder="Laisser vide = non visible en Pro"
                  className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin de destination</label>
                <select
                  value={repairForm.magasin_id}
                  onChange={(e) => setRepairForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                >
                  {MAGASINS_ADMIN.map((m) => (
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A] text-lg">📦 Ajouter un téléphone à reconditionner</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddForm(initialAddForm)
                  setModelSearch('')
                  setAvailableColors([])
                }}
                className="cursor-pointer"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fournisseur *</label>
                <select
                  value={addForm.fournisseur}
                  onChange={(e) => setAddForm((f) => ({ ...f, fournisseur: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                >
                  {FOURNISSEURS_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  <option value="__custom__">+ Ajouter un fournisseur</option>
                </select>
                {addForm.fournisseur === '__custom__' && (
                  <input
                    value={addForm.fournisseur_custom}
                    onChange={(e) => setAddForm((f) => ({ ...f, fournisseur_custom: e.target.value }))}
                    placeholder="Nom du nouveau fournisseur"
                    className="w-full mt-2 px-3 py-2 border border-[#00B4CC] rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Marque *</label>
                  <select
                    value={addForm.brand}
                    onChange={(e) => {
                      setAddForm((f) => ({ ...f, brand: e.target.value, model: '', color: '' }))
                      setModelSearch('')
                      setAvailableColors([])
                    }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                  >
                    {['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'Autre'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Stockage</label>
                  <select
                    value={addForm.storage}
                    onChange={(e) => setAddForm((f) => ({ ...f, storage: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                  >
                    <option value="">—</option>
                    {['16Go', '32Go', '64Go', '128Go', '256Go', '512Go', '1To'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Modèle *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => {
                        setModelSearch(e.target.value)
                        setAddForm((f) => ({ ...f, model: e.target.value }))
                        setShowModelSuggestions(true)
                        if (addForm.brand !== 'Apple') setAvailableColors([])
                      }}
                      onFocus={() => setShowModelSuggestions(true)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder={addForm.brand === 'Apple' ? 'Tape 12, 14 Pro, 15...' : 'Modèle du téléphone'}
                    />
                    {showModelSuggestions && modelSuggestions.length > 0 && addForm.brand === 'Apple' && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto mt-1">
                        {modelSuggestions.map((iphone) => (
                          <button
                            key={iphone.model}
                            type="button"
                            onClick={() => handleSelectModel(iphone)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 hover:text-[#00B4CC] transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                          >
                            <span className="font-medium">{iphone.model}</span>
                            <span className="text-xs text-gray-400 ml-2">{iphone.colors.length} couleurs</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Couleur</label>
                  {availableColors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {availableColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setAddForm((f) => ({ ...f, color }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all cursor-pointer ${
                            addForm.color === color
                              ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                              : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={addForm.color}
                      onChange={(e) => setAddForm((f) => ({ ...f, color: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Ex: Noir, Blanc, Or..."
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">IMEI</label>
                <input
                  type="text"
                  value={addForm.imei}
                  onChange={(e) => setAddForm((f) => ({ ...f, imei: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-mono"
                  placeholder="352999XXXXXXXXX"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prix d'achat (€) *</label>
                <input
                  type="number"
                  value={addForm.purchase_price}
                  onChange={(e) => setAddForm((f) => ({ ...f, purchase_price: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="150"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Grade initial</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Comme neuf', 'Très bon état', 'Bon état'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, phone_grade: g }))}
                      className={`py-2 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                        addForm.phone_grade === g
                          ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                          : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Batterie (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={addForm.battery_health || ''}
                  onChange={e => setAddForm(f => ({
                    ...f, battery_health: e.target.value
                  }))}
                  placeholder="ex: 87"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl
                             text-sm focus:border-[#00B4CC] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin de réception</label>
                <select
                  value={addForm.magasin_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                >
                  {MAGASINS_ADMIN.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none resize-none"
                  placeholder="Remarques..."
                />
              </div>

              <button
                onClick={handleAdd}
                className="w-full bg-[#00B4CC] text-white rounded-xl py-3 font-bold text-sm hover:bg-cyan-600 transition-all cursor-pointer"
              >
                ✅ Ajouter au stock reconditionnement
              </button>
            </div>
          </div>
        </div>
      )}

      {showStockModal && stockEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                Ajouter au stock
              </h2>
              <button onClick={() => setShowStockModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="font-bold text-[#1B2A4A] text-sm">
                {stockEntry.brand} {stockEntry.model}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {stockEntry.storage} · {stockEntry.color} ·
                Grade {stockEntry.phone_grade}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Prix d'achat : {stockEntry.purchase_price}€
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Prix de vente (€) *
                </label>
                <input type="number" value={stockPrice}
                  onChange={(e) => setStockPrice(e.target.value)}
                  placeholder="Ex: 299"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:border-[#00B4CC] outline-none" />
                {stockPrice && stockEntry.purchase_price && (
                  <p className="text-xs text-green-600 mt-1">
                    Marge : +{(Number(stockPrice) - Number(stockEntry.purchase_price)).toFixed(0)}€
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Prix Pro (€)
                  <span className="text-gray-400 normal-case ml-1">
                    — optionnel, réservé revendeurs
                  </span>
                </label>
                <input type="number" value={stockPricePro}
                  onChange={(e) => setStockPricePro(e.target.value)}
                  placeholder="Laisser vide = non visible en Pro"
                  className="w-full px-3 py-2.5 border border-blue-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Magasin *
                </label>
                <select value={stockMagasin}
                  onChange={(e) => setStockMagasin(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none">
                  <option value="">Sélectionner...</option>
                  <option value="anderlecht">Anderlecht</option>
                  <option value="molenbeek">Molenbeek</option>
                  <option value="louise">Louise</option>
                  <option value="rue-neuve">Rue Neuve</option>
                  <option value="tubize">Tubize</option>
                  <option value="saint-gilles">Saint-Gilles</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowStockModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={confirmAddToStock}
                disabled={stockLoading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {stockLoading ? 'Ajout...' : '+ Ajouter au stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
