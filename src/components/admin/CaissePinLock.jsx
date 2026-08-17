import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Delete, CheckCircle2, XCircle, Lock } from 'lucide-react'
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

// Plage d'ouverture des techniciens/vendeurs : 9h → minuit, heure belge.
// Avant 9h, seuls les responsables et admins peuvent ouvrir la caisse.
const HEURE_MIN_VENDEUR = 9

const heureBelge = () => Number(
  new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date())
)

// Accès total 24h/24, sans contrôle de planning.
const estResponsablePour = (emp, magasin) =>
  (emp.responsable_magasins || []).includes(magasin)
  || emp.grade === 'responsable'
  || emp.grade === 'admin'
  || emp.is_admin === true

const HEURE_DEBUT_DEFAUT = '10:00'
const HEURE_FIN_DEFAUT = '20:00'

export default function CaissePinLock({ magasin, magasinLabel, onUnlock }) {
  const [clockNow, setClockNow] = useState(nowTimeStr())
  useEffect(() => {
    const t = setInterval(() => setClockNow(nowTimeStr()), 1000)
    return () => clearInterval(t)
  }, [])

  const [pin, setPin] = useState('')
  const [processing, setProcessing] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Assignation d'un shift depuis l'écran de refus (responsable/admin)
  const [assignStep, setAssignStep] = useState(null) // null | 'pin' | 'liste'
  const [assignPin, setAssignPin] = useState('')
  const [assignError, setAssignError] = useState(null)
  const [assignStaffList, setAssignStaffList] = useState([])
  const [assignSaving, setAssignSaving] = useState(false)

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

  // Qui est planifié sur CE magasin aujourd'hui. Le planning n'ayant pas de
  // magasin, on part des employés rattachés au magasin puis on croise par
  // staff_id — même logique que checkPlanningMismatch côté caisse.
  const fetchPrevusDuJour = async (dateStr) => {
    const { data: staffMag } = await supabase
      .from('staff').select('id, name')
      .eq('magasin_id', magasin).eq('active', true)
    const ids = (staffMag || []).map((s) => s.id)
    if (ids.length === 0) return []
    const { data: scheds } = await supabase
      .from('staff_schedule_dates')
      .select('staff_id, heure_debut, heure_fin')
      .in('staff_id', ids).eq('date', dateStr).eq('repos', false)
      .not('heure_debut', 'is', null)
    return (scheds || [])
      .map((s) => ({ ...s, name: staffMag.find((x) => x.id === s.staff_id)?.name }))
      .filter((s) => s.name)
  }

  // ─── Assignation d'un shift depuis l'écran de refus ───
  // Toujours accessible, mais protégée par un PIN de responsable : un employé
  // bloqué ne peut pas se planifier lui-même.
  const handleAssignPinSubmit = async () => {
    setAssignError(null)
    const { data: mgr, error } = await supabase
      .from('staff').select('*')
      .eq('pin_code', assignPin).eq('active', true)
      .maybeSingle()
    if (error || !mgr) { setAssignError('Code incorrect'); setAssignPin(''); return }
    if (!estResponsablePour(mgr, magasin)) {
      setAssignError('Ce code n\'est pas celui d\'un responsable')
      setAssignPin('')
      return
    }
    const { data: staffMag } = await supabase
      .from('staff').select('id, name')
      .eq('magasin_id', magasin).eq('active', true).order('name')
    setAssignStaffList(staffMag || [])
    setAssignPin('')
    setAssignStep('liste')
  }

  const handleAssignShift = async (staffRow) => {
    setAssignSaving(true)
    const { error } = await supabase.from('staff_schedule_dates').upsert({
      staff_id: staffRow.id,
      date: todayStr(),
      repos: false,
      heure_debut: HEURE_DEBUT_DEFAUT,
      heure_fin: HEURE_FIN_DEFAUT,
    }, { onConflict: 'staff_id,date' })
    setAssignSaving(false)
    if (error) { setAssignError('Erreur : ' + error.message); return }
    setAssignStep(null)
    setAssignStaffList([])
    setFeedback(null)
    setPin('')
  }

  const closeAssign = () => {
    setAssignStep(null)
    setAssignPin('')
    setAssignError(null)
    setAssignStaffList([])
  }

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
      const firstName = (emp.name || '').split(' ')[0] || emp.name
      const nowT = nowTimeStr()
      const nowISO = new Date().toISOString()

      const estResponsable = estResponsablePour(emp, magasin)

      const { data: schedDate } = await supabase
        .from('staff_schedule_dates')
        .select('*')
        .eq('staff_id', emp.id)
        .eq('date', today)
        .maybeSingle()

      // Une ligne de planning non-repos suffit : le planning autorise un
      // créneau sans heure saisie, et quelqu'un de planifié doit pouvoir
      // entrer même si l'horaire n'a pas été renseigné.
      const aUnShiftAujourdhui = !!(schedDate && !schedDate.repos)

      const { data: existing } = await supabase
        .from('staff_pointages')
        .select('*')
        .eq('staff_id', emp.id)
        .eq('date', today)
        .maybeSingle()

      // Journée déjà engagée sur CE magasin : la validation a eu lieu à
      // l'ouverture. Verrouillage pour la pause ou poste qui se recharge ne
      // doivent pas rejouer le contrôle — sinon on enferme dehors quelqu'un
      // en plein service. Un pointage ouvert sur un AUTRE magasin ne compte
      // pas : le contrôle s'applique normalement.
      const journeeDejaOuverte = !!(existing && existing.magasin_id === magasin)

      // ─── Contrôle d'accès ───
      // Les responsables/admins passent sans aucune vérification. Pour les
      // autres : plage horaire, puis rattachement au magasin + shift planifié.
      // Ne s'applique qu'à la PREMIÈRE connexion de la journée.
      if (!estResponsable && !journeeDejaOuverte) {
        if (heureBelge() < HEURE_MIN_VENDEUR) {
          setFeedback({
            type: 'refus',
            titre: 'Hors horaire',
            message: `Connexion possible de ${HEURE_MIN_VENDEUR}h à minuit. En dehors, seul un responsable peut ouvrir la caisse.`,
            prevus: [],
          })
          setProcessing(false)
          return
        }

        // Le planning ne porte pas de magasin : le rattachement passe par
        // staff.magasin_id. Un remplaçant d'un autre magasin n'est donc pas
        // reconnu ici — il passe par le flux de remplacement de la caisse.
        if (emp.magasin_id !== magasin || !aUnShiftAujourdhui) {
          const prevus = await fetchPrevusDuJour(today)
          setFeedback({
            type: 'refus',
            titre: prevus.length > 0 ? 'Pas planifié ici aujourd\'hui' : 'Aucun shift prévu aujourd\'hui',
            message: prevus.length > 0
              ? `${firstName} n'est pas prévu sur ce magasin aujourd'hui.`
              : `Aucun employé n'est planifié sur ce magasin aujourd'hui — la caisse reste fermée.`,
            prevus,
          })
          setProcessing(false)
          return
        }
      }

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

      // Un responsable ou admin qui passe hors de ses creneaux planifies fait
      // une visite : la caisse s'ouvre, mais sans pointage — donc ni heures
      // ni salaire comptabilises, et le pointage du technicien du jour reste
      // intact. Un creneau planifie ce jour-la = poste normal, pointage cree.
      if (estResponsable && !aUnShiftAujourdhui) {
        setFeedback({
          type: 'welcome', firstName, heure: nowT,
          retardMin: 0, penalite: 0,
        })
        setTimeout(() => onUnlock(emp, null, nowISO), 1200)
        setProcessing(false)
        return
      }

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

      const { data: upserted, error: upsertErr } = await supabase
        .from('staff_pointages')
        .upsert(
          {
            staff_id: emp.id,
            magasin_id: magasin,
            date: today,
            heure_arrivee: nowISO,
            retard_minutes: retardMin,
            penalite_retard: penalite,
          },
          { onConflict: 'staff_id,date', ignoreDuplicates: true }
        )
        .select()
        .single()

      let finalPointage = upserted
      if (upsertErr || !upserted) {
        const { data: refetched } = await supabase
          .from('staff_pointages')
          .select('*')
          .eq('staff_id', emp.id)
          .eq('date', today)
          .maybeSingle()
        finalPointage = refetched
      }
      if (!finalPointage) throw upsertErr || new Error('Pointage introuvable après upsert')

      const heureArriveeISO = finalPointage.heure_arrivee || nowISO
      const heureAffichee = new Date(heureArriveeISO).toLocaleTimeString('fr-BE',
        { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      setFeedback({
        type: 'arrivee',
        firstName,
        heure: heureAffichee,
        retardMin: finalPointage.retard_minutes || 0,
        penalite: finalPointage.penalite_retard || 0,
      })
      setTimeout(() => onUnlock(emp, finalPointage.id, heureArriveeISO), 1500)
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

  // ─── Refus : caisse verrouillée ───
  // Pas d'auto-reset : l'écran reste tant que la personne n'agit pas.
  if (feedback?.type === 'refus') {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[300px]">
        {assignStep === null && (
          <>
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <Lock size={28} className="text-red-600" />
            </div>
            <p className="text-base font-bold text-red-700 text-center mb-1">{feedback.titre}</p>
            <p className="text-xs text-gray-500 text-center mb-3">{feedback.message}</p>

            {feedback.prevus?.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Prévu(s) aujourd&apos;hui</p>
                {feedback.prevus.map((p) => (
                  <p key={p.staff_id} className="text-xs text-[#1B2A4A] font-bold">
                    {p.name}
                    <span className="font-normal text-gray-400">
                      {' '}— {p.heure_debut?.slice(0, 5)} à {p.heure_fin?.slice(0, 5) || '—'}
                    </span>
                  </p>
                ))}
              </div>
            )}

            <button onClick={() => { setAssignStep('pin'); setAssignError(null) }}
              className="w-full py-2.5 bg-[#1B2A4A] text-white rounded-xl text-xs font-bold mb-2">
              Assigner un shift
            </button>
            <button onClick={() => { setFeedback(null); resetPin() }}
              className="w-full py-2 text-gray-500 text-xs font-bold">
              Réessayer
            </button>
          </>
        )}

        {assignStep === 'pin' && (
          <>
            <p className="text-sm font-bold text-[#1B2A4A] text-center mb-1">Code responsable</p>
            <p className="text-[11px] text-gray-500 text-center mb-3">
              Seul un responsable de ce magasin peut assigner un shift.
            </p>
            <input type="password" inputMode="numeric" autoFocus
              value={assignPin} maxLength={4}
              onChange={(e) => setAssignPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && assignPin.length === 4) handleAssignPinSubmit() }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-center text-xl tracking-[0.5em] font-mono mb-2" />
            {assignError && <p className="text-xs text-red-600 font-bold text-center mb-2">{assignError}</p>}
            <button onClick={handleAssignPinSubmit} disabled={assignPin.length !== 4}
              className="w-full py-2.5 bg-[#1B2A4A] text-white rounded-xl text-xs font-bold mb-2 disabled:opacity-40">
              Valider
            </button>
            <button onClick={closeAssign} className="w-full py-2 text-gray-500 text-xs font-bold">
              Annuler
            </button>
          </>
        )}

        {assignStep === 'liste' && (
          <>
            <p className="text-sm font-bold text-[#1B2A4A] text-center mb-1">Assigner un shift</p>
            <p className="text-[11px] text-gray-500 text-center mb-3">
              Aujourd&apos;hui, {HEURE_DEBUT_DEFAUT}–{HEURE_FIN_DEFAUT} · {magasinLabel || magasin}
            </p>
            {assignStaffList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                Aucun employé actif rattaché à ce magasin.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto mb-2">
                {assignStaffList.map((s) => (
                  <button key={s.id} onClick={() => handleAssignShift(s)} disabled={assignSaving}
                    className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-[#1B2A4A] disabled:opacity-50">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {assignError && <p className="text-xs text-red-600 font-bold text-center mb-2">{assignError}</p>}
            <button onClick={closeAssign} className="w-full py-2 text-gray-500 text-xs font-bold">
              Annuler
            </button>
          </>
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
