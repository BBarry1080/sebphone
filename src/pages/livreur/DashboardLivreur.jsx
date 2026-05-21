import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CRENEAU_LABELS = {
  '8-16': '8h00 — 16h00',
  '16-20': '16h00 — 20h00',
  '20-00': '20h00 — 00h00',
}

const STATUS_COLORS = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_cours: 'bg-blue-100 text-blue-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
}

export default function DashboardLivreur() {
  const navigate = useNavigate()
  const [livreur, setLivreur] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')

  useEffect(() => {
    const stored = localStorage.getItem('livreur')
    if (!stored) { navigate('/livreur/login'); return }
    const l = JSON.parse(stored)
    setLivreur(l)
    fetchDeliveries(l.id)

    const channel = supabase
      .channel('livreur-deliveries')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'deliveries',
        filter: `livreur_id=eq.${l.id}`,
      }, () => fetchDeliveries(l.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDeliveries = async (livreurId) => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, phone:phone_id(name, model, imei)')
      .eq('livreur_id', livreurId)
      .order('created_at', { ascending: false })
    setDeliveries(data || [])
    setLoading(false)
  }

  const markDelivered = async (id) => {
    if (!window.confirm('Confirmer la livraison effectuée ?')) return
    await supabase.from('deliveries')
      .update({ status: 'livree', completed_at: new Date().toISOString() })
      .eq('id', id)
  }

  const markInProgress = async (id) => {
    await supabase.from('deliveries').update({ status: 'en_cours' }).eq('id', id)
  }

  if (!livreur) return null

  const active = deliveries.filter((d) => ['en_attente', 'en_cours'].includes(d.status))
  const done = deliveries.filter((d) => d.status === 'livree')
  const displayed = tab === 'active' ? active : done

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1B2A4A] text-white px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60">Espace livreur</p>
          <h1 className="font-bold">{livreur.prenom} {livreur.nom}</h1>
        </div>
        <button
          onClick={() => { localStorage.removeItem('livreur'); navigate('/livreur/login') }}
          className="text-xs text-white/60 hover:text-white"
        >
          Déconnexion
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { label: 'En attente', count: deliveries.filter((d) => d.status === 'en_attente').length, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'En cours', count: deliveries.filter((d) => d.status === 'en_cours').length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Livrées', count: done.length, color: 'bg-green-50 text-green-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {[
          { key: 'active', label: `Courses actives (${active.length})` },
          { key: 'done', label: `Historique (${done.length})` },
        ].map((tt) => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === tt.key
                ? 'bg-[#1B2A4A] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tt.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3 pb-8">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Chargement...</p>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-400">
              {tab === 'active' ? 'Aucune course active' : 'Aucune livraison effectuée'}
            </p>
          </div>
        ) : displayed.map((d) => (
          <div key={d.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                {d.status === 'en_attente' ? '⏳ En attente'
                  : d.status === 'en_cours' ? '🚗 En cours'
                  : d.status === 'livree' ? '✅ Livrée'
                  : '❌ Annulée'}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(d.created_at).toLocaleDateString('fr-BE')}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Appareil</p>
              <p className="font-bold text-[#1B2A4A]">{d.phone?.name || d.phone?.model}</p>
              {d.phone?.imei && (
                <p className="text-xs font-mono text-gray-500 mt-0.5">IMEI : {d.phone.imei}</p>
              )}
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Client</span>
                <span className="text-sm font-medium">{d.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Tél.</span>
                <a href={`tel:${d.customer_phone}`} className="text-sm text-[#00B4CC] font-medium">
                  {d.customer_phone}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-20">Adresse</span>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(d.delivery_address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#00B4CC]"
                >
                  {d.delivery_address}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Créneau</span>
                <span className="text-sm font-medium text-orange-600">
                  {CRENEAU_LABELS[d.creneau] || d.creneau}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Prix</span>
                <span className="text-sm font-bold text-green-600">{d.delivery_price}€</span>
              </div>
            </div>

            {d.status === 'en_attente' && (
              <button
                onClick={() => markInProgress(d.id)}
                className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
              >
                🚗 Démarrer la livraison
              </button>
            )}
            {d.status === 'en_cours' && (
              <button
                onClick={() => markDelivered(d.id)}
                className="w-full py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all"
              >
                ✅ Marquer comme livrée
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
