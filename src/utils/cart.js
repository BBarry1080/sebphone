export function lineTotal(c) {
  const base = c.unit_price * c.quantity
  if (c.discountType === 'article_offert') return 0
  if (c.discountType === 'remise_pct') return base * (1 - (c.discount / 100))
  if (c.discountType === 'remise_montant' || c.discountType === 'rabais')
    return Math.max(0, base - c.discount)
  return base
}
