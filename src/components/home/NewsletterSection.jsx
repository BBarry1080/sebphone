import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Mail } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setStatus('error')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({ email: email.toLowerCase().trim() })

      if (error) {
        if (error.code === '23505') {
          setStatus('exists')
        } else {
          setStatus('error')
        }
      } else {
        setStatus('success')
        setEmail('')
      }
    } catch (e) {
      setStatus('error')
    }
    setLoading(false)
  }

  return (
    <section className="bg-[#1B2A4A] py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#00B4CC] rounded-2xl mb-6">
          <Mail size={24} className="text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
          Offres exclusives & nouveautés
        </h2>
        <p className="text-[#94A3B8] text-sm mb-8">
          Inscrivez-vous et soyez le premier à recevoir nos
          meilleures offres, promotions et arrivages.
        </p>

        {status === 'success' ? (
          <div className="bg-green-500/20 border border-green-400 rounded-2xl px-6 py-4 text-green-300 font-medium">
            ✓ Inscription confirmée ! Vous recevrez nos prochaines offres.
          </div>
        ) : (
          <>
            <div className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                placeholder="votre@email.com"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm outline-none focus:border-[#00B4CC] transition-colors"
              />
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="px-5 py-3 bg-[#00B4CC] text-white rounded-xl font-bold text-sm hover:bg-[#0099b3] transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? '...' : "S'inscrire"}
              </button>
            </div>
            {status === 'exists' && (
              <p className="text-amber-400 text-xs mt-3">
                Cet email est déjà inscrit à notre newsletter.
              </p>
            )}
            {status === 'error' && (
              <p className="text-red-400 text-xs mt-3">
                Adresse email invalide. Vérifiez et réessayez.
              </p>
            )}
            <p className="text-white/30 text-xs mt-4">
              Aucun spam. Désinscription à tout moment.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
