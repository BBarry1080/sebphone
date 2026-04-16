import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isSupabaseReady) {
      setSession(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSession(session)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (!isSupabaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
          <p className="text-3xl mb-4">⚙️</p>
          <h1 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-2">
            Supabase non configuré
          </h1>
          <p className="text-sm text-[#555555] mb-4">
            Créez le fichier <code className="bg-gray-100 px-1.5 py-0.5 rounded">.env.local</code> avec vos clés Supabase pour accéder au back-office.
          </p>
          <Navigate to="/admin/login" replace />
        </div>
      </div>
    )
  }

  if (session === undefined) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
    </div>
  )
  if (!session) return <Navigate to="/admin/login" replace />
  return children
}
