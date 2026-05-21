import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, ClipboardList, Settings, LogOut,
  Bell, Menu, X, Tag, QrCode, Calculator, BookOpen, ShoppingBag, Wrench, Briefcase,
} from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useStaffCheck } from '../../hooks/useStaffCheck'
import { useAdminNotifications } from '../../hooks/useAdminNotifications'

function SidebarContent({ onClose }) {
  const navigate = useNavigate()
  const [supaUser, setSupaUser] = useState(null)

  useEffect(() => {
    if (!isSupabaseReady) return
    supabase.auth.getSession().then(({ data }) => setSupaUser(data.session?.user ?? null))
  }, [])

  const handleSignOut = async () => {
    if (isSupabaseReady) await supabase.auth.signOut()
    localStorage.removeItem('sebphone_admin')
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
    { to: '/admin/stock',         label: 'Stock',             Icon: Smartphone,    show: has('voir_stock') },
    { to: '/admin/vendus',        label: 'Historique ventes', Icon: ShoppingBag,   show: has('voir_stock') },
    { to: '/admin/commandes',     label: 'Commandes',     Icon: ClipboardList,   show: has('voir_commandes') },
    { to: '/admin/promoCodes',    label: 'Codes promo',   Icon: Tag,             show: has('codes_promo') },
    { to: '/admin/verifier-code', label: 'Vérifier code', Icon: QrCode,          show: has('verifier_code') },
    { to: '/admin/comptabilite',  label: 'Comptabilité',  Icon: Calculator,      show: has('voir_comptabilite') },
    { to: '/admin/registre',          label: "Registre d'achat",      Icon: BookOpen, show: has('registre_achats') },
    { to: '/admin/reconditionnement', label: 'Stock Reconditionnement', Icon: Wrench,  show: has('stock_reconditionnement') },
    { to: '/admin/pro',           label: '👔 Espace Pro', Icon: Briefcase,       show: isAdmin },
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
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { notifications, unreadCount, markAllRead } = useAdminNotifications()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead() }}
              className="relative p-2 rounded-xl hover:bg-gray-100 transition-all cursor-pointer text-[#555555] hover:text-[#1B2A4A]"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-[#1B2A4A] text-sm">Notifications</h3>
                  <span className="text-xs text-gray-400">{notifications.length} événements</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">Aucune notification</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-all ${!notif.read ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">
                            {notif.status === 'recupere' ? '✅'
                              : notif.status === 'annule' ? '❌'
                              : '🔔'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1B2A4A] truncate">{notif.title}</p>
                            <p className="text-xs text-gray-500 truncate">{notif.subtitle}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(notif.time).toLocaleString('fr-BE', {
                                day: '2-digit', month: '2-digit',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-gray-100">
                  <button
                    onClick={() => { setShowNotifs(false); navigate('/admin/commandes') }}
                    className="w-full text-center text-xs text-[#00B4CC] font-semibold hover:underline cursor-pointer"
                  >
                    Voir toutes les commandes →
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
