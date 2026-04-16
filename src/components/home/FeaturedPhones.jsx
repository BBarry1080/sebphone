import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { phones } from '../../data/phones';
import PhoneCard from '../ui/PhoneCard';
import PhoneDetail from '../catalogue/PhoneDetail';
import { ArrowRight } from 'lucide-react';

const conditionFilters = [
  { value: null,            label: 'Tous' },
  { value: 'neuf',          label: 'Neuf' },
  { value: 'reconditionne', label: 'Reconditionné' },
  { value: 'occasion',      label: 'Occasion' },
  { value: 'Apple',         label: 'Apple' },
  { value: 'Samsung',       label: 'Samsung' },
];

export default function FeaturedPhones() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(null);
  const [selected, setSelected] = useState(null);

  const featured = phones
    .filter((p) => {
      if (!activeFilter) return true;
      if (['neuf', 'reconditionne', 'occasion'].includes(activeFilter)) return p.condition === activeFilter;
      return p.brand === activeFilter;
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5">
          {featured.map((phone, i) => (
            <PhoneCard
              key={phone.id}
              phone={phone}
              index={i}
              onClick={setSelected}
            />
          ))}
        </div>

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

      {selected && (
        <PhoneDetail phone={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
