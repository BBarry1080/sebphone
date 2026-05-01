import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useStaffCheck() {
  const navigate = useNavigate()
  useEffect(() => {
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} } })()
    if (currentUser.role === 'admin' || !currentUser.id) return

    const checkActive = async () => {
      const { data } = await supabase.from('staff').select('active, permissions').eq('id', currentUser.id).single()
      if (!data || !data.active) {
        localStorage.removeItem('sebphone_user')
        localStorage.removeItem('sebphone_admin')
        navigate('/admin/login')
        return
      }
      const updatedUser = { ...currentUser, permissions: data.permissions }
      localStorage.setItem('sebphone_user', JSON.stringify(updatedUser))
    }

    checkActive()
    const interval = setInterval(checkActive, 30000)
    return () => clearInterval(interval)
  }, [])
}
