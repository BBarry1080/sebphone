import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_cours: 'bg-blue-100 text-blue-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
}

const CRENEAU_LABELS = {
  '8-16': '8h — 16h',
  '16-20': '16h — 20h',
  '20-00': '20h — 00h',
}

export default function Livraisons() {
  const [deliveries, setDeliveries] = useState([])
  const [livreurs, setLivreurs] = useState([])
  const [pendingLivreurs, setPendingLivreurs] = useState([])
  const [tab, setTab] = useState('deliveries')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('admin-livraisons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livreurs' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchAll = async () => {
    const [{ data: d }, { data: l }] = await Promise.all([
      supabase
        .from('deliveries')
        .select('*, phone:phone_id(name, model, imei), livreur:livreur_id(nom, prenom)')
        .order('created_at', { ascending: false }),
      supabase.from('livreurs').select('*').order('created_at', { ascending: false }),
    ])
    setDeliveries(d || [])
    setLivreurs((l || []).filter((x) => x.status === 'approved'))
    setPendingLivreurs((l || []).filter((x) => x.status === 'pending'))
    setLoading(false)
  }

  const assignLivreur = async (deliveryId, livreurId) => {
    await supabase
      .from('deliveries')
      .update({ livreur_id: livreurId, status: 'en_attente' })
      .eq('id', deliveryId)
  }

  const updateLivreurStatus = async (livreurId, status) => {
    await supabase.from('livreurs').update({ status }).eq('id', livreurId)
  }

  const updateDeliveryStatus = async (id, status) => {
    await supabase.from('deliveries').update({ status }).eq('id', id)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Livraisons express</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'deliveries', label: `Courses (${deliveries.length})` },
          { key: 'livreurs', label: `Livreurs actifs (${livreurs.length})` },
          { key: 'pending', label: `Candidatures (${pendingLivreurs.length})`, badge: pendingLivreurs.length },
        ].map((tt) => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === tt.key
                ? 'bg-[#1B2A4A] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tt.label}
            {tt.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {tt.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'deliveries' && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-400 text-center py-8">Chargement...</p>
          ) : deliveries.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucune livraison</p>
          ) : deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {d.status?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(d.created_at).toLocaleString('fr-BE', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="font-bold text-[#1B2A4A]">{d.phone?.name || d.phone?.model}</p>
                  {d.phone?.imei && (
                    <p className="text-xs font-mono text-gray-400">{d.phone.imei}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {d.customer_name} · {d.customer_phone}
                  </p>
                  <p className="text-sm text-gray-500">{d.delivery_address}</p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    {CRENEAU_LABELS[d.creneau] || d.creneau} · {d.delivery_price}€
                  </p>
                  {d.livreur && (
                    <p className="text-xs text-blue-600 mt-1">
                      🚗 {d.livreur.prenom} {d.livreur.nom}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-40">
                  <select
                    value={d.livreur_id || ''}
                    onChange={(e) => assignLivreur(d.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="">Assigner un livreur</option>
                    {livreurs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.prenom} {l.nom}
                      </option>
                    ))}
                  </select>
                  <select
                    value={d.status}
                    onChange={(e) => updateDeliveryStatus(d.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="livree">Livrée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'livreurs' && (
        <div className="grid md:grid-cols-2 gap-3">
          {livreurs.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1B2A4A] rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  {l.prenom?.[0]}{l.nom?.[0]}
                </div>
                <div>
                  <p className="font-bold text-[#1B2A4A]">{l.prenom} {l.nom}</p>
                  <p className="text-xs text-gray-500">{l.email}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                <p>📞 {l.telephone}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Inscrit le {new Date(l.created_at).toLocaleDateString('fr-BE')}
                </p>
                <p className="text-xs font-bold text-green-600 mt-1">
                  {deliveries.filter((d) => d.livreur_id === l.id && d.status === 'livree').length} livraisons effectuées
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Désactiver ${l.prenom} ${l.nom} ?`)) {
                    updateLivreurStatus(l.id, 'rejected')
                  }
                }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Désactiver le compte
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingLivreurs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucune candidature en attente</p>
          ) : pendingLivreurs.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-[#1B2A4A]">{l.prenom} {l.nom}</p>
                  <p className="text-sm text-gray-500">{l.email}</p>
                  <p className="text-sm text-gray-500">{l.telephone}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Candidature du {new Date(l.created_at).toLocaleDateString('fr-BE')}
                  </p>
                  {l.id_card_url && (
                    <a
                      href={l.id_card_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#00B4CC] mt-2 block hover:underline"
                    >
                      📎 Voir la carte d'identité
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateLivreurStatus(l.id, 'approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all"
                  >
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => updateLivreurStatus(l.id, 'rejected')}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-all"
                  >
                    ❌ Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
