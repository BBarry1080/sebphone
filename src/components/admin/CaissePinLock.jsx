import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Delete, CheckCircle2, XCircle } from 'lucide-react'
import { calcPenalite } from '../../lib/calcSalaire'

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

  // Support clavier physique (chiffres 0-9 + Backspace)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePress(e.key)
      } else if (e.key === 'Backspace') {
        handleErase()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, processing, feedback])

  const handlePinSubmit = async (submittedPin) => {
    if (!magasin) return
    setProcessing(true)
    try {
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
        .eq('date', today)
        .maybeSingle()

      const firstName = (emp.name || '').split(' ')[0] || emp.name
      const nowT = nowTimeStr()
      const nowISO = new Date().toISOString()

      if (existing) {
        const heureAffichee = existing.heure_arrivee
          ? new Date(existing.heure_arrivee).toLocaleTimeString('fr-BE',
              { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : nowT
        setFeedback({
          type: 'welcome', firstName, heure: heureAffichee,
          retardMin: existing.retard_minutes || 0,
          penalite: existing.penalite_retard || 0,
        })
        setTimeout(() => onUnlock(emp, existing.id, existing.heure_arrivee), 1500)
        setProcessing(false)
        return
      }

      const todayDateStr = todayStr()
      const { data: schedDate } = await supabase
        .from('staff_schedule_dates')
        .select('*')
        .eq('staff_id', emp.id)
        .eq('date', todayDateStr)
        .maybeSingle()

      let retardMin = 0
      let penalite = 0
      if (schedDate && !schedDate.repos && schedDate.heure_debut) {
        const [ph, pm] = schedDate.heure_debut.split(':').map(Number)
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

  // ─── CARD compacte (feedback ou pavé PIN selon état) ───

  if (feedback?.type === 'arrivee' || feedback?.type === 'welcome') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[280px] text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <p className="text-lg font-bold text-[#1B2A4A] mb-1">
          Bonjour {feedback.firstName} !
        </p>
        <p className="text-xs text-gray-500 mb-1">Ouverture de session</p>
        <p className="text-2xl font-black font-mono text-[#00B4CC] mb-2">
          {feedback.heure}
        </p>
        {(feedback.type === 'arrivee' || feedback.type === 'welcome') && feedback.penalite > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-700 text-xs font-bold">
            Retard {feedback.retardMin} min · -{feedback.penalite}€
          </div>
        )}
      </div>
    )
  }

  if (feedback?.type === 'error') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[280px] text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle size={32} className="text-red-600" />
        </div>
        <p className="text-lg font-bold text-red-700 mb-1">{feedback.message}</p>
        <p className="text-xs text-gray-500">Nouvelle tentative dans un instant...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[280px]">
      <div className="text-center mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          {magasinLabel || magasin}
        </p>
        <p className="text-sm font-mono text-gray-500 mt-1">{clockNow}</p>
        <h2 className="text-lg font-bold text-[#1B2A4A] mt-2">Code PIN</h2>
      </div>

      {/* 4 cercles indicateurs compacts */}
      <div className="flex justify-center gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all
              ${pin.length > i
                ? 'bg-[#00B4CC] border-[#00B4CC] scale-110'
                : 'border-gray-300'}`}
          />
        ))}
      </div>

      {/* Pavé numérique compact */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button key={d}
            onClick={() => handlePress(d)}
            disabled={processing}
            className="aspect-square w-full min-h-[52px] rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#1B2A4A] text-xl font-semibold transition-all disabled:opacity-50">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => handlePress(0)}
          disabled={processing}
          className="aspect-square w-full min-h-[52px] rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#1B2A4A] text-xl font-semibold transition-all disabled:opacity-50">
          0
        </button>
        <button onClick={handleErase}
          disabled={processing || pin.length === 0}
          className="aspect-square w-full min-h-[52px] rounded-full bg-gray-50 hover:bg-gray-200 active:bg-gray-300 text-gray-500 flex items-center justify-center transition-all disabled:opacity-30">
          <Delete size={20} />
        </button>
      </div>
    </div>
  )
}
