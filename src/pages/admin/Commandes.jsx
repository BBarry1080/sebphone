import { useState, useEffect } from 'react'
import { X, Package, RefreshCw, Search, Trash2 } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

const STATUS_CONFIG = {
  en_attente:   { label: 'En attente',   cls: 'bg-yellow-100 text-yellow-800' },
  acompte_paye: { label: 'Acompte payé', cls: 'bg-blue-100 text-blue-800' },
  confirme:     { label: 'Confirmé',     cls: 'bg-green-100 text-green-800' },
  recupere:     { label: 'Récupéré',     cls: 'bg-gray-100 text-gray-700' },
  annule:       { label: 'Annulé',       cls: 'bg-red-100 text-red-700' },
}
const FILTERS = [null, 'en_attente', 'acompte_paye', 'confirme', 'recupere', 'annule']
const FILTER_LABELS = { null: 'Tous', ...Object.fromEntries(Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])) }

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
  )
}

/* ─── CHANGE MODEL MODAL ─── */
function ChangeModelModal({ order, onClose, onDone }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [saving, setSaving]       = useState(false)

  const search = async () => {
    if (!query.trim() || !isSupabaseReady) return
    setSearching(true)
    const { data } = await supabase
      .from('phones')
      .select('id, model, name, brand, grade, storage, color, price')
      .eq('status', 'disponible')
      .ilike('model', `%${query.trim()}%`)
      .limit(10)
    setResults(data || [])
    setSearching(false)
  }

  const handleConfirm = async () => {
    if (!selected || !isSupabaseReady) return
    if (!window.confirm(`Remplacer le téléphone de cette commande par "${selected.model || selected.name}" ?`)) return
    setSaving(true)
    await supabase.from('orders').update({ phone_id: selected.id }).eq('id', order.id)
    await supabase.from('phones').update({ status: 'disponible' }).eq('id', order.phone_id)
    await supabase.from('phones').update({ status: 'reserve' }).eq('id', selected.id)
    setSaving(false)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-poppins font-bold text-[#1B2A4A]">Changer le modèle</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={18} /></button>
        </div>
        <p className="text-xs text-[#888] mb-4">
          Téléphone actuel : <strong>{order.phone?.brand} {order.phone?.name || '—'}</strong>
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Rechercher un modèle disponible..."
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
          />
          <button
            onClick={search}
            disabled={searching}
            className="px-4 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
          >
            <Search size={16} />
          </button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 border-2 rounded-xl text-sm transition-all cursor-pointer ${
                  selected?.id === p.id
                    ? 'border-[#00B4CC] bg-cyan-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div>
                  <p className="font-semibold text-[#1B2A4A]">{p.model || p.name}</p>
                  <p className="text-xs text-[#555]">
                    {[p.grade && `Grade ${p.grade}`, p.storage, p.color].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="font-bold text-[#1B2A4A]">{p.price}€</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
          >
            <RefreshCw size={15} />
            {saving ? 'Mise à jour...' : `Confirmer → ${selected.model || selected.name}`}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── DETAIL PANEL ─── */
function OrderPanel({ order, onClose, onRefetch }) {
  const [saving, setSaving]         = useState(false)
  const [changeModel, setChangeModel] = useState(false)

  const updateStatus = async (newStatus) => {
    if (!isSupabaseReady) return
    if (!window.confirm(`Mettre le statut en "${STATUS_CONFIG[newStatus]?.label}" ?`)) return
    setSaving(true)
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (newStatus === 'annule') {
      await supabase.from('phones').update({ status: 'disponible' }).eq('id', order.phone_id)
    }
    onRefetch()
    setSaving(false)
  }

  const handleCancel = async () => {
    if (!isSupabaseReady) return
    if (!window.confirm('Annuler cette commande et remettre le téléphone en stock ?')) return
    setSaving(true)
    await supabase.from('orders').update({ status: 'annule' }).eq('id', order.id)
    await supabase.from('phones').update({ status: 'disponible' }).eq('id', order.phone_id)
    onRefetch()
    setSaving(false)
    onClose()
  }

  const handleEncaisser = async () => {
    if (!isSupabaseReady) return
    const phoneName  = order.phone_name || order.phone?.model || order.phone?.name || '—'
    const clientName = order.customer_name || '—'
    if (!window.confirm(
      `Confirmer l'encaissement pour ${clientName} ?\nTéléphone : ${phoneName}\nMontant total : ${order.total_amount || order.deposit_paid || '—'}€`
    )) return
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('orders').update({
      status:       'recupere',
      code_used:    true,
      code_used_at: now,
      encaisse_at:  now,
    }).eq('id', order.id)
    if (order.phone_id) {
      await supabase.from('phones').update({ status: 'vendu' }).eq('id', order.phone_id)
    }
    setSaving(false)
    onRefetch()
    onClose()
    alert('✅ Commande encaissée avec succès !')
  }

  const clientName = order.customer_name || '—'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[420px] h-full overflow-y-auto shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-poppins font-bold text-[#1B2A4A]">Commande</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Statut + code */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={order.status} />
            {order.reservation_code && (
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {order.reservation_code}
              </span>
            )}
            <span className="text-xs text-[#888]">
              {order.created_at ? new Date(order.created_at).toLocaleDateString('fr-BE') : ''}
            </span>
          </div>

          {/* Client */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#888] mb-2">Client</p>
            <p className="font-semibold text-[#1B2A4A]">{clientName}</p>
            {order.customer_email && <p className="text-sm text-[#555]">{order.customer_email}</p>}
            {order.customer_phone && <p className="text-sm text-[#555]">{order.customer_phone}</p>}
          </div>

          {/* Téléphone */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#888] mb-2">Téléphone</p>
            <p className="font-semibold text-[#1B2A4A]">
              {order.phone_name || order.phone?.model || order.phone?.name || '—'}
            </p>
            {(order.phone_storage || order.phone_color || order.phone_grade) && (
              <p className="text-sm text-[#555]">
                {[order.phone_grade, order.phone_storage, order.phone_color].filter(Boolean).join(' · ')}
              </p>
            )}
            <p className="font-bold text-[#1B2A4A]">
              {order.total_amount != null ? `Total : ${order.total_amount}€` : ''}
              {order.deposit_amount != null ? ` · Acompte : ${order.deposit_amount}€` : ''}
            </p>
          </div>

          {/* Livraison */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#888] mb-2">Livraison</p>
            <p className="text-sm font-medium text-[#1B2A4A]">
              {order.delivery_mode === 'livraison' ? '🚚 Livraison' : '🏪 Click & Collect'}
            </p>
            {order.delivery_address && (
              <p className="text-sm text-[#555]">{order.delivery_address}</p>
            )}
            {order.pickup_date && (
              <p className="text-sm text-[#555]">
                Date prévue : {new Date(order.pickup_date).toLocaleDateString('fr-BE')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {order.status !== 'recupere' && order.status !== 'annule' && (
              <button
                onClick={() => setChangeModel(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 border border-[#00B4CC] text-[#00B4CC] hover:bg-cyan-50 font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
              >
                <RefreshCw size={15} />
                Changer le modèle
              </button>
            )}
            {order.status === 'en_attente' && (
              <button
                onClick={() => updateStatus('confirme')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
              >
                ✓ Confirmer la commande
              </button>
            )}
            {(order.status === 'acompte_paye' || order.status === 'confirme' || order.status === 'en_attente') && (
              <button
                onClick={handleEncaisser}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
              >
                ✅ Encaisser — Marquer comme récupéré
              </button>
            )}
            {order.status !== 'annule' && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm"
              >
                ✗ Annuler + remettre en stock
              </button>
            )}
          </div>
        </div>
      </div>

      {changeModel && (
        <ChangeModelModal
          order={order}
          onClose={() => setChangeModel(false)}
          onDone={() => { onRefetch(); onClose() }}
        />
      )}
    </div>
  )
}

/* ─── PAGE PRINCIPALE ─── */
export default function Commandes() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (o, e) => {
    e.stopPropagation()
    if (!window.confirm(`Supprimer définitivement la commande de ${o.customer_name || 'ce client'} ?\nCette action est irréversible.`)) return
    setDeletingId(o.id)
    if (isSupabaseReady) {
      await supabase.from('orders').delete().eq('id', o.id)
    }
    setOrders((prev) => prev.filter((x) => x.id !== o.id))
    setDeletingId(null)
  }

  const fetchOrders = async () => {
    setLoading(true)
    if (!isSupabaseReady) {
      setOrders([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*, phone:phones(name, brand, model, grade, storage, color)')
      .order('created_at', { ascending: false })
    if (error) console.error('fetchOrders error:', error)
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    if (!isSupabaseReady) return

    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = activeFilter
    ? orders.filter((o) => o.status === activeFilter)
    : orders

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Commandes</h1>
        <p className="text-sm text-[#555555] mt-0.5">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={String(f)}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeFilter === f
                ? 'bg-[#1B2A4A] text-white'
                : 'bg-white border border-gray-200 text-[#555555] hover:border-[#1B2A4A]'
            }`}
          >
            {FILTER_LABELS[String(f)]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[#888]">Aucune commande</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-gray-100">
                <tr>
                  {['#', 'Client', 'Téléphone', 'Mode', 'Acompte', 'Date', 'Statut', 'Voir', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555555] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((o) => {
                  const clientName = o.customer_name || '—'
                  return (
                    <tr key={o.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 text-[#888] font-mono text-xs">#{o.id}</td>
                      <td className="px-4 py-3 font-medium text-[#1B2A4A]">{clientName}</td>
                      <td className="px-4 py-3 text-[#555]">
                        {o.phone_name || o.phone?.model || o.phone?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#555]">
                        {o.delivery_mode === 'livraison' ? '🚚 Livraison' : '🏪 Click & Collect'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1B2A4A]">
                        {o.deposit_paid != null ? `${o.deposit_paid}€` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#888]">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString('fr-BE') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="text-xs font-medium text-[#00B4CC] hover:underline cursor-pointer"
                        >
                          Détails →
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => handleDelete(o, e)}
                          disabled={deletingId === o.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedOrder && (
        <OrderPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefetch={() => {
            fetchOrders()
            setSelectedOrder(null)
          }}
        />
      )}
    </div>
  )
}
