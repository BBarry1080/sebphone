import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Star, MapPin, ExternalLink, X } from 'lucide-react';

const STORES = [
  { name: "Anderlecht", address: "Chaussée de Mons 711, 1070 Anderlecht", maps: "https://maps.google.com/?q=Chaussée+de+Mons+711+Anderlecht" },
  { name: "Molenbeek", address: "Rue de l'Église Sainte-Anne 93, 1081 Molenbeek", maps: "https://maps.google.com/?q=Rue+Eglise+Sainte+Anne+93+Molenbeek" },
  { name: "Louise", address: "Rue du Bailli 22, 1000 Bruxelles", maps: "https://maps.google.com/?q=Rue+du+Bailli+22+Bruxelles" },
  { name: "Rue Neuve", address: "Pass. du Nord 23, 1000 Bruxelles", maps: "https://maps.google.com/?q=Passage+du+Nord+23+Bruxelles" },
  { name: "Tubize", address: "Rue de Bruxelles 18, 1400 Tubize", maps: "https://maps.google.com/?q=Rue+de+Bruxelles+18+Tubize" },
  { name: "Saint-Gilles", address: "Chaussée de Forest 26, Saint-Gilles", maps: "https://maps.google.com/?q=Chaussée+de+Forest+26+Saint-Gilles" },
]

function StoresModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-poppins font-bold text-[#1B2A4A] text-lg">Nos points de vente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {STORES.map((store) => (
            <div key={store.name} className="flex items-start justify-between p-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#00B4CC] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1B2A4A]">Seb Telecom — {store.name}</p>
                  <p className="text-sm text-gray-500">{store.address}</p>
                </div>
              </div>
              <a href={store.maps} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#00B4CC] font-medium flex items-center gap-1 flex-shrink-0 ml-4 hover:underline">
                <ExternalLink size={12} />
                Maps
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  const navigate = useNavigate();
  const [showStores, setShowStores] = useState(false);

  return (
    <>
    {showStores && <StoresModal onClose={() => setShowStores(false)} />}
    <section
      className="relative overflow-hidden min-h-[85vh] md:min-h-[75vh] flex items-center"
      style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #00B4CC 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
            >
              <Star size={14} className="text-yellow-300 fill-yellow-300" />
              <span className="text-white text-sm font-medium">Boutique certifiée Belgique</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-white font-poppins font-extrabold text-4xl md:text-5xl xl:text-6xl leading-tight mb-4"
            >
              DÉCOUVREZ
              <br />
              <span className="text-[#00B4CC]" style={{ textShadow: '0 0 40px rgba(0,180,204,0.4)' }}>VOTRE PROCHAIN</span>
              <br />
              TÉLÉPHONE.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/80 text-lg md:text-xl mb-8 leading-relaxed"
            >
              Neufs, Occasions &amp; Reconditionnés au meilleur prix.<br />
              Livraison partout en Belgique.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button
                onClick={() => navigate('/boutique')}
                className="flex items-center justify-center gap-2 bg-[#00B4CC] hover:bg-[#009ab0] text-white font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 hover:scale-105 active:scale-95 min-h-[56px]"
              >
                Voir la boutique
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => navigate('/rachat')}
                className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-medium px-8 py-4 rounded-xl text-base transition-all duration-200 border border-white/30 min-h-[56px]"
              >
                Revendre mon téléphone
              </button>
              <button
                onClick={() => setShowStores(true)}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-4 rounded-xl text-base transition-all duration-200 border border-white/20 min-h-[56px]"
              >
                <MapPin size={18} />
                Nos points de vente
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-8 mt-10"
            >
              {[
                { value: '5000+', label: 'Téléphones vendus' },
                { value: '24 mois', label: 'Garantie' },
                { value: '1h-24h max', label: 'Livraison' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-white font-bold text-xl">{stat.value}</p>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: floating phones visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden md:flex items-center justify-center relative h-80"
          >
            {/* Center phone — iPhone 15 Pro */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-20"
            >
              <div className="w-32 h-56 flex items-center justify-center drop-shadow-2xl">
                <img
                  src="https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=400&hei=400&fmt=png-alpha&qlt=80"
                  alt="iPhone 15 Pro"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/images/iphones/iphone-15-pro-titane-naturel.png' }}
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#00B4CC] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                iPhone 15 Pro
              </div>
            </motion.div>

            {/* Left phone — iPhone 17 Bleu */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute left-4 top-8 z-10"
            >
              <div className="w-24 h-44 flex items-center justify-center drop-shadow-xl opacity-90">
                <img
                  src="https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-17-finish-select-202509-6-1inch-skyblue?wid=400&hei=400&fmt=png-alpha&qlt=80"
                  alt="iPhone 17"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/images/iphones/iphone-17-noir.png'; e.target.style.filter = 'hue-rotate(200deg) saturate(1.4)' }}
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                iPhone 17
              </div>
            </motion.div>

            {/* Right phone — iPhone 14 Pro */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute right-4 top-8 z-10"
            >
              <div className="w-24 h-44 flex items-center justify-center drop-shadow-xl opacity-90">
                <img
                  src="https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-61inch-deeppurple?wid=400&hei=400&fmt=png-alpha&qlt=80"
                  alt="iPhone 14 Pro"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = '/images/iphones/iphone-14-pro-noir-cosmos.png' }}
                />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#1B2A4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border border-white/20">
                iPhone 14 Pro
              </div>
            </motion.div>

            {/* Decorative circles */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full border border-white/10" />
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full border border-white/8" />
            </div>

            {/* Badge certifié */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="absolute bottom-0 right-0 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2"
            >
              <Shield size={20} className="text-[#22C55E]" />
              <div>
                <p className="text-[#1B2A4A] font-bold text-xs">Certifié</p>
                <p className="text-[#555555] text-[10px]">Garantie 24 mois</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 30C1200 60 900 0 720 20C540 40 240 0 0 30L0 60Z" fill="white"/>
        </svg>
      </div>
    </section>
    </>
  );
}
