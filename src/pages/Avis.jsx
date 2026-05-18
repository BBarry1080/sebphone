import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GOOGLE_REVIEW_LINKS } from '../data/googleReviews'
import emailjs from '@emailjs/browser'
import { useLanguage } from '../contexts/LanguageContext'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'rqbaYNMIGNP6IQB9O'

const MAGASINS_LIST = [
  { id: 'anderlecht', nom: 'Anderlecht' },
  { id: 'molenbeek', nom: 'Molenbeek' },
  { id: 'louise', nom: 'Louise' },
  { id: 'tubize', nom: 'Tubize' },
  { id: 'rue-neuve', nom: 'Rue Neuve' },
]

export default function Avis() {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const magasinParam = searchParams.get('magasin') || ''

  const [reviews, setReviews] = useState([]) // avis déjà postés par ce client
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [showNameInput, setShowNameInput] = useState(!email)
  const [inputEmail, setInputEmail] = useState(email)
  const [success, setSuccess] = useState(null)

  const fetchReviews = async (mail) => {
    if (!mail) return
    setLoading(true)
    const { data } = await supabase
      .from('customer_reviews')
      .select('*')
      .eq('customer_email', mail.toLowerCase())
    setReviews(data || [])
    // Récupère le nom depuis la dernière commande
    const { data: orderData } = await supabase
      .from('orders')
      .select('customer_name')
      .eq('customer_email', mail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
    if (orderData?.[0]) setCustomerName(orderData[0].customer_name)
    setLoading(false)
  }

  useEffect(() => {
    if (email) fetchReviews(email)
    else setLoading(false)
  }, [email])

  const reviewedMagasins = reviews.map(r => r.magasin_id)
  const totalReviews = reviews.length
  const allFiveDone = totalReviews >= 5
  const threeOrMoreDone = totalReviews >= 3

  // Calcul récompense
  const getReward = () => {
    if (allFiveDone && !reviews.find(r => r.reward_sent === 'coque_verre'))
      return 'coque_verre'
    if (threeOrMoreDone && !reviews.find(r => r.reward_sent === 'coque'))
      return 'coque'
    return null
  }

  const handlePostReview = async (magasin) => {
    if (!inputEmail) {
      alert(t('avis_email_prompt'))
      return
    }
    // Ouvre le lien Google dans un nouvel onglet
    window.open(GOOGLE_REVIEW_LINKS[magasin.id]?.url, '_blank')
  }

  const handleConfirmReview = async (magasin) => {
    if (!inputEmail) return
    setSubmitting(magasin.id)

    try {
      // Insère l'avis dans la DB
      const { error } = await supabase
        .from('customer_reviews')
        .insert([{
          customer_email: inputEmail.toLowerCase(),
          customer_name: customerName,
          magasin_id: magasin.id,
        }])

      if (error && error.code === '23505') {
        alert(t('avis_already_posted'))
        setSubmitting(null)
        return
      }

      await fetchReviews(inputEmail)

      // Vérifie si récompense à envoyer
      const newTotal = totalReviews + 1
      const reward = newTotal >= 5 ? 'coque_verre' : newTotal >= 3 ? 'coque' : null

      if (reward) {
        // Génère un code promo unique
        const promoCode = `AVIS${reward === 'coque_verre' ? '5MAG' : '3MAG'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

        // Sauvegarde le code dans les avis
        await supabase
          .from('customer_reviews')
          .update({ reward_sent: reward })
          .eq('customer_email', inputEmail.toLowerCase())
          .is('reward_sent', null)

        // Envoie l'email récompense
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            'template_202rbo1',
            {
              to_email: inputEmail,
              to_name: customerName || inputEmail,
              customer_name: customerName || 'Cher client',
              promo_code: promoCode,
              reward_type: reward === 'coque_verre'
                ? 'une coque au choix + protection verre trempé'
                : 'une coque au choix',
              reward_description: reward === 'coque_verre'
                ? 'Félicitations ! Vous avez posté un avis sur nos 5 magasins. Voici votre cadeau : une coque au choix + une protection verre trempé offerts !'
                : 'Merci ! Vous avez posté 3 avis. Voici votre cadeau : une coque au choix offerte !',
              magasins_count: newTotal,
            },
            EMAILJS_PUBLIC_KEY
          )
          setSuccess({ reward, promoCode })
        } catch (emailErr) {
          console.warn('Email récompense non envoyé:', emailErr)
          setSuccess({ reward, promoCode })
        }
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
    setSubmitting(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white py-10 px-4 text-center">
        <h1 className="text-2xl font-black mb-2">⭐ {t('avis_title')}</h1>
        <p className="text-gray-300 text-sm">
          {t('avis_subtitle')}
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Email input si pas dans l'URL */}
        {!email && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <p className="text-sm font-bold text-[#1B2A4A] mb-3">
              {t('avis_email_prompt')}
            </p>
            <div className="flex gap-2">
              <input
                value={inputEmail}
                onChange={e => setInputEmail(e.target.value)}
                placeholder={t('avis_email_placeholder')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
              />
              <button
                onClick={() => fetchReviews(inputEmail)}
                className="bg-[#1B2A4A] text-white px-4 py-2 rounded-xl text-sm font-bold">
                {t('avis_see_btn')}
              </button>
            </div>
          </div>
        )}

        {/* BARRE DE PROGRESSION */}
        {inputEmail && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-[#1B2A4A]">
                {t('avis_progress')}
              </h2>
              <span className="text-2xl font-black text-[#00B4CC]">
                {totalReviews}/5
              </span>
            </div>

            {/* Barre */}
            <div className="w-full bg-gray-100 rounded-full h-4 mb-3 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-500"
                style={{
                  width: `${(totalReviews / 5) * 100}%`,
                  background: allFiveDone
                    ? 'linear-gradient(90deg, #22c55e, #00B4CC)'
                    : threeOrMoreDone
                      ? 'linear-gradient(90deg, #f59e0b, #00B4CC)'
                      : 'linear-gradient(90deg, #1B2A4A, #00B4CC)',
                }}
              />
            </div>

            {/* Paliers */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className={`font-bold ${totalReviews >= 3 ? 'text-orange-500' : ''}`}>
                {t('avis_reward_3')}
              </span>
              <span className={`font-bold ${totalReviews >= 5 ? 'text-green-600' : ''}`}>
                {t('avis_reward_5')}
              </span>
            </div>

            {/* Message récompense */}
            {success && (
              <div className="mt-4 bg-green-50 border-2 border-green-400 rounded-xl p-4 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="font-bold text-green-700 text-sm">
                  {success.reward === 'coque_verre'
                    ? t('avis_reward_coque')
                    : t('avis_reward_coque_simple')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t('avis_reward_email')}
                </p>
                <div className="mt-3 bg-white border border-green-300 rounded-xl px-4 py-2">
                  <p className="text-xs text-gray-500">{t('avis_promo_label')}</p>
                  <p className="font-black text-[#1B2A4A] text-lg tracking-wider">
                    {success.promoCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LISTE DES MAGASINS */}
        <div className="space-y-3">
          {MAGASINS_LIST.map(magasin => {
            const done = reviewedMagasins.includes(magasin.id)
            const isCurrentMagasin = magasin.id === magasinParam

            return (
              <div key={magasin.id}
                className={`bg-white rounded-2xl border shadow-sm p-4
                  ${done ? 'border-green-200 bg-green-50'
                    : isCurrentMagasin ? 'border-[#00B4CC]'
                    : 'border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center
                                    justify-center text-lg font-black
                      ${done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {done ? '✓' : '⭐'}
                    </div>
                    <div>
                      <p className="font-bold text-[#1B2A4A] text-sm">
                        SebPhone {magasin.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                        {done ? t('avis_posted') : t('avis_not_posted')}
                      </p>
                    </div>
                  </div>

                  {!done && (
                    <div className="flex gap-2">
                      {/* Bouton ouvrir Google */}
                      <button
                        onClick={() => handlePostReview(magasin)}
                        className="bg-[#1B2A4A] text-white text-xs font-bold
                                   px-3 py-2 rounded-xl hover:bg-[#00B4CC] transition-all">
                        {t('avis_post_btn')}
                      </button>
                      {/* Bouton confirmer */}
                      <button
                        onClick={() => handleConfirmReview(magasin)}
                        disabled={submitting === magasin.id}
                        className="bg-green-500 text-white text-xs font-bold
                                   px-3 py-2 rounded-xl hover:bg-green-600
                                   transition-all disabled:opacity-50">
                        {submitting === magasin.id ? '...' : t('avis_confirm_btn')}
                      </button>
                    </div>
                  )}

                  {done && (
                    <span className="text-green-600 font-bold text-sm">{t('avis_done')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Explication */}
        <div className="mt-6 bg-[#f0f7ff] border border-[#1B2A4A]/10 rounded-2xl p-4">
          <p className="text-xs text-gray-600 font-bold mb-2">{t('avis_how_title')}</p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>{t('avis_how_1')}</li>
            <li>{t('avis_how_2')}</li>
            <li>{t('avis_how_3')}</li>
            <li>{t('avis_how_4')}</li>
            <li>{t('avis_how_5')}</li>
          </ol>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-[#00B4CC] hover:underline">
            {t('avis_back')}
          </Link>
        </div>
      </div>
    </div>
  )
}
