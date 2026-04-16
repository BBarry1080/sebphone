import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

const STORAGES = ['64Go', '128Go', '256Go', '512Go'];
const COLORS_MOCK = [
  { hex: '#1C1C1E' }, { hex: '#F5F5F0' }, { hex: '#C4B69A' },
];

const conditionLabel = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' };

export default function PhoneListCard({ phone, onClick }) {
  const navigate = useNavigate();
  const [activeStorage, setActiveStorage] = useState(0);

  const availableStorages = STORAGES.filter((s) => phone.storage === s || true).slice(0, 3);

  return (
    <div
      onClick={() => onClick?.(phone)}
      className="w-full min-w-0 bg-white border border-gray-200 rounded-xl p-4 hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer flex gap-4 items-start"
    >
      {/* Image */}
      <div className="w-20 h-20 bg-[#F5F5F5] rounded-xl flex items-center justify-center flex-shrink-0">
        {phone.images?.[0] && phone.images[0] !== '/images/placeholder.jpg' ? (
          <img src={phone.images[0]} alt={phone.name} className="object-contain w-full h-full" loading="lazy" />
        ) : (
          <Smartphone size={32} className="text-[#00B4CC] opacity-30" strokeWidth={1} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-[#1B2A4A] text-sm leading-tight line-clamp-2">{phone.name}</p>
            <p className="text-xs text-[#555555] uppercase tracking-wide mt-0.5 truncate">
              {conditionLabel[phone.condition]}
            </p>
          </div>
          <StatusBadge status={phone.status} size="sm" />
        </div>

        {/* Storage pills */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[phone.storage].map((s, i) => (
            <span
              key={s}
              className="px-2 py-0.5 bg-gray-100 text-[#555555] rounded text-[11px] font-medium border border-gray-200"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Color dots */}
        <div className="flex gap-1 mt-2">
          {COLORS_MOCK.slice(0, 3).map((c, i) => (
            <span
              key={i}
              style={{ backgroundColor: c.hex }}
              className="w-3 h-3 rounded-full border border-gray-300"
            />
          ))}
        </div>

        {/* Price */}
        <div className="mt-2">
          <span className="text-xs text-[#555555]">À partir de </span>
          <span className="font-bold text-[#1B2A4A] text-lg">{phone.price}€</span>
        </div>
      </div>
    </div>
  );
}
