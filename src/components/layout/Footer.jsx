import { Link } from 'react-router-dom';
import { Phone, Mail, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

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
      <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015l-.149.015c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.09-.54.09-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
    </svg>
  );
}


export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#1B2A4A] text-white">
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="flex flex-col gap-4">
          <div className="mb-4">
            <span className="text-2xl font-bold">
              <span className="text-[#00B4CC]">SEB</span>
              <span className="text-white">PHONE</span>
            </span>
            <p className="text-xs text-gray-400 mt-1">{t('footer_slogan')}</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Votre boutique de confiance pour téléphones neufs, reconditionnés et occasions en Belgique.
            Qualité certifiée, garantie incluse.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">{t('footer_links')}</h3>
          <ul className="flex flex-col gap-2">
            {[
              { to: '/boutique',      label: t('footer_boutique') },
              { to: '/occasions',     label: t('footer_occasions') },
              { to: '/reconditiones', label: t('footer_reconditiones') },
              { to: '/rachat',        label: t('footer_revendre') },
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
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">{t('footer_contact')}</h3>
          <ul className="flex flex-col gap-3">
            <li>
              <a href="tel:0472728524" className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-[#00B4CC] transition-colors">
                <Phone size={15} className="text-[#00B4CC] flex-shrink-0" />
                0472 72 85 24
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
          <h3 className="font-semibold text-sm uppercase tracking-widest text-[#00B4CC] mb-4">{t('footer_follow')}</h3>
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
              title="Snapchat"
              className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#00B4CC] flex items-center justify-center transition-colors duration-200"
            >
              <SnapchatIcon />
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4 leading-relaxed">
            {t('footer_social_desc')}
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
            <p className="text-xs text-gray-500">© 2025 SEBPHONE — {t('footer_rights')}</p>
            <p className="text-xs text-gray-600">{t('footer_belgique')} · {t('footer_livraison')} · {t('footer_garantie')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
