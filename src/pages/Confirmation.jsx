import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, MapPin, Calendar, Home, Smartphone } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { sendConfirmationEmail } from '../utils/sendEmail'
import { MAGASINS } from '../utils/magasins'
import { ACCESSORY_PACKS } from '../data/accessories'

export default function Confirmation() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()

  // Données affichées (soit depuis state navigate, soit depuis DB après Stripe)
  const [data, setData]       = useState(state || null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Si retour Stripe Checkout, ?code=XXX est dans l'URL
  const code      = searchParams.get('code')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (state?.reservationCode) return            // déjà reçu via navigate
    if (!code) { setNotFound(true); return }       // ni state ni code → 404
    if (!isSupabaseReady) { setNotFound(true); return }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('reservation_code', code)
        .maybeSingle()

      if (cancelled) return
      if (error || !order) { setNotFound(true); setLoading(false); return }

      // Met à jour le statut une seule fois (idempotent)
      if (order.status === 'en_attente') {
        await supabase.from('orders')
          .update({ status: 'acompte_paye' })
          .eq('reservation_code', code)
        if (order.phone_id) {
          await supabase.from('phones')
            .update({ status: 'reserve' })
            .eq('id', order.phone_id)
        }

        // Envoie l'email une seule fois
        const packLabel = ACCESSORY_PACKS.find((p) => p.id === order.accessory_pack)?.label || 'Aucun'
        await sendConfirmationEmail({
          clientEmail:      order.customer_email,
          clientName:       order.customer_name,
          phoneName:        order.phone_name,
          phoneColor:       order.phone_color,
          phoneStorage:     order.phone_storage,
          grade:            order.phone_grade,
          price:            order.total_amount,
          depositPaid:      order.deposit_amount,
          reservationCode:  order.reservation_code,
          pickupMode:       order.delivery_mode,
          magasinId:        order.magasin_id,
          pickupDate:       order.pickup_date,
          deliveryAddress:  order.delivery_address,
          accessoryPack:    order.accessory_pack ? packLabel : 'Aucun',
          batteryReplace:   !!order.battery_replace,
          accessoriesTotal: order.accessories_total || 0,
        })
      }

      setData({
        reservationCode: order.reservation_code,
        clientName:      order.customer_name,
        clientEmail:     order.customer_email,
        phoneName:       order.phone_name,
        phoneColor:      order.phone_color,
        phoneStorage:    order.phone_storage,
        grade:           order.phone_grade,
        totalPrice:      order.total_amount,
        depositPaid:     order.deposit_amount,
        remaining:       (order.total_amount || 0) - (order.deposit_amount || 0),
        delivery:        order.delivery_mode,
        magasinId:       order.magasin_id,
        magasinInfo:     MAGASINS[order.magasin_id] || null,
        pickupDate:      order.pickup_date,
        deliveryAddress: order.delivery_address,
      })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#00B4CC] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#555]">Confirmation de votre paiement...</p>
      </main>
    )
  }

  if (notFound || !data?.reservationCode) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Page introuvable</h1>
        <p className="text-[#555] mb-6">Aucune réservation à afficher.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#1B2A4A] text-white font-bold rounded-xl cursor-pointer">
          Retour à l'accueil
        </button>
      </main>
    )
  }

  const {
    reservationCode, clientName, clientEmail,
    phoneName, phoneColor, phoneStorage, grade,
    totalPrice, depositPaid, remaining,
    delivery, magasinInfo, pickupDate, deliveryAddress,
  } = data

  const pickupDateFormatted = pickupDate
    ? new Date(pickupDate).toLocaleDateString('fr-BE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <main className="max-w-xl mx-auto px-4 py-10 pb-28 md:pb-12">

      {/* Header succès */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4 animate-[scale-in_0.4s_ease-out]">
          <CheckCircle size={44} className="text-green-500" />
        </div>
        <h1 className="font-poppins font-bold text-3xl text-[#1B2A4A] mb-1">Réservation confirmée !</h1>
        <p className="text-[#555] text-sm">
          Un email de confirmation a été envoyé à{' '}
          <span className="font-semibold text-[#1B2A4A]">{clientEmail}</span>
        </p>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-left">
          <p className="font-semibold text-yellow-800 mb-2">
            📧 Vous n'avez pas reçu l'email ?
          </p>
          <ol className="text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Vérifiez votre boite de réception</li>
            <li>
              <span className="text-red-600 font-bold">
                Vérifiez vos SPAMS / Indésirables
              </span>
            </li>
            <li className="text-green-700 font-medium">
              Si l'email est dans les spams → cliquez sur "Pas du spam" ou "Ce n'est pas un indésirable" pour nous ajouter à vos contacts de confiance ✅
            </li>
          </ol>
        </div>
      </div>

      {/* Code de réservation */}
      <div className="bg-white border-2 border-[#00B4CC] rounded-2xl p-6 mb-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[#555] mb-3">
          Votre code de réservation
        </p>
        <div className="flex items-center justify-center gap-1 mb-3">
          {reservationCode.split('').map((char, i) => (
            <span
              key={i}
              className="w-11 h-14 flex items-center justify-center bg-[#F0FBFD] border-2 border-[#00B4CC] rounded-xl font-poppins font-bold text-2xl text-[#00B4CC]"
            >
              {char}
            </span>
          ))}
        </div>
        <p className="text-xs text-[#888]">Présentez ce code en magasin lors du retrait</p>
      </div>

      {/* Récapitulatif */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="bg-[#F8F9FA] px-5 py-3 border-b border-gray-100">
          <h2 className="font-poppins font-semibold text-[#1B2A4A] text-sm">Récapitulatif de la commande</h2>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          {/* Téléphone */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-[#1B2A4A]">{phoneName}</p>
              <p className="text-xs text-[#888]">
                {[phoneColor, phoneStorage, grade ? `Grade ${grade}` : ''].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="font-bold text-[#1B2A4A]">{totalPrice}€</span>
          </div>

          <hr className="border-gray-100" />

          {/* Paiement */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[#555]">
              <span>Acompte payé</span>
              <span className="font-semibold text-green-600">−{depositPaid}€</span>
            </div>
            <div className="flex justify-between text-xs text-[#555]">
              <span>Reste à payer en magasin</span>
              <span className="font-semibold text-[#1B2A4A]">{remaining}€</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Mode retrait */}
          {delivery === 'collect' ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1B2A4A]">{magasinInfo?.nom}</p>
                  <p className="text-xs text-[#888]">{magasinInfo?.adresse}</p>
                  {magasinInfo?.gmaps && (
                    <a href={magasinInfo.gmaps} target="_blank" rel="noreferrer"
                      className="text-xs text-[#00B4CC] hover:underline">
                      Voir sur Google Maps →
                    </a>
                  )}
                </div>
              </div>
              {pickupDateFormatted && (
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-[#00B4CC] flex-shrink-0" />
                  <div>
                    <span className="text-xs text-[#555]">Date de passage : </span>
                    <span className="text-xs font-semibold text-[#1B2A4A] capitalize">{pickupDateFormatted}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Home size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1B2A4A] text-xs">Livraison à domicile</p>
                <p className="text-xs text-[#888]">{deliveryAddress}</p>
              </div>
            </div>
          )}

          {/* Client */}
          <hr className="border-gray-100" />
          <p className="text-xs text-[#888]">
            Réservé par <span className="font-semibold text-[#1B2A4A]">{clientName}</span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold rounded-xl transition-colors cursor-pointer text-sm"
        >
          Retour à l'accueil
        </button>
        <button
          onClick={() => navigate('/boutique')}
          className="w-full py-3 border-2 border-[#00B4CC] text-[#00B4CC] hover:bg-cyan-50 font-bold rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2"
        >
          <Smartphone size={16} />
          Voir d'autres téléphones
        </button>
      </div>
    </main>
  )
}
