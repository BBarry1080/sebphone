import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPhoneImage } from '../../utils/phoneImage'
import ProLayout from '../../components/pro/ProLayout'

const CAT_LABELS = {
  telephone: 'Smartphones', tablette: 'Tablettes',
  ordinateur: 'Ordinateurs', montre: 'Montres', ecouteur: 'Écouteurs',
}

export default function ProCataloguePage() {
  const { categorie } = useParams()
  const [searchParams] = useSearchParams()
  const brandParam = searchParams.get('brand')
  const navigate = useNavigate()
  const [phones, setPhones] = useState([])
  const [priceMode, setPriceMode] = useState('pro')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('sebphone_pro')
    if (!stored) { navigate('/pro'); return }
    const fetchPhones = async () => {
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('categorie', categorie)
        .eq('status', 'disponible')
        .not('price_pro', 'is', null)
        .order('created_at', { ascending: false })
      setPhones(data || [])
    }
    fetchPhones()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorie])

  const filtered = phones.filter((p) => {
    const matchBrand = !brandParam ||
      (p.brand?.toLowerCase() === brandParam.toLowerCase()) ||
      (p.name?.toLowerCase().includes(brandParam.toLowerCase()))
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase())
    return matchBrand && matchSearch
  })

  return (
    <ProLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#1B2A4A]">
              {CAT_LABELS[categorie] || 'Catalogue'} Pro
              {brandParam && <span className="text-[#00B4CC]"> · {brandParam}</span>}
            </h1>
            <p className="text-sm text-gray-500">
              {filtered.length} produit(s) · tarifs revendeurs
            </p>
          </div>
          <div className="flex gap-2">
            {['pro', 'public'].map((mode) => (
              <button key={mode} onClick={() => setPriceMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  priceMode === mode
                    ? 'bg-[#1B2A4A] text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}>
                {mode === 'pro' ? '💼 Prix Pro' : '👤 Prix particulier'}
              </button>
            ))}
          </div>
        </div>

        <input type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un modèle..."
          className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-xl text-sm mb-6" />

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-12">
            Aucun produit pro dans cette catégorie pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filtered.map((phone) => {
              const displayPrice = priceMode === 'pro' ? phone.price_pro : phone.price
              return (
                <div key={phone.id}
                  onClick={() => navigate(`/reservation/${phone.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-[#00B4CC] transition-all">
                  <img src={getPhoneImage(phone.name, phone.color)}
                    alt={phone.name}
                    onError={(e) => { e.target.src = '/images/placeholder.png' }}
                    className="w-full h-32 object-contain mb-3" />
                  <p className="font-bold text-[#1B2A4A] text-sm">
                    {phone.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {phone.color} · {phone.storage} · {phone.grade || phone.condition}
                  </p>
                  <div className="mt-2">
                    <p className="text-lg font-black text-[#00B4CC]">
                      {displayPrice}€
                    </p>
                    {priceMode === 'pro' && phone.price && (
                      <p className="text-xs text-gray-400 line-through">
                        Public : {phone.price}€
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProLayout>
  )
}
