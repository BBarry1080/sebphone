import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { getColorHex } from '../utils/colors'
import { STARTING_PRICES } from '../data/startingPrices'
import { IPHONE_ON_DEMAND } from '../data/iphoneOnDemand'
import { MAGASINS_LIST } from '../utils/magasins'

export default function SurCommande() {
  const navigate = useNavigate()
  const [selectedModel,   setSelectedModel]   = useState(null)
  const [selectedColor,   setSelectedColor]   = useState(null)
  const [selectedStorage, setSelectedStorage] = useState(null)
  const [selectedMagasin, setSelectedMagasin] = useState(MAGASINS_LIST[0]?.id || 'anderlecht')
  const [deliveryMode,    setDeliveryMode]    = useState('collect')

  const handleModelClick = (model) => {
    setSelectedModel(model)
    setSelectedColor(model.colors[0])
    setSelectedStorage(model.storages[0])
  }

  const handleReserver = () => {
    if (!selectedModel || !selectedColor || !selectedStorage) return
    navigate('/reservation-commande', {
      state: {
        model:        selectedModel.model,
        color:        selectedColor,
        storage:      selectedStorage,
        price:        STARTING_PRICES[selectedModel.model] || 0,
        condition:    'neuf',
        magasin:      selectedMagasin,
        deliveryMode,
        surCommande:  true,
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO */}
      <div className="bg-[#1B2A4A] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block">
            📦 Sur commande
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Commandez votre iPhone
          </h1>
          <p className="text-gray-300 text-sm max-w-lg mx-auto">
            Le modèle que vous souhaitez n'est pas en stock ? Réservez-le et nous vous le procurons sous 2 à 5 jours.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {!selectedModel ? (
          <div>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-6">
              Choisissez votre modèle
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {IPHONE_ON_DEMAND.map((iphone) => (
                <div
                  key={iphone.model}
                  onClick={() => handleModelClick(iphone)}
                  className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer hover:shadow-md hover:border-[#00B4CC] transition-all duration-200"
                >
                  <div className="aspect-square bg-[#f8f8f8] rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <img
                      src={getPhoneImage(iphone.model, iphone.colors[0])}
                      alt={iphone.model}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                    />
                  </div>
                  <p className="font-semibold text-[#1B2A4A] text-sm leading-tight mb-1">
                    {iphone.model}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">
                    {iphone.storages[0]} → {iphone.storages[iphone.storages.length - 1]}
                  </p>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {iphone.colors.slice(0, 5).map((color) => (
                      <div
                        key={color}
                        className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: getColorHex(color) }}
                        title={color}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    À partir de{' '}
                    <span className="font-bold text-[#1B2A4A]">
                      {STARTING_PRICES[iphone.model] || '—'}€
                    </span>
                  </p>
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium mt-1.5 inline-block">
                    Sur commande
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setSelectedModel(null)}
              className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-[#1B2A4A] cursor-pointer"
            >
              <ArrowLeft size={16} />
              Retour aux modèles
            </button>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-24 h-24 bg-[#f8f8f8] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={getPhoneImage(selectedModel.model, selectedColor)}
                    alt={selectedModel.model}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                  />
                </div>
                <div>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium mb-1 inline-block">
                    📦 Sur commande
                  </span>
                  <h2 className="text-xl font-bold text-[#1B2A4A]">{selectedModel.model}</h2>
                  <p className="text-[#00B4CC] font-bold text-lg">
                    À partir de {STARTING_PRICES[selectedModel.model] || '—'}€
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-[#1B2A4A] mb-2">
                  Couleur — {selectedColor}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {selectedModel.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 cursor-pointer ${
                        selectedColor === color ? 'border-[#1B2A4A] scale-125' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: getColorHex(color) }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-[#1B2A4A] mb-2">Stockage</p>
                <div className="flex gap-2 flex-wrap">
                  {selectedModel.storages.map((storage) => (
                    <button
                      key={storage}
                      onClick={() => setSelectedStorage(storage)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer ${
                        selectedStorage === storage
                          ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                          : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                      }`}
                    >
                      {storage}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm font-semibold text-[#1B2A4A] mb-2">Mode de réception</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { value: 'collect',  label: 'Click & Collect', sub: 'Retrait en magasin' },
                    { value: 'delivery', label: 'Livraison',       sub: 'À domicile' },
                  ].map(({ value, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDeliveryMode(value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all text-sm cursor-pointer ${
                        deliveryMode === value
                          ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <p className="font-semibold">{label}</p>
                      <p className="text-xs opacity-70">{sub}</p>
                    </button>
                  ))}
                </div>

                {deliveryMode === 'collect' && (
                  <div>
                    <p className="text-sm font-medium text-[#1B2A4A] mb-2">Choisir le magasin</p>
                    <select
                      value={selectedMagasin}
                      onChange={(e) => setSelectedMagasin(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                    >
                      {MAGASINS_LIST.map((m) => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-5 text-sm text-orange-700">
                ⏱️ Délai de commande : <strong>2 à 5 jours ouvrables</strong><br />
                📦 Neuf sous scellé · Garantie 1 an Apple · 2 ans SebPhone
              </div>

              <button
                onClick={handleReserver}
                className="w-full bg-[#1B2A4A] text-white rounded-xl py-4 font-bold text-base hover:bg-[#243660] transition-all cursor-pointer"
              >
                🔒 Réserver — Acompte 50€
              </button>

              <p className="text-xs text-gray-400 text-center mt-2">
                Acompte de 50€ à la réservation · Reste à payer à la livraison
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
