import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'

const BRUSSELS_LAT = 50.8503
const BRUSSELS_LNG = 4.3517

const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearCart } = useCart()
  const items = location.state?.items || []

  const [form, setForm] = useState({
    firstname: '', lastname: '', email: '', phone: '',
  })
  const [deliveryMode, setDeliveryMode] = useState('pickup')
  const [magasin, setMagasin] = useState('')

  const [addressQuery, setAddressQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [deliveryPrice, setDeliveryPrice] = useState(null)
  const [distance, setDistance] = useState(null)
  const [creneau, setCreneau] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  const total = items.reduce((s, p) => s + (Number(p.price) || 0), 0)
  const grandTotal = total + (deliveryPrice || 0)

  const now = new Date()
  const hour = now.getHours()
  const pickupToday = hour < 20

  const getAvailableCreneaux = () => {
    if (hour < 20) return [
      { key: '10-20', label: '10h — 20h (aujourd\'hui)' },
      { key: '20-00', label: '20h — 00h (aujourd\'hui)' },
    ]
    if (hour < 24) return [
      { key: '20-00', label: '20h — 00h (aujourd\'hui)' },
    ]
    return [{ key: '10-20', label: '10h — 20h (demain)' }]
  }

  useEffect(() => {
    if (addressQuery.length < 4) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&countrycodes=be&addressdetails=1&limit=5&` +
          `q=${encodeURIComponent(addressQuery)}`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const data = await res.json()
        setSuggestions(data || [])
      } catch (e) {
        console.warn('Nominatim error', e)
      }
    }, 400)
  }, [addressQuery])

  const selectAddress = (sugg) => {
    const addr = sugg.address || {}
    const fullAddress = sugg.display_name
    const lat = parseFloat(sugg.lat)
    const lng = parseFloat(sugg.lon)
    const dist = getDistanceKm(BRUSSELS_LAT, BRUSSELS_LNG, lat, lng)
    const price = dist <= 30 ? 10 : 25

    setSelectedAddress({
      full: fullAddress,
      street: `${addr.road || ''} ${addr.house_number || ''}`.trim(),
      zip: addr.postcode || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      lat, lng,
    })
    setAddressQuery(fullAddress)
    setSuggestions([])
    setDistance(Math.round(dist))
    setDeliveryPrice(price)
  }

  const handleSubmit = async () => {
    if (!form.firstname || !form.lastname || !form.email || !form.phone) {
      alert('Tous les champs client sont obligatoires'); return
    }
    if (deliveryMode === 'pickup' && !magasin) {
      alert('Sélectionnez un magasin de retrait'); return
    }
    if (deliveryMode === 'express') {
      if (!selectedAddress) { alert('Sélectionnez votre adresse'); return }
      if (!creneau) { alert('Sélectionnez un créneau'); return }
    }

    setLoading(true)
    try {
      const saleCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const customerFull = `${form.firstname} ${form.lastname}`

      for (const item of items) {
        const { data: orderData } = await supabase.from('orders').insert({
          phone_id: item.id,
          reservation_code: saleCode,
          customer_name: customerFull,
          customer_email: form.email,
          customer_phone: form.phone,
          status: 'en_attente',
          final_price: Number(item.price) || 0,
          total_amount: Number(item.price) || 0,
          phone_name: item.name,
          phone_color: item.color,
          phone_storage: item.storage,
          phone_grade: item.grade,
          magasin_id: deliveryMode === 'pickup' ? magasin : 'livraison-sebphone',
        }).select().single()

        if (deliveryMode === 'express' && orderData) {
          await supabase.from('deliveries').insert({
            order_id: orderData.id,
            phone_id: item.id,
            customer_name: customerFull,
            customer_phone: form.phone,
            customer_email: form.email,
            delivery_address: selectedAddress.full,
            delivery_city: selectedAddress.city,
            delivery_zip: selectedAddress.zip,
            creneau: creneau,
            delivery_date: new Date().toISOString().split('T')[0],
            delivery_price: deliveryPrice,
            status: 'en_attente',
          })
        }

        await supabase.from('phones')
          .update({ status: 'reserve' }).eq('id', item.id)
      }

      clearCart()
      navigate('/confirmation', {
        state: {
          code: saleCode,
          items,
          deliveryMode,
          deliveryPrice,
          total: grandTotal,
        },
      })
    } catch (err) {
      console.error('Checkout error', err)
      alert('Erreur : ' + err.message)
    }
    setLoading(false)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Aucun article sélectionné.</p>
        <button onClick={() => navigate('/panier')}
          className="text-[#00B4CC] font-bold">← Retour au panier</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">
        Finaliser ma commande
      </h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <h2 className="font-bold text-[#1B2A4A] mb-3 text-sm uppercase">
          Récapitulatif ({items.length})
        </h2>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-600">
              {item.name} · {item.color} · {item.storage}
            </span>
            <span className="text-sm font-bold text-[#1B2A4A]">
              {item.price}€
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <h2 className="font-bold text-[#1B2A4A] mb-3 text-sm uppercase">
          Vos coordonnées
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Prénom" value={form.firstname}
            onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Nom" value={form.lastname}
            onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Email" type="email" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input placeholder="Téléphone" type="tel" value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <h2 className="font-bold text-[#1B2A4A] mb-3 text-sm uppercase">
          Mode de récupération
        </h2>
        <div className="space-y-2">
          <button onClick={() => setDeliveryMode('pickup')}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              deliveryMode === 'pickup' ? 'border-[#00B4CC] bg-blue-50' : 'border-gray-200'
            }`}>
            <div className="flex justify-between">
              <span className="font-bold text-[#1B2A4A]">
                Retrait en magasin
              </span>
              <span className="text-green-600 font-bold">Gratuit</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {pickupToday
                ? 'Disponible aujourd\'hui (jusqu\'à 20h)'
                : 'Disponible dès demain (commande après 20h)'}
            </p>
          </button>

          <button onClick={() => setDeliveryMode('express')}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              deliveryMode === 'express' ? 'border-[#00B4CC] bg-blue-50' : 'border-gray-200'
            }`}>
            <div className="flex justify-between">
              <span className="font-bold text-[#1B2A4A]">
                Livraison express jour même
              </span>
              <span className="text-[#00B4CC] font-bold">
                {deliveryPrice ? `${deliveryPrice}€` : '10-25€'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Bruxelles 10€ · +30km 25€ (calcul auto selon adresse)
            </p>
          </button>
        </div>

        {deliveryMode === 'pickup' && (
          <div className="mt-4">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
              Magasin de retrait
            </label>
            <select value={magasin}
              onChange={(e) => setMagasin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
              <option value="">Sélectionner...</option>
              <option value="louise">Louise</option>
              <option value="anderlecht">Anderlecht</option>
              <option value="molenbeek">Molenbeek</option>
              <option value="rue-neuve">Rue Neuve</option>
              <option value="tubize">Tubize</option>
            </select>
            {!pickupToday && (
              <p className="text-xs text-orange-600 font-medium mt-2">
                ⏰ Commande après 20h — retrait disponible demain
              </p>
            )}
          </div>
        )}

        {deliveryMode === 'express' && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Votre adresse
              </label>
              <input type="text" value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value)
                  setSelectedAddress(null)
                  setDeliveryPrice(null)
                }}
                placeholder="Commencez à taper votre adresse..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {suggestions.map((sugg, i) => (
                    <button key={i}
                      onClick={() => selectAddress(sugg)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      {sugg.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedAddress && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">
                  ✓ Adresse confirmée
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {selectedAddress.zip} {selectedAddress.city} · à {distance}km de Bruxelles
                </p>
                <p className="text-sm font-bold text-green-800 mt-2">
                  Frais de livraison : {deliveryPrice}€
                </p>
              </div>
            )}

            {selectedAddress && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Créneau de livraison
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableCreneaux().map((c) => (
                    <button key={c.key}
                      onClick={() => setCreneau(c.key)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        creneau === c.key
                          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex justify-between mb-1">
          <span className="text-gray-600">Sous-total</span>
          <span className="font-medium text-[#1B2A4A]">{total}€</span>
        </div>
        {deliveryPrice !== null && (
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Livraison</span>
            <span className="font-medium text-[#1B2A4A]">{deliveryPrice}€</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
          <span className="font-bold text-[#1B2A4A]">Total</span>
          <span className="font-black text-[#00B4CC] text-lg">
            {grandTotal}€
          </span>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-4 py-3 bg-[#1B2A4A] text-white rounded-xl font-bold hover:bg-[#00B4CC] transition-all disabled:opacity-50">
          {loading ? 'Traitement...' : 'Confirmer la commande'}
        </button>
      </div>
    </div>
  )
}
