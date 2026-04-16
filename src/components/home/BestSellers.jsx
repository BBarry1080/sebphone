import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { bestSellers as fallbackBestSellers } from '../../data/bestSellers';
import { usePhoneModels } from '../../hooks/usePhoneModels';
import StarRating from '../ui/StarRating';

const MAX_VISIBLE_COLORS = 4;

function ColorDots({ colors, active, onSelect }) {
  const visible = colors.slice(0, MAX_VISIBLE_COLORS);
  const extra = colors.length - MAX_VISIBLE_COLORS;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((c, i) => (
        <button
          key={c.name}
          onClick={(e) => { e.stopPropagation(); onSelect(i); }}
          title={c.name}
          style={{ backgroundColor: c.hex }}
          className={`rounded-full transition-all duration-150 cursor-pointer flex-shrink-0 ${
            active === i
              ? 'w-5 h-5 border-2 border-gray-800 shadow-sm scale-110'
              : 'w-4 h-4 border border-gray-300 hover:scale-110'
          }`}
        />
      ))}
      {extra > 0 && (
        <span className="text-[11px] text-[#555555]">+{extra}</span>
      )}
    </div>
  );
}

function BestSellerCard({ phone }) {
  const [activeColor, setActiveColor] = useState(0);
  const color = phone.colors[activeColor];

  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[240px] bg-white border border-gray-100 rounded-2xl p-4 hover:border-[#00B4CC] hover:shadow-lg transition-all duration-200 flex flex-col gap-3 cursor-pointer">
      {/* Image */}
      <div className="h-44 bg-[#F9F9F9] rounded-xl flex items-center justify-center relative overflow-hidden">
        {color.image ? (
          <img src={color.image} alt={`${phone.name} ${color.name}`} className="object-contain w-full h-full" loading="lazy" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#00B4CC] opacity-30">
            <Smartphone size={56} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="font-poppins font-bold text-[#1B2A4A] text-sm leading-tight">{phone.name}</p>

      {/* Stars */}
      <StarRating rating={phone.rating} count={phone.reviewCount} size={13} />

      {/* Price */}
      <p className="text-sm">
        <span className="text-[#555555]">À partir de </span>
        <span className="font-bold text-[#1B2A4A]">{phone.basePrice}€</span>
      </p>

      {/* Color dots */}
      <ColorDots colors={phone.colors} active={activeColor} onSelect={setActiveColor} />
    </div>
  );
}

function normalizeModel(m) {
  return {
    id: m.id,
    name: m.name,
    brand: m.brand,
    rating: m.rating ?? 4.5,
    reviewCount: m.review_count ?? 0,
    basePrice: m.base_price ?? 0,
    colors: Array.isArray(m.colors) ? m.colors : [{ name: 'Noir', hex: '#1C1C1E', image: '' }],
  };
}

export default function BestSellers() {
  const scrollRef = useRef(null);
  const { models, loading } = usePhoneModels();

  const displayList = models.length > 0
    ? models.slice(0, 6).map(normalizeModel)
    : fallbackBestSellers;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-poppins font-bold text-2xl md:text-3xl text-[#1B2A4A]">
              Les best-sellers.
              <span className="text-[#888888] font-normal"> Ceux que tout le monde s'arrache.</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              className="hidden md:flex w-9 h-9 rounded-full border border-gray-200 items-center justify-center hover:border-[#00B4CC] hover:text-[#00B4CC] transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="hidden md:flex w-9 h-9 rounded-full border border-gray-200 items-center justify-center hover:border-[#00B4CC] hover:text-[#00B4CC] transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
            <Link
              to="/boutique"
              className="flex items-center gap-1 text-sm font-medium text-[#00B4CC] hover:underline whitespace-nowrap"
            >
              Voir tout
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[200px] sm:w-[240px] h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))
            : displayList.map((phone) => (
                <BestSellerCard key={phone.id} phone={phone} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
