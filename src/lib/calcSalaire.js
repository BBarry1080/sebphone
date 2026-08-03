export async function calcSalairePeriode(supabase, staffId, hourlyWage, dateStart, dateEnd) {
  const { data: schedules } = await supabase
    .from('staff_schedules')
    .select('*')
    .eq('staff_id', staffId)

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

  let totalHeures = 0
  let salaireBrut = 0
  let penalitesRetard = 0
  const absences = []

  const d = new Date(dateStart)
  const end = new Date(dateEnd)
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    const schedule = schedules?.find((s) => s.jour_semaine === dow)

    if (schedule && !schedule.repos) {
      const pointage = pointages?.find((p) => p.date === dateStr)
      if (!pointage) {
        absences.push(dateStr)
      } else {
        if (pointage.heure_arrivee && pointage.heure_depart) {
          const heures = (new Date(pointage.heure_depart) - new Date(pointage.heure_arrivee)) / 3600000
          totalHeures += heures
          salaireBrut += heures * hourlyWage
        }
        penalitesRetard += Number(pointage.penalite_retard || 0)
      }
    }
    d.setDate(d.getDate() + 1)
  }

  const commissionsTotal = (commissions || []).reduce((s, c) => s + Number(c.commission_amount || 0), 0)
  const penalitesAbsence = absences.length * 200
  const salaireNet = salaireBrut - penalitesRetard - penalitesAbsence + commissionsTotal

  return {
    totalHeures, salaireBrut, penalitesRetard,
    absencesCount: absences.length, absencesDates: absences,
    penalitesAbsence, commissionsTotal, salaireNet,
  }
}
