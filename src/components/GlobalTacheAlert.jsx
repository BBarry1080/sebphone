import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const jourAujourdhuiFr = () => {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return jours[new Date().getDay()]
}

const playAlertBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const beep = (delay) => {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      }, delay)
    }
    beep(0)
    beep(350)
  } catch {
    // navigateur bloque le son avant interaction utilisateur — silencieux
  }
}

const getGlobalViewerIdentity = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sebphone_caisse_session_')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const cs = JSON.parse(raw)
          if (cs?.staffId) {
            const magasinId = key.replace('sebphone_caisse_session_', '')
            return { id: cs.staffId, name: cs.staffName, magasinId }
          }
        }
      }
    }
  } catch { /* ignore */ }
  try {
    const su = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    if (su?.id) return { id: su.id, name: su.name, magasinId: su.magasin_id || null }
  } catch { /* ignore */ }
  return null
}

export default function GlobalTacheAlert() {
  const [pendingTaches, setPendingTaches] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [pasFaitOpenId, setPasFaitOpenId] = useState(null)
  const [pasFaitMotif, setPasFaitMotif] = useState('')
  const intervalRef = useRef(null)

  const fetchPending = async () => {
    if (!supabase) return
    const identity = getGlobalViewerIdentity()
    if (!identity?.id) { setPendingTaches([]); return }

    const today = jourAujourdhuiFr()
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })

    const { data: taches } = await supabase
      .from('taches_recurrentes')
      .select('*')
      .eq('active', true)

    const applicableRaw = (taches || []).filter((t) => {
      const matchesJour = t.jours_semaine && t.jours_semaine.includes(today)
      const matchesDate = t.date_specifique === todayStr
      return matchesJour || matchesDate
    })

    const applicable = applicableRaw.filter((t) => {
      const magasinOk = !t.magasins || t.magasins.length === 0 || !identity.magasinId || t.magasins.includes(identity.magasinId)
      const assignationOk = !t.assigne_a_id || t.assigne_a_id === identity.id
      return magasinOk && assignationOk
    })

    if (applicable.length === 0) { setPendingTaches([]); return }

    const { data: completions } = await supabase
      .from('taches_recurrentes_completions')
      .select('tache_id')
      .eq('date_tache', todayStr)

    const completedIds = new Set((completions || []).map((c) => c.tache_id))
    setPendingTaches(applicable.filter((t) => !completedIds.has(t.id)))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending()
    const poll = setInterval(fetchPending, 60 * 1000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (pendingTaches.length === 0) return
    const minInterval = Math.min(...pendingTaches.map((t) => t.intervalle_rappel_min || 5)) * 60 * 1000
    playAlertBeep()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowModal(true)
    intervalRef.current = setInterval(() => {
      playAlertBeep()
      setShowModal(true)
    }, minInterval)
    return () => clearInterval(intervalRef.current)
  }, [pendingTaches])

  const handleComplete = async (tacheId, statut, motif = null) => {
    const identity = getGlobalViewerIdentity()
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
    await supabase.from('taches_recurrentes_completions').upsert({
      tache_id: tacheId,
      date_tache: todayStr,
      magasin_id: identity?.magasinId || null,
      statut,
      motif,
      completed_by: identity?.name || null,
    }, { onConflict: 'tache_id,date_tache,magasin_id' })
    setPasFaitOpenId(null)
    setPasFaitMotif('')
    fetchPending()
  }

  if (pendingTaches.length === 0) return null

  return (
    <>
      <div className="sticky top-0 z-[90] -mx-2 md:-mx-8 bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-lg flex-wrap">
        <span className="font-bold text-sm">
          ⚠️ {pendingTaches.length} tâche{pendingTaches.length > 1 ? 's' : ''} en attente
        </span>
        <button onClick={() => setShowModal(true)}
          className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
          Voir / Cocher
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-bold text-[#1B2A4A] text-lg mb-1">🧹 Tâches en attente</h3>
            <p className="text-xs text-gray-500 mb-4">Visible sur toute l'application</p>
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {pendingTaches.map((t) => (
                <div key={t.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-[#1B2A4A]">{t.titre}</p>
                      {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleComplete(t.id, 'fait')}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        ✓ Fait
                      </button>
                      <button onClick={() => setPasFaitOpenId(pasFaitOpenId === t.id ? null : t.id)}
                        className="bg-red-50 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        ✗ Pas fait
                      </button>
                    </div>
                  </div>
                  {pasFaitOpenId === t.id && (
                    <div className="mt-2 flex gap-2">
                      <input type="text" value={pasFaitMotif}
                        onChange={(e) => setPasFaitMotif(e.target.value)}
                        placeholder="Raison (optionnel)"
                        className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs" />
                      <button onClick={() => handleComplete(t.id, 'pas_fait', pasFaitMotif.trim() || null)}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                        Confirmer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setShowModal(false)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
