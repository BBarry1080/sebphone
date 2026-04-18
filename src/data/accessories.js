export const ACCESSORY_PACKS = [
  {
    id: 'none',
    label: 'Sans pack',
    price: 0,
    items: [],
    badge: null,
  },
  {
    id: 'essentiel',
    label: 'Pack Essentiel',
    price: 15,
    items: ['Coque de protection', 'Verre trempé'],
    badge: null,
  },
  {
    id: 'confort',
    label: 'Pack Confort',
    price: 35,
    items: ['Coque de protection', 'Verre trempé', 'Câble USB-C'],
    badge: null,
  },
  {
    id: 'recommande',
    label: 'Pack Recommandé',
    price: 55,
    items: ['Coque de protection', 'Verre trempé', 'Câble USB-C', 'Chargeur 20W'],
    badge: 'Populaire',
  },
]

export const INDIVIDUAL_ACCESSORIES = [
  { id: 'coque',    label: 'Coque de protection', price: 8 },
  { id: 'verre',    label: 'Verre trempé',         price: 7 },
  { id: 'cable',    label: 'Câble USB-C',           price: 10 },
  { id: 'chargeur', label: 'Chargeur 20W',          price: 15 },
  { id: 'airpods',  label: 'Écouteurs sans fil',    price: 25 },
]
