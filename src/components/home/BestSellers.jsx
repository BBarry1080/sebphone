import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { getPhoneImage } from '../../utils/phoneImage';
import { getColorHex } from '../../utils/colors'
import { getStartingPrice } from '../../data/startingPrices'
import { charmPrice } from '../../utils/charmPrice'

function displayPrice(phone) {
  if (phone.condition === 'reconditionne') {
    const ref = getStartingPrice(phone.model)
    if (ref) return charmPrice(ref)
  }
  return charmPrice(phone.price)
};

function BestSellerCard({ phone }) {
  const navigate = useNavigate();
  const slug = (phone.model || '').toLowerCase().replace(/\s+/g, '-');
  const imgSrc = getPhoneImage(phone.model, phone.color);

  const conditionLabel =
    phone.condition === 'neuf' ? 'Neuf'
    : phone.condition === 'reconditionne' ? 'Reconditionné'
    : phone.grade || 'Occasion';

  const conditionClass =
    phone.condition === 'neuf' ? 'bg-green-100 text-green-700'
    : phone.condition === 'reconditionne' ? 'bg-cyan-100 text-cyan-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <div
      className="flex-shrink-0 w-48 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={() => navigate(`/modele/${slug}`)}
    >
      <div className="aspect-square bg-[#f8f8f8] rounded-xl mb-3 flex items-center justify-center">
        <img
          src={imgSrc}
          alt={phone.model}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/200x200/f5f5f5/999?text=iPhone';
          }}
        />
      </div>

      <p className="font-semibold text-[#1B2A4A] text-sm leading-tight mb-1">{phone.model}</p>
      <p className="text-xs text-gray-400 mb-2">{phone.storage}</p>

      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: getColorHex(phone.color), boxShadow: '0 0 0 1px rgba(0,0,0,0.2)' }}
        />
        <span className="text-xs text-gray-500">{phone.color}</span>
      </div>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block ${conditionClass}`}>
        {conditionLabel}
      </span>

      <p className="font-bold text-[#1B2A4A] text-lg">{displayPrice(phone)}€</p>
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
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .gte('price', 400)
        .order('price', { ascending: false })
        .limit(8);
      if (data) setPhones(data);
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
                <div key={i} className="flex-shrink-0 w-48 h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))
            : phones.length === 0
            ? (
                <div className="flex flex-col items-center gap-2 text-gray-300 py-10 w-full justify-center">
                  <Smartphone size={48} strokeWidth={1} />
                  <p className="text-sm">Aucun téléphone disponible</p>
                </div>
              )
            : phones.map((phone) => (
                <BestSellerCard key={phone.id} phone={phone} />
              ))
          }
        </div>
      </div>
    </section>
  );
}
