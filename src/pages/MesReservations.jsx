// SQL à exécuter dans Supabase si pas encore fait :
// ALTER TABLE orders ADD COLUMN IF NOT EXISTS encaisse_at TIMESTAMP WITH TIME ZONE;

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Search, CheckCircle, Clock, AlertCircle, XCircle, MapPin, Calendar, Package } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { ACCESSORY_PACKS } from '../data/accessories'
import { MAGASINS } from '../utils/magasins'

const STATUS_CONFIG = {
  en_attente:   { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: '🟡' },
  acompte_paye: { label: 'Acompte reçu — En cours',   color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: '🔵' },
  confirme:     { label: 'Confirmé par le magasin',    color: 'bg-green-100 text-green-700 border-green-200',    dot: '🟢' },
  recupere:     { label: 'Récupéré — Terminé',         color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: '✅' },
  annule:       { label: 'Annulé',                     color: 'bg-red-100 text-red-600 border-red-200',          dot: '🔴' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', dot: '⚪' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span>{cfg.dot}</span>
      {cfg.label}
    </span>
  )
}

function OrderCard({ order }) {
  const navigate = useNavigate()
  const phoneName  = order.phone_name || '—'
  const imageUrl   = getPhoneImage(phoneName, order.phone_color)
  const magasin    = order.magasin_id ? MAGASINS[order.magasin_id] : null
  const pack       = ACCESSORY_PACKS.find(p => p.id === order.accessory_pack)
  const isRecupere = order.status === 'recupere'
  const remaining  = (order.total_amount || 0) - (order.deposit_amount || 0)

  const encaisseDate = order.encaisse_at || order.code_used_at
  const pickupDateFormatted = order.pickup_date
    ? new Date(order.pickup_date).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const encaisseDateFormatted = encaisseDate
    ? new Date(encaisseDate).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isRecupere ? 'border-emerald-200' : 'border-gray-200'}`}>
      {/* Header card */}
      <div className={`px-5 py-3 flex items-center justify-between ${isRecupere ? 'bg-emerald-50' : 'bg-[#F8F9FA]'}`}>
        <StatusBadge status={order.status} />
        {order.reservation_code && (
          <span className="font-mono font-bold text-[#1B2A4A] text-sm tracking-widest bg-white border border-gray-200 px-3 py-1 rounded-lg">
            {order.reservation_code}
          </span>
        )}
      </div>

      <div className="p-5 flex gap-4">
        {/* Image */}
        <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
          <img
            src={imageUrl}
            alt={phoneName}
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
            className="w-full h-full object-contain p-1"
          />
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <h3 className="font-poppins font-bold text-[#1B2A4A] text-base leading-tight">{phoneName}</h3>
          <p className="text-xs text-[#888] mt-0.5">
            {[order.phone_color, order.phone_storage, order.phone_grade ? `Grade ${order.phone_grade}` : ''].filter(Boolean).join(' · ')}
          </p>

          {/* Prix */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-bold text-lg text-[#1B2A4A]">{order.total_amount || 0}€</span>
            {order.deposit_amount > 0 && (
              <span className="text-xs text-[#888]">acompte {order.deposit_amount}€ payé</span>
            )}
          </div>

          {/* Reste à payer si pas encaissé */}
          {!isRecupere && remaining > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-0.5">Reste à payer en magasin : {remaining}€</p>
          )}

          {/* Date récupération */}
          {isRecupere && encaisseDateFormatted && (
            <p className="text-xs text-emerald-700 font-medium mt-0.5">Récupéré le {encaisseDateFormatted}</p>
          )}
        </div>
      </div>

      {/* Détails retrait + pack */}
      <div className="px-5 pb-4 space-y-2">
        {magasin && (
          <div className="flex items-start gap-2 text-xs text-[#555]">
            <MapPin size={13} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
            <span>{magasin.nom} — {magasin.adresse}</span>
          </div>
        )}
        {pickupDateFormatted && !isRecupere && (
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Calendar size={13} className="text-[#00B4CC] flex-shrink-0" />
            <span className="capitalize">Passage prévu : {pickupDateFormatted}</span>
          </div>
        )}
        {pack && pack.id !== 'none' && pack.items.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-[#555]">
            <Package size={13} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
            <span>{pack.label} inclus : {pack.items.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Section "Ce qui a été fait" */}
      {(order.phone_condition === 'reconditionne' || order.phone_condition === 'occasion') && (
        <div className="mx-5 mb-4 border border-gray-100 rounded-xl p-3 bg-gray-50">
          <p className="text-xs font-semibold text-[#555] uppercase tracking-wide mb-2">Ce qui a été fait</p>
          <ul className="space-y-1">
            {order.phone_condition === 'reconditionne' ? (
              <>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Contrôle complet 72 points</li>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Batterie testée et certifiée</li>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Nettoyage complet</li>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Tests fonctionnels validés</li>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Garantie 24 mois SebPhone</li>
              </>
            ) : (
              <>
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Contrôle complet effectué</li>
                {order.battery_health && <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Batterie : {order.battery_health}%</li>}
                <li className="text-xs text-[#555] flex items-center gap-1.5"><CheckCircle size={11} className="text-green-500" /> Garantie 6 mois SebPhone</li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5">
        {order.reservation_code && (
          <button
            onClick={() => navigate(`/commande/${order.reservation_code}`)}
            className="w-full py-2.5 border border-[#00B4CC] text-[#00B4CC] hover:bg-cyan-50 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Voir le détail complet →
          </button>
        )}
      </div>
    </div>
  )
}

export default function MesReservations() {
  const [email,   setEmail]   = useState('')
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error,   setError]   = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    if (!isSupabaseReady) {
      setOrders([])
      setSearched(true)
      setLoading(false)
      return
    }

    const { data, error: sbErr } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', email.trim().toLowerCase())
      .order('created_at', { ascending: false })

    if (sbErr) {
      setError('Erreur lors de la recherche. Réessayez.')
    } else {
      setOrders(data || [])
    }
    setSearched(true)
    setLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-12">
      <div className="mb-8">
        <h1 className="font-poppins font-bold text-3xl text-[#1B2A4A] mb-1">
          Mes <span className="text-[#00B4CC]">réservations</span>
        </h1>
        <p className="text-[#555] text-sm">Entrez votre email pour retrouver vos commandes</p>
      </div>

      {/* Formulaire email */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2 text-sm"
        >
          <Search size={16} />
          Rechercher
        </button>
      </form>

      {/* Résultats */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {searched && !loading && (
        orders.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-semibold text-[#1B2A4A]">Aucune réservation trouvée</p>
            <p className="text-sm text-[#888] mt-1">Vérifiez l'email utilisé lors de la réservation</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#555]">
              <span className="font-semibold text-[#1B2A4A]">{orders.length}</span> réservation{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
            </p>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )
      )}
    </main>
  )
}
