import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Smartphone, ClipboardList, CheckCircle, Euro, TrendingUp, Receipt } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useCurrentUser, usePermission } from '../../hooks/usePermissions'

const STATUS_BADGES = {
  en_attente:    { label: 'En attente',    cls: 'bg-yellow-100 text-yellow-800' },
  acompte_paye:  { label: 'Acompte payé',  cls: 'bg-blue-100 text-blue-800' },
  confirme:      { label: 'Confirmé',      cls: 'bg-green-100 text-green-800' },
  recupere:      { label: 'Récupéré',      cls: 'bg-gray-100 text-gray-700' },
  annule:        { label: 'Annulé',        cls: 'bg-red-100 text-red-700' },
}

function MetricCard({ icon: Icon, iconColor, label, value, unit = '', valueClass = 'text-[#1B2A4A]' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${iconColor} bg-opacity-10`}>
        <Icon size={22} className={iconColor.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-[#555555] text-sm">{label}</p>
        <p className={`font-poppins font-bold text-3xl mt-0.5 ${valueClass}`}>
          {value}<span className="text-base font-medium text-[#888] ml-1">{unit}</span>
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const isAdmin = currentUser.role === 'admin' || !currentUser.role
  const magasinFilter = !isAdmin && currentUser.magasin_id ? currentUser.magasin_id : null
  const canSeeDashboard = usePermission('voir_dashboard')
  const canSeeFinance = usePermission('voir_comptabilite')
  const canSeeCommandes = usePermission('voir_commandes')
  const canSeeStock = usePermission('voir_stock')

  useEffect(() => {
    if (!isAdmin && !canSeeDashboard) {
      navigate('/admin/stock', { replace: true })
    }
  }, [canSeeDashboard])

  const [metrics, setMetrics] = useState({ disponible: 0, reserve: 0, vendu: 0, ca: 0, benefice: 0, beneficeReel: 0, tvaMonth: 0 })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseReady) {
      setLoading(false)
      return
    }
    async function load() {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      // Filtre stock — colonne scalaire phones.added_by_magasin
      const addStockFilter = (q) => magasinFilter ? q.eq('added_by_magasin', magasinFilter) : q
      // Filtre orders/payments — colonne scalaire magasin_id
      const addOrderFilter = (q) => magasinFilter ? q.eq('magasin_id', magasinFilter) : q

      const stockQuery = supabase
        .from('phones')
        .select('id, purchase_price, price, status, fournisseur, added_by_magasin')
        .in('status', ['disponible', 'reserve'])
        .or('fournisseur.is.null,fournisseur.neq.Price MyPhone')
      const { data: stockData } = await addStockFilter(stockQuery)

      const reserveQuery = supabase
        .from('phones')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'reserve')
      const { count: reserveCount } = await addStockFilter(reserveQuery)

      const venduQuery = supabase
        .from('orders')
        .select('id, final_price, phone_id', { count: 'exact' })
        .eq('status', 'recupere')
        .gte('created_at', startOfMonth.toISOString())
      const { count: venduCount } = await addOrderFilter(venduQuery)

      const ordersQuery = supabase
        .from('orders')
        .select('id, created_at, status, final_price, customer_name, reservation_code, deposit_paid, phone:phone_id(name, model, brand)')
        .neq('status', 'annule')
        .order('created_at', { ascending: false })
        .limit(5)
      const { data: ordersData } = await addOrderFilter(ordersQuery)

      const paymentsQuery = supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', startOfMonth.toISOString())
      const { data: paymentsData } = await addOrderFilter(paymentsQuery)

      const beneficeQuery = supabase
        .from('orders')
        .select('final_price, phone:phone_id(purchase_price)')
        .eq('status', 'recupere')
        .gte('created_at', startOfMonth.toISOString())
      const { data: beneficeReelData } = await addOrderFilter(beneficeQuery)

      const tvaQuery = supabase
        .from('orders')
        .select('final_price, phone:phone_id(purchase_price, tva_regime, price)')
        .eq('status', 'recupere')
        .gte('created_at', startOfMonth.toISOString())
      const { data: tvaMonthData } = await addOrderFilter(tvaQuery)

      const disponible = (stockData || []).length
      const ca = (paymentsData || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const benefice = (stockData || []).reduce(
        (acc, p) => acc + ((Number(p.price) || 0) - (Number(p.purchase_price) || 0)), 0
      )
      const beneficeReel = (beneficeReelData || []).reduce(
        (acc, o) => acc + ((Number(o.final_price) || 0) - (Number(o.phone?.purchase_price) || 0)), 0
      )

      const calcTVAForOrder = (final_price, phone) => {
        const p = Number(final_price) || 0
        if (p <= 0) return 0
        const regime = phone?.tva_regime || 'marge'
        if (regime === 'normale') return p - p / 1.21
        const marge = p - (Number(phone?.purchase_price) || 0)
        if (marge <= 0) return 0
        return marge - marge / 1.21
      }
      const tvaMonth = (tvaMonthData || []).reduce(
        (acc, o) => acc + calcTVAForOrder(o.final_price, o.phone), 0
      )

      setMetrics({
        disponible: disponible || 0,
        reserve: reserveCount || 0,
        vendu: venduCount || 0,
        ca,
        benefice,
        beneficeReel,
        tvaMonth,
      })
      setOrders(ordersData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Dashboard</h1>
        <p className="text-sm text-[#555555] mt-0.5">Vue d'ensemble du stock et des commandes</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {canSeeStock && <MetricCard icon={Smartphone}    iconColor="bg-[#00B4CC]" label="Stock réel"              value={metrics.disponible} unit="appareils" />}
        {canSeeCommandes && <MetricCard icon={ClipboardList} iconColor="bg-blue-500"  label="Réservations en cours" value={metrics.reserve} />}
        {canSeeCommandes && <MetricCard icon={CheckCircle}   iconColor="bg-green-500" label="Vendus ce mois"        value={metrics.vendu} />}
        {canSeeFinance && <MetricCard icon={Euro}          iconColor="bg-[#1B2A4A]" label="CA du mois"             value={metrics.ca} unit="€" />}
        {canSeeFinance && (
          <MetricCard icon={TrendingUp} iconColor="bg-green-500" label="Bénéfice potentiel"
            value={new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(metrics.benefice)}
            valueClass="text-emerald-600"
          />
        )}
        {canSeeFinance && (
          <MetricCard icon={TrendingUp} iconColor="bg-emerald-500" label="Bénéfice réel"
            value={new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(metrics.beneficeReel)}
            valueClass="text-emerald-600"
          />
        )}
        {canSeeFinance && (
          <MetricCard icon={Receipt} iconColor="bg-purple-500" label="TVA collectée"
            value={new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(metrics.tvaMonth || 0)}
            valueClass="text-purple-600"
          />
        )}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1B2A4A]">Dernières commandes</h2>
          <Link to="/admin/commandes" className="text-sm text-[#00B4CC] hover:underline">
            Voir toutes →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#888]">Aucune commande pour le moment</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F8F9FA] border-b border-gray-100">
                <tr>
                  {['Client', 'Téléphone', 'Acompte', 'Statut', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[#555555] text-xs uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const badge = STATUS_BADGES[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-700' }
                  const clientName = o.customer
                    ? `${o.customer.first_name} ${o.customer.last_name}`
                    : o.customer_name || '—'
                  return (
                    <tr key={o.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1B2A4A]">{clientName}</td>
                      <td className="px-4 py-3 text-[#555555]">
                        {o.phone?.brand} {o.phone?.name || '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1B2A4A]">
                        {o.deposit_paid != null ? `${o.deposit_paid}€` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#888]">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString('fr-BE') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to="/admin/commandes"
                          className="text-xs text-[#00B4CC] hover:underline font-medium"
                        >
                          Détails →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
