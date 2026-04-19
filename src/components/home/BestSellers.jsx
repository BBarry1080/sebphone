import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { phonesMock } from '../../data/phonesMock';
import StarRating from '../ui/StarRating';
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage';

const COLOR_HEX = {
  'noir': '#1C1C1E', 'minuit': '#1C1C1E', 'black': '#1C1C1E', 'midnight': '#1C1C1E',
  'blanc': '#FAFAFA', 'white': '#FAFAFA', 'lumière stellaire': '#F5F0E8', 'starlight': '#F5F0E8',
  'bleu': '#2E5CA8', 'blue': '#2E5CA8', 'bleu alpin': '#4A7FA8',
  'rouge': '#BF0000', 'red': '#BF0000', 'product red': '#BF0000',
  'violet': '#7B5EA7', 'violet intense': '#7B5EA7', 'purple': '#7B5EA7',
  'or': '#C8A96E', 'gold': '#C8A96E',
  'rose': '#F4C2C2', 'pink': '#F4C2C2',
  'titane': '#8E8D87', 'titan': '#8E8D87',
  'graphite': '#4A4A4A',
  'vert': '#4A7C59', 'green': '#4A7C59',
  'argent': '#C0C0C0', 'silver': '#C0C0C0',
  'phantom black': '#1C1C1E', 'cream': '#F5F0E8',
};

function getHex(colorName) {
  if (!colorName) return '#888888';
  return COLOR_HEX[colorName.toLowerCase().trim()] || '#888888';
}

function groupByModel(rawPhones) {
  const groups = {};
  rawPhones.forEach((p) => {
    const key = p.model || p.name;
    if (!key) return;
    if (!groups[key]) {
      groups[key] = {
        id: p.id,
        name: key,
        brand: p.brand,
        basePrice: p.price,
        colors: [],
        colorNames: new Set(),
        rating: 4.5,
        reviewCount: 0,
      };
    }
    const g = groups[key];
    if (p.price < g.basePrice) g.basePrice = p.price;
    if (p.color && !g.colorNames.has(p.color)) {
      g.colorNames.add(p.color);
      g.colors.push({ name: p.color, hex: getHex(p.color), image: '' });
    }
  });
  return Object.values(groups).map(({ colorNames, ...rest }) => rest);
}

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
  const color = phone.colors[activeColor] || { name: '', hex: '#888', image: '' };
  const imgSrc = color.image || getPhoneImage(phone.name, color.name);

  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[240px] bg-white border border-gray-100 rounded-2xl p-4 hover:border-[#00B4CC] hover:shadow-lg transition-all duration-200 flex flex-col gap-3 cursor-pointer">
      <div className="h-44 bg-[#F9F9F9] rounded-xl flex items-center justify-center relative overflow-hidden">
        {imgSrc !== PLACEHOLDER ? (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={`${phone.name} ${color.name}`}
            className="object-contain w-full h-full"
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#00B4CC] opacity-30">
            <Smartphone size={56} strokeWidth={1} />
          </div>
        )}
      </div>
      <p className="font-poppins font-bold text-[#1B2A4A] text-sm leading-tight">{phone.name}</p>
      <StarRating rating={phone.rating} count={phone.reviewCount} size={13} />
      <p className="text-sm">
        <span className="text-[#555555]">À partir de </span>
        <span className="font-bold text-[#1B2A4A]">{phone.basePrice}€</span>
      </p>
      {phone.colors.length > 0 && (
        <ColorDots colors={phone.colors} active={activeColor} onSelect={setActiveColor} />
      )}
    </div>
  );
}

export default function BestSellers() {
  const scrollRef = useRef(null);
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBestSellers() {
      if (!isSupabaseReady) {
        setPhones(groupByModel(phonesMock));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .order('price', { ascending: false })
        .limit(8);
      setPhones(groupByModel(data || []));
      setLoading(false);
    }
    fetchBestSellers();
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
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

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[200px] sm:w-[240px] h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))
            : phones.map((phone) => (
                <BestSellerCard key={phone.name} phone={phone} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
