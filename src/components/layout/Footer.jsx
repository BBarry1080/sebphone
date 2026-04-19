import { Link } from 'react-router-dom';
import { Phone, Mail, Globe } from 'lucide-react';

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.27 8.27 0 0 0 4.84 1.55V6.79a4.85 4.85 0 0 1-1.07-.1z"/>
    </svg>
  );
}


export default function Footer() {
  return (
    <footer className="bg-[#1B2A4A] text-white">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="flex flex-col gap-4">
          <div className="bg-[#1B2A4A] p-3 rounded-xl inline-block">
            <img
              src="/images/logo/logo-blanc.png"
              alt="SebPhone"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                console.error('Logo blanc introuvable:', e.target.src)
                e.target.style.display = 'none'
              }}
            />
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Votre boutique de confiance pour téléphones neufs, reconditionnés et occasions en Belgique.
            Qualité certifiée, garantie incluse.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">Liens rapides</h3>
          <ul className="flex flex-col gap-2">
            {[
              { to: '/boutique',      label: 'Boutique' },
              { to: '/occasions',     label: 'Occasions' },
              { to: '/reconditiones', label: 'Reconditionnés' },
              { to: '/rachat',        label: 'Rachat téléphone' },
            ].map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-gray-400 hover:text-[#00B4CC] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">Contact</h3>
          <ul className="flex flex-col gap-3">
            <li>
              <a href="tel:+3249240540057" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#00B4CC] transition-colors">
                <Phone size={15} className="text-[#00B4CC] flex-shrink-0" />
                +32(0)492 / 40.54.57
              </a>
            </li>
            <li>
              <a href="mailto:contact@sebphone.be" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#00B4CC] transition-colors">
                <Mail size={15} className="text-[#00B4CC] flex-shrink-0" />
                contact@sebphone.be
              </a>
            </li>
            <li>
              <span className="flex items-center gap-2.5 text-sm text-gray-400">
                <Globe size={15} className="text-[#00B4CC] flex-shrink-0" />
                www.sebphone.be
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">Suivez-nous</h3>
          <div className="flex gap-3">
            <a
              href="https://www.instagram.com/seb.phone/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#00B4CC] flex items-center justify-center transition-colors duration-200"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://www.tiktok.com/@sebb.phone"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#00B4CC] flex items-center justify-center transition-colors duration-200"
            >
              <TikTokIcon />
            </a>
            <a
              href="https://snapchat.com/t/PPG5RuoF"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Snapchat"
              className="bg-yellow-400 p-2 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-colors duration-200"
            >
              <img
                src="/images/logo/Snapchat-logo-on-transparent-background-PNG.png"
                alt="Snapchat"
                className="w-5 h-5 object-contain"
                onError={(e) => {
                  console.error('Logo Snap introuvable:', e.target.src)
                  e.target.style.display = 'none'
                }}
              />
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4 leading-relaxed">
            Retrouvez nos dernières offres et actualités sur les réseaux sociaux.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col items-center gap-2">
          <div className="text-xs text-gray-400 text-center">
            <p className="font-medium text-gray-300">Slt Group (SRL)</p>
            <p>N° TVA : BE 1028.764.677</p>
            <p>Chaussée de Mons 711, 1070 Anderlecht</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-1 mt-1">
            <p className="text-xs text-gray-500">© 2025 SEBPHONE — Tous droits réservés</p>
            <p className="text-xs text-gray-600">Belgique · Livraison rapide · Garantie incluse</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
