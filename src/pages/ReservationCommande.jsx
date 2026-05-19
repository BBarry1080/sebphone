import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ReservationForm from '../components/reservation/ReservationForm'
import { getSurCommandeColors, getSurCommandeStorages } from '../utils/surCommandeColors'

export default function ReservationCommande() {
  const { state } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!state) navigate('/boutique', { replace: true })
  }, [state, navigate])

  const srcPhone = state?.phone || null
  const model = srcPhone?.name || srcPhone?.model || state?.model || ''
  const availableColors = getSurCommandeColors(model)
  const availableStorages = getSurCommandeStorages(model)

  const [selectedColor, setSelectedColor] = useState(
    state?.selectedColor || state?.color || availableColors[0] || ''
  )
  const [selectedStorage, setSelectedStorage] = useState(
    availableStorages.includes(state?.selectedStorage)
      ? state?.selectedStorage
      : availableStorages[0]
  )

  if (!state) return null

  const price = srcPhone?.price ?? state?.price ?? 0
  const delai = srcPhone?.delai_commande || state?.delai || '1h à 72h'

  // Phone "sur commande" — le client choisit couleur, stockage et magasin
  const virtualPhone = {
    id:             srcPhone?.id ?? null,
    name:           model,
    model:          model,
    brand:          srcPhone?.brand || (model.toLowerCase().includes('samsung') ? 'Samsung' : 'Apple'),
    color:          selectedColor,
    storage:        selectedStorage,
    price:          price,
    condition:      'neuf',
    grade:          null,
    battery_health: null,
    parts_replaced: [],
    magasins:       [],
    status:         'sur_commande',
    delai_commande: delai,
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
          {selectedColor} · {selectedStorage} · Neuf sous scellé · Délai {delai}
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
            Couleur souhaitée
          </label>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                  ${selectedColor === color
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'}`}>
                {color}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
            Stockage souhaité
          </label>
          <div className="flex flex-wrap gap-2">
            {availableStorages.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStorage(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                  ${selectedStorage === s
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ReservationForm key={`${selectedColor}-${selectedStorage}`} phone={virtualPhone} />
    </main>
  )
}
