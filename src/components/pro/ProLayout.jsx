import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Home, Smartphone, Tablet, Monitor, Watch, Headphones, LogOut } from 'lucide-react'

const ProNavDropdown = ({ label, icon, items }) => {
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
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-[#1B2A4A] hover:text-[#00B4CC] transition-colors">
        {icon} {label}
        <ChevronDown size={14} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute top-8 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-48 z-50">
          {items.map((item) => (
            <Link key={item.href} to={item.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-[#1B2A4A] hover:text-[#00B4CC]">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProLayout({ children }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('sebphone_pro')
    navigate('/pro')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/pro/accueil" className="flex items-center gap-2">
            <span className="text-xl font-black text-[#00B4CC]">SEB</span>
            <span className="text-xl font-black text-[#1B2A4A]">PHONE</span>
            <span className="bg-[#1B2A4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">PRO</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <Link to="/pro/accueil"
              className="flex items-center gap-1.5 text-sm font-medium text-[#1B2A4A] hover:text-[#00B4CC]">
              <Home size={15} /> Accueil
            </Link>
            <ProNavDropdown label="Smartphones" icon={<Smartphone size={15} />}
              items={[
                { href: '/pro/catalogue/telephone', label: 'Tous les smartphones' },
                { href: '/pro/catalogue/telephone?brand=Apple', label: 'Apple iPhone' },
                { href: '/pro/catalogue/telephone?brand=Samsung', label: 'Samsung' },
              ]} />
            <ProNavDropdown label="Tablettes" icon={<Tablet size={15} />}
              items={[
                { href: '/pro/catalogue/tablette', label: 'Toutes les tablettes' },
                { href: '/pro/catalogue/tablette?brand=Apple', label: 'Apple iPad' },
                { href: '/pro/catalogue/tablette?brand=Samsung', label: 'Samsung' },
              ]} />
            <ProNavDropdown label="Ordinateurs" icon={<Monitor size={15} />}
              items={[
                { href: '/pro/catalogue/ordinateur', label: 'Tous les ordinateurs' },
                { href: '/pro/catalogue/ordinateur?brand=Apple', label: 'Apple MacBook' },
              ]} />
            <ProNavDropdown label="Montres" icon={<Watch size={15} />}
              items={[
                { href: '/pro/catalogue/montre', label: 'Toutes les montres' },
                { href: '/pro/catalogue/montre?brand=Apple', label: 'Apple Watch' },
                { href: '/pro/catalogue/montre?brand=Samsung', label: 'Samsung' },
              ]} />
            <ProNavDropdown label="Écouteurs" icon={<Headphones size={15} />}
              items={[
                { href: '/pro/catalogue/ecouteur', label: 'Tous les écouteurs' },
                { href: '/pro/catalogue/ecouteur?brand=Apple', label: 'AirPods' },
                { href: '/pro/catalogue/ecouteur?brand=Samsung', label: 'Galaxy Buds' },
              ]} />
          </nav>

          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500">
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  )
}
