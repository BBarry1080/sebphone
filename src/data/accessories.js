export const ACCESSORY_PACKS = [
  {
    id: 'none',
    label: 'Sans pack',
    price: 0,
    originalPrice: null,
    items: [],
    badge: null,
  },
  {
    id: 'essentiel',
    label: 'Pack Essentiel',
    price: 15,
    originalPrice: 30,
    items: ['Coque de protection', 'Verre trempé'],
    badge: null,
  },
  {
    id: 'confort',
    label: 'Pack Confort',
    price: 30,
    originalPrice: 60,
    items: ['Coque de protection', 'Verre trempé', 'Câble'],
    badge: null,
  },
  {
    id: 'recommande',
    label: 'Pack Recommandé',
    price: 35,
    originalPrice: 70,
    items: ['Coque de protection', 'Verre trempé', 'Câble', 'Chargeur 20W', 'Écouteurs filaires'],
    badge: 'Populaire',
  },
]

export const INDIVIDUAL_ACCESSORIES = [
  { id: 'coque',    label: 'Coque de protection', price: 8 },
  { id: 'verre',    label: 'Verre trempé',         price: 7 },
  { id: 'cable',    label: 'Câble',                price: 10 },
  { id: 'chargeur', label: 'Chargeur 20W',          price: 15 },
  { id: 'airpods',  label: 'Écouteurs sans fil',    price: 25 },
]
