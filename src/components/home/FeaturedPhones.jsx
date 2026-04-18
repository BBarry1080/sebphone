import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { phonesMock } from '../../data/phonesMock';
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage';
import { ArrowRight } from 'lucide-react';

const conditionFilters = [
  { value: null,            label: 'Tous' },
  { value: 'neuf',          label: 'Neuf' },
  { value: 'reconditionne', label: 'Reconditionné' },
  { value: 'occasion',      label: 'Occasion' },
];

const conditionLabel = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' };
const conditionColor = {
  neuf:          'bg-blue-100 text-blue-700',
  reconditionne: 'bg-cyan-100 text-cyan-700',
  occasion:      'bg-orange-100 text-orange-700',
};

function PhoneCard({ phone, index }) {
  const navigate = useNavigate();
  const modelName = typeof phone.model === 'string' ? phone.model : phone.model?.name || phone.name || '';
  const imgSrc = getPhoneImage(modelName, phone.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      onClick={() => navigate(`/modele/${modelName.toLowerCase().replace(/\s+/g, '-')}`)}
      className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* Image */}
      <div className="h-36 bg-[#F9F9F9] rounded-xl flex items-center justify-center overflow-hidden">
        {imgSrc !== PLACEHOLDER ? (
          <img
            src={imgSrc}
            alt={modelName}
            className="h-full w-full object-contain p-3"
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
          />
        ) : (
          <Smartphone size={48} className="text-[#00B4CC] opacity-20" strokeWidth={1} />
        )}
      </div>

      {/* Condition badge */}
      {phone.condition && (
        <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor[phone.condition] || 'bg-gray-100 text-gray-600'}`}>
          {conditionLabel[phone.condition] || phone.condition}
        </span>
      )}

      {/* Name */}
      <p className="font-poppins font-bold text-[#1B2A4A] text-sm leading-tight">{modelName}</p>

      {/* Extra info per condition */}
      {phone.condition === 'reconditionne' && phone.parts?.length > 0 && (
        <p className="text-xs text-gray-400 -mt-1">
          Pièces changées : {phone.parts.map((p) => p.part_type || p.part_name || p).filter(Boolean).join(', ')}
        </p>
      )}
      {phone.condition === 'occasion' && phone.battery_health && (
        <p className="text-xs text-gray-400 -mt-1">🔋 Batterie : {phone.battery_health}%</p>
      )}

      {/* Storage pill */}
      {phone.storage && (
        <span className="self-start text-[11px] border border-gray-200 rounded-md px-2 py-0.5 text-gray-600 font-medium">
          {phone.storage}
        </span>
      )}

      {/* Price */}
      <p className="font-bold text-[#1B2A4A] text-base mt-auto">
        <span className="text-xs text-gray-400 font-normal mr-1">À partir de</span>
        {phone.price}€
      </p>
    </motion.div>
  );
}

export default function FeaturedPhones() {
  const navigate = useNavigate();
  const [allPhones, setAllPhones]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    async function fetchPhones() {
      setLoading(true);

      if (!isSupabaseReady) {
        setAllPhones(phonesMock.filter((p) => p.status === 'disponible').slice(0, 12));
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('phones')
        .select('*, parts:phone_parts(*)')
        .eq('status', 'disponible')
        .order('created_at', { ascending: false })
        .limit(12);

      setAllPhones(data || []);
      setLoading(false);
    }
    fetchPhones();
  }, []);

  const featured = allPhones
    .filter((p) => {
      if (!activeFilter) return true;
      return p.condition === activeFilter;
    })
    .slice(0, 6);

  return (
    <section className="py-16 md:py-20 bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="font-poppins font-bold text-3xl md:text-4xl text-[#00B4CC] mb-3">
            NOTRE SÉLECTION ACTUELLE
          </h2>
          <p className="text-[#555555] text-base">Découvrez nos téléphones disponibles dès maintenant</p>
        </motion.div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 justify-center flex-wrap">
          {conditionFilters.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => setActiveFilter(f.value === activeFilter ? null : f.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer
                ${activeFilter === f.value
                  ? 'bg-[#00B4CC] text-white border-[#00B4CC] scale-105'
                  : 'bg-white text-[#555555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-16 text-[#888] text-sm">
            Aucun téléphone disponible pour cette catégorie.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {featured.map((phone, i) => (
              <PhoneCard key={phone.id} phone={phone} index={i} />
            ))}
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mt-10"
        >
          <button
            onClick={() => navigate('/boutique')}
            className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243660] text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Voir tout le catalogue
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
