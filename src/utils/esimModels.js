// Modèles avec eSIM intégrée (cochée automatiquement)
export const ESIM_MODELS = [
  // Apple — eSIM only
  'iPhone 17 Air', 'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17',
  'iPhone 16e', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
  // Apple — eSIM + SIM physique
  'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
  'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
  'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
  'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
  'iPhone SE', 'iPhone XS Max', 'iPhone XS', 'iPhone XR',
  // Samsung
  'Samsung Galaxy S26 Ultra', 'Samsung Galaxy S26+', 'Samsung Galaxy S26',
  'Samsung Galaxy S25 Ultra', 'Samsung Galaxy S25+', 'Samsung Galaxy S25',
  'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24',
  'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23+', 'Samsung Galaxy S23',
  'Samsung Galaxy Z Fold 6', 'Samsung Galaxy Z Flip 6',
  'Samsung Galaxy Z Fold 5', 'Samsung Galaxy Z Flip 5',
  // Google Pixel
  'Google Pixel 9 Pro XL', 'Google Pixel 9 Pro Fold',
  'Google Pixel 9 Pro', 'Google Pixel 9',
  'Google Pixel 8 Pro', 'Google Pixel 8', 'Google Pixel 8a',
  'Google Pixel 7 Pro', 'Google Pixel 7', 'Google Pixel 7a',
]

export const isEsimModel = (modelName) => {
  if (!modelName) return false
  return ESIM_MODELS.some(m =>
    modelName.toLowerCase().includes(m.toLowerCase())
  )
}
