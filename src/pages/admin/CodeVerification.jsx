// SQL à exécuter dans Supabase si pas encore fait :
// ALTER TABLE orders
//   ADD COLUMN IF NOT EXISTS reservation_code TEXT UNIQUE,
//   ADD COLUMN IF NOT EXISTS code_used BOOLEAN DEFAULT false,
//   ADD COLUMN IF NOT EXISTS code_used_at TIMESTAMP WITH TIME ZONE;

import { useState, useRef, useEffect } from 'react'
import { Search, CheckCircle, XCircle, AlertTriangle, MapPin, Calendar } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'

export default function CodeVerification() {
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const verifyCode = async (e) => {
    e.preventDefault()
    if (!code.trim() || code.length < 3) return
    setLoading(true)
    setResult(null)

    if (!isSupabaseReady) {
      setResult({ status: 'invalid' })
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('reservation_code', code.trim().toUpperCase())
      .maybeSingle()

    setLoading(false)

    if (error || !data) {
      setResult({ status: 'invalid' })
      return
    }
    if (data.code_used) {
      setResult({ status: 'used', usedAt: data.code_used_at, order: data })
      return
    }
    setResult({ status: 'valid', order: data })
  }

  const markAsPickedUp = async () => {
    if (!result?.order) return
    setLoading(true)

    await supabase.from('orders').update({
      status:       'recupere',
      code_used:    true,
      code_used_at: new Date().toISOString(),
    }).eq('id', result.order.id)

    if (result.order.phone_id) {
      await supabase.from('phones').update({ status: 'vendu' }).eq('id', result.order.phone_id)
    }

    setResult({ status: 'marked_done', order: result.order })
    setLoading(false)
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('fr-BE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Vérifier une réservation</h1>
        <p className="text-sm text-[#555] mt-0.5">Saisissez le code client à 6 caractères</p>
      </div>

      {/* Formulaire de vérification */}
      <form onSubmit={verifyCode} className="flex gap-3 mb-8">
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="ABC123"
          className="flex-1 px-5 py-4 border-2 border-gray-200 rounded-xl text-2xl font-poppins font-bold text-center tracking-[0.3em] text-[#1B2A4A] outline-none focus:border-[#00B4CC] transition-colors uppercase"
          maxLength={6}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || code.length < 3}
          className="px-6 py-4 bg-[#1B2A4A] hover:bg-[#243a64] text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Search size={18} />
          Vérifier
        </button>
      </form>

      {/* Résultat */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
        </div>
      )}

      {result?.status === 'invalid' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <XCircle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="font-bold text-red-600 text-lg">Code invalide</p>
          <p className="text-sm text-red-400 mt-1">Ce code n'existe pas. Vérifiez et réessayez.</p>
        </div>
      )}

      {result?.status === 'used' && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
          <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
          <p className="font-bold text-orange-600 text-lg">Code déjà utilisé</p>
          <p className="text-sm text-orange-500 mt-1">
            Récupéré le : <span className="font-semibold capitalize">{formatDate(result.usedAt)}</span>
          </p>
          {result.order && (
            <p className="text-xs text-orange-400 mt-1">
              {result.order.customer_name} — {result.order.phone_name}
            </p>
          )}
        </div>
      )}

      {result?.status === 'marked_done' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
          <p className="font-bold text-green-700 text-lg">Téléphone remis au client</p>
          <p className="text-sm text-green-600 mt-1">Le stock a été mis à jour.</p>
          <button
            onClick={() => { setCode(''); setResult(null); inputRef.current?.focus() }}
            className="mt-4 px-5 py-2 bg-[#1B2A4A] text-white text-sm font-bold rounded-xl cursor-pointer"
          >
            Nouvelle vérification
          </button>
        </div>
      )}

      {result?.status === 'valid' && result.order && (() => {
        const o = result.order
        const remaining = (o.total_amount || 0) - (o.deposit_amount || 0)
        return (
          <div className="bg-white border-2 border-green-400 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-green-50 px-5 py-4 flex items-center gap-3 border-b border-green-200">
              <CheckCircle size={28} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-700 text-base">Réservation valide</p>
                <p className="text-xs text-green-600">Code : <span className="font-mono font-bold tracking-widest">{o.reservation_code}</span></p>
              </div>
            </div>

            <div className="px-5 py-5 space-y-4 text-sm">
              {/* Client */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888] mb-2">Client</p>
                <div className="space-y-1">
                  <p className="font-semibold text-[#1B2A4A]">{o.customer_name}</p>
                  <p className="text-[#555]">{o.customer_email}</p>
                  <p className="text-[#555]">{o.customer_phone}</p>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Téléphone */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888] mb-2">Téléphone</p>
                <div className="space-y-1">
                  <p className="font-semibold text-[#1B2A4A]">
                    {o.phone_name}
                    {o.phone_storage ? ` — ${o.phone_storage}` : ''}
                    {o.phone_color ? ` — ${o.phone_color}` : ''}
                  </p>
                  {o.phone_grade && (
                    <p className="text-[#555]">Grade : <span className="font-bold">{o.phone_grade}</span></p>
                  )}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Prix */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#888] mb-2">Paiement</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#555]">Prix total</span>
                    <span className="font-bold text-[#1B2A4A]">{o.total_amount}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#555]">Acompte payé</span>
                    <span className="font-semibold text-green-600">−{o.deposit_amount}€</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                    <span className="font-semibold text-[#1B2A4A]">Reste à encaisser</span>
                    <span className="font-bold text-[#1B2A4A] text-base">{remaining}€</span>
                  </div>
                </div>
              </div>

              {/* Retrait */}
              {(o.magasin_id || o.pickup_date) && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#888] mb-2">Retrait</p>
                    {o.magasin_id && (
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-[#00B4CC] flex-shrink-0" />
                        <span className="text-[#555]">{o.magasin_id}</span>
                      </div>
                    )}
                    {o.pickup_date && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#00B4CC] flex-shrink-0" />
                        <span className="text-[#555] capitalize">{formatDate(o.pickup_date)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button
                onClick={markAsPickedUp}
                disabled={loading}
                className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle size={18} />
                Marquer comme récupéré — {remaining}€ encaissés
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
