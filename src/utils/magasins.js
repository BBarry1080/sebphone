export const MAGASINS = {
  anderlecht: {
    id:      'anderlecht',
    nom:     'SebPhone — Anderlecht',
    adresse: 'Anderlecht, Bruxelles',
    tel:     '+32(0)492 40.54.57',
  },
  molenbeek: {
    id:      'molenbeek',
    nom:     'SebPhone — Molenbeek',
    adresse: 'Molenbeek, Bruxelles',
    tel:     '+32(0)492 40.54.57',
  },
  'rue-neuve': {
    id:      'rue-neuve',
    nom:     'SebPhone — Rue Neuve',
    adresse: 'Rue Neuve, Bruxelles Centre',
    tel:     '+32(0)492 40.54.57',
  },
  louise: {
    id:      'louise',
    nom:     'SebPhone — Louise',
    adresse: 'Avenue Louise, Bruxelles',
    tel:     '+32(0)492 40.54.57',
  },
}

// Array version for loops (Stock.jsx, selects)
export const MAGASINS_LIST = Object.values(MAGASINS)
