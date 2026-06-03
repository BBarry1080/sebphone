import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Search } from 'lucide-react'
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

  const [phones, setPhones]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterBrand, setFilterBrand]         = useState('tous')
  const [filterCondition, setFilterCondition] = useState('tous')
  const [priceMode, setPriceMode]             = useState('pro')

  useEffect(() => {
    if (!proUser) {
      navigate('/pro')
      return
    }
    const fetchProPhones = async () => {
      setLoading(true)
      if (!isSupabaseReady) { setLoading(false); return }
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .not('price_pro', 'is', null)
        .order('created_at', { ascending: false })
      setPhones(data || [])
      setLoading(false)
    }
    fetchProPhones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('sebphone_pro')
    navigate('/pro')
  }

  const filtered = phones.filter((p) => {
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

      <div className="flex gap-2 mb-6">
        {['pro', 'public'].map((mode) => (
          <button key={mode}
            onClick={() => setPriceMode(mode)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              priceMode === mode
                ? 'bg-[#1B2A4A] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            {mode === 'pro' ? '💼 Prix Pro' : '👤 Prix particulier'}
          </button>
        ))}
      </div>

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
          {filtered.map((phone) => {
            const displayPrice = priceMode === 'pro' ? phone.price_pro : phone.price
            return (
              <div key={phone.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col">
                <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden mb-3">
                  <img
                    src={getPhoneImage(phone.model || phone.name, phone.color)}
                    alt={phone.name || phone.model}
                    className="w-full h-full object-contain p-3"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER }}
                  />
                </div>
                <h3 className="font-bold text-[#1B2A4A] text-sm leading-tight">{phone.name || phone.model}</h3>
                <p className="text-xs text-[#888] mt-0.5">
                  {[CONDITION_KEYS[phone.condition] ? t(CONDITION_KEYS[phone.condition]) : phone.condition, phone.storage, phone.color].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-3">
                  <p className="text-lg font-black text-[#00B4CC]">
                    {displayPrice}€
                  </p>
                  {priceMode === 'pro' && phone.price && (
                    <p className="text-xs text-gray-400 line-through">
                      Public : {phone.price}€
                    </p>
                  )}
                  {priceMode === 'public' && phone.price_pro && (
                    <p className="text-xs text-blue-500 font-medium">
                      💼 Prix Pro : {phone.price_pro}€
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/reservation/${phone.id}`)}
                  className="mt-3 w-full text-center py-2 bg-[#1B2A4A] hover:bg-[#243a64] text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Réserver / Commander
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
