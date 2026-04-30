import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Store, Truck, CreditCard, Package, CheckCircle, Calendar, Wrench, Tag, X, BatteryCharging } from 'lucide-react';
import Button from '../ui/Button';
import { ACCESSORY_PACKS } from '../../data/accessories';
import { MAGASINS, MAGASINS_LIST } from '../../utils/magasins';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { sendConfirmationEmail } from '../../utils/sendEmail';
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function ReservationForm({ phone }) {
  const navigate = useNavigate()

  // Parse magasins — Supabase peut renvoyer un tableau ou une string JSON
  const phoneShops = (() => {
    const raw = phone?.magasins
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return [] }
    }
    return []
  })()

  const availableMagasins = phoneShops.length > 0
    ? MAGASINS_LIST.filter((m) => phoneShops.includes(m.id))
    : MAGASINS_LIST

  console.log('phone.magasins reçu:', phone?.magasins)
  console.log('phoneShops parsé:', phoneShops)
  console.log('availableMagasins calculé:', availableMagasins)

  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    email:      '',
    phone:      '',
    delivery:   'collect',
    magasin:    phoneShops[0] || MAGASINS_LIST[0].id,
    address:    '',
    pickupDate: '',
    notes:      '',
  });
  const [selectedPack, setSelectedPack] = useState('none');
  const [paymentMode,  setPaymentMode]  = useState('acompte');
  const [batteryReplace, setBatteryReplace] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [promoInput,   setPromoInput]  = useState('');
  const [promoCode,    setPromoCode]   = useState(null);
  const [promoError,   setPromoError]  = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    if (phoneShops[0]) {
      setForm((prev) => ({ ...prev, magasin: phoneShops[0] }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone?.id])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const packPrice    = ACCESSORY_PACKS.find((p) => p.id === selectedPack)?.price || 0;
  const batteryEligible = phone?.battery_health != null && phone.battery_health <= 80;
  const batteryPrice = batteryReplace && batteryEligible ? 20 : 0;
  const basePrice    = (phone?.price || 0) + packPrice + batteryPrice;
  const discount   = promoCode
    ? promoCode.type === 'percent'
      ? Math.round(basePrice * promoCode.value / 100)
      : promoCode.value
    : 0
  const totalPrice  = Math.max(0, basePrice - discount);
  const depositPaid = paymentMode === 'total' ? totalPrice : 50;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) return
    setPromoError('')
    setPromoLoading(true)
    setPromoCode(null)

    if (!isSupabaseReady) {
      setPromoError('Service indisponible.')
      setPromoLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    setPromoLoading(false)

    if (error || !data) { setPromoError('Code invalide ou expiré.'); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError('Ce code a expiré.'); return }
    if (data.max_uses && data.uses_count >= data.max_uses) { setPromoError('Ce code a atteint sa limite d\'utilisation.'); return }
    if (data.min_order && basePrice < data.min_order) { setPromoError(`Commande minimum de ${data.min_order}€ requis.`); return }

    setPromoCode(data)
    setPromoError('')
  }

  const removePromo = () => {
    setPromoCode(null)
    setPromoInput('')
    setPromoError('')
  }

  const handleStripeCheckout = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setSubmitError('Remplissez tous les champs obligatoires')
      return
    }
    if (form.delivery === 'delivery' && !form.address) {
      setSubmitError('Renseignez votre adresse de livraison')
      return
    }

    setLoading(true)
    setSubmitError(null)

    try {
      const reservationCode = generateCode()
      const clientName = `${form.firstName} ${form.lastName}`.trim()
      const magasinFinal = availableMagasins.length === 1
        ? availableMagasins[0].id
        : form.magasin

      const amountToPay = paymentMode === 'acompte' ? 50 : totalPrice

      // 1. Sauvegarde la réservation en DB avec status 'en_attente'
      if (isSupabaseReady && supabase) {
        const orderData = {
          customer_name:    clientName,
          customer_email:   form.email,
          customer_phone:   form.phone,
          phone_id:         phone?.id || null,
          phone_name:       phone?.name || phone?.model || '',
          phone_storage:    phone?.storage || '',
          phone_color:      phone?.color || '',
          phone_grade:      phone?.grade || '',
          delivery_mode:    form.delivery,
          magasin_id:       form.delivery === 'collect' ? magasinFinal : null,
          delivery_address: form.delivery === 'delivery' ? form.address : null,
          pickup_date:      form.delivery === 'collect' && form.pickupDate ? form.pickupDate : null,
          payment_mode:     paymentMode,
          total_amount:     totalPrice,
          deposit_amount:   amountToPay,
          notes:            form.notes || null,
          reservation_code: reservationCode,
          status:           'en_attente',
          accessory_pack:   selectedPack !== 'none' ? selectedPack : null,
          accessories_total: packPrice + batteryPrice,
          battery_replace:  batteryReplace && batteryEligible,
          promo_code:       promoCode?.code || null,
          discount_amount:  discount || 0,
        }

        const { error: insertError } = await supabase.from('orders').insert([orderData])
        if (insertError) {
          console.error('Erreur insert order:', insertError)
          throw new Error('Impossible de créer la réservation : ' + insertError.message)
        }
      }

      // 2. Crée la session Stripe Checkout
      console.log('Création de la session Stripe Checkout...', { paymentMode, amountToPay })
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneId:         phone?.id,
          phoneName:       phone?.name || phone?.model,
          phoneColor:      phone?.color,
          phoneStorage:    phone?.storage,
          clientName,
          clientEmail:     form.email,
          amount:          amountToPay,
          totalPrice,
          paymentMode,
          reservationCode,
          magasinNom:      MAGASINS[magasinFinal]?.nom || magasinFinal,
        })
      })

      const { url, error } = await res.json()
      if (error) throw new Error(error)
      if (!url) throw new Error('URL de paiement manquante')

      // 3. Redirige vers Stripe Checkout
      console.log('Redirection vers Stripe Checkout:', url)
      window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
      setSubmitError('Erreur : ' + err.message)
      setLoading(false)
    }
  }

  const submitReservation = async (paymentIntent) => {
    console.log('1. Début soumission', paymentIntent ? '(après paiement Stripe)' : '');
    setLoading(true);
    setSubmitError(null);

    const magasinFinal = availableMagasins.length === 1
      ? availableMagasins[0].id
      : form.magasin

    const reservationCode = generateCode();
    const clientName = `${form.firstName} ${form.lastName}`.trim();
    console.log('2. formData:', { ...form, magasinFinal, reservationCode, clientName, totalPrice, depositPaid });

    try {
      if (isSupabaseReady && supabase) {
        const orderData = {
          customer_name:    clientName,
          customer_email:   form.email,
          customer_phone:   form.phone,
          phone_id:         phone?.id || null,
          phone_name:       phone?.name || phone?.model || '',
          phone_storage:    phone?.storage || '',
          phone_color:      phone?.color || '',
          phone_grade:      phone?.grade || '',
          delivery_mode:    form.delivery,
          magasin_id:       form.delivery === 'collect' ? magasinFinal : null,
          delivery_address: form.delivery === 'delivery' ? form.address : null,
          pickup_date:      form.delivery === 'collect' && form.pickupDate ? form.pickupDate : null,
          payment_mode:     paymentMode,
          total_amount:     totalPrice,
          deposit_amount:   depositPaid,
          notes:            form.notes || null,
          reservation_code: reservationCode,
          status:           paymentIntent ? 'acompte_paye' : 'en_attente',
          accessory_pack:   selectedPack !== 'none' ? selectedPack : null,
          battery_replace:  batteryReplace && batteryEligible,
          promo_code:       promoCode?.code || null,
          discount_amount:  discount || null,
          payment_intent_id: paymentIntent?.id || null,
        }

        console.log('3. Validation OK');
        console.log('4. Tentative insert Supabase...', orderData);

        const { data, error } = await supabase.from('orders').insert([orderData]).select().maybeSingle()
        console.log('5. Résultat insert:', data, error);

        if (error) {
          console.error('6. ERREUR INSERT:', error)
          setSubmitError('Erreur lors de la réservation : ' + error.message)
          setLoading(false)
          return
        }

        console.log('7. Insert OK, mise à jour téléphone...');
        await supabase.from('phones').update({ status: 'reserve' }).eq('id', phone.id)
        if (promoCode?.id) {
          await supabase.from('promo_codes').update({ uses_count: (promoCode.uses_count || 0) + 1 }).eq('id', promoCode.id)
        }
      } else {
        console.log('3. Supabase non disponible — mode offline');
      }

      console.log('8. Envoi email...');
      const packLabel = ACCESSORY_PACKS.find((p) => p.id === selectedPack)?.label || 'Aucun'
      const emailResult = await sendConfirmationEmail({
        clientEmail:      form.email,
        clientName,
        phoneName:        phone?.name || phone?.model || '',
        phoneColor:       phone?.color || '',
        phoneStorage:     phone?.storage || '',
        grade:            phone?.grade || '',
        price:            totalPrice,
        depositPaid,
        reservationCode,
        pickupMode:       form.delivery,
        magasinId:        magasinFinal,
        pickupDate:       form.pickupDate,
        deliveryAddress:  form.address,
        accessoryPack:    selectedPack !== 'none' ? packLabel : 'Aucun',
        batteryReplace:   batteryReplace && batteryEligible,
        accessoriesTotal: packPrice + batteryPrice,
      })
      console.log('9. Email result:', emailResult)

      console.log('10. Redirection vers /confirmation...');
      navigate('/confirmation', {
        state: {
          reservationCode,
          clientName,
          clientEmail:    form.email,
          phoneName:      phone?.name || phone?.model || '',
          phoneColor:     phone?.color || '',
          phoneStorage:   phone?.storage || '',
          grade:          phone?.grade || '',
          totalPrice,
          depositPaid,
          remaining:      totalPrice - depositPaid,
          delivery:       form.delivery,
          magasinId:      magasinFinal,
          magasinInfo:    MAGASINS[magasinFinal] || null,
          pickupDate:     form.pickupDate,
          deliveryAddress: form.address,
        }
      })
    } catch (err) {
      console.error('❌ CATCH submitReservation:', err)
      setSubmitError('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleStripeCheckout();
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      {/* Résumé téléphone */}
      {(() => {
        const imgSrc = getPhoneImage(phone?.name || phone?.model, phone?.color)
        const conditionLabel = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
        const conditionStyle = {
          neuf:          'bg-blue-50 text-blue-700 border-blue-200',
          reconditionne: 'bg-cyan-50 text-[#00B4CC] border-cyan-200',
          occasion:      'bg-orange-50 text-orange-600 border-orange-200',
        }
        const battery = phone?.battery_health
        const batteryColor = battery >= 85 ? 'bg-green-400' : battery >= 75 ? 'bg-orange-400' : 'bg-red-400'
        const batteryText  = battery >= 85 ? 'text-green-700' : battery >= 75 ? 'text-orange-600' : 'text-red-600'
        const parts = phone?.parts || []
        const partsText = parts.length > 0 ? parts.map((p) => p.part_type).join(', ') : null

        return (
          <div className="bg-[#F5F5F5] rounded-2xl p-4 flex gap-4">
            {/* Photo */}
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={imgSrc}
                alt={phone?.name || phone?.model}
                className="w-full h-full object-contain p-2"
                onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
              />
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#1B2A4A] text-sm leading-tight mb-1.5">{phone?.name || phone?.model}</p>

              {/* Badges : condition + grade */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {phone?.condition && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${conditionStyle[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {conditionLabel[phone.condition] || phone.condition}
                  </span>
                )}
                {phone?.grade && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                    {phone.grade}
                  </span>
                )}
                {phone?.storage && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                    {phone.storage}
                  </span>
                )}
                {phone?.color && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                    {phone.color}
                  </span>
                )}
              </div>

              {/* Batterie */}
              {battery && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] text-gray-500">Batterie</span>
                  <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${batteryColor} rounded-full`} style={{ width: `${battery}%` }} />
                  </div>
                  <span className={`text-[10px] font-semibold ${batteryText}`}>{battery}%</span>
                </div>
              )}

              {/* Pièces remplacées */}
              {partsText && (
                <div className="flex items-start gap-1 mb-1.5">
                  <Wrench size={10} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] text-[#555]">{partsText}</span>
                </div>
              )}
              {phone?.condition === 'reconditionne' && !partsText && (
                <p className="text-[10px] text-[#555] mb-1.5">Aucune réparation — État original</p>
              )}

              {/* Prix */}
              <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                {discount > 0 && (
                  <span className="text-xs text-gray-400 line-through">{basePrice}€</span>
                )}
                <span className="font-bold text-[#00B4CC] text-base">{totalPrice}€</span>
                {discount > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold">-{discount}€</span>
                )}
                {(packPrice > 0 || batteryPrice > 0) && !discount && (
                  <span className="text-[10px] text-[#555]">
                    {packPrice > 0 && `pack +${packPrice}€`}
                    {packPrice > 0 && batteryPrice > 0 && ' · '}
                    {batteryPrice > 0 && `batterie +${batteryPrice}€`}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#555555]">Acompte à la réservation : <strong>50€</strong></p>
            </div>
          </div>
        )
      })()}

      {/* Infos personnelles */}
      <div>
        <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-4 flex items-center gap-2">
          <User size={18} className="text-[#00B4CC]" />
          Vos informations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Prénom *</label>
            <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Jean" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Nom *</label>
            <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Dupont" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
              <span className="flex items-center gap-1"><Mail size={13} /> Email *</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="jean@exemple.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
              <span className="flex items-center gap-1"><Phone size={13} /> Téléphone *</span>
            </label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="+32 XXX XX XX XX" />
          </div>
        </div>
      </div>

      {/* Mode de réception */}
      <div>
        <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-[#00B4CC]" />
          Mode de réception
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: 'collect',  Icon: Store, label: 'Click & Collect', sub: 'Retrait en magasin' },
            { value: 'delivery', Icon: Truck, label: 'Livraison',        sub: 'À domicile' },
          ].map(({ value, Icon, label, sub }) => (
            <button key={value} type="button"
              onClick={() => setForm((p) => ({ ...p, delivery: value }))}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                ${form.delivery === value
                  ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                  : 'border-gray-200 text-[#555555] hover:border-[#00B4CC]'}`}
            >
              <Icon size={22} />
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs opacity-70">{sub}</span>
            </button>
          ))}
        </div>

        {form.delivery === 'collect' && (
          <div className="flex flex-col gap-3 mt-1">
            {availableMagasins.length === 1 ? (
              <div>
                <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
                  Magasin de retrait
                </label>
                <div className="flex items-start gap-3 bg-cyan-50 border-2 border-[#00B4CC] rounded-xl p-4">
                  <MapPin size={18} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#1B2A4A] text-sm">
                      {MAGASINS[availableMagasins[0].id]?.nom}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {MAGASINS[availableMagasins[0].id]?.adresse}
                    </p>
                    <p className="text-xs text-[#00B4CC] mt-1 font-medium">
                      ✓ Ce téléphone est uniquement disponible ici
                    </p>
                  </div>
                </div>
                <input type="hidden" name="magasin" value={availableMagasins[0].id} />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
                  <span className="flex items-center gap-1"><Store size={13} /> Choisir le magasin de retrait *</span>
                </label>
                <select name="magasin" value={form.magasin} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all bg-white">
                  {availableMagasins.map((m) => (
                    <option key={m.id} value={m.id}>{MAGASINS[m.id]?.nom}</option>
                  ))}
                </select>
                {form.magasin && MAGASINS[form.magasin] && (
                  <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 mt-2">
                    <MapPin size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#1B2A4A]">{MAGASINS[form.magasin]?.nom}</p>
                      <p className="text-xs text-gray-400">{MAGASINS[form.magasin]?.adresse}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
                <span className="flex items-center gap-1"><Calendar size={13} /> Date de passage souhaitée</span>
              </label>
              <input
                type="date"
                name="pickupDate"
                value={form.pickupDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              />
            </div>
          </div>
        )}

        {form.delivery === 'delivery' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }}>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Adresse de livraison *</label>
            <input type="text" name="address" value={form.address} onChange={handleChange}
              required={form.delivery === 'delivery'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Rue, numéro, ville, code postal" />
          </motion.div>
        )}
      </div>

      {/* Packs accessoires */}
      <div>
        <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-4 flex items-center gap-2">
          <Package size={18} className="text-[#00B4CC]" />
          Pack accessoires
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {ACCESSORY_PACKS.map((pack) => (
            <div key={pack.id} className="relative">
              {pack.id === 'recommande' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00B4CC] text-white text-xs font-bold px-4 py-1 rounded-full z-10 whitespace-nowrap">
                  ⭐ Le plus populaire
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedPack(pack.id)}
                className={`w-full flex flex-col items-start text-left p-4 border-2 rounded-xl transition-all cursor-pointer ${
                  selectedPack === pack.id ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]/50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="font-semibold text-sm text-[#1B2A4A]">{pack.label}</span>
                  {pack.price === 0 ? (
                    <span className="text-lg font-bold text-gray-400">Gratuit</span>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-gray-400 line-through">+{pack.originalPrice}€</span>
                      <span className="text-lg font-bold text-[#00B4CC]">+{pack.price}€</span>
                    </div>
                  )}
                </div>
                {pack.items.length > 0 ? (
                  <ul className="space-y-1">
                    {pack.items.map((item) => (
                      <li key={item} className="flex items-center gap-1.5 text-xs text-[#555]">
                        <CheckCircle size={11} className="text-[#00B4CC] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#888]">Aucun accessoire</p>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Option batterie neuve */}
      {batteryEligible && (
        <div>
          <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-3 flex items-center gap-2">
            <BatteryCharging size={18} className="text-[#00B4CC]" />
            Option batterie neuve
          </h3>
          <button
            type="button"
            onClick={() => setBatteryReplace(!batteryReplace)}
            className={`w-full flex items-start gap-3 p-4 border-2 rounded-xl text-left transition-all cursor-pointer ${
              batteryReplace ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]/50'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              batteryReplace ? 'bg-[#00B4CC] border-[#00B4CC]' : 'border-gray-300'
            }`}>
              {batteryReplace && <CheckCircle size={14} className="text-white" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-[#1B2A4A]">Remplacer par une batterie neuve à 100%</p>
                <span className="text-lg font-bold text-[#00B4CC]">+20€</span>
              </div>
              <p className="text-xs text-[#555]">
                La batterie actuelle est à <strong>{phone.battery_health}%</strong>. Pour 20€, on la remplace par une batterie neuve à 100% avant la remise du téléphone.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Code promo */}
      <div>
        <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-3 flex items-center gap-2">
          <Tag size={18} className="text-[#00B4CC]" />
          Code promo
        </h3>
        {promoCode ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-bold text-green-700 font-mono">{promoCode.code}</p>
              <p className="text-xs text-green-600">
                {promoCode.type === 'percent'
                  ? `-${promoCode.value}% → -${discount}€`
                  : `-${promoCode.value}€`}
              </p>
            </div>
            <button type="button" onClick={removePromo} className="p-1 text-green-600 hover:text-red-500 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
              placeholder="Entrez votre code promo"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all font-mono uppercase"
            />
            <button
              type="button"
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim()}
              className="px-5 py-3 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {promoLoading ? '…' : 'Appliquer'}
            </button>
          </div>
        )}
        {promoError && <p className="text-xs text-red-500 mt-2">{promoError}</p>}
      </div>

      {/* Mode de paiement */}
      <div>
        <h3 className="font-poppins font-semibold text-[#1B2A4A] mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-[#00B4CC]" />
          Mode de paiement
        </h3>
        <div
          onClick={() => setPaymentMode('acompte')}
          className={`border-2 rounded-xl p-4 mb-3 cursor-pointer transition-all ${
            paymentMode === 'acompte' ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]/50'
          }`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold text-[#1B2A4A] text-sm">Réserver avec acompte</p>
              <p className="text-xs text-gray-500 mt-0.5">Payez 50€ maintenant pour bloquer le téléphone. Le reste est réglé en magasin.</p>
              <p className="text-xs text-orange-500 mt-1">⚠️ L'acompte n'est pas remboursable</p>
            </div>
            <span className="font-bold text-[#00B4CC] text-xl flex-shrink-0">50€</span>
          </div>
        </div>
        <div
          onClick={() => setPaymentMode('total')}
          className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
            paymentMode === 'total' ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]/50'
          }`}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold text-[#1B2A4A] text-sm">Payer le montant total</p>
              <p className="text-xs text-gray-500 mt-0.5">Réglez la totalité maintenant. Récupération en magasin ou livraison.</p>
            </div>
            <span className="font-bold text-[#1B2A4A] text-xl flex-shrink-0">{totalPrice}€</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Notes (optionnel)</label>
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all resize-none"
          placeholder="Informations complémentaires, questions..." />
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleStripeCheckout}
        disabled={loading}
        className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-white rounded-xl py-4 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            Préparation du paiement...
          </span>
        ) : paymentMode === 'acompte' ? (
          '🔒 Réserver et payer 50€'
        ) : (
          `🔒 Payer ${totalPrice}€ maintenant`
        )}
      </button>
    </motion.form>
  );
}
