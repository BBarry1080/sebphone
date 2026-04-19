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

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12.017 2C9.38 2 7.23 3.377 6.26 5.396c-.406.843-.49 1.73-.49 2.574 0 .49.033.98.065 1.405-.228.098-.49.163-.784.163-.326 0-.62-.098-.882-.228l-.065-.033c-.098-.032-.195-.065-.293-.065-.326 0-.62.228-.685.554-.065.392.163.751.522.882l.098.033c.424.13.816.391 1.077.75.098.13.13.294.098.457-.326 1.339-1.47 2.15-2.776 2.41-.294.065-.49.327-.457.62.033.261.228.457.49.49.261.032.522.065.816.065.326 0 .685-.033 1.044-.098.261-.033.49.13.588.36.294.784.98 1.273 1.763 1.273.294 0 .588-.065.849-.196.49-.228 1.012-.36 1.535-.36.49 0 .98.098 1.437.294.294.13.62.196.947.196.784 0 1.47-.49 1.763-1.24.098-.228.327-.392.588-.36.36.065.718.098 1.044.098.294 0 .555-.033.816-.065.261-.033.457-.229.49-.49.033-.293-.163-.555-.457-.62-1.306-.26-2.45-1.07-2.776-2.41-.033-.163 0-.326.098-.457.261-.36.653-.62 1.077-.75l.098-.033c.359-.13.587-.49.522-.882-.065-.326-.359-.554-.685-.554-.098 0-.195.033-.293.065l-.065.033c-.261.13-.555.228-.882.228-.294 0-.555-.065-.784-.163.033-.424.065-.915.065-1.405 0-.849-.098-1.73-.49-2.574C16.803 3.377 14.653 2 12.017 2z"/>
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
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#00B4CC] flex items-center justify-center transition-colors duration-200"
            >
              <SnapchatIcon />
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
