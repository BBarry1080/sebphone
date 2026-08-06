export function calcDureeHeures(heure_debut, heure_fin) {
  if (!heure_debut || !heure_fin) return 0
  const [h1, m1] = heure_debut.split(':').map(Number)
  const [h2, m2] = heure_fin.split(':').map(Number)
  let minutes = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (minutes <= 0) minutes += 24 * 60
  return minutes / 60
}

export function isShiftFinished(dateStr, heure_fin, heure_depart) {
  const todayStr = new Date().toISOString().slice(0, 10)
  if (dateStr < todayStr) return true // jour passé : toujours terminé
  if (dateStr > todayStr) return false // jour futur : jamais terminé
  if (heure_depart) return true // a pointé son départ
  if (!heure_fin) return false
  const now = new Date()
  const [h, m] = heure_fin.split(':').map(Number)
  const finPrevue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
  return now >= finPrevue
}

export function calcPenalite(retardMin) {
  if (retardMin < 15) return 0
  return 20 * (1 + Math.floor((retardMin - 15) / 60))
}

export function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const toStr = (d) => d.toISOString().slice(0, 10)
  return { weekStart: toStr(monday), weekEnd: toStr(now) }
}

export async function calcSalairePeriode(supabase, staffId, hourlyWage, dateStart, dateEnd) {
  const { data: schedules } = await supabase
    .from('staff_schedule_dates')
    .select('*')
    .eq('staff_id', staffId)
    .gte('date', dateStart)
    .lte('date', dateEnd)

  const { data: pointages } = await supabase
    .from('staff_pointages')
    .select('*')
    .eq('staff_id', staffId)
    .gte('date', dateStart)
    .lte('date', dateEnd)

  const { data: commissions } = await supabase
    .from('staff_commissions')
    .select('commission_amount')
    .eq('staff_id', staffId)
    .gte('created_at', dateStart + 'T00:00:00')
    .lte('created_at', dateEnd + 'T23:59:59')

  const { data: heuresSup } = await supabase
    .from('staff_heures_sup')
    .select('duree_heures')
    .eq('staff_id', staffId)
    .eq('statut', 'accepte')
    .gte('date', dateStart)
    .lte('date', dateEnd)

  let totalHeures = 0
  let salaireBrut = 0
  let penalitesRetard = 0
  const absences = []

  const d = new Date(dateStart)
  const end = new Date(dateEnd)
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10)
    const schedule = schedules?.find((s) => s.date === dateStr)

    if (schedule && !schedule.repos) {
      const pointage = pointages?.find((p) => p.date === dateStr)
      if (!pointage) {
        absences.push(dateStr)
      } else {
        const finished = isShiftFinished(dateStr, schedule.heure_fin, pointage.heure_depart)
        if (finished) {
          const heures = calcDureeHeures(schedule.heure_debut, schedule.heure_fin)
          totalHeures += heures
          salaireBrut += heures * hourlyWage
        } else if (pointage.heure_arrivee) {
          const heuresLive = Math.max(0, (new Date() - new Date(pointage.heure_arrivee)) / 3600000)
          totalHeures += heuresLive
          salaireBrut += heuresLive * hourlyWage
        }
        penalitesRetard += Number(pointage.penalite_retard || 0)
      }
    }
    d.setDate(d.getDate() + 1)
  }

  const commissionsTotal = (commissions || []).reduce((s, c) => s + Number(c.commission_amount || 0), 0)
  const heuresSupTotal = (heuresSup || []).reduce((s, h) => s + Number(h.duree_heures || 0), 0)
  const heuresSupMontant = heuresSupTotal * hourlyWage
  const penalitesAbsence = absences.length * 200
  const salaireNet = salaireBrut + heuresSupMontant - penalitesRetard - penalitesAbsence + commissionsTotal

  return {
    totalHeures, salaireBrut, penalitesRetard,
    absencesCount: absences.length, absencesDates: absences,
    penalitesAbsence, commissionsTotal,
    heuresSupTotal, heuresSupMontant,
    salaireNet,
  }
}
