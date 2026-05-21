import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ShoppingCart, ChevronDown, Smartphone, Tablet, Watch, Headphones, Monitor, Home } from 'lucide-react';
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

function NavDropdown({ label, icon, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150 hover:bg-gray-50
                    ${open ? 'text-[#00B4CC] bg-cyan-50' : 'text-[#1B2A4A] hover:text-[#00B4CC]'}`}>
        {icon}
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-56 z-50">
          {items.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-[#1B2A4A] group-hover:text-[#00B4CC]">
                  {item.label}
                </p>
                {item.sub && (
                  <p className="text-xs text-gray-400">{item.sub}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

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

  const smartphonesItems = [
    { href: '/boutique', label: 'Tous les smartphones' },
    { href: '/iphone', label: 'Apple iPhone' },
    { href: '/samsung', label: 'Samsung' },
    { href: '/occasions', label: 'Occasions', sub: 'Testés et garantis' },
    { href: '/reconditiones', label: 'Reconditionnés', sub: 'Remis à neuf' },
  ]
  const tabletteItems = [
    { href: '/catalogue/tablette', label: 'Toutes les tablettes' },
    { href: '/catalogue/tablette?brand=Apple', label: 'Apple iPad', sub: 'iPad, iPad Pro, iPad Air' },
    { href: '/catalogue/tablette?brand=Samsung', label: 'Samsung Galaxy Tab' },
  ]
  const ordinateurItems = [
    { href: '/catalogue/ordinateur', label: 'Tous les ordinateurs' },
    { href: '/catalogue/ordinateur?brand=Apple', label: 'Apple MacBook' },
    { href: '/catalogue/ordinateur?brand=Dell', label: 'Dell' },
    { href: '/catalogue/ordinateur?brand=HP', label: 'HP' },
    { href: '/catalogue/ordinateur?brand=Lenovo', label: 'Lenovo' },
  ]
  const montreItems = [
    { href: '/catalogue/montre', label: 'Toutes les montres' },
    { href: '/catalogue/montre?brand=Apple', label: 'Apple Watch' },
    { href: '/catalogue/montre?brand=Samsung', label: 'Samsung Galaxy Watch' },
  ]
  const ecouteurItems = [
    { href: '/catalogue/ecouteur', label: 'Tous les écouteurs' },
    { href: '/catalogue/ecouteur?brand=Apple', label: 'Apple AirPods' },
    { href: '/catalogue/ecouteur?brand=Samsung', label: 'Samsung Galaxy Buds' },
    { href: '/catalogue/ecouteur?brand=Sony', label: 'Sony' },
  ]

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
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'text-[#00B4CC] bg-cyan-50' : 'text-[#1B2A4A] hover:text-[#00B4CC] hover:bg-gray-50'
              }`
            }
          >
            <span className="flex items-center gap-1.5">
              <Home size={15} />
              {t('nav_home') || 'Accueil'}
            </span>
          </NavLink>

          <NavDropdown label={t('nav_smartphones')} icon={<Smartphone size={15} />} items={smartphonesItems} />
          <NavDropdown label={t('nav_tablettes')} icon={<Tablet size={15} />} items={tabletteItems} />
          <NavDropdown label={t('nav_ordinateurs')} icon={<Monitor size={15} />} items={ordinateurItems} />
          <NavDropdown label={t('nav_montres')} icon={<Watch size={15} />} items={montreItems} />
          <NavDropdown label={t('nav_ecouteurs')} icon={<Headphones size={15} />} items={ecouteurItems} />

          <NavLink
            to="/rachat"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'text-[#00B4CC] bg-cyan-50' : 'text-[#1B2A4A] hover:text-[#00B4CC] hover:bg-gray-50'
              }`
            }
          >
            {t('nav_revendre')}
          </NavLink>
          <NavLink
            to="/pro"
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive ? 'text-[#00B4CC] bg-cyan-50' : 'text-[#1B2A4A] hover:text-[#00B4CC] hover:bg-gray-50'
              }`
            }
          >
            {t('nav_pro')}
          </NavLink>
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
