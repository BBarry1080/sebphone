import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const useCart = () => useContext(CartContext)

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sebphone_cart')
      if (saved) setCart(JSON.parse(saved))
    } catch (e) { console.warn('Cart load error', e) }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('sebphone_cart', JSON.stringify(cart))
    } catch (e) { console.warn('Cart save error', e) }
  }, [cart])

  const addToCart = (phone) => {
    setCart((prev) => {
      if (prev.find((p) => p.id === phone.id)) return prev
      return [...prev, {
        id: phone.id,
        name: phone.name || phone.model,
        model: phone.model,
        color: phone.color,
        storage: phone.storage,
        grade: phone.grade,
        condition: phone.condition,
        price: phone.price,
        imei: phone.imei,
        categorie: phone.categorie,
        status: phone.status,
      }]
    })
  }

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((p) => p.id !== id))

  const clearCart = () => setCart([])

  const isInCart = (id) => cart.some((p) => p.id === id)

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, clearCart, isInCart,
      cartCount: cart.length,
    }}>
      {children}
    </CartContext.Provider>
  )
}
