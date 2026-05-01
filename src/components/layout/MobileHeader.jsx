import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Search, Phone, Mail, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';

const navLinks = [
  { to: '/',              label: 'Accueil' },
  { to: '/iphone',        label: 'iPhone' },
  { to: '/samsung',       label: 'Samsung' },
  { to: '/occasions',     label: 'Occasions' },
  { to: '/reconditiones', label: 'Reconditionnés' },
  { to: '/sur-commande',  label: '📦 Sur commande', highlight: true },
  { to: '/rachat',        label: 'Revendre' },
];

function SebLogo() {
  return (
    <Link to="/" className="flex items-center">
      <img
        src="/images/logo/SEBPHONEbysebtelecom.png"
        alt="SebPhone"
        className="h-8 w-auto object-contain"
        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
      />
    </Link>
  );
}

export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/boutique?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white shadow-sm">
      <div className="px-4 h-14 flex items-center justify-between">
        <SebLogo />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-[#555555] cursor-pointer"
          >
            <Search size={20} />
          </button>
          <Link to="/panier" className="relative p-2 text-[#555555]">
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
          <button onClick={() => setOpen(!open)} className="p-2 text-[#1B2A4A] cursor-pointer">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Search bar dropdown */}
      <AnimatePresence>
        {searchOpen && (
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center gap-2">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un téléphone..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setQuery(''); }}
                className="p-1 text-gray-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-30 top-14"
              onClick={() => setOpen(false)}
            />
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed right-0 top-14 bottom-0 w-72 bg-white z-40 shadow-2xl flex flex-col"
            >
              <div className="flex flex-col py-4 flex-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to + link.label}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`px-6 py-4 font-medium text-base border-b border-gray-50 transition-colors ${
                      link.highlight
                        ? 'text-orange-500 hover:bg-orange-50'
                        : 'text-[#1B2A4A] hover:bg-[#F5F5F5] hover:text-[#00B4CC]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="px-6 py-6 bg-[#F5F5F5] border-t border-gray-100">
                <p className="text-xs text-[#555555] font-semibold uppercase tracking-wide mb-3">Contact</p>
                <a href="tel:+3249240540057" className="flex items-center gap-2 text-sm text-[#1B2A4A] mb-2">
                  <Phone size={14} className="text-[#00B4CC]" />
                  +32(0)492 / 40.54.57
                </a>
                <a href="mailto:contact@sebphone.be" className="flex items-center gap-2 text-sm text-[#1B2A4A]">
                  <Mail size={14} className="text-[#00B4CC]" />
                  contact@sebphone.be
                </a>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
