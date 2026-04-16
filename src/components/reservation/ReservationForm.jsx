import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Store, Truck, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import ConfirmationCard from './ConfirmationCard';

export default function ReservationForm({ phone }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    delivery: 'collect',
    address: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return <ConfirmationCard phone={phone} form={form} />;
  }

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
        <div>
          <p className="font-semibold text-[#1B2A4A] text-sm">{phone?.name}</p>
          <p className="text-[#00B4CC] font-bold">{phone?.price}€</p>
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
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Jean"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Nom *</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
              <span className="flex items-center gap-1"><Mail size={13} /> Email *</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="jean@exemple.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">
              <span className="flex items-center gap-1"><Phone size={13} /> Téléphone *</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="+32 XXX XX XX XX"
            />
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
            { value: 'collect', Icon: Store, label: 'Click & Collect', sub: 'Retrait en magasin' },
            { value: 'delivery', Icon: Truck, label: 'Livraison', sub: 'À domicile' },
          ].map(({ value, Icon, label, sub }) => (
            <button
              key={value}
              type="button"
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

        {form.delivery === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Adresse de livraison *</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              required={form.delivery === 'delivery'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
              placeholder="Rue, numéro, ville, code postal"
            />
          </motion.div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Notes (optionnel)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all resize-none"
          placeholder="Informations complémentaires, questions..."
        />
      </div>

      {/* Info paiement */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Information acompte</p>
        <p>Un acompte de <strong>50€</strong> sera demandé pour confirmer la réservation. Le reste sera réglé à la remise du téléphone.</p>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="full"
        disabled={loading}
        className="text-base font-bold"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Envoi en cours...
          </span>
        ) : (
          'Confirmer la réservation — Acompte 50€'
        )}
      </Button>
    </motion.form>
  );
}
