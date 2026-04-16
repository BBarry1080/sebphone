import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Truck, RotateCcw, Package } from 'lucide-react';
import { phones } from '../../data/phones';

const OFFER_PHONE_ID = 2; // iPhone 14 128Go Minuit
const STORAGES = ['128Go', '256Go', '512Go'];

const COLORS = [
  { name: 'Minuit', hex: '#1C1C1E' },
  { name: 'Lumière stellaire', hex: '#F5F0E8' },
  { name: 'Bleu Alpin', hex: '#2E5CA8' },
  { name: 'Rouge', hex: '#FF3B30' },
];

const badges = [
  { Icon: CheckCircle, text: 'Garantie 12-24 mois' },
  { Icon: Truck,       text: 'Livraison 24-72h' },
  { Icon: RotateCcw,   text: 'Retour 30 jours' },
  { Icon: Package,     text: '12 disponibles' },
];

export default function WeeklyOffer() {
  const navigate = useNavigate();
  const [activeStorage, setActiveStorage] = useState(0);
  const [activeColor, setActiveColor] = useState(0);
  const offerPhone = phones.find((p) => p.id === OFFER_PHONE_ID);

  if (!offerPhone) return null;

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
            <div className="bg-white rounded-2xl p-5 w-full shadow-xl flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00B4CC]">
                Offre de la semaine
              </p>
              <p className="font-poppins font-bold text-[#1B2A4A] text-lg leading-tight">
                {offerPhone.name.split(' ').slice(0, 2).join(' ')}
              </p>

              {/* Storage pills */}
              <div>
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
              <div>
                <p className="text-xs text-[#555555] mb-2">Couleur : <span className="font-medium text-[#1B2A4A]">{COLORS[activeColor].name}</span></p>
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
              <button
                onClick={() => navigate(`/telephone/${offerPhone.id}`)}
                className="w-full flex items-center justify-center gap-2 bg-[#00B4CC] hover:bg-[#0099b3] text-white font-bold py-3 rounded-full transition-colors cursor-pointer text-sm"
              >
                Voir l'offre →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
