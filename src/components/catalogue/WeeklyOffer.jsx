import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, RotateCcw, Package } from 'lucide-react';
import { phones } from '../../data/phones';
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage';
import { supabase, isSupabaseReady } from '../../lib/supabase';

const OFFER_PHONE_ID = 2; // iPhone 14 128Go Minuit
const STORAGES = ['128Go', '256Go', '512Go'];

const COLORS = [
  { name: 'Minuit',             hex: '#1C1C1E' },
  { name: 'Lumière stellaire',  hex: '#F5F0E8' },
  { name: 'Bleu',               hex: '#2E5CA8' },
  { name: 'Rouge',              hex: '#BF0000' },
  { name: 'Violet',             hex: '#7B5EA7' },
];

export default function WeeklyOffer() {
  const navigate = useNavigate();
  const [activeStorage, setActiveStorage] = useState(0);
  const [activeColor, setActiveColor]     = useState(0);
  const [stockCount, setStockCount]       = useState(null); // null = loading
  const offerPhone = phones.find((p) => p.id === OFFER_PHONE_ID);

  useEffect(() => {
    async function fetchStock() {
      if (!isSupabaseReady) { setStockCount(12); return; }
      const { count } = await supabase
        .from('phones')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disponible')
        .eq('condition', 'reconditionne');
      setStockCount(count ?? 0);
    }
    fetchStock();
  }, []);

  if (!offerPhone) return null;

  const outOfStock = stockCount === 0;
  const currentImage = getPhoneImage('iPhone 14', COLORS[activeColor].name);

  const badges = [
    { Icon: CheckCircle, text: 'Garantie 24 mois' },
    { Icon: Truck,       text: 'Livraison 1h - 24h max' },
    { Icon: RotateCcw,   text: 'Retour 30 jours' },
    { Icon: Package,     text: stockCount === null ? '...' : `${stockCount} disponibles` },
  ];

  return (
    <section className="px-4 md:px-6 py-6 max-w-7xl mx-auto mb-6">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0f1e36 100%)' }}
      >
        <div className="grid md:grid-cols-5 gap-0">
          {/* Left — 60% */}
          <div className="md:col-span-3 p-7 md:p-10 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#00B4CC] mb-3">
                Offre de la semaine
              </p>
              <h2 className="font-poppins font-bold text-white text-2xl md:text-3xl xl:text-4xl leading-tight mb-3">
                Acheter un iPhone reconditionné
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Testés, certifiés, garantis. Jusqu'à −60 % par rapport au neuf.
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {badges.map(({ Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 bg-white/10 text-[#CBD5E1] text-xs px-3 py-1.5 rounded-full"
                >
                  <Icon size={12} className="text-[#00B4CC]" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — 40% */}
          <div className="md:col-span-2 p-5 flex items-center justify-center">
            <div className={`bg-white rounded-2xl p-5 w-full shadow-xl flex flex-col gap-4 relative ${outOfStock ? 'opacity-50' : ''}`}>
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-2xl bg-white/60 backdrop-blur-[1px]">
                  <p className="text-center text-sm font-bold text-gray-600 px-4">
                    Fin de stock<br />
                    <span className="font-normal text-xs text-gray-400">Revenez la semaine prochaine</span>
                  </p>
                </div>
              )}

              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00B4CC]">
                Offre de la semaine
              </p>

              {/* Phone image */}
              <div className="h-32 flex items-center justify-center overflow-hidden">
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={`iPhone 14 ${COLORS[activeColor].name}`}
                  className="h-full object-contain"
                  onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
                />
              </div>

              <p className="font-poppins font-bold text-[#1B2A4A] text-lg leading-tight">
                iPhone 14
              </p>

              {/* Storage pills */}
              <div className={outOfStock ? 'pointer-events-none' : ''}>
                <p className="text-xs text-[#555555] mb-2">Capacité</p>
                <div className="flex gap-2 flex-wrap">
                  {STORAGES.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setActiveStorage(i)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
                        activeStorage === i
                          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                          : 'bg-gray-50 text-[#555555] border-gray-200 hover:border-[#1B2A4A]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color dots */}
              <div className={outOfStock ? 'pointer-events-none' : ''}>
                <p className="text-xs text-[#555555] mb-2">
                  Couleur : <span className="font-medium text-[#1B2A4A]">{COLORS[activeColor].name}</span>
                </p>
                <div className="flex gap-2">
                  {COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => setActiveColor(i)}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                        activeColor === i
                          ? 'border-2 border-gray-800 scale-110'
                          : 'border border-gray-300 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="text-xs text-[#555555]">À partir de</p>
                <p className="font-poppins font-bold text-[#1B2A4A] text-2xl">{offerPhone.price}€</p>
              </div>

              {/* CTA */}
              {outOfStock ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-full text-sm cursor-not-allowed"
                >
                  Fin de stock — Revenez la semaine prochaine
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/telephone/${offerPhone.id}`)}
                  className="w-full flex items-center justify-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold py-3 rounded-full transition-colors cursor-pointer text-sm"
                >
                  Voir l'offre →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
