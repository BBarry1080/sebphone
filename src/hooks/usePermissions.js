import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useCurrentUser() {
  try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} }
}

export function useIsAdmin() {
  const user = useCurrentUser()
  return user.role === 'admin' || !user.role
}

export function usePermission(perm) {
  const user = useCurrentUser()
  if (user.role === 'admin' || !user.role) return true
  return user.permissions?.[perm] === true
}

export function useRequirePermission(perm) {
  const navigate = useNavigate()
  const hasPermission = usePermission(perm)
  useEffect(() => {
    if (!hasPermission) navigate('/admin/dashboard', { replace: true })
  }, [hasPermission])
  return hasPermission
}
