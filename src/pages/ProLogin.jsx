import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { sha256 } from 'js-sha256'
import emailjs from '@emailjs/browser'

const SALT = 'sebphone_salt_2026'
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'rqbaYNMIGNP6IQB9O'
const PRO_TEMPLATE_ID = 'template_qukek6a'

export default function ProLogin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    vat_number: '',
    address: '',
    password: '',
    password_confirm: '',
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!isSupabaseReady) { setError('Service indisponible'); return }
    setLoading(true)
    try {
      const cleanEmail = loginEmail.trim().toLowerCase()
      const hashedPassword = sha256(loginPassword + SALT)

      const { data: account } = await supabase
        .from('pro_accounts')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (!account || account.password_hash !== hashedPassword) {
        setError('Email ou mot de passe incorrect')
        return
      }

      if (account.status === 'pending') {
        setInfo('Votre compte est en cours d\'approbation. Vous recevrez un email dès validation.')
        return
      }
      if (account.status === 'rejected') {
        setError('Votre demande a été refusée. Contactez-nous pour plus d\'informations.')
        return
      }
      if (account.status === 'approved') {
        localStorage.setItem('sebphone_pro', JSON.stringify({
          id: account.id,
          company_name: account.company_name,
          contact_name: account.contact_name,
          email: account.email,
        }))
        navigate('/pro/catalogue')
        return
      }
      setError('Statut de compte inconnu')
    } catch (err) {
      console.error('Pro login error:', err)
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!isSupabaseReady) { setError('Service indisponible'); return }
    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    setLoading(true)
    try {
      const cleanEmail = form.email.trim().toLowerCase()

      const { data: existing } = await supabase
        .from('pro_accounts')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (existing) {
        setError('Un compte existe déjà avec cet email')
        return
      }

      const { error: insertError } = await supabase
        .from('pro_accounts')
        .insert([{
          company_name:  form.company_name,
          contact_name:  form.contact_name,
          email:         cleanEmail,
          phone:         form.phone,
          vat_number:    form.vat_number,
          address:       form.address,
          password_hash: sha256(form.password + SALT),
          status:        'pending',
        }])

      if (insertError) throw insertError

      // Notification best-effort à l'équipe
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          PRO_TEMPLATE_ID,
          {
            to_email: 'contact@sebphone.be',
            company_name: form.company_name,
            message: `Nouvelle demande d'accès pro : ${form.company_name} (${cleanEmail}) — TVA ${form.vat_number}`,
          },
          EMAILJS_PUBLIC_KEY,
        )
      } catch (mailErr) {
        console.warn('Notification email non envoyée:', mailErr)
      }

      setInfo('Demande envoyée ! Votre compte sera activé après validation par notre équipe.')
      setTab('login')
    } catch (err) {
      console.error('Pro register error:', err)
      setError('Une erreur est survenue lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const fld = (k) => ({
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  return (
    <main className="max-w-md mx-auto px-4 py-10 pb-28 md:pb-12">
      <div className="bg-white rounded-2xl shadow-md p-8">
        <div className="text-center mb-6">
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Espace Professionnels</h1>
          <p className="text-sm text-[#555] mt-1">Accédez à nos tarifs et stocks B2B</p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {[
            { id: 'login', label: 'Se connecter' },
            { id: 'register', label: 'Créer un compte pro' },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); setError(null); setInfo(null) }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                tab === tb.id ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-gray-500'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4">
            {info}
          </p>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Email professionnel</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1B2A4A] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 mt-1"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Nom de la société *</label>
              <input {...fld('company_name')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Nom du contact *</label>
              <input {...fld('contact_name')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Email professionnel *</label>
              <input type="email" {...fld('email')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Téléphone *</label>
              <input type="tel" {...fld('phone')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Numéro de TVA *</label>
              <input {...fld('vat_number')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Adresse *</label>
              <input {...fld('address')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Mot de passe *</label>
              <input type="password" {...fld('password')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#1B2A4A]">Confirmer le mot de passe *</label>
              <input type="password" {...fld('password_confirm')} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 mt-1"
            >
              {loading ? 'Envoi...' : 'Créer mon compte pro'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
