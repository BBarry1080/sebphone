export function charmPrice(price) {
  if (price == null || isNaN(price)) return price
  const p = Math.round(Number(price))
  return p % 10 === 0 ? p - 1 : p
}
