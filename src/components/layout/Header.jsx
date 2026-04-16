import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../../context/CartContext';

function SebLogo() {
  return (
    <Link to="/" className="flex flex-col leading-none">
      <span className="font-poppins font-bold text-2xl tracking-tight">
        <span style={{ color: '#00B4CC' }}>SEB</span>
        <span style={{ color: '#1B2A4A' }}>PHONE</span>
      </span>
      <span className="text-xs italic text-[#555555] -mt-0.5">Où tu veux, quand tu veux</span>
    </Link>
  );
}

const navLinks = [
  { to: '/',              label: 'Accueil',       end: true },
  { to: '/boutique',      label: 'iPhone',        end: false },
  { to: '/boutique?brand=Samsung', label: 'Samsung', end: false },
  { to: '/occasions',     label: 'Occasions',     end: false },
  { to: '/reconditiones', label: 'Reconditionnés', end: false },
  { to: '/rachat',        label: 'Rachat',        end: false },
];

export default function Header() {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { totalItems } = useCart();

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
          <span className="text-[#00B4CC] font-medium">Livraison en Belgique · Click &amp; Collect disponible</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <SebLogo />

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to + link.label}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-[#00B4CC] bg-cyan-50'
                    : 'text-[#1B2A4A] hover:text-[#00B4CC] hover:bg-gray-50'
                }`
              }
            >
              {link.label}
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
                placeholder="Rechercher..."
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
          <button className="p-2 rounded-lg hover:bg-gray-50 text-[#555555] hover:text-[#00B4CC] transition-colors cursor-pointer">
            <User size={20} />
          </button>
          <Link to="/panier" className="relative p-2 rounded-lg hover:bg-gray-50 text-[#555555] hover:text-[#00B4CC] transition-colors">
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
