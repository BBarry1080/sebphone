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

  useEffect(() => { fetchStaffList() }, [])

  const magasinNom = (id) => MAGASINS_PHYSIQUES.find((m) => m.id === id)?.nom || id

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
          <Calendar size={22} /> Planning
        </h1>
        <p className="text-sm text-gray-500 mt-1">Horaires et plannings de l'équipe</p>
      </div>

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
