import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function InscriptionLivreur() {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '',
    telephone: '', password: '', confirmPassword: '',
  })
  const [idCard, setIdCard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const hashPassword = async (pwd) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.nom || !form.prenom || !form.email || !form.password || !idCard) {
      setError('Tous les champs sont obligatoires')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (form.password.length < 8) {
      setError('Mot de passe minimum 8 caractères')
      return
    }
    setLoading(true)
    try {
      const ext = idCard.name.split('.').pop()
      const fileName = `${Date.now()}_${form.email}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(fileName, idCard)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('id-cards')
        .getPublicUrl(fileName)

      const hash = await hashPassword(form.password)
      const { error: insertError } = await supabase
        .from('livreurs')
        .insert({
          nom: form.nom,
          prenom: form.prenom,
          email: form.email,
          telephone: form.telephone,
          password_hash: hash,
          id_card_url: urlData.publicUrl,
          status: 'pending',
        })
      if (insertError) throw insertError
      setSuccess(true)
    } catch (err) {
      setError('Erreur : ' + err.message)
    }
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Demande envoyée !</h2>
        <p className="text-gray-600 text-sm">
          Votre dossier est en cours d'examen. Vous recevrez un email sous 24-48h après validation par l'équipe SebPhone.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#1B2A4A] rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🚗</span>
          </div>
          <div>
            <h1 className="font-bold text-[#1B2A4A]">Devenir livreur SebPhone</h1>
            <p className="text-xs text-gray-500">Livraisons express Bruxelles</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {[
            { key: 'prenom', label: 'Prénom', type: 'text' },
            { key: 'nom', label: 'Nom', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'telephone', label: 'Téléphone', type: 'tel' },
            { key: 'password', label: 'Mot de passe', type: 'password' },
            { key: 'confirmPassword', label: 'Confirmer le mot de passe', type: 'password' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                {f.label}
              </label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
              Photo carte d'identité (recto)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setIdCard(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG ou PDF — votre document est chiffré et sécurisé
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            <strong>Conditions :</strong> Véhicule personnel requis, disponible sur Bruxelles et alentours (30km max), majeur et titulaire d'un permis de conduire valide.
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-[#1B2A4A] text-white rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Soumettre ma candidature'}
          </button>
        </div>
      </div>
    </div>
  )
}
