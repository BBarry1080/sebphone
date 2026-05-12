import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../lib/supabase'

const ALL_PERMISSIONS = [
  'voir_dashboard',
  'voir_stock', 'ajouter_stock', 'modifier_stock', 'supprimer_stock', 'offre_semaine',
  'stock_reconditionnement',
  'voir_commandes', 'modifier_commandes', 'encaisser', 'changer_modele', 'supprimer_commande', 'verifier_code',
  'voir_clients', 'codes_promo',
  'voir_comptabilite', 'ajouter_paiements',
  'compta_anderlecht', 'compta_molenbeek', 'compta_rue_neuve', 'compta_louise', 'compta_tubize', 'compta_saint_gilles',
  'registre_achats',
  'gerer_utilisateurs',
]

function readUserFromStorage() {
  try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} }
}

export function useCurrentUser() {
  const [user, setUser] = useState(readUserFromStorage)

  useEffect(() => {
    if (!isSupabaseReady) return
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session
      if (session?.user?.email === 'admin@sebphone.be') {
        const adminUser = {
          id:              session.user.id,
          email:           session.user.email,
          role:            'admin',
          name:            'Admin',
          isSupabaseAdmin: true,
          permissions:     Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, true])),
        }
        localStorage.setItem('sebphone_user', JSON.stringify(adminUser))
        setUser(adminUser)
      }
    })
  }, [])

  return user
}

export function useIsAdmin() {
  const user = useCurrentUser()
  return user?.role === 'admin' ||
         user?.email === 'admin@sebphone.be' ||
         user?.isSupabaseAdmin === true
}

export function usePermission(perm) {
  const user = useCurrentUser()
  if (user?.role === 'admin' || !user?.role) return true
  if (user?.email === 'admin@sebphone.be' || user?.isSupabaseAdmin === true) return true
  return user?.permissions?.[perm] === true
}

export function useRequirePermission(perm) {
  const navigate = useNavigate()
  const hasPermission = usePermission(perm)
  useEffect(() => {
    if (!hasPermission) navigate('/admin/dashboard', { replace: true })
  }, [hasPermission])
  return hasPermission
}
