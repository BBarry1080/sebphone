import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { getPhoneImage } from '../../utils/phoneImage';
import { getColorHex } from '../../utils/colors'
import { useLanguage } from '../../contexts/LanguageContext';
import { translateColor } from '../../utils/translateColor';


function BestSellerCard({ phone }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
        <span className="text-xs text-gray-500">{translateColor(phone.color, t)}</span>
      </div>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mb-2 inline-block ${conditionClass}`}>
        {conditionLabel}
      </span>

      <p className="font-bold text-[#1B2A4A] text-lg">{phone.price}€</p>

      <button
        onClick={(e) => {
          e.stopPropagation()
          const robustSlug = (phone.model || phone.name)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[()]/g, '')
            .replace(/[^a-z0-9-]/g, '')
          window.open(`/modele/${robustSlug}`, '_blank')
        }}
        className="mt-2 text-xs text-[#00B4CC] hover:underline font-medium"
      >
        Voir sur le site →
      </button>
    </div>
  );
}

export default function BestSellers() {
  const { t } = useLanguage();
  const scrollRef = useRef(null);
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBestSellers() {
      if (!isSupabaseReady) {
        setLoading(false);
        return;
      }

      const { data: config } = await supabase
        .from('best_sellers_config')
        .select('phone_id, position')
        .order('position', { ascending: true })
        .limit(8);

      if (config && config.length > 0) {
        const ids = config.map((c) => c.phone_id);
        const { data: phonesData } = await supabase
          .from('phones')
          .select('*')
          .in('id', ids)
          .eq('status', 'disponible');

        const ordered = config
          .map((c) => phonesData?.find((p) => p.id === c.phone_id))
          .filter(Boolean);
        setPhones(ordered);
      } else {
        const { data } = await supabase
          .from('phones')
          .select('*')
          .eq('status', 'disponible')
          .or('visible_on_site.eq.true,visible_on_site.is.null')
          .gte('price', 400)
          .order('price', { ascending: false })
          .limit(8);
        if (data) setPhones(data);
      }
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
              {t('bestsellers_title')}
              <span className="text-[#888888] font-normal"> {t('bestsellers_subtitle')}</span>
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
              {t('bestsellers_see_all')}
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
                  <p className="text-sm">{t('bestsellers_empty')}</p>
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
