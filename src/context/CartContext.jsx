import { createContext, useContext, useState, useCallback } from 'react';

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

  const VALID_COUPONS = { 'SEBPHONE10': 10, 'BIENVENUE': 20, 'POUPETTE': 20 };
  const applyCoupon = useCallback((code) => {
    const discount = VALID_COUPONS[code.toUpperCase()];
    if (discount) {
      setCoupon({ code: code.toUpperCase(), discount });
      return true;
    }
    return false;
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
