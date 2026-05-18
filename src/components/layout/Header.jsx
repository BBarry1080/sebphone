import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ShoppingCart, ClipboardList } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../ui/LanguageSelector';

function SebLogo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/images/logo/SEBPHONEbysebtelecom.png"
        alt="SebPhone"
        className="h-10 w-auto object-contain"
        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
      />
    </Link>
  );
}

const navLinks = [
  { to: '/',              labelKey: 'nav_home',         end: true },
  { to: '/iphone',        labelKey: 'nav_iphone',       end: false },
  { to: '/samsung',       labelKey: 'nav_samsung',      end: false },
  { to: '/occasions',     labelKey: 'nav_occasions',    end: false },
  { to: '/reconditiones', labelKey: 'nav_reconditionnes', end: false },
  { to: '/sur-commande',  labelKey: 'nav_sur_commande', end: false, highlight: true, icon: '📦 ' },
  { to: '/rachat',        labelKey: 'nav_revendre',     end: false },
  { to: '/pro',           labelKey: 'nav_pro',          end: false },
];

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { t } = useLanguage();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/boutique?q=${encodeURIComponent(query)}`);
      setShowSearch(false);
      setQuery('');
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-[#1B2A4A] text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Phone size={12} />
              +32(0)492 / 40.54.57
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={12} />
              contact@sebphone.be
            </span>
          </div>
          <span className="text-[#00B4CC] font-medium">{t('banner_delivery')}</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <SebLogo />

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to + link.labelKey}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  link.highlight
                    ? (isActive ? 'text-orange-700 bg-orange-50' : 'text-orange-500 hover:text-orange-700 hover:bg-orange-50')
                    : (isActive ? 'text-[#00B4CC] bg-cyan-50' : 'text-[#1B2A4A] hover:text-[#00B4CC] hover:bg-gray-50')
                }`
              }
            >
              {link.icon || ''}{t(link.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {showSearch ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => { if (!query) setShowSearch(false); }}
                placeholder={t('search_placeholder')}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00B4CC] w-44"
              />
            </form>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-gray-50 text-[#555555] hover:text-[#00B4CC] transition-colors cursor-pointer"
            >
              <Search size={20} />
            </button>
          )}
          <Link
            to="/mes-reservations"
            className="p-2 rounded-lg hover:bg-gray-50 text-[#555555] hover:text-[#00B4CC] transition-colors flex items-center gap-1.5 text-sm font-medium"
            title={t('nav_my_reservations')}
          >
            <User size={20} />
          </Link>
          <Link to="/panier" className="relative p-2 rounded-lg hover:bg-gray-50 text-[#555555] hover:text-[#00B4CC] transition-colors">
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
          <div className="ml-1 pl-2 border-l border-gray-200">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </header>
  );
}
