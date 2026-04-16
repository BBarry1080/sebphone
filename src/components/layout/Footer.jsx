import { Link } from 'react-router-dom';
import { Phone, Mail, Globe } from 'lucide-react';

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#1B2A4A] text-white">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-poppins font-bold text-2xl">
              <span className="text-[#00B4CC]">SEB</span>
              <span className="text-white">PHONE</span>
            </p>
            <p className="text-sm italic text-gray-400 mt-0.5">Où tu veux, quand tu veux</p>
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
            {[
              { Icon: FacebookIcon,  href: '#', label: 'Facebook' },
              { Icon: InstagramIcon, href: '#', label: 'Instagram' },
              { Icon: XIcon,         href: '#', label: 'Twitter / X' },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#00B4CC] flex items-center justify-center transition-colors duration-200"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
          <p className="text-sm text-gray-400 mt-4 leading-relaxed">
            Retrouvez nos dernières offres et actualités sur les réseaux sociaux.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">© 2025 SEBPHONE — Tous droits réservés</p>
          <p className="text-xs text-gray-600">Belgique · Livraison rapide · Garantie incluse</p>
        </div>
      </div>
    </footer>
  );
}
