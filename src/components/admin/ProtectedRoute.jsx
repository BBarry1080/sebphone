import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [authed, setAuthed] = useState(undefined)

  useEffect(() => {
    // 1. Check localStorage (admin hardcodé ou employé staff)
    const localAdmin = localStorage.getItem('sebphone_admin') === 'true'
    if (localAdmin) {
      setAuthed(true)
      return
    }

    // 2. Fallback Supabase Auth (ancien système)
    if (!isSupabaseReady) {
      setAuthed(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setAuthed(!!session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (authed === undefined) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
    </div>
  )
  if (!authed) return <Navigate to="/admin/login" replace />
  return children
}
