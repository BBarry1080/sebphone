import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Smartphone, ClipboardList, CheckCircle, Euro } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

const STATUS_BADGES = {
  en_attente:    { label: 'En attente',    cls: 'bg-yellow-100 text-yellow-800' },
  acompte_paye:  { label: 'Acompte payé',  cls: 'bg-blue-100 text-blue-800' },
  confirme:      { label: 'Confirmé',      cls: 'bg-green-100 text-green-800' },
  recupere:      { label: 'Récupéré',      cls: 'bg-gray-100 text-gray-700' },
  annule:        { label: 'Annulé',        cls: 'bg-red-100 text-red-700' },
}

function MetricCard({ icon: Icon, iconColor, label, value, unit = '' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${iconColor} bg-opacity-10`}>
        <Icon size={22} className={iconColor.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-[#555555] text-sm">{label}</p>
        <p className="font-poppins font-bold text-[#1B2A4A] text-3xl mt-0.5">
          {value}<span className="text-base font-medium text-[#888] ml-1">{unit}</span>
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ disponible: 0, reserve: 0, vendu: 0, ca: 0 })
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

      const [{ count: disponible }, { count: reserve }, { count: vendu }, { data: ordersData }] = await Promise.all([
        supabase.from('phones').select('id', { count: 'exact', head: true }).eq('status', 'disponible'),
        supabase.from('phones').select('id', { count: 'exact', head: true }).eq('status', 'reserve'),
        supabase.from('phones').select('id', { count: 'exact', head: true })
          .eq('status', 'vendu')
          .gte('updated_at', startOfMonth.toISOString()),
        supabase.from('orders')
          .select('*, phone:phones(name, brand), customer:customers(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      // CA du mois: somme des deposit_paid ce mois
      const { data: caData } = await supabase
        .from('orders')
        .select('deposit_paid')
        .gte('created_at', startOfMonth.toISOString())

      const ca = (caData || []).reduce((sum, o) => sum + (o.deposit_paid || 0), 0)

      setMetrics({ disponible: disponible || 0, reserve: reserve || 0, vendu: vendu || 0, ca })
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
        <MetricCard icon={Smartphone}     iconColor="bg-[#00B4CC]"  label="Stock disponible"       value={metrics.disponible} unit="appareils" />
        <MetricCard icon={ClipboardList}  iconColor="bg-blue-500"   label="Réservations en cours"  value={metrics.reserve} />
        <MetricCard icon={CheckCircle}    iconColor="bg-green-500"  label="Vendus ce mois"         value={metrics.vendu} />
        <MetricCard icon={Euro}           iconColor="bg-[#1B2A4A]"  label="CA du mois"             value={metrics.ca} unit="€" />
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
