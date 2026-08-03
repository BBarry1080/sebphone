import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Delete, Clock, CheckCircle2, XCircle } from 'lucide-react'

function calcPenalite(retardMin) {
  if (retardMin < 15) return 0
  return 20 * (1 + Math.floor((retardMin - 15) / 60))
}

const pad2 = (n) => String(n).padStart(2, '0')

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const nowTimeStr = () => {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export default function CaissePinLock({ magasin, magasinLabel, onUnlock }) {
  const [clockNow, setClockNow] = useState(nowTimeStr())
  useEffect(() => {
    const t = setInterval(() => setClockNow(nowTimeStr()), 1000)
    return () => clearInterval(t)
  }, [])

  const [pin, setPin] = useState('')
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const resetPin = () => setPin('')

  useEffect(() => {
    if (feedback?.type === 'error') {
      const t = setTimeout(() => { setFeedback(null); resetPin() }, 1500)
      return () => clearTimeout(t)
    }
  }, [feedback])

  const handlePress = (digit) => {
    if (processing || feedback) return
    setPin((prev) => {
      if (prev.length >= 4) return prev
      const next = prev + String(digit)
      if (next.length === 4) {
        setTimeout(() => handlePinSubmit(next), 100)
      }
      return next
    })
  }

  const handleErase = () => {
    if (processing || feedback) return
    setPin((prev) => prev.slice(0, -1))
  }

  const handlePinSubmit = async (submittedPin) => {
    if (!magasin) return
    setProcessing(true)
    try {
      // PIN désormais unique globalement (pas de filtre magasin)
      const { data: emp, error: empError } = await supabase
        .from('staff')
        .select('*')
        .eq('pin_code', submittedPin)
        .eq('active', true)
        .maybeSingle()

      if (empError) {
        console.error('Erreur requête staff pointage:', empError)
        setFeedback({ type: 'error', message: 'Erreur réseau, réessayez' })
        setProcessing(false)
        return
      }
      if (!emp) {
        setFeedback({ type: 'error', message: 'Code incorrect' })
        setProcessing(false)
        return
      }

      const today = todayStr()
      const { data: existing } = await supabase
        .from('staff_pointages')
        .select('*')
        .eq('staff_id', emp.id)
        .eq('magasin_id', magasin)
        .eq('date', today)
        .maybeSingle()

      const firstName = (emp.name || '').split(' ')[0] || emp.name
      const nowT = nowTimeStr()
      const nowISO = new Date().toISOString()

      // Cas : pointage existant (avec ou sans heure_depart) — on réutilise, pas de recréation
      if (existing) {
        setFeedback({ type: 'welcome', firstName, heure: nowT, retardMin: 0, penalite: 0 })
        setTimeout(() => onUnlock(emp, existing.id, existing.heure_arrivee), 1500)
        setProcessing(false)
        return
      }

      // Nouveau pointage arrivée — calcul du retard via schedule
      const jourSem = new Date().getDay()
      const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', emp.id)
        .eq('jour_semaine', jourSem)
        .maybeSingle()

      let retardMin = 0
      let penalite = 0
      if (schedule && !schedule.repos && schedule.heure_debut) {
        const [ph, pm] = schedule.heure_debut.split(':').map(Number)
        const now = new Date()
        const plannedMinutes = ph * 60 + pm
        const actualMinutes = now.getHours() * 60 + now.getMinutes()
        const diff = actualMinutes - plannedMinutes
        retardMin = Math.max(0, diff)
        penalite = calcPenalite(retardMin)
      }

      const { data: inserted, error: insErr } = await supabase
        .from('staff_pointages')
        .insert({
          staff_id: emp.id,
          magasin_id: magasin,
          date: today,
          heure_arrivee: nowISO,
          retard_minutes: retardMin,
          penalite_retard: penalite,
        })
        .select()
        .single()
      if (insErr) throw insErr

      setFeedback({ type: 'arrivee', firstName, heure: nowT, retardMin, penalite })
      setTimeout(() => onUnlock(emp, inserted.id, nowISO), 1500)
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur réseau, réessayez' })
    } finally {
      setProcessing(false)
    }
  }

  // ─── FEEDBACK écrans ───
  if (feedback?.type === 'arrivee' || feedback?.type === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>
        <div className="text-center text-white max-w-md w-full">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={56} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bonjour {feedback.firstName} !</h1>
          <p className="text-white/70 text-lg mb-1">Ouverture de session</p>
          <p className="text-4xl font-black font-mono text-[#00B4CC] mb-4">{feedback.heure}</p>
          {feedback.type === 'arrivee' && feedback.penalite > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-5 py-3 text-amber-200 text-sm font-bold">
              Retard de {feedback.retardMin} min — pénalité -{feedback.penalite}€
            </div>
          )}
        </div>
      </div>
    )
  }

  if (feedback?.type === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' }}>
        <div className="text-center text-white max-w-md w-full">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/30 flex items-center justify-center">
            <XCircle size={56} className="text-red-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{feedback.message}</h1>
          <p className="text-white/70 text-sm">Nouvelle tentative dans un instant...</p>
        </div>
      </div>
    )
  }

  // ─── ÉCRAN PIN ───
  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6"
      style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>

      <div className="flex items-center justify-between text-white/60 text-sm">
        <span>{magasinLabel || magasin}</span>
        <span className="font-mono">{clockNow}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-sm mx-auto w-full">

        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-1">Enregistrement caisse</h1>
          <p className="text-white/60 text-sm">Entrez votre code à 4 chiffres pour ouvrir la session</p>
        </div>

        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all
                ${pin.length > i
                  ? 'bg-[#00B4CC] border-[#00B4CC] scale-110'
                  : 'border-white/40'}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button key={d}
              onClick={() => handlePress(d)}
              disabled={processing}
              className="aspect-square w-full min-h-[80px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-3xl font-light transition-all disabled:opacity-50">
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => handlePress(0)}
            disabled={processing}
            className="aspect-square w-full min-h-[80px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-3xl font-light transition-all disabled:opacity-50">
            0
          </button>
          <button onClick={handleErase}
            disabled={processing || pin.length === 0}
            className="aspect-square w-full min-h-[80px] rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 text-white flex items-center justify-center transition-all disabled:opacity-30">
            <Delete size={26} />
          </button>
        </div>

      </div>
    </div>
  )
}
