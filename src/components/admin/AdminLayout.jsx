import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, ClipboardList, Users, Settings, LogOut, Bell,
} from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

const navItems = [
  { to: '/admin/dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/admin/stock',       label: 'Stock',        Icon: Smartphone },
  { to: '/admin/commandes',   label: 'Commandes',    Icon: ClipboardList },
  { to: '/admin/clients',     label: 'Clients',      Icon: Users },
  { to: '/admin/parametres',  label: 'Paramètres',   Icon: Settings },
]

const PAGE_TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/stock': 'Gestion du stock',
  '/admin/commandes': 'Commandes',
  '/admin/clients': 'Clients',
  '/admin/parametres': 'Paramètres',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!isSupabaseReady) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  const handleSignOut = async () => {
    if (isSupabaseReady) await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] flex-shrink-0 bg-[#1B2A4A] flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-poppins font-bold text-xl">
              <span className="text-[#00B4CC]">SEB</span>
              <span className="text-white">PHONE</span>
            </span>
            <span className="text-[10px] font-bold uppercase bg-[#00B4CC] text-white px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[rgba(0,180,204,0.2)] text-[#00B4CC] border-l-4 border-[#00B4CC] pl-2'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#00B4CC] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.user_metadata?.full_name || 'Administrateur'}
              </p>
              <p className="text-[#94A3B8] text-[11px] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 text-sm text-[#94A3B8] hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-[#555555]">
            <span className="text-[#1B2A4A] font-semibold">Admin</span>
          </div>
          <button className="relative p-2 text-[#555555] hover:text-[#1B2A4A] cursor-pointer">
            <Bell size={18} />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
