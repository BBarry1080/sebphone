import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, MapPin, Calendar, Package, CreditCard, Smartphone } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { ACCESSORY_PACKS } from '../data/accessories'
import { MAGASINS } from '../utils/magasins'
import Spinner from '../components/ui/Spinner'

const STATUS_CONFIG = {
  en_attente:   { label: 'En attente de confirmation', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  acompte_paye: { label: 'Acompte reçu — En cours',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirme:     { label: 'Confirmé par le magasin',    color: 'bg-green-100 text-green-700 border-green-200' },
  recupere:     { label: 'Récupéré — Terminé',         color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  annule:       { label: 'Annulé',                     color: 'bg-red-100 text-red-600 border-red-200' },
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-[#F8F9FA] px-5 py-3 border-b border-gray-100">
        <h2 className="font-poppins font-semibold text-[#1B2A4A] text-sm">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

export default function DetailCommande() {
  const { code }   = useParams()
  const navigate   = useNavigate()
  const [order,    setOrder]   = useState(null)
  const [loading,  setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!code) { setNotFound(true); setLoading(false); return }

    if (!isSupabaseReady) {
      setNotFound(true)
      setLoading(false)
      return
    }

    supabase
      .from('orders')
      .select('*')
      .eq('reservation_code', code.toUpperCase())
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOrder(data)
        else setNotFound(true)
        setLoading(false)
      })
  }, [code])

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20">
        <Spinner message="Chargement de la commande..." />
      </main>
    )
  }

  if (notFound || !order) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Commande introuvable</h1>
        <p className="text-[#555] mb-6">Le code <span className="font-mono font-bold">{code}</span> ne correspond à aucune réservation.</p>
        <button onClick={() => navigate('/mes-reservations')} className="px-6 py-3 bg-[#1B2A4A] text-white font-bold rounded-xl cursor-pointer">
          Mes réservations
        </button>
      </main>
    )
  }

  const phoneName    = order.phone_name || '—'
  const imageUrl     = getPhoneImage(phoneName, order.phone_color)
  const magasin      = order.magasin_id ? MAGASINS[order.magasin_id] : null
  const pack         = ACCESSORY_PACKS.find(p => p.id === order.accessory_pack)
  const remaining    = (order.total_amount || 0) - (order.deposit_amount || 0)
  const statusCfg    = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  const isRecupere   = order.status === 'recupere'

  const fmtDate = (iso, opts = {}) => iso
    ? new Date(iso).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', ...opts })
    : null

  const encaisseDate = order.encaisse_at || order.code_used_at

  return (
    <main className="max-w-xl mx-auto px-4 py-8 pb-28 md:pb-12 space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#555] hover:text-[#1B2A4A] transition-colors cursor-pointer mb-2"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      {/* Titre + code */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Ma commande</h1>
          <p className="text-sm text-[#888] mt-0.5">Code : <span className="font-mono font-bold text-[#1B2A4A] tracking-widest">{order.reservation_code}</span></p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Section 1 — Téléphone + image */}
      <Section title="Téléphone">
        <div className="flex gap-4 items-center">
          <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src={imageUrl}
              alt={phoneName}
              onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
              className="w-full h-full object-contain p-2"
            />
          </div>
          <div className="flex-1">
            <p className="font-poppins font-bold text-[#1B2A4A] text-lg leading-tight">{phoneName}</p>
            <p className="text-sm text-[#555] mt-0.5">
              {[order.phone_color, order.phone_storage].filter(Boolean).join(' · ')}
            </p>
            {order.phone_grade && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-[#1B2A4A]/10 text-[#1B2A4A] rounded-full text-xs font-bold">
                Grade {order.phone_grade}
              </span>
            )}
            {(order.phone_condition === 'neuf' || order.phone_condition === 'reconditionne') && (
              <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle size={11} />
                Garantie {order.phone_condition === 'neuf' ? '12' : '24'} mois SebPhone
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Section 2 — Ce qui a été fait */}
      {(order.phone_condition === 'reconditionne' || order.phone_condition === 'occasion') && (
        <Section title="Ce qui a été fait">
          <ul className="space-y-2">
            {order.phone_condition === 'reconditionne' ? (
              <>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Contrôle complet 72 points</li>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Batterie testée et certifiée</li>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Nettoyage complet</li>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Tests fonctionnels validés</li>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Garantie 24 mois SebPhone</li>
              </>
            ) : (
              <>
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Contrôle complet effectué</li>
                {order.battery_health && <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Batterie : {order.battery_health}%</li>}
                <li className="text-sm text-[#555] flex items-center gap-2"><CheckCircle size={15} className="text-green-500 flex-shrink-0" /> Garantie 6 mois SebPhone</li>
              </>
            )}
          </ul>
        </Section>
      )}

      {/* Section 3 — Paiement */}
      <Section title="Paiement">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#555]">Prix total</span>
            <span className="font-bold text-[#1B2A4A]">{order.total_amount || 0}€</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#555]">Acompte payé</span>
            <span className="font-semibold text-green-600">−{order.deposit_amount || 0}€</span>
          </div>
          {isRecupere ? (
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
              <span className="font-semibold text-[#1B2A4A]">Payé en magasin</span>
              <span className="font-bold text-emerald-700">{remaining}€ ✓</span>
            </div>
          ) : (
            <div className="flex justify-between border-t border-gray-100 pt-2 mt-1">
              <span className="font-semibold text-[#1B2A4A]">Reste à payer en magasin</span>
              <span className="font-bold text-[#1B2A4A]">{remaining}€</span>
            </div>
          )}
          {encaisseDate && (
            <p className="text-xs text-[#888] pt-1">Encaissé le {fmtDate(encaisseDate)}</p>
          )}
        </div>
      </Section>

      {/* Section 4 — Accessoires */}
      {pack && pack.id !== 'none' && pack.items.length > 0 && (
        <Section title="Accessoires inclus">
          <ul className="space-y-2">
            {pack.items.map((item) => (
              <li key={item} className="text-sm text-[#555] flex items-center gap-2">
                <CheckCircle size={15} className="text-[#00B4CC] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#888] mt-2">{pack.label}</p>
        </Section>
      )}

      {/* Section 5 — Magasin / Livraison */}
      <Section title={order.delivery_mode === 'delivery' ? 'Livraison' : 'Magasin de retrait'}>
        {magasin ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1B2A4A] text-sm">{magasin.nom}</p>
                <p className="text-xs text-[#888]">{magasin.adresse}</p>
                {magasin.gmaps && (
                  <a href={magasin.gmaps} target="_blank" rel="noreferrer"
                    className="text-xs text-[#00B4CC] hover:underline">
                    Voir sur Google Maps →
                  </a>
                )}
              </div>
            </div>
            {order.pickup_date && (
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-[#00B4CC] flex-shrink-0" />
                <p className="text-sm text-[#555] capitalize">
                  {isRecupere ? 'Récupéré le ' : 'Passage prévu : '}
                  {fmtDate(isRecupere ? encaisseDate : order.pickup_date, { weekday: 'long' })}
                </p>
              </div>
            )}
          </div>
        ) : order.delivery_address ? (
          <div className="flex items-start gap-2">
            <MapPin size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#555]">{order.delivery_address}</p>
          </div>
        ) : (
          <p className="text-sm text-[#888]">—</p>
        )}
      </Section>

      {/* Bouton retour */}
      <button
        onClick={() => navigate('/mes-reservations')}
        className="w-full py-3 border-2 border-[#1B2A4A] text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white font-bold rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
      >
        <Smartphone size={16} />
        Toutes mes réservations
      </button>
    </main>
  )
}
