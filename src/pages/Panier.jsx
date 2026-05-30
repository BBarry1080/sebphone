import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { Trash2, ShoppingCart } from 'lucide-react'
import { getPhoneImage } from '../utils/phoneImage'

export default function Panier() {
  const navigate = useNavigate()
  const { cart, removeFromCart, clearCart } = useCart()
  const [selected, setSelected] = useState(cart.map((p) => p.id))

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(cart.map((p) => p.id))
      const stillThere = prev.filter((id) => ids.has(id))
      const newOnes = cart.map((p) => p.id).filter((id) => !prev.includes(id))
      return [...stillThere, ...newOnes]
    })
  }, [cart])

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id)
      ? prev.filter((s) => s !== id)
      : [...prev, id])
  }

  const selectedItems = cart.filter((p) => selected.includes(p.id))
  const total = selectedItems.reduce((s, p) => s + (Number(p.price) || 0), 0)

  const handleCheckout = () => {
    if (selectedItems.length === 0) return
    navigate(`/reservation/${selectedItems[0].id}`)
  }

  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-2">
        Votre panier est vide
      </h1>
      <p className="text-gray-500 mb-6">
        Parcourez nos téléphones et ajoutez vos favoris au panier.
      </p>
      <button onClick={() => navigate('/boutique')}
        className="bg-[#1B2A4A] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#00B4CC] transition-all">
        Voir la boutique
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">
          Mon panier ({cart.length})
        </h1>
        <button onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700">
          Vider le panier
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {cart.map((item) => (
          <div key={item.id}
            className={`flex items-center gap-4 p-4 bg-white rounded-2xl border-2 transition-all ${
              selected.includes(item.id) ? 'border-[#00B4CC]' : 'border-gray-100'
            }`}>
            <input type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggleSelect(item.id)}
              className="w-5 h-5 accent-[#00B4CC]" />
            <img
              src={getPhoneImage(item.name, item.color)}
              alt={item.name}
              onError={(e) => { e.target.src = '/images/placeholder.png' }}
              className="w-16 h-16 object-contain rounded-xl bg-gray-50" />
            <div className="flex-1">
              <p className="font-bold text-[#1B2A4A]">{item.name}</p>
              <p className="text-xs text-gray-500">
                {item.color} · {item.storage} · {item.grade || item.condition}
              </p>
              <p className="text-[#00B4CC] font-bold mt-1">{item.price}€</p>
            </div>
            <button onClick={() => removeFromCart(item.id)}
              className="text-gray-400 hover:text-red-500 p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">
            Articles sélectionnés ({selectedItems.length})
          </span>
          <span className="font-bold text-[#1B2A4A]">{total}€</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Frais de livraison calculés à l'étape suivante
        </p>
        <button onClick={handleCheckout}
          disabled={selectedItems.length === 0}
          className="w-full py-3 bg-[#1B2A4A] text-white rounded-xl font-bold hover:bg-[#00B4CC] transition-all disabled:opacity-50">
          Passer à la commande →
        </button>
        {selectedItems.length > 1 && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            La réservation se fait appareil par appareil.
            Commencez par le premier, les autres restent dans votre panier.
          </p>
        )}
      </div>
    </div>
  )
}
