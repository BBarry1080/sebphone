import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPhoneById } from '../data/phonesApi';
import { motion } from 'framer-motion';
import { ArrowLeft, Smartphone, CheckCircle, Truck, RotateCcw, Store, Battery, ChevronRight, MapPin } from 'lucide-react';
import { MAGASINS } from '../utils/magasins';
import { useState, useEffect } from 'react';
import StatusBadge from '../components/ui/StatusBadge';
import StarRating from '../components/ui/StarRating';
import { charmPrice } from '../utils/charmPrice';
import { useCart } from '../context/CartContext';
import Spinner from '../components/ui/Spinner';

const conditionLabel = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' };

const COLORS_BY_PHONE = {
  default: [
    { name: 'Noir', hex: '#1C1C1E' },
    { name: 'Blanc', hex: '#F5F5F0' },
    { name: 'Argent', hex: '#E8E8E8' },
  ],
};

const GRADES_CONFIG = [
  { id: 'bon_etat',      label: 'Bon état',      warranty: '24 mois', priceAdj: -80, desc: 'Traces visibles, batterie origine' },
  { id: 'tres_bon_etat', label: 'Très bon état', warranty: '24 mois', priceAdj: -40, desc: 'Peu de traces, batterie origine' },
  { id: 'comme_neuf',    label: 'Comme neuf',    warranty: '24 mois', priceAdj: 0,   desc: 'Aucune trace visible, batterie origine' },
  { id: 'neuf',          label: 'Neuf',          warranty: '24 mois', priceAdj: 50,  desc: 'Aucune trace — comme sorti de boîte' },
];

const STORAGES_CONFIG = [
  { label: '64Go',  priceAdj: -80 },
  { label: '128Go', priceAdj: 0 },
  { label: '256Go', priceAdj: 120 },
  { label: '512Go', priceAdj: 240 },
];

const BATTERY_OPTIONS = [
  { id: 'standard', label: 'Batterie standard', detail: '+85%, garantie 12 mois', priceAdj: 0, suffix: 'Inclus' },
  { id: 'new',      label: 'Batterie neuve 100%', detail: 'Garantie 12 mois',      priceAdj: 50, suffix: '+50€' },
];

export default function PhoneDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    getPhoneById(id)
      .then((data) => setPhone(data))
      .catch((err) => setFetchError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const colors = COLORS_BY_PHONE[phone?.id] || COLORS_BY_PHONE.default;
  const storages = STORAGES_CONFIG.filter((s, i) => i < 3);

  const [activeColor, setActiveColor] = useState(0);
  const [activeGrade, setActiveGrade] = useState(2); // Très bon par défaut
  const [activeStorage, setActiveStorage] = useState(1); // 128Go par défaut
  const [activeBattery, setActiveBattery] = useState(0);
  const [thumbIdx, setThumbIdx] = useState(0);
  const [added, setAdded] = useState(false);

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20">
        <Spinner message="Chargement du téléphone..." />
      </main>
    );
  }

  if (fetchError || !phone) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📱</p>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Téléphone introuvable</h1>
        <button onClick={() => navigate('/boutique')} className="px-6 py-3 bg-[#00B4CC] text-white rounded-xl font-bold">
          Retour boutique
        </button>
      </main>
    );
  }

  const basePrice = phone.price + GRADES_CONFIG[activeGrade].priceAdj + storages[activeStorage].priceAdj + BATTERY_OPTIONS[activeBattery].priceAdj;
  const originalPrice = Math.round(basePrice * 1.4);
  const savings = originalPrice - basePrice;

  const handleAddToCart = () => {
    addToCart({
      phone,
      grade: GRADES_CONFIG[activeGrade].label,
      storage: storages[activeStorage].label,
      battery: BATTERY_OPTIONS[activeBattery].label,
      color: colors[activeColor].name,
      price: basePrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const thumbnails = [0, 1, 2];

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-[#555555] mb-6">
        <Link to="/boutique" className="hover:text-[#00B4CC] transition-colors">
          ← {phone.brand === 'Apple' ? 'iPhone' : 'Samsung'}
        </Link>
        <ChevronRight size={14} />
        <span className="text-[#1B2A4A] font-medium">{phone.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* LEFT — Images */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4"
        >
          {/* Main image */}
          <div className="relative bg-[#F5F5F5] rounded-3xl flex items-center justify-center py-16 overflow-hidden group">
            <div className="text-[#00B4CC] opacity-20">
              <Smartphone size={160} strokeWidth={0.6} />
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3">
            {thumbnails.map((i) => (
              <button
                key={i}
                onClick={() => setThumbIdx(i)}
                className={`w-16 h-16 rounded-xl bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 border-2 transition-all cursor-pointer ${
                  thumbIdx === i ? 'border-[#1B2A4A]' : 'border-transparent hover:border-gray-300'
                }`}
              >
                <Smartphone size={28} className="text-[#00B4CC] opacity-20" strokeWidth={1} />
              </button>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          {/* Header */}
          <div>
            <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl md:text-3xl mb-2 leading-tight">
              {phone.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <StarRating rating={4.5} count={11} size={14} />
              <StatusBadge status={phone.status} size="sm" />
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-poppins font-bold text-3xl text-[#1B2A4A]">{charmPrice(basePrice)}€</span>
            <span className="text-gray-400 line-through text-lg">{charmPrice(originalPrice)}€</span>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
              Économisez {savings}€
            </span>
          </div>

          {/* Neuf badges */}
          {phone.condition === 'neuf' && (
            <div className="flex flex-wrap gap-2">
              {['Sous scellé', 'Garantie 1 an Apple', 'Garantie 2 ans SebPhone'].map((t) => (
                <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle size={11} />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Info badges */}
          <div className="flex flex-col gap-2.5">
            {[
              { Icon: Truck,     text: 'Livraison 1h-24h max', color: 'text-[#00B4CC]' },
              { Icon: RotateCcw, text: 'Retour gratuit sous 30 jours. Garantie jusqu\'à 24 mois.', color: 'text-[#166534]' },
              { Icon: Store,     text: 'Click & Collect disponible en magasin', color: 'text-[#555555]' },
            ].map(({ Icon, text, color }) => (
              <div key={text} className="flex items-start gap-2 text-sm text-[#555555]">
                <Icon size={16} className={`${color} flex-shrink-0 mt-0.5`} />
                <span>{text}</span>
              </div>
            ))}
            {phone.magasins?.length > 0 ? (
              <div className="flex flex-col gap-1 pl-1 border-l-2 border-[#00B4CC]/30">
                {phone.magasins.map((id) => {
                  const mag = MAGASINS[id];
                  if (!mag) return null;
                  return (
                    <div key={id} className="flex items-start gap-2 text-sm text-[#555555]">
                      <MapPin size={14} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-[#1B2A4A]">{mag.nom}</span>
                        <span className="text-xs text-gray-400 ml-1">— {mag.adresse}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-[#555555]">
                <MapPin size={16} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                <span>Disponible dans tous nos magasins</span>
              </div>
            )}
          </div>

          {/* Color selection */}
          <div>
            <p className="font-semibold text-[#1B2A4A] text-sm mb-3">
              Couleur : <span className="font-normal text-[#555555]">{colors[activeColor].name}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => setActiveColor(i)}
                  className={`flex items-center gap-2 px-3 py-2 border-2 rounded-xl transition-all cursor-pointer ${
                    activeColor === i ? 'border-gray-800' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                  <span className="text-xs font-medium text-[#1B2A4A]">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grade selection */}
          {phone.condition === 'reconditionne' && (
            <div>
              <p className="font-semibold text-[#1B2A4A] text-sm mb-3">État du produit</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GRADES_CONFIG.map((g, i) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGrade(i)}
                    className={`flex flex-col items-start text-left p-3 border-2 rounded-xl transition-all cursor-pointer ${
                      activeGrade === i ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm text-[#1B2A4A]">{g.label}</span>
                      <span className="text-xs text-[#00B4CC] font-medium">
                        {g.priceAdj > 0 ? `+${g.priceAdj}€` : g.priceAdj < 0 ? `${g.priceAdj}€` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#555555]">{g.desc}</p>
                    <p className="text-xs text-[#166534] mt-1 font-medium">✓ {g.warranty}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Storage selection */}
          <div>
            <p className="font-semibold text-[#1B2A4A] text-sm mb-3">Capacité de stockage</p>
            <div className="flex gap-2 flex-wrap">
              {storages.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setActiveStorage(i)}
                  className={`flex flex-col items-center px-4 py-2.5 border-2 rounded-xl transition-all cursor-pointer ${
                    activeStorage === i ? 'border-gray-800' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-semibold text-[#1B2A4A]">{s.label}</span>
                  {s.priceAdj !== 0 && (
                    <span className="text-xs text-[#555555]">
                      {s.priceAdj > 0 ? `+${s.priceAdj}€` : `${s.priceAdj}€`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Battery health */}
          <div>
            <p className="font-semibold text-[#1B2A4A] text-sm mb-3">Santé de la batterie</p>
            <div className="flex flex-col gap-2">
              {BATTERY_OPTIONS.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setActiveBattery(i)}
                  className={`flex items-center justify-between p-3 border-2 rounded-xl transition-all cursor-pointer text-left ${
                    activeBattery === i ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Battery size={16} className="text-[#00B4CC] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#1B2A4A]">{b.label}</p>
                      <p className="text-xs text-[#555555]">{b.detail}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${b.priceAdj > 0 ? 'text-[#1B2A4A]' : 'text-[#166534]'}`}>
                    {b.suffix}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recap + CTA */}
          <div className="bg-[#F5F5F5] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone size={24} className="text-[#00B4CC] opacity-40" strokeWidth={1} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B2A4A] text-sm leading-tight">{phone.name}</p>
                <p className="text-xs text-[#555555]">
                  {colors[activeColor].name} · {GRADES_CONFIG[activeGrade].label} · {storages[activeStorage].label}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-[#1B2A4A] text-lg">{charmPrice(basePrice)}€</p>
                <p className="text-xs text-gray-400 line-through">{charmPrice(originalPrice)}€</p>
              </div>
            </div>

            <span className="text-xs text-[#166534] font-medium">Économisez {savings}€</span>

            <button
              onClick={handleAddToCart}
              disabled={phone.status === 'vendu'}
              className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl transition-all text-base min-h-[52px] cursor-pointer ${
                added
                  ? 'bg-[#166534] text-white'
                  : phone.status === 'vendu'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#1a1a1a] hover:bg-black text-white'
              }`}
            >
              {added ? '✓ Ajouté au panier !' : phone.status === 'vendu' ? 'Indisponible' : 'Ajouter au panier'}
            </button>

            <div className="flex justify-around text-xs text-[#555555]">
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-[#166534]" /> 30 jours pour changer d'avis</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-[#166534]" /> Garantie {GRADES_CONFIG[activeGrade].warranty}</span>
            </div>
          </div>

          {/* Replaced parts for reconditioned */}
          {phone.condition === 'reconditionne' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4">
              <h4 className="font-semibold text-orange-800 mb-2">🔧 Pièces remplacées</h4>
              {phone.parts_replaced?.length > 0 ? (
                <ul className="space-y-1">
                  {phone.parts_replaced.map((part) => (
                    <li key={part} className="flex items-center gap-2 text-sm text-orange-700">
                      <span>✓</span> {part}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-700 font-medium">✓ Aucune réparation — État original</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
