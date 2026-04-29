// SQL à exécuter dans Supabase si la colonne manque :
// ALTER TABLE phones ADD COLUMN IF NOT EXISTS battery_health INTEGER DEFAULT NULL;

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Smartphone, CheckCircle, MapPin } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { phonesMock } from '../data/phonesMock'
import Spinner from '../components/ui/Spinner'
import { colorToHex } from '../components/catalogue/PhoneListCard'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { getStartingPrice } from '../data/startingPrices'
import { charmPrice } from '../utils/charmPrice'

function gradeScore(phone) {
  if (!phone) return 0
  if (phone.condition === 'reconditionne') {
    return { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 }[phone.grade] || 0
  }
  return { 'Neuf': 4, 'Comme neuf': 3, 'Très bon état': 2, 'État correct': 1 }[phone.grade] || 0
}

const GRADE_STYLE = {
  'Neuf':          'bg-green-100 text-green-700 border-green-200',
  'Comme neuf':    'bg-green-100 text-green-700 border-green-200',
  'Très bon état': 'bg-blue-100 text-blue-700 border-blue-200',
  'Bon état':      'bg-cyan-100 text-cyan-700 border-cyan-200',
  'A+':            'bg-green-100 text-green-700 border-green-200',
  'A':             'bg-blue-100 text-blue-700 border-blue-200',
  'B':             'bg-cyan-100 text-cyan-700 border-cyan-200',
  'C':             'bg-cyan-100 text-cyan-700 border-cyan-200',
}

const CONDITION_STYLE = {
  'neuf':          'bg-green-50 text-green-700 border-green-200',
  'reconditionne': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'occasion':      'bg-blue-50 text-blue-700 border-blue-200',
}
const CONDITION_LABEL = {
  'neuf':          'Neuf',
  'reconditionne': 'Reconditionné',
  'occasion':      'Occasion',
}

import { MAGASINS } from '../utils/magasins'

function BatteryBar({ value }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>
  const color = value >= 90 ? 'bg-green-400' : value >= 80 ? 'bg-orange-400' : 'bg-red-400'
  const textColor = value >= 90 ? 'text-green-700' : value >= 80 ? 'text-orange-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{value}%</span>
    </div>
  )
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-full border font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
          : 'bg-white text-[#555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'
      }`}
    >
      {label}
    </button>
  )
}

export default function ModelDetailPage() {
  const { modelSlug } = useParams()
  const navigate = useNavigate()
  const [phones, setPhones]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStorage, setFilterStorage] = useState(null)
  const [filterColor, setFilterColor]   = useState(null)

  useEffect(() => {
    async function fetchPhones() {
      setLoading(true)
      const decodedModel = modelSlug.replace(/-/g, ' ')

      if (!isSupabaseReady) {
        const result = phonesMock.filter((p) => {
          const name = (typeof p.model === 'string' ? p.model : p.model?.name) || p.name || ''
          return name.toLowerCase().includes(decodedModel.toLowerCase())
        })
        setPhones(result)
        setLoading(false)
        return
      }

      // Try with phone_parts join first, fall back to simple select on error
      let { data, error } = await supabase
        .from('phones')
        .select('*, parts:phone_parts(*)')
        .ilike('model', decodedModel)
        .eq('status', 'disponible')
        .order('price', { ascending: false })

      if (error) {
        const res = await supabase
          .from('phones')
          .select('*')
          .ilike('model', decodedModel)
          .eq('status', 'disponible')
          .order('price', { ascending: false })
        data = res.data
      }

      setPhones(data || [])
      setLoading(false)
    }
    fetchPhones()
  }, [modelSlug])

  const storages = [...new Set(phones.map((p) => p.storage).filter(Boolean))]
  const colors   = [...new Set(phones.map((p) => p.color).filter(Boolean))]

  const filtered = phones.filter((p) => {
    if (filterStorage && p.storage !== filterStorage) return false
    if (filterColor   && p.color   !== filterColor)   return false
    return true
  })

  const bestPhone = filtered.reduce((best, p) => {
    if (!best) return p
    const scoreP    = gradeScore(p) * 100 + (p.battery_health || 0)
    const scoreBest = gradeScore(best) * 100 + (best.battery_health || 0)
    return scoreP > scoreBest ? p : best
  }, null)

  const modelName = phones[0]
    ? (typeof phones[0].model === 'string' ? phones[0].model : phones[0].model?.name) || phones[0].name
    : modelSlug.replace(/-/g, ' ')

  const minPrice = filtered.length > 0 ? Math.min(...filtered.map((p) => p.price)) : null
  const isAllReconditionne = filtered.length > 0 && filtered.every((p) => p.condition === 'reconditionne')
  const refPrice = isAllReconditionne ? getStartingPrice(modelName) : null
  const imageUrl = getPhoneImage(modelName, filterColor || bestPhone?.color)

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#555] hover:text-[#1B2A4A] mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      {loading ? (
        <Spinner message="Chargement des appareils..." />
      ) : phones.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📱</p>
          <p className="text-[#1B2A4A] font-semibold text-lg">Modèle introuvable</p>
          <p className="text-[#555] text-sm mt-1">Ce modèle n'est plus disponible ou n'existe pas.</p>
          <button
            onClick={() => navigate('/boutique')}
            className="mt-6 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold cursor-pointer"
          >
            Voir tous les téléphones
          </button>
        </div>
      ) : (
        <>
          {/* ── SECTION HAUTE ── */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            {/* Image */}
            <div className="w-full sm:w-48 h-48 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {imageUrl !== PLACEHOLDER ? (
                <img
                  src={imageUrl}
                  alt={modelName}
                  className="w-full h-full object-contain p-4"
                  onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                />
              ) : (
                <Smartphone size={80} className="text-[#00B4CC] opacity-20" strokeWidth={1} />
              )}
            </div>

            {/* Infos */}
            <div className="flex-1">
              <h1 className="font-poppins font-bold text-2xl md:text-3xl text-[#1B2A4A] mb-1">
                {modelName}
              </h1>
              {minPrice !== null && (
                <p className="text-[#555] text-sm mb-4">
                  À partir de{' '}
                  <span className="font-bold text-xl text-[#1B2A4A]">
                    {charmPrice(refPrice ?? minPrice)}€
                  </span>
                </p>
              )}

              {/* Filtre stockage */}
              {storages.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Capacité</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill label="Tous" active={!filterStorage} onClick={() => setFilterStorage(null)} />
                    {storages.map((s) => (
                      <FilterPill key={s} label={s} active={filterStorage === s} onClick={() => setFilterStorage(s)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Filtre couleur */}
              {colors.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Couleur</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setFilterColor(null)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all ${!filterColor ? 'border-[#1B2A4A]' : 'border-gray-300 hover:border-gray-400'}`}
                      title="Toutes"
                    >
                      <span className="text-[10px] text-gray-500">∀</span>
                    </button>
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFilterColor(filterColor === c ? null : c)}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-all ${filterColor === c ? 'border-[#1B2A4A] scale-110' : 'border-gray-300 hover:border-gray-400'}`}
                        style={{ background: colorToHex(c) }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Neuf badges */}
          {bestPhone?.condition === 'neuf' && (
            <div className="flex flex-wrap gap-2 mb-4">
              {['Sous scellé', 'Garantie 1 an Apple', 'Garantie 2 ans SebPhone'].map((t) => (
                <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle size={11} />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Magasins Click & Collect */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#00B4CC]" /> Click &amp; Collect
            </p>
            {bestPhone?.magasins?.length > 0 ? (
              <div>
                <p className="text-xs text-[#555] mb-2">
                  Ce téléphone est disponible en Click &amp; Collect uniquement dans ce(s) magasin(s) :
                </p>
                <div className="space-y-1.5">
                  {bestPhone.magasins.map((id) => {
                    const mag = MAGASINS[id];
                    if (!mag) return null;
                    return (
                      <div key={id} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                        <MapPin size={14} className="text-[#00B4CC] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-[#1B2A4A]">{mag.nom}</p>
                          <p className="text-xs text-gray-400">{mag.adresse}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Disponible dans tous nos magasins</p>
            )}
          </div>

          {/* ── SECTION BASSE — Tableau de sélection ── */}
          <div>
            <div className="mb-4">
              <h2 className="font-poppins font-bold text-xl text-[#1B2A4A]">Choisissez votre exemplaire</h2>
              <p className="text-sm text-[#555]">
                {filtered.length} appareil{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[#888] text-sm">
                Aucun appareil disponible pour cette sélection
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8F9FA] border-b border-gray-100">
                      <tr>
                        {['État / Grade', 'Batterie', 'Détails', 'Prix', ''].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#555] uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((phone) => {
                        const isBest = phone.id === bestPhone?.id
                        const parts  = phone.parts || []
                        const partsText = parts.length > 0
                          ? parts.map((p) => p.part_type).join(', ')
                          : 'Aucune réparation — État original'
                        return (
                          <tr key={phone.id} className={`hover:bg-gray-50 transition-colors ${isBest ? 'bg-cyan-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <span className={`px-2 py-0.5 rounded border text-xs font-semibold w-fit ${CONDITION_STYLE[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {CONDITION_LABEL[phone.condition] || phone.condition}
                                </span>
                                {phone.grade && (
                                  <span className={`px-2 py-0.5 rounded border text-xs font-bold w-fit ${GRADE_STYLE[phone.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {phone.grade}
                                  </span>
                                )}
                                {isBest && (
                                  <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                    ★ Meilleur choix
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <BatteryBar value={phone.battery_health} />
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              {phone.condition === 'neuf' ? (
                                <p className="text-xs text-blue-700 font-medium">Sous scellé · Garantie 1 an Apple</p>
                              ) : (
                                <p className="text-xs text-[#555] line-clamp-2">{partsText}</p>
                              )}
                              {(phone.storage || phone.color) && (
                                <p className="text-[11px] text-[#888] mt-0.5">
                                  {[phone.storage, phone.color].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-[#1B2A4A] text-base">{charmPrice(phone.price)}€</span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  console.log('Téléphone choisi:', phone);
                                  console.log('Magasins:', phone.magasins);
                                  navigate(`/reservation/${phone.id}`, { state: { phone } });
                                }}
                                className="px-4 py-2 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Choisir →
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map((phone) => {
                    const isBest = phone.id === bestPhone?.id
                    const parts  = phone.parts || []
                    const partsText = parts.length > 0
                      ? parts.map((p) => p.part_type).join(', ')
                      : 'État original'
                    return (
                      <div
                        key={phone.id}
                        className={`bg-white rounded-2xl border p-4 ${isBest ? 'border-[#00B4CC] bg-cyan-50/30' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1.5">
                            <span className={`px-2.5 py-0.5 rounded border text-xs font-semibold w-fit ${CONDITION_STYLE[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {CONDITION_LABEL[phone.condition] || phone.condition}
                            </span>
                            {phone.grade && (
                              <span className={`px-2.5 py-0.5 rounded border text-xs font-bold w-fit ${GRADE_STYLE[phone.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {phone.grade}
                              </span>
                            )}
                            {isBest && (
                              <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                ★ Meilleur choix
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[#1B2A4A] text-lg">{charmPrice(phone.price)}€</span>
                        </div>

                        <div className="space-y-1.5 mb-3 text-xs text-[#555]">
                          {(phone.storage || phone.color) && (
                            <p>{[phone.storage, phone.color].filter(Boolean).join(' · ')}</p>
                          )}
                          {phone.condition === 'neuf' ? (
                            <p className="text-blue-700 font-medium">Sous scellé · Garantie 1 an Apple · Garantie 2 ans SebPhone</p>
                          ) : (
                            <p>{partsText}</p>
                          )}
                          <BatteryBar value={phone.battery_health} />
                        </div>

                        <button
                          onClick={() => {
                            console.log('ID téléphone:', phone.id, phone);
                            navigate(`/reservation/${phone.id}`);
                          }}
                          className="w-full py-2.5 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Choisir cet appareil →
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </main>
  )
}
