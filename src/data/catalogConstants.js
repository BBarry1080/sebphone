import { IPHONE_ON_DEMAND } from './iphoneOnDemand'
import { IPHONE_DATABASE } from './iphoneDatabase'
import { PHONES_DATABASE, findPhoneModel } from './phonesDatabase'

export const MODELS_BY_CATEGORIE = {
  tablette: {
    'Apple': [
      'iPad Air 13" M4',
      'iPad Air 11" M4',
      'iPad Air 13" M3',
      'iPad Air 11" M3',
      'iPad Pro 13" M4',
      'iPad Pro 11" M4',
      'iPad 11e génération',
      'iPad 10e génération',
      'iPad 9e génération',
      'iPad mini 7',
      'iPad mini 6',
      'iPad mini 5',
      'iPad Pro 12.9" M2',
      'iPad Pro 11" M2',
      'iPad Pro 12.9" M1',
      'iPad Pro 11" M1',
      'iPad Air M2',
      'iPad Air M1',
      'iPad Air 4',
    ],
    'Samsung': [
      'Samsung Galaxy Tab S11 Ultra',
      'Samsung Galaxy Tab S11',
      'Samsung Galaxy Tab S10 Ultra',
      'Samsung Galaxy Tab S10+',
      'Samsung Galaxy Tab S10 FE+',
      'Samsung Galaxy Tab S10 FE',
      'Samsung Galaxy Tab S10 Lite',
      'Samsung Galaxy Tab S9 Ultra',
      'Samsung Galaxy Tab S9+',
      'Samsung Galaxy Tab S9',
      'Samsung Galaxy Tab S9 FE',
      'Samsung Galaxy Tab A9+',
      'Samsung Galaxy Tab A9',
      'Samsung Galaxy Tab A8',
      'Samsung Galaxy Tab A11+',
    ],
    'Microsoft': [
      'Microsoft Surface Pro 11', 'Microsoft Surface Pro 10',
      'Microsoft Surface Pro 9', 'Microsoft Surface Go 3',
    ],
  },
  montre: {
    'Apple': [
      'Apple Watch Ultra 3',
      'Apple Watch Series 11',
      'Apple Watch SE 3',
      'Apple Watch Ultra 2',
      'Apple Watch Series 10',
      'Apple Watch Series 9',
      'Apple Watch Series 8',
      'Apple Watch Series 7',
      'Apple Watch Series 6',
      'Apple Watch Series 5',
      'Apple Watch Series 4',
      'Apple Watch Series 3',
      'Apple Watch SE 2',
      'Apple Watch SE',
    ],
    'Samsung': [
      'Samsung Galaxy Watch Ultra 2025',
      'Samsung Galaxy Watch 8 Classic',
      'Samsung Galaxy Watch 8',
      'Samsung Galaxy Watch Ultra',
      'Samsung Galaxy Watch 7',
      'Samsung Galaxy Watch 6 Classic',
      'Samsung Galaxy Watch 6',
      'Samsung Galaxy Watch 5 Pro',
      'Samsung Galaxy Watch 5',
      'Samsung Galaxy Watch 4 Classic',
      'Samsung Galaxy Watch 4',
    ],
    'Garmin': [
      'Garmin Fenix 8', 'Garmin Forerunner 965',
      'Garmin Venu 3',
    ],
  },
  ecouteur: {
    'Apple': [
      'AirPods Pro 3',
      'AirPods Pro 2',
      'AirPods 4 ANC',
      'AirPods 4',
      'AirPods Max 2',
      'AirPods Max',
      'AirPods 3',
      'AirPods 2',
    ],
    'Samsung': [
      'Samsung Galaxy Buds3 Pro',
      'Samsung Galaxy Buds3',
      'Samsung Galaxy Buds2 Pro',
      'Samsung Galaxy Buds2',
      'Samsung Galaxy Buds Live',
      'Samsung Galaxy Buds FE',
    ],
    'Sony': [
      'Sony WH-1000XM6',
      'Sony WH-1000XM5',
      'Sony WF-1000XM5',
      'Sony WF-1000XM4',
      'Sony WH-CH720N',
      'Sony WH-CH520',
    ],
    'Bose': [
      'Bose QuietComfort Ultra', 'Bose QuietComfort 45',
      'Bose QuietComfort Earbuds 2',
    ],
    'JBL': [
      'JBL Tour Pro 3', 'JBL Tour Pro 2',
      'JBL Live Pro 2', 'JBL Tune 770NC',
    ],
  },
  ordinateur: {
    'Apple': [
      'MacBook Pro 16" M4', 'MacBook Pro 14" M4',
      'MacBook Air 15" M3', 'MacBook Air 13" M3',
      'MacBook Pro 16" M3', 'MacBook Pro 14" M3',
      'MacBook Air 15" M2', 'MacBook Air 13" M2',
    ],
    'Dell': [
      'Dell XPS 15', 'Dell XPS 13', 'Dell Latitude 14',
      'Dell Inspiron 15', 'Dell Inspiron 14',
    ],
    'HP': [
      'HP Spectre x360 14', 'HP EliteBook 840',
      'HP Pavilion 15', 'HP Envy 13',
    ],
    'Lenovo': [
      'Lenovo ThinkPad X1 Carbon', 'Lenovo ThinkPad T14',
      'Lenovo IdeaPad 5', 'Lenovo Yoga 9i',
    ],
    'Microsoft': [
      'Microsoft Surface Laptop 6', 'Microsoft Surface Laptop 5',
      'Microsoft Surface Pro 11',
    ],
  },
  accessoire: {
    'Apple': [
      'Coque iPhone 16 Pro Max', 'Coque iPhone 16 Pro',
      'Coque iPhone 16', 'Chargeur MagSafe',
      'Câble USB-C Apple', 'Adaptateur Lightning',
    ],
    'Samsung': [
      'Coque Samsung S25 Ultra', 'Coque Samsung S25',
      'Chargeur Samsung 45W', 'Câble USB-C Samsung',
    ],
    'Autre': [
      'Verre trempé', 'Coque universelle',
      'Chargeur rapide', 'Câble USB-C',
      'Câble Lightning', 'Support téléphone',
      'Batterie externe', 'Hub USB-C',
    ],
  },
}

export const WATCH_SIZES = {
  'Apple': {
    'Apple Watch Ultra 3': ['49mm'],
    'Apple Watch Series 11': ['42mm', '46mm'],
    'Apple Watch SE 3': ['40mm', '44mm'],
    'Apple Watch Ultra 2': ['49mm'],
    'Apple Watch Series 10': ['42mm', '46mm'],
    'Apple Watch Series 9': ['41mm', '45mm'],
    'Apple Watch Series 8': ['41mm', '45mm'],
    'Apple Watch Series 7': ['41mm', '45mm'],
    'Apple Watch Series 6': ['40mm', '44mm'],
    'Apple Watch Series 5': ['40mm', '44mm'],
    'Apple Watch Series 4': ['40mm', '44mm'],
    'Apple Watch Series 3': ['38mm', '42mm'],
    'Apple Watch SE 2': ['40mm', '44mm'],
    'Apple Watch SE': ['40mm', '44mm'],
    'default': ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '49mm'],
  },
  'Samsung': {
    'Samsung Galaxy Watch Ultra 2025': ['47mm'],
    'Samsung Galaxy Watch 8 Classic': ['46mm'],
    'Samsung Galaxy Watch 8': ['40mm', '44mm'],
    'Samsung Galaxy Watch Ultra': ['47mm'],
    'Samsung Galaxy Watch 7': ['40mm', '44mm'],
    'Samsung Galaxy Watch 6 Classic': ['43mm', '47mm'],
    'Samsung Galaxy Watch 6': ['40mm', '44mm'],
    'Samsung Galaxy Watch 5 Pro': ['45mm'],
    'Samsung Galaxy Watch 5': ['40mm', '44mm'],
    'Samsung Galaxy Watch 4 Classic': ['42mm', '46mm'],
    'Samsung Galaxy Watch 4': ['40mm', '44mm'],
    'default': ['40mm', '42mm', '43mm', '44mm', '45mm', '46mm', '47mm'],
  },
  'Garmin': {
    'default': ['42mm', '45mm', '47mm', '51mm'],
  },
  'default': ['38mm', '40mm', '41mm', '42mm', '44mm', '45mm', '46mm', '47mm', '49mm'],
}

export const WATCH_COLORS = {
  'Apple': {
    'Apple Watch Ultra 3': ['Titane naturel', 'Titane noir'],
    'Apple Watch Series 11': [
      'Gris sidéral', 'Jet Noir', 'Rose Gold', 'Argent',
      'Titane naturel', 'Titane or', 'Titane ardoise'
    ],
    'Apple Watch SE 3': ['Lumière stellaire', 'Moonlight'],
    'Apple Watch Series 10': ['Jet Noir', 'Rose Gold', 'Argent', 'Titane naturel', 'Titane or', 'Titane ardoise'],
    'Apple Watch Series 9': ['Minuit', 'Lumière stellaire', 'Rose', 'PRODUCT RED', 'Argent', 'Or', 'Graphite'],
    'Apple Watch Series 8': ['Minuit', 'Lumière stellaire', 'PRODUCT RED', 'Argent', 'Or', 'Graphite'],
    'Apple Watch Series 7': ['Minuit', 'Lumière stellaire', 'Bleu', 'Vert', 'PRODUCT RED'],
    'Apple Watch Series 6': ['Bleu', 'PRODUCT RED', 'Or', 'Argent', 'Graphite'],
    'Apple Watch Series 5': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Series 4': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Series 3': ['Argent', 'Or', 'Gris sidéral'],
    'Apple Watch Ultra 2': ['Titane naturel', 'Titane noir'],
    'Apple Watch SE 2': ['Minuit', 'Lumière stellaire', 'Argent'],
    'Apple Watch SE': ['Argent', 'Or', 'Gris sidéral'],
    'default': ['Noir', 'Argent', 'Or', 'Rose Gold', 'Blanc'],
  },
  'Samsung': {
    'Samsung Galaxy Watch Ultra 2025': ['Titane Argent', 'Titane Gris', 'Titane Blanc'],
    'Samsung Galaxy Watch 8 Classic': ['Noir', 'Argent'],
    'Samsung Galaxy Watch 8': ['Graphite', 'Argent'],
    'Samsung Galaxy Watch Ultra': ['Titane Gris', 'Titane Blanc', 'Titane Argent'],
    'Samsung Galaxy Watch 7': ['Vert', 'Crème', 'Argent'],
    'Samsung Galaxy Watch 6 Classic': ['Noir', 'Argent', 'Camel', 'Indigo'],
    'Samsung Galaxy Watch 6': ['Graphite', 'Argent', 'Crème', 'Or', 'Bleu glacier', 'Indigo', 'Menthe'],
    'Samsung Galaxy Watch 5 Pro': ['Noir', 'Gris'],
    'Samsung Galaxy Watch 5': ['Argent', 'Or', 'Saphir'],
    'Samsung Galaxy Watch 4 Classic': ['Noir', 'Argent'],
    'Samsung Galaxy Watch 4': ['Noir', 'Argent', 'Or', 'Vert'],
    'default': ['Noir', 'Argent', 'Or', 'Vert', 'Crème'],
  },
  'Garmin': {
    'default': ['Noir', 'Ardoise', 'Blanc', 'Bleu'],
  },
  'default': ['Noir', 'Blanc', 'Argent', 'Or', 'Rose Gold'],
}

export const EARPHONE_COLORS = {
  'Apple': {
    'AirPods Pro 2': ['Blanc'],
    'AirPods 4': ['Blanc'],
    'AirPods 3': ['Blanc'],
    'AirPods Max': ['Blanc lumière stellaire', 'Noir minuit', 'Bleu', 'Orange', 'Violet'],
    'default': ['Blanc'],
  },
  'Samsung': {
    'Samsung Galaxy Buds3 Pro': ['Blanc', 'Argent'],
    'Samsung Galaxy Buds3': ['Blanc', 'Argent'],
    'Samsung Galaxy Buds2 Pro': ['Blanc', 'Graphite', 'Violet'],
    'Samsung Galaxy Buds2': ['Blanc', 'Graphite', 'Olive', 'Lavande'],
    'Samsung Galaxy Buds Live': ['Mystic Bronze', 'Mystic Blanc', 'Mystic Noir'],
    'default': ['Blanc', 'Noir'],
  },
  'Sony': {
    'default': ['Noir', 'Blanc', 'Argent'],
  },
  'Bose': {
    'default': ['Noir', 'Blanc', 'Bleu'],
  },
  'default': ['Noir', 'Blanc', 'Gris'],
}

export const COMPUTER_COLORS = {
  'Apple': {
    'default': ['Gris sidéral', 'Argent', 'Or', 'Noir sidéral'],
  },
  'Dell': { 'default': ['Noir', 'Argent', 'Blanc'] },
  'HP': { 'default': ['Noir', 'Argent', 'Bleu nuit'] },
  'Lenovo': { 'default': ['Noir', 'Gris', 'Bleu arctique'] },
  'Microsoft': { 'default': ['Platine', 'Noir mat', 'Saphir', 'Forêt'] },
  'default': ['Noir', 'Argent', 'Gris'],
}

export const COMPUTER_STORAGE = ['128Go SSD', '256Go SSD', '512Go SSD', '1To SSD', '2To SSD']

export const STORAGE_OPTIONS = ['16Go', '32Go', '64Go', '128Go', '256Go', '512Go', '1To', '2To']

export const getBrands = (categorie) => {
  if (categorie === 'telephone')
    return ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google']
  return Object.keys(MODELS_BY_CATEGORIE[categorie] || {})
}

export const getModels = (categorie, brand) => {
  if (categorie === 'telephone') {
    if (brand === 'Apple') {
      return [
        ...IPHONE_ON_DEMAND.map((i) => i.model),
        ...IPHONE_DATABASE.map((i) => i.model),
      ]
    }
    return (PHONES_DATABASE[brand] || []).map((p) => p.model)
  }
  return MODELS_BY_CATEGORIE[categorie]?.[brand] || []
}

export const getColors = (categorie, brand, model) => {
  if (categorie === 'telephone') {
    if (brand === 'Apple') {
      const found = IPHONE_ON_DEMAND.find((i) => i.model === model)
        || IPHONE_DATABASE.find((i) => i.model === model)
      return found?.colors || []
    }
    const found = findPhoneModel(brand, model)
    return found?.colors || []
  }
  if (categorie === 'montre') {
    return WATCH_COLORS[brand]?.[model]
      || WATCH_COLORS[brand]?.default
      || WATCH_COLORS.default
  }
  if (categorie === 'ecouteur') {
    return EARPHONE_COLORS[brand]?.[model]
      || EARPHONE_COLORS[brand]?.default
      || EARPHONE_COLORS.default
  }
  if (categorie === 'ordinateur') {
    return COMPUTER_COLORS[brand]?.default || COMPUTER_COLORS.default
  }
  return []
}

export const getStorages = (categorie, brand, model) => {
  if (categorie === 'telephone') {
    if (brand === 'Apple') {
      const found = IPHONE_ON_DEMAND.find((i) => i.model === model)
        || IPHONE_DATABASE.find((i) => i.model === model)
      return found?.storages || STORAGE_OPTIONS
    }
    const found = findPhoneModel(brand, model)
    return found?.storages || STORAGE_OPTIONS
  }
  if (categorie === 'montre') {
    return WATCH_SIZES[brand]?.[model]
      || WATCH_SIZES[brand]?.default
      || WATCH_SIZES.default
  }
  if (categorie === 'ordinateur') return COMPUTER_STORAGE
  if (categorie === 'tablette') return STORAGE_OPTIONS
  return []
}
