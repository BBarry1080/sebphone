import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Store, Truck, CreditCard, Package, CheckCircle, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import { ACCESSORY_PACKS } from '../../data/accessories';
import { MAGASINS, MAGASINS_LIST } from '../../utils/magasins';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { sendConfirmationEmail } from '../../utils/sendEmail';

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
  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    email:      '',
    phone:      '',
    delivery:   'collect',
    magasin:    MAGASINS_LIST[0].id,
    address:    '',
    pickupDate: '',
    notes:      '',
  });
  const [selectedPack, setSelectedPack] = useState('none');
  const [paymentMode,  setPaymentMode]  = useState('acompte');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const packPrice  = ACCESSORY_PACKS.find((p) => p.id === selectedPack)?.price || 0;
  const totalPrice = (phone?.price || 0) + packPrice;
  const depositPaid = paymentMode === 'total' ? totalPrice : 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('1. Début soumission');
    setLoading(true);
    setSubmitError(null);

    const reservationCode = generateCode();
    const clientName = `${form.firstName} ${form.lastName}`.trim();
    console.log('2. formData:', { ...form, reservationCode, clientName, totalPrice, depositPaid });

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
          magasin_id:       form.delivery === 'collect' ? form.magasin : null,
          delivery_address: form.delivery === 'delivery' ? form.address : null,
          pickup_date:      form.delivery === 'collect' && form.pickupDate ? form.pickupDate : null,
          payment_mode:     paymentMode,
          total_amount:     totalPrice,
          deposit_amount:   depositPaid,
          notes:            form.notes || null,
          reservation_code: reservationCode,
          status:           'en_attente',
          accessory_pack:   selectedPack !== 'none' ? selectedPack : null,
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
      } else {
        console.log('3. Supabase non disponible — mode offline');
      }

      console.log('8. Envoi email...');
      const emailResult = await sendConfirmationEmail({
        clientEmail:     form.email,
        clientName,
        phoneName:       phone?.name || phone?.model || '',
        phoneColor:      phone?.color || '',
        phoneStorage:    phone?.storage || '',
        grade:           phone?.grade || '',
        price:           totalPrice,
        depositPaid,
        reservationCode,
        pickupMode:      form.delivery,
        magasinId:       form.magasin,
        pickupDate:      form.pickupDate,
        deliveryAddress: form.address,
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
          magasinId:      form.magasin,
          magasinInfo:    MAGASINS[form.magasin] || null,
          pickupDate:     form.pickupDate,
          deliveryAddress: form.address,
        }
      })
    } catch (err) {
      console.error('❌ CATCH handleSubmit:', err)
      setSubmitError('Une erreur est survenue. Veuillez réessayer.')
      setLoading(false)
    }
  };

  const selectedMagasin = MAGASINS[form.magasin];

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      {/* Résumé téléphone */}
      <div className="bg-[#F5F5F5] rounded-2xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-[#00B4CC] flex-shrink-0">
          <CreditCard size={24} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[#1B2A4A] text-sm">{phone?.name || phone?.model}</p>
          {packPrice > 0 && (
            <p className="text-xs text-[#555]">{ACCESSORY_PACKS.find((p) => p.id === selectedPack)?.label} +{packPrice}€</p>
          )}
          <p className="text-[#00B4CC] font-bold">{totalPrice}€</p>
          <p className="text-xs text-[#555555]">Acompte à la réservation : <strong>50€</strong></p>
        </div>
      </div>

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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.3 }} className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
                <span className="flex items-center gap-1"><Store size={13} /> Choisir le magasin *</span>
              </label>
              <select name="magasin" value={form.magasin} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all bg-white">
                {MAGASINS_LIST.map((m) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>
            {selectedMagasin && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                <MapPin size={15} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#1B2A4A]">{selectedMagasin.nom}</p>
                  <p className="text-xs text-gray-400">{selectedMagasin.adresse}</p>
                  <p className="text-xs text-gray-400">{selectedMagasin.tel}</p>
                </div>
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
          </motion.div>
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
                  <span className={`text-lg font-bold ${pack.price === 0 ? 'text-gray-400' : 'text-[#1B2A4A]'}`}>
                    {pack.price === 0 ? 'Gratuit' : `+${pack.price}€`}
                  </span>
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

      <Button type="submit" variant="primary" size="full" disabled={loading} className="text-base font-bold">
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Envoi en cours...
          </span>
        ) : paymentMode === 'acompte'
          ? 'Réserver et payer 50€'
          : `Payer ${totalPrice}€ maintenant`
        }
      </Button>
    </motion.form>
  );
}
