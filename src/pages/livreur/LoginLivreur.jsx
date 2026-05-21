import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function LoginLivreur() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const hashPassword = async (pwd) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const hash = await hashPassword(password)
      const { data, error: err } = await supabase
        .from('livreurs')
        .select('*')
        .eq('email', email)
        .eq('password_hash', hash)
        .single()

      if (err || !data) {
        setError('Email ou mot de passe incorrect')
        setLoading(false)
        return
      }
      if (data.status === 'pending') {
        setError('Votre compte est en cours de validation.')
        setLoading(false)
        return
      }
      if (data.status === 'rejected') {
        setError('Votre candidature a été refusée. Contactez contact@sebphone.be')
        setLoading(false)
        return
      }
      localStorage.setItem('livreur', JSON.stringify(data))
      navigate('/livreur/dashboard')
    } catch (e) {
      setError('Erreur de connexion')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚗</div>
          <h1 className="font-bold text-[#1B2A4A] text-xl">Espace Livreur</h1>
          <p className="text-xs text-gray-500 mt-1">SebPhone Bruxelles</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
