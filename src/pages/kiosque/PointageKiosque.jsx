import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MAGASINS_LIST } from '../../utils/magasins'
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

const formatDuration = (startISO, endISO) => {
  const diffMs = new Date(endISO) - new Date(startISO)
  let mins = Math.max(0, Math.floor(diffMs / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${pad2(m)}min`
}

const nowTimeStr = () => {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export default function PointageKiosque() {
  const [searchParams, setSearchParams] = useSearchParams()
  const magasinParam = searchParams.get('magasin')
  const validMagasin = useMemo(
    () => MAGASINS_LIST.find((m) => m.id === magasinParam && !m.virtuel),
    [magasinParam]
  )

  const [clockNow, setClockNow] = useState(nowTimeStr())
  useEffect(() => {
    const t = setInterval(() => setClockNow(nowTimeStr()), 1000)
    return () => clearInterval(t)
  }, [])

  const [pin, setPin] = useState('')
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type, ...data }

  const resetPin = () => setPin('')
  const resetAll = () => { setFeedback(null); setPin('') }

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => resetAll(), 3000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  const handlePress = (digit) => {
    if (processing || feedback) return
    setPin((prev) => {
      if (prev.length >= 4) return prev
      const next = prev + String(digit)
      if (next.length === 4) {
        // fire in next tick so UI reflects the 4th dot first
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
    if (!validMagasin) return
    setProcessing(true)
    try {
      const { data: emp, error: empError } = await supabase
        .from('staff')
        .select('*')
        .eq('magasin_id', (validMagasin.id || '').toLowerCase())
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

      if (!existing) {
        // Cas A — ARRIVÉE
        const jourSem = new Date().getDay() // 0=dim..6=sam
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

        const { error: insErr } = await supabase.from('staff_pointages').insert({
          staff_id: emp.id,
          magasin_id: validMagasin.id,
          date: today,
          heure_arrivee: nowISO,
          retard_minutes: retardMin,
          penalite_retard: penalite,
        })
        if (insErr) throw insErr

        setFeedback({
          type: 'arrivee',
          firstName,
          heure: nowT,
          retardMin,
          penalite,
        })
      } else if (!existing.heure_depart) {
        // Cas B — DÉPART
        const { error: updErr } = await supabase
          .from('staff_pointages')
          .update({ heure_depart: nowISO })
          .eq('id', existing.id)
        if (updErr) throw updErr

        setFeedback({
          type: 'depart',
          firstName,
          heure: nowT,
          duree: formatDuration(existing.heure_arrivee, nowISO),
        })
      } else {
        // Cas C — déjà terminé
        setFeedback({
          type: 'done',
          firstName,
          heureArrivee: new Date(existing.heure_arrivee).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          heureDepart: new Date(existing.heure_depart).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erreur réseau, réessayez' })
    } finally {
      setProcessing(false)
    }
  }

  // ─── ÉCRAN DE SÉLECTION DE MAGASIN ───
  if (!validMagasin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>
        <div className="w-full max-w-md text-center text-white">
          <div className="font-poppins font-bold text-3xl mb-1">
            <span className="text-[#00B4CC]">SEB</span>
            <span className="text-white">PHONE</span>
          </div>
          <p className="text-white/60 text-sm mb-8">Pointage employé</p>
          <h2 className="text-xl font-bold mb-6">Sélectionnez votre magasin</h2>
          <div className="flex flex-col gap-3">
            {MAGASINS_LIST.filter((m) => !m.virtuel).map((m) => (
              <button
                key={m.id}
                onClick={() => setSearchParams({ magasin: m.id })}
                className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-base hover:bg-white/20 transition-all"
              >
                {m.nom}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── ÉCRANS DE FEEDBACK ───
  if (feedback?.type === 'arrivee') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>
        <div className="text-center text-white max-w-md w-full">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={56} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bonjour {feedback.firstName} !</h1>
          <p className="text-white/70 text-lg mb-1">Arrivée enregistrée à</p>
          <p className="text-4xl font-black font-mono text-[#00B4CC] mb-4">{feedback.heure}</p>
          {feedback.penalite > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl px-5 py-3 text-amber-200 text-sm font-bold">
              Retard de {feedback.retardMin} min — pénalité -{feedback.penalite}€
            </div>
          )}
        </div>
      </div>
    )
  }

  if (feedback?.type === 'depart') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>
        <div className="text-center text-white max-w-md w-full">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Clock size={56} className="text-blue-300" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Au revoir {feedback.firstName} !</h1>
          <p className="text-white/70 text-lg mb-1">Départ à</p>
          <p className="text-4xl font-black font-mono text-[#00B4CC] mb-4">{feedback.heure}</p>
          <p className="text-white/70 text-sm">
            Durée travaillée : <span className="font-bold text-white">{feedback.duree}</span>
          </p>
        </div>
      </div>
    )
  }

  if (feedback?.type === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #15223d 0%, #0f1a30 100%)' }}>
        <div className="text-center text-white max-w-md w-full">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
            <Clock size={56} className="text-white/60" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Bonjour {feedback.firstName}</h1>
          <p className="text-white/70 text-base mb-4">Vous avez déjà terminé votre journée aujourd'hui</p>
          <div className="bg-white/10 rounded-2xl px-5 py-3 text-sm space-y-1">
            <p className="text-white/70">Arrivée : <span className="font-mono font-bold text-white">{feedback.heureArrivee}</span></p>
            <p className="text-white/70">Départ : <span className="font-mono font-bold text-white">{feedback.heureDepart}</span></p>
          </div>
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

      {/* Header : magasin + horloge */}
      <div className="flex items-center justify-between text-white/60 text-sm">
        <span>{validMagasin.nom}</span>
        <span className="font-mono">{clockNow}</span>
      </div>

      {/* Contenu centré */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-sm mx-auto w-full">

        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-1">Pointage</h1>
          <p className="text-white/60 text-sm">Entrez votre code à 4 chiffres</p>
        </div>

        {/* 4 cercles indicateurs */}
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

        {/* Pavé numérique */}
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
