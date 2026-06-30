import { IMAGE_MAP, PLACEHOLDER } from '../utils/phoneImage'

// Helper interne : cherche l'image dans IMAGE_MAP par modèle+couleur
const findImg = (modelKey, colorKey, fallbackColorKey) => {
  const map = IMAGE_MAP[modelKey]
  if (!map) return PLACEHOLDER
  return map[colorKey] || map[fallbackColorKey] || map.default || PLACEHOLDER
}

export const CANONICAL_CATALOG = {
  // ═══ LEGACY (couleurs stables, non controversées) ═══
  'iPhone 7': {
    storages: ['32Go', '128Go', '256Go'],
    colors: {
      'Noir':    findImg('iphone 7', 'noir'),
      'Argent':  findImg('iphone 7', 'argent'),
      'Or':      findImg('iphone 7', 'or'),
      'Or rose': findImg('iphone 7', 'or rose'),
      'Rouge':   findImg('iphone 7', 'rouge'),
    },
  },
  'iPhone 7 Plus': {
    storages: ['32Go', '128Go', '256Go'],
    colors: {
      'Noir':    findImg('iphone 7 plus', 'noir'),
      'Argent':  findImg('iphone 7 plus', 'argent'),
      'Or':      findImg('iphone 7 plus', 'or'),
      'Or rose': findImg('iphone 7 plus', 'or rose'),
      'Rouge':   findImg('iphone 7 plus', 'rouge'),
    },
  },
  'iPhone 8': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':      findImg('iphone 8', 'argent'),
      'Or':          findImg('iphone 8', 'or'),
      'Gris sideral':findImg('iphone 8', 'gris sideral'),
    },
  },
  'iPhone 8 Plus': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':      findImg('iphone 8 plus', 'argent'),
      'Or':          findImg('iphone 8 plus', 'or'),
      'Gris sideral':findImg('iphone 8 plus', 'gris sideral'),
    },
  },
  'iPhone SE (2020)': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Blanc': findImg('iphone se (2020)', 'blanc'),
      'Noir':  findImg('iphone se (2020)', 'noir'),
      'Rouge': findImg('iphone se (2020)', 'rouge'),
    },
  },

  // ═══ X / XR / XS (2017-2018) ═══
  'iPhone X': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':       findImg('iphone x', 'argent'),
      'Gris sideral':findImg('iphone x', 'gris sideral'),
    },
  },
  'iPhone XR': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   findImg('iphone xr', 'noir'),
      'Blanc':  findImg('iphone xr', 'blanc'),
      'Rouge':  findImg('iphone xr', 'rouge'),
      'Bleu':   findImg('iphone xr', 'bleu'),
      'Jaune':  findImg('iphone xr', 'jaune'),
      'Corail': findImg('iphone xr', 'corail'),
    },
  },
  'iPhone XS': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       findImg('iphone xs', 'argent'),
      'Or':           findImg('iphone xs', 'or'),
      'Gris sideral':findImg('iphone xs', 'gris sideral'),
    },
  },
  'iPhone XS Max': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       findImg('iphone xs max', 'argent'),
      'Or':           findImg('iphone xs max', 'or'),
      'Gris sideral':findImg('iphone xs max', 'gris sideral'),
    },
  },

  // ═══ iPhone 11 (2019) — VÉRIFIÉ ═══
  'iPhone 11': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   findImg('iphone 11', 'noir'),
      'Blanc':  findImg('iphone 11', 'blanc'),
      'Rouge':  findImg('iphone 11', 'rouge'),
      'Jaune':  findImg('iphone 11', 'jaune'),
      'Vert':   findImg('iphone 11', 'vert'),
      'Violet': findImg('iphone 11', 'violet'),
    },
  },
  'iPhone 11 Pro': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Gris sideral': findImg('iphone 11 pro', 'gris sideral'),
      'Argent':        findImg('iphone 11 pro', 'argent'),
      'Or':            findImg('iphone 11 pro', 'or'),
      'Vert nuit':     findImg('iphone 11 pro', 'vert nuit'),
    },
  },
  'iPhone 11 Pro Max': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Gris sideral': findImg('iphone 11 pro max', 'gris sideral'),
      'Argent':        findImg('iphone 11 pro max', 'argent'),
      'Or':            findImg('iphone 11 pro max', 'or'),
      'Vert nuit':     findImg('iphone 11 pro max', 'vert nuit'),
    },
  },

  'iPhone SE (2022)': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Minuit':            findImg('iphone se (2022)', 'minuit'),
      'Lumiere stellaire': findImg('iphone se (2022)', 'lumiere stellaire'),
      'Rouge':             findImg('iphone se (2022)', 'rouge'),
    },
  },

  // ═══ iPhone 12 (2020) — VÉRIFIÉ ═══
  'iPhone 12 mini': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   findImg('iphone 12 mini', 'noir'),
      'Blanc':  findImg('iphone 12 mini', 'blanc'),
      'Rouge':  findImg('iphone 12 mini', 'rouge'),
      'Vert':   findImg('iphone 12 mini', 'vert'),
      'Bleu':   findImg('iphone 12 mini', 'bleu'),
      'Violet': findImg('iphone 12 mini', 'violet'),
    },
  },
  'iPhone 12': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   findImg('iphone 12', 'noir'),
      'Blanc':  findImg('iphone 12', 'blanc'),
      'Rouge':  findImg('iphone 12', 'rouge'),
      'Vert':   findImg('iphone 12', 'vert'),
      'Bleu':   findImg('iphone 12', 'bleu'),
      'Violet': findImg('iphone 12', 'violet'),
    },
  },
  'iPhone 12 Pro': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Graphite':     findImg('iphone 12 pro', 'graphite'),
      'Argent':       findImg('iphone 12 pro', 'argent'),
      'Or':           findImg('iphone 12 pro', 'or'),
      'Bleu pacifique':findImg('iphone 12 pro', 'bleu pacifique'),
    },
  },
  'iPhone 12 Pro Max': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Graphite':      findImg('iphone 12 pro max', 'graphite'),
      'Argent':        findImg('iphone 12 pro max', 'argent'),
      'Or':            findImg('iphone 12 pro max', 'or'),
      'Bleu pacifique':findImg('iphone 12 pro max', 'bleu pacifique'),
    },
  },

  // ═══ iPhone 13 (2021) — VÉRIFIÉ ═══
  'iPhone 13 mini': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            findImg('iphone 13 mini', 'minuit'),
      'Lumiere stellaire': findImg('iphone 13 mini', 'lumiere stellaire'),
      'Rouge':             findImg('iphone 13 mini', 'rouge'),
      'Bleu':              findImg('iphone 13 mini', 'bleu'),
      'Rose':              findImg('iphone 13 mini', 'rose'),
      'Vert':              findImg('iphone 13 mini', 'vert'),
    },
  },
  'iPhone 13': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            findImg('iphone 13', 'minuit'),
      'Lumiere stellaire': findImg('iphone 13', 'lumiere stellaire'),
      'Rouge':             findImg('iphone 13', 'rouge'),
      'Bleu':              findImg('iphone 13', 'bleu'),
      'Rose':              findImg('iphone 13', 'rose'),
      'Vert':              findImg('iphone 13', 'vert'),
    },
  },
  'iPhone 13 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Graphite':   findImg('iphone 13 pro', 'graphite'),
      'Argent':     findImg('iphone 13 pro', 'argent'),
      'Or':         findImg('iphone 13 pro', 'or'),
      'Bleu alpin': findImg('iphone 13 pro', 'bleu alpin'),
      'Vert alpin': findImg('iphone 13 pro', 'vert alpin'),
    },
  },
  'iPhone 13 Pro Max': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Graphite':   findImg('iphone 13 pro max', 'graphite'),
      'Argent':     findImg('iphone 13 pro max', 'argent'),
      'Or':         findImg('iphone 13 pro max', 'or'),
      'Bleu alpin': findImg('iphone 13 pro max', 'bleu alpin'),
      'Vert alpin': findImg('iphone 13 pro max', 'vert alpin'),
    },
  },

  // ═══ iPhone 14 (2022) — VÉRIFIÉ ═══
  'iPhone 14': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            findImg('iphone 14', 'minuit'),
      'Lumiere stellaire': findImg('iphone 14', 'lumiere stellaire'),
      'Rouge':             findImg('iphone 14', 'rouge'),
      'Bleu':              findImg('iphone 14', 'bleu'),
      'Violet':            findImg('iphone 14', 'violet'),
      'Jaune':             findImg('iphone 14', 'jaune'),
    },
  },
  'iPhone 14 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            findImg('iphone 14 plus', 'minuit'),
      'Lumiere stellaire': findImg('iphone 14 plus', 'lumiere stellaire'),
      'Rouge':             findImg('iphone 14 plus', 'rouge'),
      'Bleu':              findImg('iphone 14 plus', 'bleu'),
      'Violet':            findImg('iphone 14 plus', 'violet'),
      'Jaune':             findImg('iphone 14 plus', 'jaune'),
    },
  },
  'iPhone 14 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Noir spatial':   findImg('iphone 14 pro', 'noir spatial'),
      'Argent':         findImg('iphone 14 pro', 'argent'),
      'Or':             findImg('iphone 14 pro', 'or'),
      'Violet intense': findImg('iphone 14 pro', 'violet intense'),
    },
  },
  'iPhone 14 Pro Max': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Noir spatial':   findImg('iphone 14 pro max', 'noir spatial'),
      'Argent':         findImg('iphone 14 pro max', 'argent'),
      'Or':             findImg('iphone 14 pro max', 'or'),
      'Violet intense': findImg('iphone 14 pro max', 'violet intense'),
    },
  },

  // ═══ iPhone 15 (2023) — VÉRIFIÉ ═══
  'iPhone 15': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':  findImg('iphone 15', 'noir'),
      'Rose':  findImg('iphone 15', 'rose'),
      'Jaune': findImg('iphone 15', 'jaune'),
      'Vert':  findImg('iphone 15', 'vert'),
      'Bleu':  findImg('iphone 15', 'bleu'),
    },
  },
  'iPhone 15 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':  findImg('iphone 15 plus', 'noir'),
      'Rose':  findImg('iphone 15 plus', 'rose'),
      'Jaune': findImg('iphone 15 plus', 'jaune'),
      'Vert':  findImg('iphone 15 plus', 'vert'),
      'Bleu':  findImg('iphone 15 plus', 'bleu'),
    },
  },
  'iPhone 15 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': findImg('iphone 15 pro', 'titane naturel'),
      'Titane bleu':    findImg('iphone 15 pro', 'titane bleu'),
      'Titane blanc':   findImg('iphone 15 pro', 'titane blanc'),
      'Titane noir':    findImg('iphone 15 pro', 'titane noir'),
    },
  },
  'iPhone 15 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': findImg('iphone 15 pro max', 'titane naturel'),
      'Titane bleu':    findImg('iphone 15 pro max', 'titane bleu'),
      'Titane blanc':   findImg('iphone 15 pro max', 'titane blanc'),
      'Titane noir':    findImg('iphone 15 pro max', 'titane noir'),
    },
  },

  // ═══ iPhone 16 (2024) — VÉRIFIÉ ═══
  'iPhone 16e': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir':  findImg('iphone 16e', 'noir'),
      'Blanc': findImg('iphone 16e', 'blanc'),
    },
  },
  'iPhone 16': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':        findImg('iphone 16', 'noir'),
      'Blanc':       findImg('iphone 16', 'blanc'),
      'Rose':        findImg('iphone 16', 'rose'),
      'Sarcelle':    findImg('iphone 16', 'bleu outremer', 'noir'), // teal — fallback si pas trouvé
      'Outremer':    findImg('iphone 16', 'bleu outremer'),
    },
  },
  'iPhone 16 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':     findImg('iphone 16 plus', 'noir'),
      'Blanc':    findImg('iphone 16 plus', 'blanc'),
      'Rose':     findImg('iphone 16 plus', 'rose'),
      'Sarcelle': findImg('iphone 16 plus', 'bleu outremer', 'noir'),
      'Outremer': findImg('iphone 16 plus', 'bleu outremer'),
    },
  },
  'iPhone 16 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Titane noir':    findImg('iphone 16 pro', 'titane noir'),
      'Titane blanc':   findImg('iphone 16 pro', 'titane blanc'),
      'Titane naturel': findImg('iphone 16 pro', 'titane naturel'),
      'Titane desert':  findImg('iphone 16 pro', 'titane desert'),
    },
  },
  'iPhone 16 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Titane noir':    findImg('iphone 16 pro max', 'titane noir'),
      'Titane blanc':   findImg('iphone 16 pro max', 'titane blanc'),
      'Titane naturel': findImg('iphone 16 pro max', 'titane naturel'),
      'Titane desert':  findImg('iphone 16 pro max', 'titane desert'),
    },
  },

  // ═══ iPhone 17 (2025) — VÉRIFIÉ SEPT 2025 ═══
  'iPhone 17e': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir':  findImg('iphone 17e', 'noir'),
      'Blanc': findImg('iphone 17e', 'blanc'),
    },
  },
  'iPhone 17': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':       findImg('iphone 17', 'noir'),
      'Blanc':      findImg('iphone 17', 'noir'), // TODO image manquante
      'Lavande':    findImg('iphone 17', 'rose'),
      'Bleu brume': findImg('iphone 17', 'bleu'),
      'Sauge':      findImg('iphone 17', 'noir'), // TODO image manquante
    },
  },
  'iPhone 17 Air': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir sideral': findImg('iphone 17 air', 'noir'),
      'Blanc nuage':  findImg('iphone 17 air', 'blanc'),
      'Or clair':     findImg('iphone 17 air', 'or'),
      'Bleu ciel':    findImg('iphone 17 air', 'bleu'),
    },
  },
  'iPhone 17 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Orange cosmique': findImg('iphone 17 pro', 'orange cosmique'),
      'Bleu intense':    findImg('iphone 17 pro', 'bleu intense'),
      'Argent':          findImg('iphone 17 pro', 'argent'),
    },
  },
  'iPhone 17 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Orange cosmique': findImg('iphone 17 pro max', 'orange cosmique'),
      'Bleu intense':    findImg('iphone 17 pro max', 'bleu intense'),
      'Argent':          findImg('iphone 17 pro max', 'argent'),
    },
  },
}

export const getCanonicalModel = (modelName) => {
  if (!modelName) return null
  const normalized = modelName.toLowerCase()
    .replace(/^apple\s+/i, '')
    .trim()
  const found = Object.keys(CANONICAL_CATALOG).find(
    k => k.toLowerCase() === normalized
  )
  return found ? { name: found, ...CANONICAL_CATALOG[found] } : null
}

// Alias pour les couleurs qui ont changé de nom
// entre la base de données et le catalogue officiel
const COLOR_ALIASES = {
  'iPhone 17': {
    'bleu': 'Bleu brume',
    'rose': 'Lavande',
  },
}

export const getCanonicalImage = (modelName, colorName) => {
  const model = getCanonicalModel(modelName)
  if (!model) return null
  if (!colorName) {
    const firstColor = Object.keys(model.colors)[0]
    return model.colors[firstColor] || null
  }

  // 1. Match exact insensible à la casse
  const colorKeyExact = Object.keys(model.colors).find(
    c => c.toLowerCase() === colorName.toLowerCase()
  )
  if (colorKeyExact) return model.colors[colorKeyExact]

  // 2. Match via alias (si la base utilise un ancien nom)
  const aliasMap = COLOR_ALIASES[model.name]
  if (aliasMap) {
    const aliasTarget = aliasMap[colorName.toLowerCase()]
    if (aliasTarget && model.colors[aliasTarget]) {
      return model.colors[aliasTarget]
    }
  }

  // 3. Fallback première couleur
  const firstColor = Object.keys(model.colors)[0]
  return model.colors[firstColor] || null
}

export const colorsMatch = (dbColor, catalogColor, modelName) => {
  if (!dbColor || !catalogColor) return false

  // Match exact insensible à la casse
  if (dbColor.toLowerCase() === catalogColor.toLowerCase()) {
    return true
  }

  // Match via alias
  const model = getCanonicalModel(modelName)
  if (model) {
    const aliasMap = COLOR_ALIASES[model.name]
    if (aliasMap) {
      const aliasTarget = aliasMap[dbColor.toLowerCase()]
      if (aliasTarget && aliasTarget.toLowerCase() === catalogColor.toLowerCase()) {
        return true
      }
    }
  }

  return false
}
