import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { sha256 } from 'js-sha256'

const SALT = 'sebphone_salt_2026'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    if (!isSupabaseReady) {
      setError('Supabase non configuré — créez .env.local avec vos clés.')
      return
    }
    setLoading(true)

    // 1. Tentative de connexion admin Supabase Auth (admin principal)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (!authError) {
      localStorage.setItem('sebphone_user', JSON.stringify({
        name: 'Admin',
        email,
        role: 'admin',
        magasin_id: null,
        permissions: null,
      }))
      navigate('/admin/dashboard')
      return
    }

    // 2. Tentative connexion employé (table staff)
    const hashedPassword = sha256(password + SALT)
    console.log('=== LOGIN DEBUG ===')
    console.log('email saisi:', email)
    console.log('password saisi:', password)
    console.log('hash généré:', hashedPassword)

    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single()

    console.log('staffData trouvé:', staffData)
    console.log('staffError:', staffError)
    console.log('hash en DB:', staffData?.password_hash)
    console.log('hash match:', staffData?.password_hash === hashedPassword)

    if (!staffError && staffData && staffData.password_hash === hashedPassword && staffData.active) {
      localStorage.setItem('sebphone_user', JSON.stringify({
        id:          staffData.id,
        name:        staffData.name,
        email:       staffData.email,
        role:        'employe',
        magasin_id:  staffData.magasin_id,
        permissions: staffData.permissions,
      }))
      await supabase.from('staff').update({ last_login: new Date().toISOString() }).eq('id', staffData.id)
      navigate('/admin/dashboard')
      return
    }

    setError('Email ou mot de passe incorrect')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <span className="font-poppins font-bold text-2xl tracking-tight">
            <span className="text-[#00B4CC]">SEB</span>
            <span className="text-[#1B2A4A]">PHONE</span>
          </span>
          <span className="mt-1.5 text-xs font-medium text-[#555555] bg-[#F5F5F5] px-3 py-1 rounded-full">
            Back-office Admin
          </span>
        </div>

        <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-6 text-center">
          Connexion
        </h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1B2A4A]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@sebphone.be"
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1B2A4A]">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1B2A4A] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-[#888888] hover:text-[#1B2A4A] transition-colors">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}
