import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, RotateCcw, Package } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage';
import { getStartingPrice } from '../../data/startingPrices';
import { charmPrice } from '../../utils/charmPrice';

const COLOR_HEX = {
  'noir': '#1C1C1E', 'minuit': '#1C1C1E', 'black': '#1C1C1E', 'midnight': '#1C1C1E',
  'blanc': '#FAFAFA', 'white': '#FAFAFA', 'lumière stellaire': '#F5F0E8', 'starlight': '#F5F0E8',
  'bleu': '#2E5CA8', 'blue': '#2E5CA8', 'bleu alpin': '#4A7FA8',
  'rouge': '#BF0000', 'red': '#BF0000', 'violet': '#7B5EA7', 'violet intense': '#7B5EA7',
  'or': '#C8A96E', 'gold': '#C8A96E', 'rose': '#F4C2C2', 'pink': '#F4C2C2',
  'titane': '#8E8D87', 'graphite': '#4A4A4A', 'argent': '#C0C0C0', 'silver': '#C0C0C0',
  'vert': '#4A7C59', 'phantom black': '#1C1C1E',
};

function getHex(colorName) {
  if (!colorName) return '#888888';
  return COLOR_HEX[colorName.toLowerCase().trim()] || '#888888';
}

export default function WeeklyOffer() {
  const navigate = useNavigate();
  const [offerPhone, setOfferPhone]       = useState(null);
  const [relatedPhones, setRelatedPhones] = useState([]);
  const [activeStorage, setActiveStorage] = useState(0);
  const [activeColor, setActiveColor]     = useState(0);
  const [stockCount, setStockCount]       = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function fetchOffer() {
      if (!isSupabaseReady) {
        setStockCount(12);
        setLoading(false);
        return;
      }

      // 1. Priorité : téléphone marqué "offre de la semaine" par l'admin
      const { data: starred } = await supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .eq('offre_semaine', true)
        .limit(1)
        .maybeSingle();

      let best = starred || null;

      // 2. Fallback : meilleure marge parmi les entrées de gamme (prix <= 150€)
      if (!best) {
        const { data: phonesData } = await supabase
          .from('phones')
          .select('id, name, model, brand, color, storage, price, purchase_price, condition')
          .eq('status', 'disponible')
          .not('purchase_price', 'is', null)
          .lte('price', 150);

        if (phonesData?.length > 0) {
          best = phonesData.reduce((top, p) => {
            if (!p.purchase_price || p.price <= 0) return top;
            const score = (p.price - p.purchase_price) / p.price;
            const topScore = top ? (top.price - top.purchase_price) / top.price : -Infinity;
            return score > topScore ? p : top;
          }, null);
        }
      }

      // Fallback: first disponible phone
      if (!best) {
        const { data: fb } = await supabase
          .from('phones')
          .select('*')
          .eq('status', 'disponible')
          .limit(1);
        if (fb?.[0]) best = fb[0];
      }

      if (best) {
        const modelName = best.model || best.name;
        const { data: sameModel } = await supabase
          .from('phones')
          .select('*')
          .eq('status', 'disponible')
          .eq('model', modelName);
        setOfferPhone(best);
        setRelatedPhones(sameModel?.length ? sameModel : [best]);
      }

      const { count } = await supabase
        .from('phones')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disponible');
      setStockCount(count ?? 0);
      setLoading(false);
    }
    fetchOffer();
  }, []);

  if (loading) {
    return (
      <section className="px-4 md:px-6 py-6 max-w-7xl mx-auto mb-6">
        <div className="rounded-2xl h-64 bg-gray-100 animate-pulse" />
      </section>
    );
  }

  if (!offerPhone) return null;

  const modelName    = offerPhone.model || offerPhone.name || '';
  const storages     = [...new Set(relatedPhones.map((p) => p.storage).filter(Boolean))];
  const colorNames   = [...new Map(relatedPhones.filter((p) => p.color).map((p) => [p.color, p.color])).keys()];

  const currentStorage = storages[activeStorage] || offerPhone.storage || '';
  const currentColor   = colorNames[activeColor] || offerPhone.color || '';

  const selectedPhone = relatedPhones.find(
    (p) => (!currentStorage || p.storage === currentStorage) && (!currentColor || p.color === currentColor)
  ) || offerPhone;

  const outOfStock   = stockCount === 0;
  const currentImage = getPhoneImage(modelName, currentColor);
  const rawPrice = selectedPhone.price ?? offerPhone.price;
  const conditionNorm = (selectedPhone.condition || offerPhone.condition || '')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isReconditionne = conditionNorm.startsWith('reconditionn');
  const displayPrice = isReconditionne
    ? (getStartingPrice(modelName) ?? rawPrice)
    : rawPrice;

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
                {modelName}
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                Testés, certifiés, garantis. Jusqu'à −60 % par rapport au neuf.
              </p>
            </div>
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

              <div className="h-32 flex items-center justify-center overflow-hidden">
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={`${modelName} ${currentColor}`}
                  className="h-full object-contain"
                  onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER; }}
                />
              </div>

              <p className="font-poppins font-bold text-[#1B2A4A] text-lg leading-tight">
                {modelName}
              </p>

              {storages.length > 1 && (
                <div className={outOfStock ? 'pointer-events-none' : ''}>
                  <p className="text-xs text-[#555555] mb-2">Capacité</p>
                  <div className="flex gap-2 flex-wrap">
                    {storages.map((s, i) => (
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
              )}

              {colorNames.length > 1 && (
                <div className={outOfStock ? 'pointer-events-none' : ''}>
                  <p className="text-xs text-[#555555] mb-2">
                    Couleur : <span className="font-medium text-[#1B2A4A]">{currentColor}</span>
                  </p>
                  <div className="flex gap-2">
                    {colorNames.map((c, i) => (
                      <button
                        key={c}
                        onClick={() => setActiveColor(i)}
                        title={c}
                        style={{ backgroundColor: getHex(c) }}
                        className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                          activeColor === i
                            ? 'border-2 border-gray-800 scale-110'
                            : 'border border-gray-300 hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-[#555555]">À partir de</p>
                <p className="font-poppins font-bold text-[#1B2A4A] text-2xl">{charmPrice(displayPrice)}€</p>
              </div>

              {outOfStock ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 font-bold py-3 rounded-full text-sm cursor-not-allowed"
                >
                  Fin de stock — Revenez la semaine prochaine
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/modele/${modelName.toLowerCase().replace(/\s+/g, '-')}`)}
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
