import { useNavigate } from 'react-router-dom'
import { Smartphone } from 'lucide-react'

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
  neuf:          'bg-blue-100 text-blue-700',
  reconditionne: 'bg-cyan-100 text-cyan-700',
  occasion:      'bg-orange-100 text-orange-700',
}

/* ── Grouped model card (catalogue) ── */
function GroupCard({ group }) {
  const navigate = useNavigate()
  const imageUrl = group.bestPhone?.image_url
    || group.bestPhone?.images?.[0]
    || null

  return (
    <div
      onClick={() => navigate(`/modele/${modelToSlug(group.model)}`)}
      className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-center hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* Image */}
      <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
        {imageUrl && imageUrl !== '/images/placeholder.jpg' ? (
          <img src={imageUrl} alt={group.model} className="w-full h-full object-contain p-2" loading="lazy" />
        ) : (
          <Smartphone size={40} className="text-[#00B4CC] opacity-25" strokeWidth={1} />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[#1B2A4A] text-[15px] leading-tight mb-1 truncate">
          {group.model}
        </h3>

        <span className="text-[11px] text-green-600 font-medium">
          ● {group.totalStock} disponible{group.totalStock > 1 ? 's' : ''}
        </span>

        {/* Pills stockage */}
        {group.storages.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {group.storages.map((s) => (
              <span key={s} className="text-[11px] border border-gray-300 rounded-md px-2 py-0.5 text-gray-600 font-medium">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Pastilles couleur */}
        {group.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {group.colors.slice(0, 5).map((c) => (
              <span
                key={c}
                className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
                style={{ background: colorToHex(c) }}
                title={c}
              />
            ))}
            {group.colors.length > 5 && (
              <span className="text-[10px] text-gray-400">+{group.colors.length - 5}</span>
            )}
          </div>
        )}

        {/* Prix */}
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-[11px] text-gray-400">À partir de</span>
          <span className="font-bold text-[16px] text-[#1B2A4A]">{group.basePrice}€</span>
        </div>
      </div>
    </div>
  )
}

/* ── Individual phone card (detail pages, backward compat) ── */
function PhoneCard({ phone, onClick }) {
  const colors = phone.color ? [phone.color] : []

  return (
    <div
      onClick={() => onClick?.(phone)}
      className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-center hover:border-[#00B4CC] hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="w-[100px] h-[100px] flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
        {phone.images?.[0] && phone.images[0] !== '/images/placeholder.jpg' ? (
          <img src={phone.images[0]} alt={phone.name} className="w-full h-full object-contain p-2" loading="lazy" />
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
          <span className="font-bold text-[16px] text-[#1B2A4A]">{phone.price}€</span>
        </div>
      </div>
    </div>
  )
}

/* ── Default export : auto-détecte group vs phone ── */
export default function PhoneListCard({ group, phone, onClick }) {
  if (group) return <GroupCard group={group} />
  return <PhoneCard phone={phone} onClick={onClick} />
}
