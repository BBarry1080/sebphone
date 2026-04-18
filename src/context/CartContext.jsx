import { createContext, useContext, useState, useCallback } from 'react';
import { supabase, isSupabaseReady } from '../lib/supabase';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState(null);

  const addToCart = useCallback((item) => {
    setItems((prev) => {
      const key = `${item.phone.id}-${item.grade}-${item.storage}-${item.battery}-${item.color}`;
      const exists = prev.find((i) => i.key === key);
      if (exists) {
        return prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, key, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => i.key === key ? { ...i, quantity: qty } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const FALLBACK_COUPONS = {
    'SEBPHONE10': { type: 'percent', value: 10 },
    'BIENVENUE':  { type: 'percent', value: 15 },
    'PROMO20':    { type: 'fixed',   value: 20 },
    'POUPETTE':   { type: 'fixed',   value: 20 },
  };

  const applyCoupon = useCallback(async (code, currentSubtotal = 0) => {
    const upper = code.trim().toUpperCase();
    if (!upper) return false;

    if (!isSupabaseReady) {
      const promo = FALLBACK_COUPONS[upper];
      if (!promo) return false;
      const discount = promo.type === 'percent'
        ? Math.round(currentSubtotal * promo.value / 100)
        : promo.value;
      setCoupon({ code: upper, discount });
      return true;
    }

    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', upper)
      .eq('active', true)
      .maybeSingle();

    if (!data) return false;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
    if (data.max_uses != null && data.uses_count >= data.max_uses) return false;
    if (data.min_order && currentSubtotal < data.min_order) return false;

    const discount = data.type === 'percent'
      ? Math.round(currentSubtotal * data.value / 100)
      : data.value;
    setCoupon({ code: data.code, discount });

    supabase.from('promo_codes')
      .update({ uses_count: (data.uses_count || 0) + 1 })
      .eq('id', data.id);

    return true;
  }, []);

  const removeCoupon = useCallback(() => setCoupon(null), []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      coupon, applyCoupon, removeCoupon,
      subtotal, discountAmount, total, totalItems,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
