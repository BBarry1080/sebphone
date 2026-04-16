import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import StatusBadge from './StatusBadge';
import GradeTag from './GradeTag';
import Button from './Button';

const conditionLabel = {
  neuf: 'NEUF',
  reconditionne: 'RECONDITIONNÉ',
  occasion: 'OCCASION',
};

export default function PhoneCard({ phone, onClick, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.02, borderColor: '#00B4CC' }}
      onClick={() => onClick?.(phone)}
      className="bg-white rounded-2xl border-2 border-transparent hover:border-[#00B4CC] shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Image zone */}
      <div className="relative bg-[#F5F5F5] p-4 flex items-center justify-center min-h-[180px]">
        {/* Badges top */}
        <div className="absolute top-3 left-3 z-10">
          <GradeTag grade={phone.grade} />
        </div>
        <div className="absolute top-3 right-3 z-10">
          <span className={`w-3 h-3 rounded-full inline-block ${
            phone.status === 'disponible' ? 'bg-[#22C55E]' :
            phone.status === 'reserve'    ? 'bg-[#F97316]' :
                                            'bg-[#EF4444]'
          }`} />
        </div>

        {/* Phone image */}
        {phone.images && phone.images[0] && phone.images[0] !== '/images/placeholder.jpg' ? (
          <img
            src={phone.images[0]}
            alt={phone.name}
            loading="lazy"
            className="object-contain w-full h-40"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-[#00B4CC] opacity-40">
            <Smartphone size={72} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Info zone */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div>
          <h3 className="font-bold text-[#1B2A4A] text-sm leading-tight line-clamp-2">{phone.name}</h3>
          <p className="text-xs text-[#555555] uppercase tracking-wide mt-0.5">
            {conditionLabel[phone.condition]}
          </p>
        </div>

        <p className="text-xl font-bold text-[#00B4CC]">{phone.price}€</p>

        <StatusBadge status={phone.status} size="sm" />

        <div className="mt-auto pt-2">
          {phone.status !== 'vendu' ? (
            <Button
              variant="primary"
              size="full"
              onClick={(e) => { e.stopPropagation(); onClick?.(phone); }}
              disabled={phone.status === 'vendu'}
            >
              {phone.status === 'reserve' ? 'Voir le détail' : 'Réserver (Acompte)'}
            </Button>
          ) : (
            <Button variant="ghost" size="full" disabled className="opacity-50 cursor-not-allowed">
              Indisponible
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
