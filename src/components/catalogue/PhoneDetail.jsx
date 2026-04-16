import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, CheckCircle, Store, Truck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import GradeTag from '../ui/GradeTag';
import Button from '../ui/Button';

const conditionLabel = {
  neuf: 'Neuf',
  reconditionne: 'Reconditionné',
  occasion: 'Occasion',
};

export default function PhoneDetail({ phone, onClose }) {
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState('collect');

  if (!phone) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        {/* Panel */}
        <motion.div
          key="panel"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto"
        >
          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>

          {/* Close button desktop */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <h2 className="font-bold text-[#1B2A4A] text-lg pr-4 leading-tight">{phone.name}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 cursor-pointer">
              <X size={20} className="text-[#555555]" />
            </button>
          </div>

          <div className="px-6 pb-8 flex flex-col gap-5">
            {/* Image */}
            <div className="bg-[#F5F5F5] rounded-2xl flex items-center justify-center py-8">
              <div className="text-[#00B4CC] opacity-30">
                <Smartphone size={100} strokeWidth={0.8} />
              </div>
            </div>

            {/* Infos principales */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GradeTag grade={phone.grade} />
                  <span className="text-xs text-[#555555] uppercase tracking-wide">
                    {conditionLabel[phone.condition]}
                  </span>
                </div>
                <p className="text-3xl font-bold text-[#00B4CC]">{phone.price}€</p>
                <p className="text-sm text-[#555555] mt-0.5">Acompte à la réservation : <strong>50€</strong></p>
              </div>
              <StatusBadge status={phone.status} />
            </div>

            {/* Description */}
            {phone.description && (
              <p className="text-sm text-[#555555] leading-relaxed">{phone.description}</p>
            )}

            {/* Pièces remplacées */}
            {phone.condition === 'reconditionne' && phone.parts?.length > 0 && (
              <div className="bg-[#F5F5F5] rounded-xl p-4">
                <h3 className="font-semibold text-[#1B2A4A] text-sm mb-3">Pièces remplacées / vérifiées</h3>
                <ul className="flex flex-col gap-2">
                  {phone.parts.map((part, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#333333]">
                      <CheckCircle size={16} className="text-[#22C55E] flex-shrink-0" />
                      <span>
                        <strong>{part.name}</strong>
                        {part.type ? ` — ${part.type}` : ''}
                        {part.detail ? ` (${part.detail})` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mode de réception */}
            {phone.status !== 'vendu' && (
              <div>
                <h3 className="font-semibold text-[#1B2A4A] text-sm mb-3">Mode de réception</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDelivery('collect')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                      ${delivery === 'collect'
                        ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                        : 'border-gray-200 text-[#555555] hover:border-[#00B4CC]'}`}
                  >
                    <Store size={24} />
                    <span className="text-sm font-medium">Click & Collect</span>
                    <span className="text-xs opacity-70">Retrait en magasin</span>
                  </button>
                  <button
                    onClick={() => setDelivery('delivery')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                      ${delivery === 'delivery'
                        ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                        : 'border-gray-200 text-[#555555] hover:border-[#00B4CC]'}`}
                  >
                    <Truck size={24} />
                    <span className="text-sm font-medium">Livraison</span>
                    <span className="text-xs opacity-70">À domicile</span>
                  </button>
                </div>
              </div>
            )}

            {/* CTA */}
            {phone.status !== 'vendu' ? (
              <Button
                variant="primary"
                size="full"
                onClick={() => { onClose(); navigate(`/reservation/${phone.id}`); }}
                className="text-base font-bold"
              >
                Réserver — Acompte 50€
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-[#EF4444] font-semibold">Ce téléphone a été vendu</p>
                <p className="text-sm text-[#555555] mt-1">Consultez nos autres offres disponibles</p>
              </div>
            )}

            <Button variant="ghost" size="full" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
