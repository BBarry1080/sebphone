import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, ClipboardList, Settings, LogOut,
  Bell, Menu, X, Tag, QrCode, Calculator,
} from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useStaffCheck } from '../../hooks/useStaffCheck'

function SidebarContent({ onClose }) {
  const navigate = useNavigate()
  const [supaUser, setSupaUser] = useState(null)

  useEffect(() => {
    if (!isSupabaseReady) return
    supabase.auth.getSession().then(({ data }) => setSupaUser(data.session?.user ?? null))
  }, [])

  const handleSignOut = async () => {
    if (isSupabaseReady) await supabase.auth.signOut()
    localStorage.removeItem('sebphone_user')
    navigate('/admin/login')
  }

  // Lecture user courant (admin Supabase Auth OU employé localStorage)
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} }
  })()

  const isAdmin = storedUser.role === 'admin' || !!supaUser
  const perms   = storedUser.permissions || {}
  const has     = (perm) => isAdmin || perms[perm] === true

  const displayName = storedUser.name || supaUser?.user_metadata?.full_name || 'Administrateur'
  const displayEmail = storedUser.email || supaUser?.email || ''
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD'

  const navItems = [
    { to: '/admin/dashboard',     label: 'Dashboard',     Icon: LayoutDashboard, show: true },
    { to: '/admin/stock',         label: 'Stock',         Icon: Smartphone,      show: has('voir_stock') },
    { to: '/admin/commandes',     label: 'Commandes',     Icon: ClipboardList,   show: has('voir_commandes') },
    { to: '/admin/promoCodes',    label: 'Codes promo',   Icon: Tag,             show: has('codes_promo') },
    { to: '/admin/verifier-code', label: 'Vérifier code', Icon: QrCode,          show: has('verifier_code') },
    { to: '/admin/comptabilite',  label: 'Comptabilité',  Icon: Calculator,      show: has('voir_comptabilite') },
    { to: '/admin/parametres',    label: 'Paramètres',    Icon: Settings,        show: isAdmin },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-poppins font-bold text-xl">
            <span className="text-[#00B4CC]">SEB</span>
            <span className="text-white">PHONE</span>
          </span>
          <span className="text-[10px] font-bold uppercase bg-[#00B4CC] text-white px-1.5 py-0.5 rounded">
            {isAdmin ? 'Admin' : 'Staff'}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/60 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.filter((item) => item.show).map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
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
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-[#94A3B8] text-[11px] truncate">{displayEmail}</p>
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
    </div>
  )
}

export default function AdminLayout() {
  useStaffCheck()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#1B2A4A] flex items-center justify-between px-4 py-3">
        <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
          <Menu size={24} />
        </button>
        <span className="font-poppins font-bold text-lg">
          <span className="text-[#00B4CC]">SEB</span>
          <span className="text-white">PHONE</span>
        </span>
        <div className="w-8" />
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#1B2A4A] z-50 transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      <aside className="hidden lg:flex w-[240px] flex-shrink-0 bg-[#1B2A4A] flex-col h-full">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden pt-12 lg:pt-0">
        <header className="hidden lg:flex bg-white border-b border-gray-200 px-6 h-14 items-center justify-between flex-shrink-0">
          <div className="text-sm text-[#555555]">
            <span className="text-[#1B2A4A] font-semibold">Admin</span>
          </div>
          <button className="relative p-2 text-[#555555] hover:text-[#1B2A4A] cursor-pointer">
            <Bell size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
