import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { getPhoneImage } from '../../utils/phoneImage'
import { getStartingPrice } from '../../data/startingPrices'

function displayPrice(phone) {
  if (phone.condition === 'reconditionne') {
    const ref = getStartingPrice(phone.model)
    if (ref) return ref
  }
  return phone.price
};

function toSlug(model) {
  return (model || '').toLowerCase().replace(/\s+/g, '-');
}

const conditionBadge = {
  neuf:          { label: 'Neuf',          cls: 'bg-blue-100 text-blue-700' },
  reconditionne: { label: 'Reconditionné', cls: 'bg-green-100 text-green-700' },
  occasion:      { label: 'Occasion',      cls: 'bg-orange-100 text-orange-700' },
};

function PhoneCard({ phone }) {
  const navigate = useNavigate();
  const badge = conditionBadge[phone.condition];

  return (
    <div
      onClick={() => navigate(`/modele/${toSlug(phone.model)}`)}
      className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="aspect-square bg-[#f8f8f8] rounded-xl mb-3 flex items-center justify-center">
        <img
          src={getPhoneImage(phone.model, phone.color)}
          alt={phone.model}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/200x200/f5f5f5/999?text=iPhone';
          }}
        />
      </div>
      {badge && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      )}
      <p className="font-semibold text-[#1B2A4A] text-sm mt-2 mb-1 leading-tight">{phone.model}</p>
      <p className="text-xs text-gray-400 mb-2">{phone.storage} · {phone.color}</p>
      <p className="font-bold text-[#1B2A4A] text-lg">{displayPrice(phone)}€</p>
    </div>
  );
}

export default function FeaturedPhones() {
  const navigate = useNavigate();
  const [phones, setPhones]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState('tous');

  async function fetchPhones() {
    if (!isSupabaseReady) { setLoading(false); return; }
    const { data } = await supabase
      .from('phones')
      .select('*')
      .eq('status', 'disponible')
      .order('price', { ascending: false })
      .limit(12);
    setPhones(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPhones();

    if (!isSupabaseReady) return;
    const channel = supabase
      .channel('phones_featured')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phones' }, fetchPhones)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const hasNeuf         = phones.some((p) => p.condition === 'neuf');
  const hasReconditionne = phones.some((p) => p.condition === 'reconditionne');
  const hasOccasion     = phones.some((p) => p.condition === 'occasion');

  const filtered = activeFilter === 'tous'
    ? phones
    : phones.filter((p) => p.condition === activeFilter);

  if (!loading && phones.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl text-[#00B4CC] mb-3">
            NOTRE SÉLECTION ACTUELLE
          </h2>
          <p className="text-[#555555] text-base">Découvrez nos téléphones disponibles dès maintenant</p>
        </div>

        {/* Pilules */}
        {!loading && (
          <div className="flex gap-2 flex-wrap mb-6 justify-center">
            <button
              onClick={() => setActiveFilter('tous')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeFilter === 'tous' ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            {hasNeuf && (
              <button
                onClick={() => setActiveFilter('neuf')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  activeFilter === 'neuf' ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Neuf
              </button>
            )}
            {hasReconditionne && (
              <button
                onClick={() => setActiveFilter('reconditionne')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  activeFilter === 'reconditionne' ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Reconditionné
              </button>
            )}
            {hasOccasion && (
              <button
                onClick={() => setActiveFilter('occasion')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  activeFilter === 'occasion' ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Occasion
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Aucun téléphone disponible dans cette catégorie.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filtered.map((phone) => (
              <PhoneCard key={phone.id} phone={phone} />
            ))}
          </div>
        )}

        {/* CTA */}
        {!loading && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => navigate('/boutique')}
              className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243660] text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Voir tout le catalogue
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
