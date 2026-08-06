import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useIsAdmin } from '../../hooks/usePermissions'
import StaffScheduleCalendar from '../../components/admin/StaffScheduleCalendar'
import { MAGASINS_PHYSIQUES } from '../../utils/magasins'
import { Calendar } from 'lucide-react'

export default function Planning() {
  const isAdmin = useIsAdmin()
  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Heures supplémentaires : demandes en attente + ajout manuel
  const [pendingHeuresSup, setPendingHeuresSup]     = useState([])
  const [loadingPendingHS, setLoadingPendingHS]     = useState(false)
  const [showAddHeureSup, setShowAddHeureSup]       = useState(false)
  const [addHSForm, setAddHSForm]                   = useState({ staff_id: '', date: '', duree_heures: '', motif: '' })
  const [savingHS, setSavingHS]                     = useState(false)

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

  useEffect(() => { fetchStaffList() }, [])
  useEffect(() => { fetchPendingHeuresSup() }, [])

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

  const magasinNom = (id) => MAGASINS_PHYSIQUES.find((m) => m.id === id)?.nom || id

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
          <Calendar size={22} /> Planning
        </h1>
        <p className="text-sm text-gray-500 mt-1">Horaires et plannings de l'équipe</p>
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
    </div>
  )
}
