import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { logActivity } from '../../lib/logActivity'
import { calcPenalite } from '../../lib/calcSalaire'
import { ChevronLeft, ChevronRight, MessageCircle, X, Check } from 'lucide-react'

const pad2 = (n) => String(n).padStart(2, '0')
const toDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const isPastDate = (dateStr) => dateStr < toDateStr(new Date())

const extractHM = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export default function StaffScheduleCalendar({ staffId, staffName, staffPhone, staffMagasin = '', hourlyWage, isAdmin = false, readOnly = false }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [scheduleDates, setScheduleDates] = useState([])
  const [pointages, setPointages] = useState([])
  const [loadingCal, setLoadingCal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayForm, setDayForm] = useState({ repos: false, heure_debut: '10:00', heure_fin: '20:00' })
  const [savingDay, setSavingDay] = useState(false)
  const [pointageForm, setPointageForm] = useState({ heure_arrivee: '', heure_depart: '' })
  const [savingPointage, setSavingPointage] = useState(false)
  const [sendingPlanning, setSendingPlanning] = useState(false)

  // Sélection multiple
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState(new Set())
  const [bulkForm, setBulkForm] = useState({ repos: false, heure_debut: '10:00', heure_fin: '20:00' })
  const [savingBulk, setSavingBulk] = useState(false)

  const now = new Date()
  const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = displayDate.getFullYear()
  const month = displayDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const monthStart = toDateStr(firstDay)
  const monthEnd = toDateStr(lastDay)
  const daysInMonth = lastDay.getDate()
  const firstDayDow = (firstDay.getDay() + 6) % 7

  const fetchCalendarData = async () => {
    if (!staffId) return
    setLoadingCal(true)
    const [schedRes, pointRes] = await Promise.all([
      supabase.from('staff_schedule_dates').select('*')
        .eq('staff_id', staffId)
        .gte('date', monthStart).lte('date', monthEnd),
      supabase.from('staff_pointages').select('*')
        .eq('staff_id', staffId)
        .gte('date', monthStart).lte('date', monthEnd),
    ])
    setScheduleDates(schedRes.data || [])
    setPointages(pointRes.data || [])
    setLoadingCal(false)
  }

  useEffect(() => { fetchCalendarData() /* eslint-disable-next-line */ }, [staffId, monthOffset])

  const toggleMultiSelectMode = () => {
    setMultiSelectMode((m) => !m)
    setSelectedDates(new Set())
    setSelectedDay(null)
  }

  const toggleDateSelection = (dateStr) => {
    setSelectedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  const openDay = (dateStr) => {
    setSelectedDay(dateStr)
    const sched = scheduleDates.find((s) => s.date === dateStr)
    setDayForm({
      repos: sched?.repos ?? false,
      heure_debut: sched?.heure_debut || '10:00',
      heure_fin:   sched?.heure_fin   || '20:00',
    })
    const p = pointages.find((x) => x.date === dateStr)
    setPointageForm({
      heure_arrivee: extractHM(p?.heure_arrivee),
      heure_depart:  extractHM(p?.heure_depart),
    })
  }

  const closeDay = () => {
    setSelectedDay(null)
  }

  const handleCellClick = (dateStr, past, hasPointage) => {
    // Cases passées non cliquables sauf admin + pointage existant
    if (past && !isAdmin) return
    if (past && isAdmin && !hasPointage) return

    if (multiSelectMode && !readOnly) {
      if (past) return // pas de multi-select sur dates passées
      toggleDateSelection(dateStr)
    } else {
      openDay(dateStr)
    }
  }

  const handleSaveDay = async () => {
    if (!selectedDay) return
    setSavingDay(true)
    const { error } = await supabase.from('staff_schedule_dates').upsert({
      staff_id: staffId,
      date: selectedDay,
      repos: dayForm.repos,
      heure_debut: dayForm.repos ? null : dayForm.heure_debut,
      heure_fin:   dayForm.repos ? null : dayForm.heure_fin,
    }, { onConflict: 'staff_id,date' })
    setSavingDay(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_schedule_update', `Horaire du ${selectedDay} mis à jour pour ${staffName}`)
    alert('✅ Enregistré')
    fetchCalendarData()
  }

  const handleSavePointage = async () => {
    if (!selectedDay) return
    const p = pointages.find((x) => x.date === selectedDay)
    if (!p) { alert('Aucun pointage réel pour ce jour'); return }
    setSavingPointage(true)

    const buildISO = (hm) => {
      if (!hm) return null
      const [h, m] = hm.split(':').map(Number)
      const [y, mo, d] = selectedDay.split('-').map(Number)
      return new Date(y, mo - 1, d, h, m, 0).toISOString()
    }

    const arriveeISO = buildISO(pointageForm.heure_arrivee) || p.heure_arrivee
    const departISO = pointageForm.heure_depart ? buildISO(pointageForm.heure_depart) : null

    const sched = scheduleDates.find((s) => s.date === selectedDay)
    let retardMin = 0
    let penalite = 0
    if (sched && !sched.repos && sched.heure_debut && arriveeISO) {
      const [ph, pm] = sched.heure_debut.split(':').map(Number)
      const arr = new Date(arriveeISO)
      const plannedMinutes = ph * 60 + pm
      const actualMinutes = arr.getHours() * 60 + arr.getMinutes()
      const diff = actualMinutes - plannedMinutes
      retardMin = Math.max(0, diff)
      penalite = calcPenalite(retardMin)
    }

    const payload = {
      heure_arrivee: arriveeISO,
      retard_minutes: retardMin,
      penalite_retard: penalite,
    }
    if (departISO) payload.heure_depart = departISO

    const { error } = await supabase.from('staff_pointages')
      .update(payload).eq('id', p.id)
    setSavingPointage(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_pointage_correction', `Pointage du ${selectedDay} corrigé manuellement pour ${staffName}`)
    alert('✅ Pointage corrigé')
    fetchCalendarData()
  }

  const handleApplyBulk = async () => {
    if (selectedDates.size === 0) return
    setSavingBulk(true)
    const rows = Array.from(selectedDates).map((dateStr) => ({
      staff_id: staffId,
      date: dateStr,
      repos: bulkForm.repos,
      heure_debut: bulkForm.repos ? null : bulkForm.heure_debut,
      heure_fin:   bulkForm.repos ? null : bulkForm.heure_fin,
    }))
    const { error } = await supabase.from('staff_schedule_dates')
      .upsert(rows, { onConflict: 'staff_id,date' })
    setSavingBulk(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_schedule_bulk_update',
      `Horaire appliqué à ${rows.length} jour(s) pour ${staffName}`)
    const n = rows.length
    setSelectedDates(new Set())
    fetchCalendarData()
    alert(`✅ Horaire appliqué à ${n} jour(s)`)
  }

  const handleSendPlanning = () => {
    const joursActifs = scheduleDates
      .filter((s) => !s.repos)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    if (joursActifs.length === 0) {
      alert('Aucun horaire posé ce mois-ci')
      return
    }
    if (!staffPhone) {
      alert('Aucun numéro de téléphone pour cet employé — ajoute-le dans sa fiche')
      return
    }
    // Ouvre l'onglet EN PREMIER, avant tout calcul — sinon Safari
    // et certains navigateurs bloquent ou perdent la redirection
    // et l'onglet reste bloqué sur about:blank
    const newTab = window.open('', '_blank')

    setSendingPlanning(true)
    try {
      const lignes = joursActifs.map((s) =>
        `📅 ${new Date(s.date).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })} : ${s.heure_debut} - ${s.heure_fin}`
      ).join('\n')
      const magasinPart = staffMagasin ? ` (${staffMagasin})` : ''
      const message = `Bonjour ${staffName.split(' ')[0]} ! Voici ton planning pour ${displayDate.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })} chez SebPhone${magasinPart} :\n\n${lignes}\n\nÀ bientôt !`

      const digits = staffPhone.replace(/\D/g, '')
      const intl = digits.startsWith('0') ? '32' + digits.slice(1)
        : digits.startsWith('32') ? digits
        : '32' + digits
      const waLink = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`

      if (newTab) {
        newTab.location.href = waLink
      } else {
        alert('Le navigateur a bloqué l\'ouverture de WhatsApp — autorise les pop-ups pour ce site puis réessaie.')
        return
      }
      logActivity('staff_planning_sent', `Planning de ${displayDate.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })} envoyé (WhatsApp) à ${staffName}`)
    } finally {
      setSendingPlanning(false)
    }
  }

  const monthLabel = displayDate.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
  const todayStrVal = toDateStr(new Date())

  const cells = []
  for (let i = 0; i < firstDayDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d))
  }

  const currentPointageOnSelected = selectedDay ? pointages.find((p) => p.date === selectedDay) : null

  return (
    <div>
      {/* Header nav mois + multi-select + WhatsApp */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset((o) => o - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-[#1B2A4A] capitalize min-w-[140px] text-center">
            {monthLabel}
          </span>
          <button onClick={() => setMonthOffset((o) => o + 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={toggleMultiSelectMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                ${multiSelectMode
                  ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#00B4CC]'}`}>
              ☑️ Sélection multiple
            </button>
            <button onClick={handleSendPlanning}
              disabled={sendingPlanning}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-700 disabled:opacity-50">
              <MessageCircle size={14} /> {sendingPlanning ? 'Envoi...' : 'Envoyer le planning (WhatsApp)'}
            </button>
          </div>
        )}
      </div>

      {/* En-têtes jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grille calendrier */}
      {loadingCal ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />
            const dateStr = toDateStr(date)
            const sched = scheduleDates.find((s) => s.date === dateStr)
            const point = pointages.find((p) => p.date === dateStr)
            const isToday = dateStr === todayStrVal
            const isSelected = selectedDay === dateStr
            const isMultiSelected = selectedDates.has(dateStr)
            const past = isPastDate(dateStr)

            // Locked : passé sans pointage OU (passé + pointage mais pas admin)
            const lockedNoAction = past && !point            // pas d'action possible
            const adminCorrigeable = past && point && isAdmin // admin peut ouvrir pour corriger
            const cellDisabled = past && !isAdmin           // employé bloqué sur tout jour passé
            const clickable = !past || adminCorrigeable

            const clickHandler = clickable
              ? () => handleCellClick(dateStr, past, !!point)
              : undefined

            const borderCls = isMultiSelected
              ? 'border-[#00B4CC] bg-cyan-100'
              : isSelected
                ? 'border-[#00B4CC] bg-cyan-50'
                : adminCorrigeable
                  ? 'border-amber-200 bg-amber-50 hover:border-amber-400'
                  : sched
                    ? 'border-gray-100 bg-white hover:border-[#1B2A4A]'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'

            const cellStyle = `aspect-square min-h-[60px] p-1 rounded-lg border-2 text-left transition-all
              ${borderCls}
              ${cellDisabled || lockedNoAction ? 'opacity-40 cursor-default' : ''}
              ${(!clickable) ? 'pointer-events-none' : ''}`

            return (
              <button key={dateStr}
                onClick={clickHandler}
                className={cellStyle}>
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold
                    ${isToday ? 'text-[#00B4CC]' : 'text-[#1B2A4A]'}
                    ${(cellDisabled || lockedNoAction) ? 'line-through' : ''}`}>
                    {date.getDate()}
                  </span>
                  {isMultiSelected ? (
                    <Check size={12} className="text-[#00B4CC] mt-0.5" />
                  ) : point && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1" title="Pointage enregistré" />
                  )}
                </div>
                {sched && (
                  sched.repos ? (
                    <span className="block text-[9px] font-bold px-1 py-0.5 rounded bg-gray-200 text-gray-600 mt-1 text-center">
                      Repos
                    </span>
                  ) : (
                    <span className="block text-[9px] font-bold text-[#00B4CC] mt-1 leading-tight">
                      {sched.heure_debut?.slice(0, 5)}
                      <br />
                      {sched.heure_fin?.slice(0, 5)}
                    </span>
                  )
                )}
                {sched && !sched.repos && point && Number(point.penalite_retard) > 0 && (
                  <span className="block text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded mt-0.5 text-center">
                    -{point.penalite_retard}€
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Panneau bulk (multi-select) */}
      {multiSelectMode && selectedDates.size > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
            <p className="text-sm font-bold text-[#1B2A4A] mb-3">
              {selectedDates.size} jour{selectedDates.size > 1 ? 's' : ''} sélectionné{selectedDates.size > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bulkForm.repos}
                  onChange={(e) => setBulkForm((f) => ({ ...f, repos: e.target.checked }))}
                  className="w-4 h-4 accent-[#00B4CC]" />
                <span className="text-xs font-medium text-gray-600">Repos</span>
              </label>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <input type="time" value={bulkForm.heure_debut} disabled={bulkForm.repos}
                  onChange={(e) => setBulkForm((f) => ({ ...f, heure_debut: e.target.value }))}
                  className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm ${bulkForm.repos ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white'}`} />
                <span className="text-gray-400 text-xs">→</span>
                <input type="time" value={bulkForm.heure_fin} disabled={bulkForm.repos}
                  onChange={(e) => setBulkForm((f) => ({ ...f, heure_fin: e.target.value }))}
                  className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm ${bulkForm.repos ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white'}`} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleApplyBulk}
                disabled={savingBulk}
                className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                {savingBulk ? 'Application...' : `Appliquer à ${selectedDates.size} jour${selectedDates.size > 1 ? 's' : ''}`}
              </button>
              <button onClick={() => setSelectedDates(new Set())}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-gray-400">
                Annuler la sélection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau jour sélectionné (mode normal, pas multi-select) */}
      {selectedDay && !multiSelectMode && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[#1B2A4A]">
              {new Date(selectedDay).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button onClick={closeDay} className="text-gray-400 hover:text-[#1B2A4A]">
              <X size={16} />
            </button>
          </div>

          {/* a) Horaire prévu (jamais pour un jour passé) */}
          {!isPastDate(selectedDay) && (
            readOnly ? (
              (() => {
                const sched = scheduleDates.find((s) => s.date === selectedDay)
                return (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Horaire prévu</p>
                    {!sched ? (
                      <p className="text-sm text-gray-400">Aucun horaire prévu</p>
                    ) : sched.repos ? (
                      <p className="text-sm text-[#1B2A4A] font-bold">Repos</p>
                    ) : (
                      <p className="text-sm text-[#1B2A4A] font-bold">
                        {sched.heure_debut?.slice(0, 5)} → {sched.heure_fin?.slice(0, 5)}
                      </p>
                    )}
                  </div>
                )
              })()
            ) : (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Horaire prévu</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={dayForm.repos}
                      onChange={(e) => setDayForm((f) => ({ ...f, repos: e.target.checked }))}
                      className="w-4 h-4 accent-[#00B4CC]" />
                    <span className="text-xs font-medium text-gray-600">Repos</span>
                  </label>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <input type="time" value={dayForm.heure_debut} disabled={dayForm.repos}
                      onChange={(e) => setDayForm((f) => ({ ...f, heure_debut: e.target.value }))}
                      className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm ${dayForm.repos ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white'}`} />
                    <span className="text-gray-400 text-xs">→</span>
                    <input type="time" value={dayForm.heure_fin} disabled={dayForm.repos}
                      onChange={(e) => setDayForm((f) => ({ ...f, heure_fin: e.target.value }))}
                      className={`px-2 py-1.5 border border-gray-200 rounded-lg text-sm ${dayForm.repos ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white'}`} />
                  </div>
                </div>
                <button onClick={handleSaveDay}
                  disabled={savingDay}
                  className="mt-3 bg-[#1B2A4A] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00B4CC] disabled:opacity-50">
                  {savingDay ? 'Enregistrement...' : 'Enregistrer l\'horaire'}
                </button>
              </div>
            )
          )}

          {/* b) Pointage réel */}
          {currentPointageOnSelected && (
            isAdmin ? (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pointage réel</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-gray-500 block mb-0.5">Arrivée</label>
                    <input type="time" value={pointageForm.heure_arrivee}
                      onChange={(e) => setPointageForm((f) => ({ ...f, heure_arrivee: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] text-gray-500 block mb-0.5">Départ</label>
                    <input type="time" value={pointageForm.heure_depart}
                      onChange={(e) => setPointageForm((f) => ({ ...f, heure_depart: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white" />
                  </div>
                </div>
                <button onClick={handleSavePointage}
                  disabled={savingPointage}
                  className="mt-3 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-600 disabled:opacity-50">
                  {savingPointage ? 'Correction...' : 'Corriger le pointage'}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Pointage</p>
                <p className="text-sm text-[#1B2A4A]">
                  {extractHM(currentPointageOnSelected.heure_arrivee) || '—'}
                  {' → '}
                  {currentPointageOnSelected.heure_depart
                    ? extractHM(currentPointageOnSelected.heure_depart)
                    : <span className="text-amber-600 font-bold">en cours</span>}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
