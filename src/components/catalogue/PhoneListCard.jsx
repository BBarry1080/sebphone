import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone } from 'lucide-react'
import { getPhoneImage, PLACEHOLDER } from '../../utils/phoneImage'
import { getStartingPrice } from '../../data/startingPrices'
import { charmPrice } from '../../utils/charmPrice'

export const colorToHex = (colorName) => {
  const map = {
    'Noir': '#1C1C1E', 'Minuit': '#1C1C1E', 'Noir de jais': '#0A0A0A', 'Noir spatial': '#1C1C1E',
    'Blanc': '#F5F5F0', 'Lumière stellaire': '#F5F0E8', 'Argent': '#E2E2E2',
    'Rouge': '#BF0000',
    'Bleu': '#2E5CA8', 'Bleu alpin': '#3A6B9A', 'Bleu Pacifique': '#2A5FA8',
    'Bleu outremer': '#1B3A8C', 'Bleu intense': '#1B3A8C', 'Bleu ciel': '#6BB8E8',
    'Violet': '#7B5EA7', 'Violet intense': '#5B2D8A',
    'Or': '#D4A96A', 'Or rose': '#F4C2C2',
    'Rose': '#FADADD',
    'Vert': '#4A7C6F', 'Vert nuit': '#1E3A2F', 'Vert alpin': '#2E5C42', 'Vert jade': '#2E7D5C',
    'Jaune': '#F5D76E',
    'Graphite': '#54524F',
    'Titane naturel': '#C4B69A', 'Titane noir': '#2C2C2E', 'Titane blanc': '#E8E4DC',
    'Titane bleu': '#4A6FA5', 'Titane désert': '#C8A87A',
    'Corail': '#FF7F50', 'Orange cosmique': '#FF6B2B',
    'Gris sidéral': '#4A4A4A',
  }
  return map[colorName] || '#9CA3AF'
}

function modelToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

const conditionLabel = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const conditionColor = {
  neuf:          'bg-green-100 text-green-700',
  reconditionne: 'bg-cyan-100 text-cyan-700',
  occasion:      'bg-blue-100 text-blue-700',
}

/* ── Grouped model card — vue LISTE ── */
function GroupCard({ group }) {
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState(group.colors?.[0] || null)
  const imgSrc = getPhoneImage(group.model, selectedColor)

  const isReconditionne = group.condition === 'reconditionne'
    || group.phones?.every((p) => p.condition === 'reconditionne')
  const refPrice = isReconditionne ? (group.referencePrice || getStartingPrice(group.model)) : null

  return (
    <div
      onClick={() => navigate(`/modele/${modelToSlug(group.model)}`)}
      className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-center hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
        <img key={imgSrc} src={imgSrc} alt={`${group.model} ${selectedColor || ''}`}
          className="w-full h-full object-contain p-2" loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[#1B2A4A] text-[15px] leading-tight mb-1 truncate">{group.model}</h3>
        <span className="text-[11px] text-green-600 font-medium">● {group.totalStock} disponible{group.totalStock > 1 ? 's' : ''}</span>
        {group.storages.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {group.storages.map((s) => (
              <span key={s} className="text-[11px] border border-gray-300 rounded-md px-2 py-0.5 text-gray-600 font-medium">{s}</span>
            ))}
          </div>
        )}
        {group.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {group.colors.slice(0, 6).map((c) => (
              <button key={c} onClick={(e) => { e.stopPropagation(); setSelectedColor(c) }}
                className={`rounded-full border-2 flex-shrink-0 transition-transform cursor-pointer ${selectedColor === c ? 'w-5 h-5 border-[#1B2A4A] scale-110' : 'w-3.5 h-3.5 border-gray-300 hover:border-gray-500'}`}
                style={{ background: colorToHex(c) }} title={c} />
            ))}
            {group.colors.length > 6 && <span className="text-[10px] text-gray-400">+{group.colors.length - 6}</span>}
          </div>
        )}
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-[11px] text-gray-400">À partir de</span>
          <span className="font-bold text-[16px] text-[#1B2A4A]">{charmPrice(refPrice ?? group.basePrice)}€</span>
        </div>
      </div>
    </div>
  )
}

/* ── Grouped model card — vue GRILLE ── */
function GroupCardGrid({ group }) {
  const navigate = useNavigate()
  const [selectedColor, setSelectedColor] = useState(group.colors?.[0] || null)
  const imgSrc = getPhoneImage(group.model, selectedColor)

  const isReconditionne = group.condition === 'reconditionne'
    || group.phones?.every((p) => p.condition === 'reconditionne')
  const refPrice = isReconditionne ? (group.referencePrice || getStartingPrice(group.model)) : null

  return (
    <div
      onClick={() => navigate(`/modele/${modelToSlug(group.model)}`)}
      className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-3">
        <img key={imgSrc} src={imgSrc} alt={`${group.model} ${selectedColor || ''}`}
          className="w-full h-full object-contain p-3" loading="lazy"
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }} />
      </div>

      {/* Infos */}
      <div className="flex-1 flex flex-col">
        <p className="text-[11px] text-green-600 font-medium mb-1">● {group.totalStock} disponible{group.totalStock > 1 ? 's' : ''}</p>
        <h3 className="font-bold text-[#1B2A4A] text-[14px] leading-tight mb-2">{group.model}</h3>

        {group.storages.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {group.storages.slice(0, 3).map((s) => (
              <span key={s} className="text-[10px] border border-gray-300 rounded-md px-1.5 py-0.5 text-gray-600 font-medium">{s}</span>
            ))}
            {group.storages.length > 3 && <span className="text-[10px] text-gray-400">+{group.storages.length - 3}</span>}
          </div>
        )}

        {group.colors.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {group.colors.slice(0, 5).map((c) => (
              <button key={c} onClick={(e) => { e.stopPropagation(); setSelectedColor(c) }}
                className={`rounded-full border-2 flex-shrink-0 transition-transform cursor-pointer ${selectedColor === c ? 'w-4 h-4 border-[#1B2A4A] scale-110' : 'w-3 h-3 border-gray-300'}`}
                style={{ background: colorToHex(c) }} title={c} />
            ))}
            {group.colors.length > 5 && <span className="text-[10px] text-gray-400">+{group.colors.length - 5}</span>}
          </div>
        )}

        <div className="mt-auto">
          <p className="text-[10px] text-gray-400">À partir de</p>
          <p className="font-bold text-[18px] text-[#1B2A4A] leading-tight">{charmPrice(refPrice ?? group.basePrice)}€</p>
        </div>
      </div>
    </div>
  )
}

/* ── Individual phone card (backward compat) ── */
function PhoneCard({ phone, onClick }) {
  const imgSrc = getPhoneImage(
    (typeof phone.model === 'string' ? phone.model : phone.model?.name) || phone.name,
    phone.color
  )
  const colors = phone.color ? [phone.color] : []

  return (
    <div
      onClick={() => onClick?.(phone)}
      className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-center hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
        {imgSrc !== PLACEHOLDER ? (
          <img
            src={imgSrc}
            alt={phone.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
          />
        ) : (
          <Smartphone size={40} className="text-[#00B4CC] opacity-25" strokeWidth={1} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColor[phone.condition] || 'bg-gray-100 text-gray-600'}`}>
            {conditionLabel[phone.condition] || phone.condition}
          </span>
        </div>
        <h3 className="font-bold text-[#1B2A4A] text-[15px] leading-tight mb-2 truncate">
          {phone.name || phone.model}
        </h3>
        {phone.storage && (
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[11px] border border-gray-300 rounded-md px-2 py-0.5 text-gray-600 font-medium">
              {phone.storage}
            </span>
          </div>
        )}
        {colors.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            {colors.map((c) => (
              <span key={c} className="w-4 h-4 rounded-full border border-gray-300" style={{ background: colorToHex(c) }} title={c} />
            ))}
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-[11px] text-gray-400">À partir de</span>
          <span className="font-bold text-[16px] text-[#1B2A4A]">{charmPrice(phone.price)}€</span>
        </div>
      </div>
    </div>
  )
}

export default function PhoneListCard({ group, phone, onClick, viewMode = 'list' }) {
  if (group) return viewMode === 'grid' ? <GroupCardGrid group={group} /> : <GroupCard group={group} />
  return <PhoneCard phone={phone} onClick={onClick} />
}
