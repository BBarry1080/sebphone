import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ChevronDown, ChevronUp, Lock, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import Button from '../components/ui/Button';

function PaymentIcons() {
  const methods = ['Visa', 'MC', 'Amex', 'PayPal', 'GPay'];
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {methods.map((m) => (
        <span key={m} className="px-2 py-1 border border-gray-200 rounded text-xs text-[#555555] font-medium bg-white">
          {m}
        </span>
      ))}
    </div>
  );
}

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, coupon, applyCoupon, removeCoupon, subtotal, discountAmount, total } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [note, setNote] = useState('');
  const [shippingOpen, setShippingOpen] = useState(false);

  const handleCoupon = () => {
    if (!couponInput.trim()) return;
    const ok = applyCoupon(couponInput);
    if (!ok) setCouponError('Code invalide. Essayez SEBPHONE10 ou BIENVENUE.');
    else setCouponError('');
  };

  if (items.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 pb-24 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag size={36} className="text-gray-400" />
        </div>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Votre panier est vide</h1>
        <p className="text-[#555555] mb-6">Découvrez nos téléphones reconditionnés et occasions.</p>
        <Button variant="primary" size="md" onClick={() => navigate('/boutique')}>
          Voir la boutique
        </Button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 pb-28 md:pb-12">
      <h1 className="font-poppins font-bold text-[#1B2A4A] text-3xl md:text-4xl mb-8 text-center">Panier</h1>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Products list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Header desktop */}
          <div className="hidden md:grid grid-cols-3 text-xs font-semibold text-[#555555] uppercase tracking-wide pb-2 border-b border-gray-100">
            <span>Produit</span>
            <span className="text-center">Quantité</span>
            <span className="text-right">Total</span>
          </div>

          {items.map((item) => (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-3 gap-4 items-center py-4 border-b border-gray-100"
            >
              {/* Produit */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[#F5F5F5] rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={28} className="text-[#00B4CC] opacity-40" />
                </div>
                <div>
                  <p className="font-semibold text-[#1B2A4A] text-sm leading-tight">{item.phone.name}</p>
                  <p className="text-xs text-[#555555] mt-0.5">
                    {[item.color, item.grade && `Grade ${item.grade}`, item.storage].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-sm font-bold text-[#00B4CC] mt-1">{item.price}€</p>
                  <button
                    onClick={() => removeFromCart(item.key)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Supprimer
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2 md:justify-center">
                <button
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:border-[#00B4CC] transition-colors cursor-pointer text-lg font-medium"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:border-[#00B4CC] transition-colors cursor-pointer text-lg font-medium"
                >
                  +
                </button>
              </div>

              {/* Total */}
              <div className="text-right">
                <p className="font-bold text-[#1B2A4A] text-base">{(item.price * item.quantity).toFixed(0)}€</p>
              </div>
            </motion.div>
          ))}

          {/* Shipping estimate */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShippingOpen(!shippingOpen)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[#1B2A4A] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Estimer les frais de livraison
              {shippingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {shippingOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 flex flex-col gap-3">
                    <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] bg-white">
                      <option>Belgique</option>
                      <option>France</option>
                      <option>Luxembourg</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Code postal"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                    />
                    <Button variant="secondary" size="sm" className="self-start">Estimer</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary card */}
        <div className="lg:sticky lg:top-24">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="font-poppins font-bold text-[#1B2A4A] text-lg">Récapitulatif</h2>

            <div className="flex justify-between text-sm">
              <span className="text-[#555555]">Sous-total</span>
              <span className="font-semibold">{subtotal}€</span>
            </div>

            {/* Coupon */}
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-green-800">{coupon.code}</p>
                  <p className="text-xs text-green-700">−{coupon.discount}€</p>
                </div>
                <button onClick={removeCoupon} className="text-green-600 hover:text-red-500 text-xs cursor-pointer">Retirer</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCoupon()}
                  placeholder="Code promo"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] min-w-0"
                />
                <Button variant="secondary" size="sm" onClick={handleCoupon}>OK</Button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500 -mt-2">{couponError}</p>}

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Réduction</span>
                <span className="font-semibold">−{discountAmount}€</span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="font-bold text-[#1B2A4A]">Total</span>
              <span className="font-bold text-[#1B2A4A] text-xl">{total}€</span>
            </div>
            <p className="text-xs text-[#555555] -mt-2">Taxes incluses. Frais d'expédition calculés à l'étape de paiement.</p>

            {/* Note */}
            <div>
              <label className="block text-xs font-medium text-[#555555] mb-1.5">Note pour la commande (optionnel)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC] resize-none"
                placeholder="Instructions spéciales..."
              />
            </div>

            <button className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-black text-white font-bold py-4 rounded-xl transition-colors cursor-pointer min-h-[52px] text-base">
              <Lock size={16} />
              Commander
            </button>

            <div className="text-center">
              <p className="text-xs text-[#555555] mb-2">Nous acceptons</p>
              <PaymentIcons />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
