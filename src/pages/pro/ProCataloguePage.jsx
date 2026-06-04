import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPhoneImage } from '../../utils/phoneImage'
import ProLayout from '../../components/pro/ProLayout'
import GradeBadge from '../../components/pro/GradeBadge'

const CAT_LABELS = {
  telephone: 'Smartphones', tablette: 'Tablettes',
  ordinateur: 'Ordinateurs', montre: 'Montres', ecouteur: 'Écouteurs',
}

const getTvaDetail = (price, regime) => {
  const p = Number(price) || 0
  if (regime === 'normale' || regime === 'classique') {
    const ht = p / 1.21
    const tva = p - ht
    return {
      label: 'TVA 21%',
      ht: ht.toFixed(2),
      tva: tva.toFixed(2),
      ttc: p,
      isMarge: false,
    }
  }
  return {
    label: 'TVA sur marge',
    ht: null,
    tva: null,
    ttc: p,
    isMarge: true,
  }
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
                    {phone.color} · {phone.storage} · {phone.condition}
                  </p>
                  <div className="mt-1">
                    <GradeBadge grade={phone.grade} />
                  </div>
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
                  {(() => {
                    const tva = getTvaDetail(displayPrice, phone.tva_regime)
                    return (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          tva.isMarge
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {tva.label}
                        </span>
                        {tva.isMarge ? (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Pas de TVA déductible (régime marge)
                          </p>
                        ) : (
                          <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                            <div className="flex justify-between">
                              <span>HT</span><span>{tva.ht}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span>TVA 21%</span><span>{tva.tva}€</span>
                            </div>
                            <div className="flex justify-between font-bold text-[#1B2A4A]">
                              <span>TTC</span><span>{tva.ttc}€</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProLayout>
  )
}
