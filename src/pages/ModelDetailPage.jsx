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
import { useLanguage } from '../contexts/LanguageContext'
import { translateColor } from '../utils/translateColor'

const translateRepair = (name, t) => {
  const map = {
    'batterie': t('repair_battery'),
    'battery': t('repair_battery'),
    'écran': t('repair_screen'),
    'screen': t('repair_screen'),
    'caméra': t('repair_camera'),
    'camera': t('repair_camera'),
    'bouton': t('repair_button'),
    'button': t('repair_button'),
    'haut-parleur': t('repair_speaker'),
    'speaker': t('repair_speaker'),
    'connecteur': t('repair_charging'),
    'charging': t('repair_charging'),
  }
  return map[name?.toLowerCase()] || name
}

const translateGrade = (grade, t) => {
  const map = {
    'comme neuf': t('grade_comme_neuf'),
    'bon état': t('grade_bon_etat'),
    'très bon état': t('grade_tres_bon'),
    'parfait état': t('grade_parfait'),
    'like new': t('grade_comme_neuf'),
    'good condition': t('grade_bon_etat'),
  }
  return map[grade?.toLowerCase()] || grade
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
  const { t } = useLanguage()
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

      const { data } = await supabase
        .from('phones')
        .select('*')
        .ilike('model', decodedModel)
        .eq('status', 'disponible')
        .or('visible_on_site.eq.true,visible_on_site.is.null')
        .order('price', { ascending: false })

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

  // Tous les magasins où ce modèle est disponible
  const availableMagasins = [...new Set(
    phones
      .filter((p) => p.status === 'disponible')
      .flatMap((p) => p.magasins || [])
  )]

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
        {t('back')}
      </button>

      {loading ? (
        <Spinner message={t('model_loading')} />
      ) : phones.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">📱</p>
          <p className="text-[#1B2A4A] font-semibold text-lg">{t('model_not_found')}</p>
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
                  {t('model_from')}{' '}
                  <span className="font-bold text-xl text-[#1B2A4A]">
                    {charmPrice(refPrice ?? minPrice)}€
                  </span>
                </p>
              )}

              {/* Filtre stockage */}
              {storages.length > 1 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">{t('phone_capacity')}</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterPill label={t('phone_all')} active={!filterStorage} onClick={() => setFilterStorage(null)} />
                    {storages.map((s) => (
                      <FilterPill key={s} label={s} active={filterStorage === s} onClick={() => setFilterStorage(s)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Filtre couleur */}
              {colors.length > 1 && (
                <div>
                  <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">{t('phone_color')}</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setFilterColor(null)}
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer transition-all ${!filterColor ? 'border-[#1B2A4A]' : 'border-gray-300 hover:border-gray-400'}`}
                      title={t('model_all')}
                    >
                      <span className="text-[10px] text-gray-500">∀</span>
                    </button>
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFilterColor(filterColor === c ? null : c)}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-all ${filterColor === c ? 'border-[#1B2A4A] scale-110' : 'border-gray-300 hover:border-gray-400'}`}
                        style={{ background: colorToHex(c) }}
                        title={translateColor(c, t)}
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
              {[t('model_sealed'), t('model_guarantee_apple'), t('model_guarantee_seb')].map((label) => (
                <span key={label} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle size={11} />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Magasins Click & Collect */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#00B4CC]" /> {t('phone_click_collect')}
            </p>
            {availableMagasins.length > 0 ? (
              <div>
                <p className="text-xs text-[#555] mb-2">
                  {t('phone_click_collect_desc')}
                </p>
                <div className="mt-3 space-y-2">
                  {availableMagasins.map((magasinId) => {
                    const mag = MAGASINS[magasinId];
                    if (!mag) return null;
                    return (
                      <div key={magasinId} className="flex items-start gap-2 mt-2">
                        <MapPin size={14} className="text-[#00B4CC] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-[#1B2A4A]">
                            {mag.nom}
                          </p>
                          {mag.adresse && (
                            <p className="text-xs text-gray-400">{mag.adresse}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t('model_available_stores')}</p>
            )}
          </div>

          {/* ── SECTION BASSE — Tableau de sélection ── */}
          <div>
            <div className="mb-4">
              <h2 className="font-poppins font-bold text-xl text-[#1B2A4A]">{t('phone_choose')}</h2>
              <p className="text-sm text-[#555]">
                {filtered.length} {t('phone_devices_available')}
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
                        {[t('phone_condition_grade'), t('phone_battery'), t('phone_details'), t('phone_price'), ''].map((h) => (
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
                        const partsReplaced = Array.isArray(phone.parts_replaced)
                          ? phone.parts_replaced
                          : (typeof phone.parts_replaced === 'string'
                              ? (() => { try { return JSON.parse(phone.parts_replaced) } catch { return [] } })()
                              : [])
                        const allParts = parts.length > 0 ? parts.map((p) => p.part_type) : partsReplaced
                        return (
                          <tr key={phone.id} className={`hover:bg-gray-50 transition-colors ${isBest ? 'bg-cyan-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <span className={`px-2 py-0.5 rounded border text-xs font-semibold w-fit ${CONDITION_STYLE[phone.condition] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                  {CONDITION_LABEL[phone.condition] || phone.condition}
                                </span>
                                {phone.grade && (
                                  <span className={`px-2 py-0.5 rounded border text-xs font-bold w-fit ${GRADE_STYLE[phone.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {translateGrade(phone.grade, t)}
                                  </span>
                                )}
                                {isBest && (
                                  <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                    ★ {t('phone_best_choice')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {phone.status === 'sur_commande' ? (
                                <span className="text-sm italic text-gray-400">
                                  {t('model_battery_range')}
                                </span>
                              ) : phone.battery_health ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-2 rounded-full transition-all"
                                      style={{
                                        width: `${phone.battery_health}%`,
                                        backgroundColor: phone.battery_health >= 85
                                          ? '#22c55e' : phone.battery_health >= 75
                                          ? '#f59e0b' : '#ef4444'
                                      }}
                                    />
                                  </div>
                                  <span className={`text-sm font-bold ${
                                    phone.battery_health >= 85 ? 'text-green-600'
                                    : phone.battery_health >= 75 ? 'text-orange-500'
                                    : 'text-red-500'}`}>
                                    {phone.battery_health}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 max-w-[220px]">
                              {phone.condition === 'neuf' ? (
                                <span className="text-xs text-blue-600 font-medium">Neuf sous scellé</span>
                              ) : phone.condition === 'occasion' ? (
                                allParts.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {allParts.map((p) => (
                                      <div key={p} className="flex items-center gap-1 text-xs text-[#555]">
                                        <span className="text-orange-500">🔧</span><span>{translateRepair(p, t)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-green-600 text-xs font-medium">✓ {t('phone_no_repair')}</span>
                                )
                              ) : phone.condition === 'reconditionne' ? (
                                allParts.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {allParts.map((p) => (
                                      <div key={p} className="flex items-center gap-1 text-xs text-[#555]">
                                        <span className="text-orange-500">🔧</span><span>{translateRepair(p, t)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : null
                              ) : null}
                              {(phone.storage || phone.color) && (
                                <p className="text-[11px] text-[#888] mt-1">
                                  {[phone.storage, translateColor(phone.color, t)].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              {phone.has_esim && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold bg-[#1B2A4A] text-white px-2 py-0.5 rounded-lg">
                                  eSIM
                                </span>
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
                                {t('model_choose_btn')}
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
                    const partsReplaced = Array.isArray(phone.parts_replaced)
                      ? phone.parts_replaced
                      : (typeof phone.parts_replaced === 'string'
                          ? (() => { try { return JSON.parse(phone.parts_replaced) } catch { return [] } })()
                          : [])
                    const allParts = parts.length > 0 ? parts.map((p) => p.part_type) : partsReplaced
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
                                {translateGrade(phone.grade, t)}
                              </span>
                            )}
                            {isBest && (
                              <span className="text-[10px] font-bold text-[#00B4CC] bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded-full w-fit">
                                ★ {t('model_best_choice')}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-[#1B2A4A] text-lg">{charmPrice(phone.price)}€</span>
                        </div>

                        <div className="space-y-1.5 mb-3 text-xs text-[#555]">
                          {(phone.storage || phone.color) && (
                            <p>{[phone.storage, translateColor(phone.color, t)].filter(Boolean).join(' · ')}</p>
                          )}
                          {phone.has_esim && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-[#1B2A4A] text-white px-2 py-0.5 rounded-lg">
                              eSIM
                            </span>
                          )}
                          {phone.condition === 'neuf' ? (
                            <p className="text-blue-700 font-medium">Sous scellé · Garantie 1 an Apple · Garantie 2 ans SebPhone</p>
                          ) : phone.condition === 'occasion' ? (
                            allParts.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {allParts.map((p) => (
                                  <div key={p} className="flex items-center gap-1">
                                    <span className="text-orange-500">🔧</span><span>{translateRepair(p, t)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-green-600 font-medium">✓ {t('phone_no_repair')}</p>
                            )
                          ) : phone.condition === 'reconditionne' ? (
                            allParts.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {allParts.map((p) => (
                                  <div key={p} className="flex items-center gap-1">
                                    <span className="text-orange-500">🔧</span><span>{translateRepair(p, t)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null
                          ) : null}
                          {phone.status === 'sur_commande' ? (
                            <span className="text-xs italic text-gray-400">
                              {t('model_battery_range')}
                            </span>
                          ) : phone.battery_health ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${phone.battery_health}%`,
                                    backgroundColor: phone.battery_health >= 85
                                      ? '#22c55e' : phone.battery_health >= 75
                                      ? '#f59e0b' : '#ef4444'
                                  }}
                                />
                              </div>
                              <span className={`text-sm font-bold ${
                                phone.battery_health >= 85 ? 'text-green-600'
                                : phone.battery_health >= 75 ? 'text-orange-500'
                                : 'text-red-500'}`}>
                                {phone.battery_health}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            console.log('ID téléphone:', phone.id, phone);
                            navigate(`/reservation/${phone.id}`);
                          }}
                          className="w-full py-2.5 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          {t('model_choose_btn')}
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
