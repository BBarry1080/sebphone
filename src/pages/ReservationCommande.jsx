import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ReservationForm from '../components/reservation/ReservationForm'
import { MAGASINS_LIST } from '../utils/magasins'

export default function ReservationCommande() {
  const { state } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!state) navigate('/sur-commande', { replace: true })
  }, [state, navigate])

  if (!state) return null

  const { model, color, storage, price } = state

  // Phone "virtuel" — pas de phone_id en DB, c'est une commande
  const virtualPhone = {
    id:             null,
    name:           model,
    model:          model,
    brand:          model.toLowerCase().includes('samsung') ? 'Samsung' : 'Apple',
    color:          color,
    storage:        storage,
    price:          price,
    condition:      'neuf',
    grade:          null,
    battery_health: null,
    parts_replaced: [],
    magasins:       MAGASINS_LIST.map((m) => m.id),
    status:         'disponible',
    surCommande:    true,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#555555] hover:text-[#00B4CC] text-sm mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="mb-8">
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
          📦 Sur commande
        </span>
        <h1 className="font-poppins font-bold text-3xl text-[#1B2A4A] mb-1">
          Réserver <span className="text-[#00B4CC]">{model}</span>
        </h1>
        <p className="text-[#555555] text-sm">
          {color} · {storage} · Neuf sous scellé · Délai 2 à 5 jours
        </p>
      </div>

      <ReservationForm phone={virtualPhone} />
    </main>
  )
}
