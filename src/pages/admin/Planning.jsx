import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useIsAdmin } from '../../hooks/usePermissions'
import StaffScheduleCalendar from '../../components/admin/StaffScheduleCalendar'
import { MAGASINS_PHYSIQUES } from '../../utils/magasins'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

const PLANNING_MAGASINS_EXCLUS = ['marrakech', 'livraison-sebphone']
const PLANNING_MAGASIN_LABELS = { 'livraison-sebtelecom': 'À domicile' }

export default function Planning() {
  const isAdmin = useIsAdmin()

  const planningMagasins = MAGASINS_PHYSIQUES
    .filter((m) => !PLANNING_MAGASINS_EXCLUS.includes(m.id))
    .map((m) => PLANNING_MAGASIN_LABELS[m.id] ? { ...m, nom: PLANNING_MAGASIN_LABELS[m.id] } : m)

  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Heures supplémentaires : demandes en attente + ajout manuel
  const [pendingHeuresSup, setPendingHeuresSup]     = useState([])
  const [loadingPendingHS, setLoadingPendingHS]     = useState(false)
  const [showAddHeureSup, setShowAddHeureSup]       = useState(false)
  const [addHSForm, setAddHSForm]                   = useState({ staff_id: '', date: '', duree_heures: '', motif: '' })
  const [savingHS, setSavingHS]                     = useState(false)

  // Disponibilités proposées par les employés
  const [pendingDispos, setPendingDispos] = useState([])
  const [loadingDispos, setLoadingDispos] = useState(false)

  // Vue par magasin
  const [viewMode, setViewMode] = useState('employe') // 'employe' | 'magasin'
  const [selectedMagasinVue, setSelectedMagasinVue] = useState(planningMagasins[0]?.id || '')
  const [magasinMonthOffset, setMagasinMonthOffset] = useState(0)
  const [magasinStaffList, setMagasinStaffList] = useState([])
  const [magasinScheduleDates, setMagasinScheduleDates] = useState([])
  const [magasinFermetures, setMagasinFermetures] = useState([])
  const [assignDateIsClosed, setAssignDateIsClosed] = useState(false)
  const [loadingMagasinVue, setLoadingMagasinVue] = useState(false)

  // Assignation rapide d'un shift depuis la vue magasin
  const [showAssignShift, setShowAssignShift] = useState(false)
  const [assignDate, setAssignDate] = useState(null)
  const [assignForm, setAssignForm] = useState({ staff_id: '', repos: false, heure_debut: '10:00', heure_fin: '18:00' })
  const [savingAssign, setSavingAssign] = useState(false)
  const [suggestedDispoMap, setSuggestedDispoMap] = useState({})

  const mgPad2 = (n) => String(n).padStart(2, '0')
  const mgToDateStr = (d) => `${d.getFullYear()}-${mgPad2(d.getMonth() + 1)}-${mgPad2(d.getDate())}`

  const buildMonthCells = (monthOffset) => {
    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const year = base.getFullYear()
    const month = base.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    return cells
  }

  const fetchMagasinVueData = async () => {
    if (!selectedMagasinVue) return
    setLoadingMagasinVue(true)
    const { data: staffData } = await supabase
      .from('staff').select('*')
      .eq('magasin_id', selectedMagasinVue).eq('active', true)
      .order('name', { ascending: true })
    setMagasinStaffList(staffData || [])
    const staffIds = (staffData || []).map((s) => s.id)

    const now = new Date()
    const base = new Date(now.getFullYear(), now.getMonth() + magasinMonthOffset, 1)
    const monthStart = `${base.getFullYear()}-${mgPad2(base.getMonth() + 1)}-01`
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    const monthEnd = `${base.getFullYear()}-${mgPad2(base.getMonth() + 1)}-${mgPad2(lastDay)}`

    const { data: fermData } = await supabase
      .from('magasin_fermetures').select('*')
      .eq('magasin_id', selectedMagasinVue)
      .gte('date', monthStart).lte('date', monthEnd)
    setMagasinFermetures(fermData || [])

    if (staffIds.length === 0) {
      setMagasinScheduleDates([])
      setLoadingMagasinVue(false)
      return
    }
    const { data: schedData } = await supabase
      .from('staff_schedule_dates').select('*, staff(name)')
      .in('staff_id', staffIds).gte('date', monthStart).lte('date', monthEnd)
    setMagasinScheduleDates(schedData || [])
    setLoadingMagasinVue(false)
  }

  const JS_DAY_TO_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

  const fetchSuggestionsForDate = async (dateStr) => {
    const staffIds = magasinStaffList.map((s) => s.id)
    if (staffIds.length === 0) { setSuggestedDispoMap({}); return }
    const frDay = JS_DAY_TO_FR[new Date(dateStr + 'T12:00:00').getDay()]
    const { data } = await supabase
      .from('staff_disponibilites_hebdo')
      .select('*')
      .in('staff_id', staffIds)
      .eq('jour_semaine', frDay)
      .eq('active', true)
      .eq('repos', false)
    const map = {}
    ;(data || []).forEach((d) => {
      map[d.staff_id] = {
        ...d,
        heure_debut: (d.heure_debut || '').slice(0, 5),
        heure_fin: (d.heure_fin || '').slice(0, 5),
      }
    })
    setSuggestedDispoMap(map)
  }

  const openAssignShift = (dateStr) => {
    setAssignDate(dateStr)
    setAssignForm({ staff_id: '', repos: false, heure_debut: '10:00', heure_fin: '18:00' })
    setAssignDateIsClosed(magasinFermetures.some((f) => f.date === dateStr))
    setShowAssignShift(true)
    fetchSuggestionsForDate(dateStr)
  }

  const handleAssignShift = async () => {
    if (!assignForm.staff_id || !assignDate) {
      alert('Choisis un employé'); return
    }
    setSavingAssign(true)
    const { error } = await supabase.from('staff_schedule_dates').upsert({
      staff_id: assignForm.staff_id,
      date: assignDate,
      repos: assignForm.repos,
      heure_debut: assignForm.repos ? null : assignForm.heure_debut,
      heure_fin: assignForm.repos ? null : assignForm.heure_fin,
    }, { onConflict: 'staff_id,date' })
    setSavingAssign(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setShowAssignShift(false)
    fetchMagasinVueData()
  }

  const handleToggleFermeture = async () => {
    if (!assignDate || !selectedMagasinVue) return
    setSavingAssign(true)
    if (assignDateIsClosed) {
      const { error } = await supabase.from('magasin_fermetures')
        .delete().eq('magasin_id', selectedMagasinVue).eq('date', assignDate)
      setSavingAssign(false)
      if (error) { alert('Erreur : ' + error.message); return }
    } else {
      const currentUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
      const { error } = await supabase.from('magasin_fermetures').upsert({
        magasin_id: selectedMagasinVue,
        date: assignDate,
        created_by: currentUser?.name || 'Admin',
      }, { onConflict: 'magasin_id,date' })
      setSavingAssign(false)
      if (error) { alert('Erreur : ' + error.message); return }
    }
    setShowAssignShift(false)
    fetchMagasinVueData()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (viewMode === 'magasin') fetchMagasinVueData()
  }, [viewMode, selectedMagasinVue, magasinMonthOffset])

  const fetchStaffList = async () => {
    setLoadingStaff(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
    setStaffList(data || [])
    setLoadingStaff(false)
  }

  const fetchPendingHeuresSup = async () => {
    setLoadingPendingHS(true)
    const { data } = await supabase
      .from('staff_heures_sup')
      .select('*, staff(name)')
      .eq('statut', 'en_attente')
      .order('date', { ascending: false })
    setPendingHeuresSup(data || [])
    setLoadingPendingHS(false)
  }

  const fetchPendingDispos = async () => {
    setLoadingDispos(true)
    const { data } = await supabase
      .from('staff_disponibilites').select('*, staff(name)')
      .eq('statut', 'en_attente').order('created_at', { ascending: false })
    setPendingDispos(data || [])
    setLoadingDispos(false)
  }

  useEffect(() => { fetchStaffList() }, [])
  useEffect(() => { fetchPendingHeuresSup() }, [])
  useEffect(() => { fetchPendingDispos() }, [])

  const handleTraiterDispo = async (dispo, statut) => {
    const currentUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    if (statut === 'accepte') {
      let error
      if (dispo.type === 'hebdo') {
        const res = await supabase.from('staff_disponibilites_hebdo').upsert({
          staff_id: dispo.staff_id,
          jour_semaine: dispo.jour_semaine,
          repos: dispo.repos,
          heure_debut: dispo.repos ? null : dispo.heure_debut,
          heure_fin: dispo.repos ? null : dispo.heure_fin,
          active: true,
        }, { onConflict: 'staff_id,jour_semaine' })
        error = res.error
      } else {
        const res = await supabase.from('staff_schedule_dates').upsert({
          staff_id: dispo.staff_id,
          date: dispo.date,
          repos: dispo.repos,
          heure_debut: dispo.repos ? null : dispo.heure_debut,
          heure_fin: dispo.repos ? null : dispo.heure_fin,
        }, { onConflict: 'staff_id,date' })
        error = res.error
      }
      if (error) {
        alert('Erreur lors de l\'application de l\'horaire : ' + error.message)
        return
      }
    }
    const { error: updateError } = await supabase.from('staff_disponibilites')
      .update({ statut, traite_par: currentUser?.name || 'Admin', traite_at: new Date().toISOString() })
      .eq('id', dispo.id)
    if (updateError) { alert('Erreur : ' + updateError.message); return }
    fetchPendingDispos()
  }

  const handleTraiterHeureSup = async (id, statut) => {
    const currentUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    await supabase.from('staff_heures_sup')
      .update({ statut, traite_par: currentUser?.name || 'Admin', traite_at: new Date().toISOString() })
      .eq('id', id)
    fetchPendingHeuresSup()
  }

  const handleAddHeureSupManuelle = async () => {
    if (!addHSForm.staff_id || !addHSForm.date || !addHSForm.duree_heures) {
      alert('Employé, date et durée obligatoires'); return
    }
    setSavingHS(true)
    const currentUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const { error } = await supabase.from('staff_heures_sup').insert({
      staff_id: addHSForm.staff_id,
      date: addHSForm.date,
      duree_heures: Number(addHSForm.duree_heures),
      motif: addHSForm.motif || null,
      statut: 'accepte',
      traite_par: currentUser?.name || 'Admin',
      traite_at: new Date().toISOString(),
    })
    setSavingHS(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setAddHSForm({ staff_id: '', date: '', duree_heures: '', motif: '' })
    setShowAddHeureSup(false)
    fetchPendingHeuresSup()
  }

  const magasinNom = (id) => planningMagasins.find((m) => m.id === id)?.nom || MAGASINS_PHYSIQUES.find((m) => m.id === id)?.nom || id

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
          <Calendar size={22} /> Planning
        </h1>
        <p className="text-sm text-gray-500 mt-1">Horaires et plannings de l'équipe</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('employe')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            viewMode === 'employe' ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          👤 Par employé
        </button>
        <button onClick={() => setViewMode('magasin')}
          className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
            viewMode === 'magasin' ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-white text-gray-600 border-gray-200'
          }`}>
          🏬 Par magasin
        </button>
      </div>

      {(pendingHeuresSup.length > 0 || isAdmin) && (
        <div className="mb-4">
          {pendingHeuresSup.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2">
              <p className="text-xs font-bold text-amber-700 uppercase mb-2">
                ⏱️ {pendingHeuresSup.length} demande(s) d'heures supplémentaires en attente
              </p>
              <div className="space-y-2">
                {pendingHeuresSup.map((r) => (
                  <div key={r.id} className="bg-white rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-[#1B2A4A]">{r.staff?.name || '—'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.date).toLocaleDateString('fr-BE')} — {r.duree_heures}h en plus
                        {r.heure_fin_prevue && ` (prévu ${r.heure_fin_prevue})`}
                      </p>
                      {r.motif && <p className="text-xs text-gray-400 italic mt-0.5">"{r.motif}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTraiterHeureSup(r.id, 'accepte')}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600">
                        Accepter
                      </button>
                      <button onClick={() => handleTraiterHeureSup(r.id, 'refuse')}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-red-300 hover:text-red-500">
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pendingDispos.length > 0 && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 mb-2">
              <p className="text-xs font-bold text-cyan-700 uppercase mb-2">
                📅 {pendingDispos.length} disponibilité(s) proposée(s)
              </p>
              <div className="space-y-2">
                {pendingDispos.map((d) => (
                  <div key={d.id} className="bg-white rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-[#1B2A4A]">{d.staff?.name || '—'}</p>
                      <p className="text-xs text-gray-500">
                        {d.type === 'hebdo'
                          ? `Tous les ${d.jour_semaine}`
                          : new Date(d.date).toLocaleDateString('fr-BE')}
                        {' — '}{d.repos ? 'Repos' : `${d.heure_debut} - ${d.heure_fin}`}
                      </p>
                      {d.motif && <p className="text-xs text-gray-400 italic mt-0.5">"{d.motif}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTraiterDispo(d, 'accepte')}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600">
                        Accepter
                      </button>
                      <button onClick={() => handleTraiterDispo(d, 'refuse')}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-red-300 hover:text-red-500">
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            !showAddHeureSup ? (
              <button onClick={() => setShowAddHeureSup(true)}
                className="text-xs font-bold text-[#00B4CC] hover:text-[#1B2A4A]">
                + Ajouter une heure sup manuellement
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select value={addHSForm.staff_id} onChange={(e) => setAddHSForm((f) => ({ ...f, staff_id: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="">— Employé —</option>
                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="date" value={addHSForm.date} onChange={(e) => setAddHSForm((f) => ({ ...f, date: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                  <input type="number" step="0.25" placeholder="Durée (h)" value={addHSForm.duree_heures}
                    onChange={(e) => setAddHSForm((f) => ({ ...f, duree_heures: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                  <input type="text" placeholder="Motif (optionnel)" value={addHSForm.motif}
                    onChange={(e) => setAddHSForm((f) => ({ ...f, motif: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddHeureSupManuelle} disabled={savingHS}
                    className="bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                    {savingHS ? 'Ajout...' : 'Ajouter (validé automatiquement)'}
                  </button>
                  <button onClick={() => setShowAddHeureSup(false)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                    Annuler
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {viewMode === 'employe' && (
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Colonne gauche : liste employés */}
        <div className="w-full lg:w-[300px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
          {loadingStaff ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Aucun employé actif</p>
          ) : (
            staffList.map((s) => {
              const initials = s.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
              const isSel = selectedStaff?.id === s.id
              return (
                <button key={s.id}
                  onClick={() => setSelectedStaff(s)}
                  className={`w-full text-left p-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                    isSel ? 'bg-cyan-50 border-2 border-[#00B4CC]' : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}>
                  <div className="w-9 h-9 rounded-lg bg-[#1B2A4A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1B2A4A] text-sm truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{magasinNom(s.magasin_id)}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Colonne droite : calendrier employé sélectionné */}
        <div className="flex-1 min-w-0">
          {!selectedStaff ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Calendar size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sélectionnez un employé pour voir son planning</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <StaffScheduleCalendar
                staffId={selectedStaff.id}
                staffName={selectedStaff.name}
                staffPhone={selectedStaff.telephone}
                hourlyWage={selectedStaff.hourly_wage || 0}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {viewMode === 'magasin' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {planningMagasins.map((m) => (
              <button key={m.id} onClick={() => setSelectedMagasinVue(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  selectedMagasinVue === m.id ? 'bg-[#00B4CC] text-white border-[#00B4CC]' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {m.nom}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setMagasinMonthOffset((o) => o - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-bold text-[#1B2A4A] capitalize min-w-[140px] text-center">
                  {(() => {
                    const now = new Date()
                    const base = new Date(now.getFullYear(), now.getMonth() + magasinMonthOffset, 1)
                    return base.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
                  })()}
                </span>
                <button onClick={() => setMagasinMonthOffset((o) => o + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronRight size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {magasinStaffList.length} employé(s) actif(s) dans ce magasin
              </p>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d) => (
                <div key={d} className="text-center text-[10px] font-bold uppercase text-gray-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {loadingMagasinVue ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const todayStr = mgToDateStr(new Date())
                  return buildMonthCells(magasinMonthOffset).map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />
                    const dateStr = mgToDateStr(date)
                    const workingToday = magasinScheduleDates.filter((s) => s.date === dateStr && !s.repos)
                    const isClosed = magasinFermetures.some((f) => f.date === dateStr)
                    const isHole = !isClosed && workingToday.length === 0
                    const isPast = dateStr < todayStr
                    const colorCls = isClosed
                      ? 'border-gray-300 bg-gray-100'
                      : isHole
                        ? 'border-red-300 bg-red-50'
                        : isPast
                          ? 'border-green-300 bg-green-50'
                          : 'border-blue-300 bg-blue-50'
                    return (
                      <div key={dateStr}
                        className={`rounded-xl border p-2 min-h-[80px] ${colorCls}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-gray-400">{date.getDate()}</p>
                          <button onClick={() => openAssignShift(dateStr)}
                            className="w-4 h-4 flex items-center justify-center rounded-full bg-[#1B2A4A] text-white text-[10px] font-bold leading-none hover:bg-[#00B4CC]"
                            title="Ajouter un employé ce jour">
                            +
                          </button>
                        </div>
                        {isClosed ? (
                          <p className="text-[10px] font-bold text-gray-500">🔒 Fermé</p>
                        ) : isHole ? (
                          <p className="text-[10px] font-bold text-red-600">⚠️ Personne</p>
                        ) : (
                          <div className="space-y-0.5">
                            {workingToday.map((s) => (
                              <p key={s.id} className={`text-[10px] truncate ${isPast ? 'text-green-700' : 'text-blue-700'}`}>
                                {(s.staff?.name || '').split(' ')[0] || '—'}
                                {s.heure_debut && ` ${s.heure_debut}-${s.heure_fin}`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {showAssignShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A] text-lg">
                Assigner un shift
              </h3>
              <button onClick={() => setShowAssignShift(false)} className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {assignDate && new Date(assignDate).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>

            <button onClick={handleToggleFermeture} disabled={savingAssign}
              className={`w-full py-2 rounded-xl text-xs font-bold border-2 mb-3 disabled:opacity-50 ${
                assignDateIsClosed
                  ? 'bg-red-50 border-red-300 text-red-600'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
              }`}>
              {assignDateIsClosed ? '🔓 Rouvrir le magasin ce jour' : '🔒 Marquer le magasin fermé ce jour'}
            </button>

            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Employé</p>
            {Object.keys(suggestedDispoMap).length > 0 && (
              <p className="text-[10px] text-green-600 font-bold mb-1.5">✅ Disponibles ce jour d'après leurs préférences</p>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {magasinStaffList.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun employé actif dans ce magasin</p>
              ) : (
                [...magasinStaffList]
                  .sort((a, b) => (suggestedDispoMap[b.id] ? 1 : 0) - (suggestedDispoMap[a.id] ? 1 : 0))
                  .map((s) => {
                    const suggestion = suggestedDispoMap[s.id]
                    const isSelected = assignForm.staff_id === s.id
                    return (
                      <button key={s.id}
                        onClick={() => setAssignForm((f) => ({
                          ...f,
                          staff_id: s.id,
                          repos: false,
                          heure_debut: suggestion?.heure_debut || f.heure_debut,
                          heure_fin: suggestion?.heure_fin || f.heure_fin,
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${
                          isSelected
                            ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                            : suggestion
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}>
                        {suggestion && !isSelected && '✅ '}{s.name}
                        {suggestion && ` (${suggestion.heure_debut}-${suggestion.heure_fin})`}
                      </button>
                    )
                  })
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-600 mb-3">
              <input type="checkbox" checked={assignForm.repos}
                onChange={(e) => setAssignForm((f) => ({ ...f, repos: e.target.checked }))} />
              Repos (pas de shift)
            </label>

            {!assignForm.repos && (
              <div className="flex gap-2 mb-4">
                <input type="time" value={assignForm.heure_debut}
                  onChange={(e) => setAssignForm((f) => ({ ...f, heure_debut: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input type="time" value={assignForm.heure_fin}
                  onChange={(e) => setAssignForm((f) => ({ ...f, heure_fin: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            )}

            <button onClick={handleAssignShift} disabled={savingAssign || !assignForm.staff_id}
              className="w-full py-2.5 bg-[#00B4CC] text-white rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
              {savingAssign ? 'Enregistrement...' : 'Assigner'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
