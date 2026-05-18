import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Mail, Search } from 'lucide-react'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { getPhoneImage, PLACEHOLDER } from '../utils/phoneImage'
import { useLanguage } from '../contexts/LanguageContext'

const CONDITION_KEYS = { neuf: 'condition_new', reconditionne: 'condition_refurbished', occasion: 'condition_used' }

export default function ProCatalogue() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const proUser = (() => {
    try { return JSON.parse(localStorage.getItem('sebphone_pro') || 'null') } catch { return null }
  })()

  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterBrand, setFilterBrand] = useState('tous')
  const [filterCondition, setFilterCondition] = useState('tous')

  useEffect(() => {
    if (!proUser) {
      navigate('/pro')
      return
    }
    const load = async () => {
      setLoading(true)
      if (!isSupabaseReady) { setLoading(false); return }
      const { data } = await supabase
        .from('pro_stock')
        .select('*, phones(*)')
        .eq('visible', true)
      setItems((data || []).filter((row) => row.phones))
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sebphone_pro')
    navigate('/pro')
  }

  const filtered = items.filter((row) => {
    const p = row.phones
    const name = (p.name || p.model || '').toLowerCase()
    if (search.trim() && !name.includes(search.toLowerCase())) return false
    if (filterBrand !== 'tous' && p.brand !== filterBrand) return false
    if (filterCondition !== 'tous' && p.condition !== filterCondition) return false
    return true
  })

  if (!proUser) return null

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 pb-28 md:pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">{t('pro_catalogue_title')}</h1>
          <p className="text-sm text-[#555]">{proUser.company_name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-[#555] hover:text-red-500 transition-colors cursor-pointer"
        >
          <LogOut size={16} /> {t('pro_logout')}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pro_search')}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
          />
        </div>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
        >
          <option value="tous">{t('pro_all_brands')}</option>
          <option value="Apple">Apple</option>
          <option value="Samsung">Samsung</option>
        </select>
        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
        >
          <option value="tous">{t('pro_all_conditions')}</option>
          <option value="neuf">{t('condition_new')}</option>
          <option value="reconditionne">{t('condition_refurbished')}</option>
          <option value="occasion">{t('condition_used')}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-[#888] py-20">{t('pro_loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#888] py-20">{t('pro_empty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const p = row.phones
            return (
              <div key={row.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col">
                <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-3">
                  <img
                    src={getPhoneImage(p.model || p.name, p.color)}
                    alt={p.name || p.model}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                  />
                </div>
                <h3 className="font-bold text-[#1B2A4A] text-sm leading-tight">{p.name || p.model}</h3>
                <p className="text-xs text-[#888] mt-0.5">
                  {[CONDITION_KEYS[p.condition] ? t(CONDITION_KEYS[p.condition]) : p.condition, p.storage, p.color].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('pro_price_pro')}</span>
                    <span className="font-bold text-[#00B4CC]">{row.pro_price ?? '—'}€</span>
                  </div>
                  {row.lot_price != null && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('pro_price_lot')} ({row.lot_size || '—'} pcs)</span>
                      <span className="font-semibold text-[#1B2A4A]">{row.lot_price}€</span>
                    </div>
                  )}
                </div>
                <a
                  href={`mailto:contact@sebphone.be?subject=Commande pro — ${encodeURIComponent(p.name || p.model)}&body=${encodeURIComponent(`Bonjour,\n\nNous souhaitons commander : ${p.name || p.model} (${[p.storage, p.color].filter(Boolean).join(' · ')}).\n\nSociété : ${proUser.company_name}`)}`}
                  className="mt-3 w-full text-center py-2 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={15} /> {t('pro_contact_order')}
                </a>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
