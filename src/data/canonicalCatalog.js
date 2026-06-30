// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL_CATALOG — SOURCE UNIQUE DE VÉRITÉ couleurs + images par modèle iPhone
//
// Construit en croisant :
//   - src/data/iphoneDatabase.js   (IPHONE_DATABASE)  → couleurs/storages legacy
//                                                         (iPhone 7 → SE 2020)
//   - src/data/iphoneOnDemand.js   (IPHONE_ON_DEMAND) → couleurs/storages officiels
//                                                         Apple (iPhone X → 17 Pro Max)
//   - src/utils/phoneImage.js      (IMAGE_MAP)        → chemins d'images
//
// RÈGLE DE FUSION (par modèle) :
//   1. Les couleurs/storages OFFICIELS viennent de la source produit
//      (IPHONE_DATABASE pour le legacy, IPHONE_ON_DEMAND pour X→17 Pro Max).
//   2. Chaque couleur officielle reçoit son image exacte depuis IMAGE_MAP
//      (clé normalisée identique).
//   3. Couleur officielle SANS image exacte → image la plus proche par famille,
//      signalée par un commentaire « // TODO image manquante, fallback … ».
//   4. Couleur présente dans IMAGE_MAP mais ABSENTE des couleurs officielles
//      (couleur fantôme, source du bug) → NON incluse.
//
// INVARIANT : chaque couleur listée possède SA propre clé dans `colors`,
// avec un chemin d'image qui existe réellement (jamais de fichier manquant).
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_CATALOG = {
  // ── Legacy (couleurs/storages depuis IPHONE_DATABASE) ─────────────────────
  'iPhone 7': {
    storages: ['32Go', '128Go', '256Go'],
    colors: {
      'Noir':         '/images/iphones/iphone-7-noir.png',
      'Noir de jais': '/images/iphones/iphone-7-noir.png', // TODO image manquante, fallback noir
      'Argent':       '/images/iphones/iphone-7-argent.png',
      'Or':           '/images/iphones/iphone-7-or.png',
      'Or rose':      '/images/iphones/iphone-7-rose.png',
      'Rouge':        'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-red-select-2017?wid=400&hei=400&fmt=jpeg',
    },
  },
  'iPhone 7 Plus': {
    storages: ['32Go', '128Go', '256Go'],
    colors: {
      'Noir':         '/images/iphones/iphone-7-plus-noir-de-jais.png',
      'Noir de jais': '/images/iphones/iphone-7-plus-noir-de-jais.png',
      'Argent':       '/images/iphones/iphone-7-plus-argent.png',
      'Or':           '/images/iphones/iphone-7-plus-or.png',
      'Or rose':      '/images/iphones/iphone-7-plus-or-rose.png',
      'Rouge':        'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7plus-red-select-2017?wid=400&hei=400&fmt=jpeg',
    },
  },
  'iPhone 8': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-8-argent.png',
      'Or':           '/images/iphones/iphone-8-or.png',
      'Gris sidéral': '/images/iphones/iphone-8-gris-sideral.png',
    },
  },
  'iPhone 8 Plus': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-8-plus-argent.png',
      'Or':           '/images/iphones/iphone-8-plus-or.png',
      'Gris sidéral': '/images/iphones/iphone-8-plus-gris-sideral.png',
    },
  },
  'iPhone SE (2020)': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-se-2020-noir.png',
      'Blanc': '/images/iphones/iphone-se-2020-blanc.png',
      'Rouge': '/images/iphones/iphone-se-2020-rouge.png',
    },
  },

  // ── X → 17 Pro Max (couleurs/storages depuis IPHONE_ON_DEMAND) ────────────
  'iPhone X': {
    storages: ['64Go', '256Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-x-argent.png',
      'Gris sidéral': '/images/iphones/iphone-x-gris-sideral.png',
    },
  },
  'iPhone XR': {
    storages: ['64Go', '128Go'],
    colors: {
      'Noir':   '/images/iphones/iphone-xr-noir.png',
      'Blanc':  '/images/iphones/iphone-xr-blanc.png',
      'Rouge':  '/images/iphones/iphone-xr-rouge.png',
      'Bleu':   '/images/iphones/iphone-xr-bleu.png',
      'Jaune':  '/images/iphones/iphone-xr-jaune.png',
      'Corail': '/images/iphones/iphone-xr-corail.png',
    },
  },
  'iPhone XS': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-xs-argent.png',
      'Or':           '/images/iphones/iphone-xs-or.png',
      'Gris sidéral': '/images/iphones/iphone-xs-gris-sideral.png',
    },
  },
  'iPhone XS Max': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-xs-max-argent.png',
      'Or':           '/images/iphones/iphone-xs-max-or.png',
      'Gris sidéral': '/images/iphones/iphone-xs-max-gris-sideral.png',
    },
  },
  'iPhone 11': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   '/images/iphones/iphone-11-noir.png',
      'Blanc':  '/images/iphones/iphone-11-blanc.png',
      'Rouge':  '/images/iphones/iphone-11-rouge.png',
      'Vert':   '/images/iphones/iphone-11-vert.png',
      'Jaune':  '/images/iphones/iphone-11-jaune.png',
      'Violet': '/images/iphones/iphone-11-violet.png',
    },
  },
  'iPhone 11 Pro': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-11-pro-argent.png',
      'Or':           '/images/iphones/iphone-11-pro-or.png',
      'Gris sidéral': '/images/iphones/iphone-11-pro-gris-sideral.png',
      'Vert nuit':    '/images/iphones/iphone-11-pro-vert-nuit.png',
    },
  },
  'iPhone 11 Pro Max': {
    storages: ['64Go', '256Go', '512Go'],
    colors: {
      'Argent':       '/images/iphones/iphone-11-pro-max-argent.png',
      'Or':           'https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone11promax-gold-select?wid=400&hei=400&fmt=jpeg',
      'Gris sidéral': '/images/iphones/iphone-11-pro-max-gris-sideral.png',
      'Vert nuit':    '/images/iphones/iphone-11-pro-max-vert-nuit.png',
    },
  },
  'iPhone 12 mini': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   '/images/iphones/iphone-12-mini-noir.png',
      'Blanc':  '/images/iphones/iphone-12-mini-blanc.png',
      'Rouge':  '/images/iphones/iphone-12-mini-rouge.png',
      'Bleu':   '/images/iphones/iphone-12-mini-bleu.png',
      'Vert':   '/images/iphones/iphone-12-mini-vert.png',
      'Violet': '/images/iphones/iphone-12-mini-violet.png',
    },
  },
  'iPhone 12': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Noir':   '/images/iphones/iphone-12-noir.png',
      'Blanc':  '/images/iphones/iphone-12-blanc.png',
      'Rouge':  '/images/iphones/iphone-12-rouge.png',
      'Bleu':   '/images/iphones/iphone-12-bleu.png',
      'Vert':   '/images/iphones/iphone-12-vert.png',
      'Violet': '/images/iphones/iphone-12-violet.png',
    },
  },
  'iPhone 12 Pro': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Argent':         '/images/iphones/iphone-12-pro-argent.png',
      'Or':             '/images/iphones/iphone-12-pro-or.png',
      'Graphite':       '/images/iphones/iphone-12-pro-graphite.png',
      'Bleu Pacifique': '/images/iphones/iphone-12-pro-bleu-pacifique.png',
    },
  },
  'iPhone 12 Pro Max': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Argent':         '/images/iphones/iphone-12-pro-max-argent.png',
      'Or':             '/images/iphones/iphone-12-pro-max-or.png',
      'Graphite':       '/images/iphones/iphone-12-pro-max-graphite.png',
      'Bleu Pacifique': '/images/iphones/iphone-12-pro-max-bleu-pacifique.png',
    },
  },
  'iPhone 13 mini': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            '/images/iphones/iphone-13-mini-minuit.png',
      'Lumière stellaire': '/images/iphones/iphone-13-mini-lumiere-stellaire.png',
      'Rouge':             '/images/iphones/iphone-13-mini-rouge.png',
      'Bleu':              '/images/iphones/iphone-13-mini-bleu.png',
      'Rose':              '/images/iphones/iphone-13-mini-rose.png',
      'Vert':              '/images/iphones/iphone-13-mini-vert.png',
    },
  },
  'iPhone 13': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            '/images/iphones/iphone-13-minuit.png',
      'Lumière stellaire': '/images/iphones/iphone-13-lumiere-stellaire.png',
      'Rouge':             '/images/iphones/iphone-13-rouge.png',
      'Bleu':              '/images/iphones/iphone-13-bleu.png',
      'Rose':              '/images/iphones/iphone-13-rose.png',
      'Vert':              '/images/iphones/iphone-13-vert.png',
    },
  },
  'iPhone 13 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Argent':     '/images/iphones/iphone-13-pro-argent.png',
      'Or':         '/images/iphones/iphone-13-pro-or.png',
      'Graphite':   '/images/iphones/iphone-13-pro-graphite.png',
      'Bleu alpin': '/images/iphones/iphone-13-pro-bleu-sierra.png',
      'Vert sierra':'/images/iphones/iphone-13-pro-vert-alpin.png', // TODO image manquante (clé 'vert alpin'), fallback vert
    },
  },
  'iPhone 13 Pro Max': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Argent':     '/images/iphones/iphone-13-pro-max-argent.png',
      'Or':         '/images/iphones/iphone-13-pro-max-or.png',
      'Graphite':   '/images/iphones/iphone-13-pro-max-graphite.png',
      'Bleu alpin': '/images/iphones/iphone-13-pro-max-bleu-sierra.png',
      'Vert sierra':'/images/iphones/iphone-13-pro-max-vert-alpin.png', // TODO image manquante (clé 'vert alpin'), fallback vert
    },
  },
  'iPhone SE (2022)': {
    storages: ['64Go', '128Go', '256Go'],
    colors: {
      'Minuit':            '/images/iphones/iphone-se-2022-minuit.png',
      'Lumière stellaire': '/images/iphones/iphone-se-2022-lumiere-stellaire.png',
      'Rouge':             '/images/iphones/iphone-se-2022-rouge.png',
    },
  },
  'iPhone 14': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            '/images/iphones/iphone-14-minuit.png',
      'Lumière stellaire': '/images/iphones/iphone-14-lumiere-stellaire.png',
      'Rouge':             '/images/iphones/iphone-14-rouge.png',
      'Bleu':              '/images/iphones/iphone-14-bleu.png',
      'Violet':            '/images/iphones/iphone-14-violet.png',
      'Jaune':             '/images/iphones/iphone-14-jaune.png',
    },
  },
  'iPhone 14 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Minuit':            '/images/iphones/iphone-14-plus-minuit.png',
      'Lumière stellaire': '/images/iphones/iphone-14-plus-lumiere-stellaire.png',
      'Rouge':             '/images/iphones/iphone-14-plus-rouge.png',
      'Bleu':              '/images/iphones/iphone-14-plus-bleu.png',
      'Violet':            '/images/iphones/iphone-14-plus-violet.png',
    },
  },
  'iPhone 14 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Violet intense': '/images/iphones/iphone-14-pro-violet-intense.png',
      'Or':             '/images/iphones/iphone-14-pro-or.png',
      'Argent':         '/images/iphones/iphone-14-pro-argent.png',
      'Noir spatial':   '/images/iphones/iphone-14-pro-noir-cosmos.png',
    },
  },
  'iPhone 14 Pro Max': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Violet intense': '/images/iphones/iphone-14-pro-max-violet-intense.png',
      'Or':             '/images/iphones/iphone-14-pro-max-or.png',
      'Argent':         '/images/iphones/iphone-14-pro-max-argent.png',
      'Noir spatial':   '/images/iphones/iphone-14-pro-max-noir-cosmos.png',
    },
  },
  'iPhone 15': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-15-noir.png',
      'Rose':  '/images/iphones/iphone-15-rose.png',
      'Jaune': '/images/iphones/iphone-15-jaune.png',
      'Vert':  '/images/iphones/iphone-15-vert.png',
      'Bleu':  '/images/iphones/iphone-15-bleu.png',
    },
  },
  'iPhone 15 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-15-plus-noir.png',
      'Rose':  '/images/iphones/iphone-15-plus-rose.png',
      'Jaune': '/images/iphones/iphone-15-plus-jaune.png',
      'Vert':  '/images/iphones/iphone-15-plus-vert.png',
      'Bleu':  '/images/iphones/iphone-15-plus-bleu.png',
    },
  },
  'iPhone 15 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': '/images/iphones/iphone-15-pro-titane-naturel.png',
      'Titane bleu':    '/images/iphones/iphone-15-pro-titane-bleu.png',
      'Titane blanc':   '/images/iphones/iphone-15-pro-titane-blanc.png',
      'Titane noir':    '/images/iphones/iphone-15-pro-titane-noir.png',
    },
  },
  'iPhone 15 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': '/images/iphones/iphone-15-pro-max-titane-naturel.png',
      'Titane bleu':    '/images/iphones/iphone-15-pro-max-titane-bleu.png',
      'Titane blanc':   '/images/iphones/iphone-15-pro-max-titane-blanc.png',
      'Titane noir':    '/images/iphones/iphone-15-pro-max-titane-noir.png',
    },
  },
  'iPhone 16e': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-16e-noir.png',
      'Blanc': '/images/iphones/iphone-16e-blanc.png',
    },
  },
  'iPhone 16': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':          '/images/iphones/iphone-16-noir.png',
      'Blanc':         '/images/iphones/iphone-16-blanc.png',
      'Rose':          '/images/iphones/iphone-16-rose.png',
      'Bleu outremer': '/images/iphones/iphone-16-outremer.png',
      'Vert jade':     '/images/iphones/iphone-16-sarcelle.png',
    },
  },
  'iPhone 16 Plus': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':          '/images/iphones/iphone-16-plus-noir.png',
      'Blanc':         '/images/iphones/iphone-16-plus-blanc.png',
      'Rose':          '/images/iphones/iphone-16-plus-rose.png',
      'Bleu outremer': '/images/iphones/iphone-16-plus-outremer.png',
      'Vert jade':     '/images/iphones/iphone-16-plus-sarcelle.png',
    },
  },
  'iPhone 16 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': '/images/iphones/iphone-16-pro-titane-naturel.png',
      'Titane blanc':   '/images/iphones/iphone-16-pro-titane-blanc.png',
      'Titane noir':    '/images/iphones/iphone-16-pro-titane-noir.png',
      'Titane désert':  '/images/iphones/iphone-16-pro-titane-desert.png',
    },
  },
  'iPhone 16 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Titane naturel': '/images/iphones/iphone-16-pro-max-titane-naturel.png',
      'Titane blanc':   '/images/iphones/iphone-16-pro-max-titane-blanc.png',
      'Titane noir':    '/images/iphones/iphone-16-pro-max-titane-noir.png',
      'Titane désert':  '/images/iphones/iphone-16-pro-max-titane-desert.png',
    },
  },
  'iPhone 17e': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-16e-noir.png',  // TODO image manquante, fallback 16e
      'Blanc': '/images/iphones/iphone-16e-blanc.png', // TODO image manquante, fallback 16e
      'Rose':  '/images/iphones/iphone-16e-blanc.png', // TODO image manquante, fallback blanc 16e
    },
  },
  'iPhone 17': {
    storages: ['128Go', '256Go', '512Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-17-noir.png',
      'Blanc': '/images/iphones/iphone-17-noir.png',       // TODO image manquante, fallback noir
      'Rose':  '/images/iphones/iphone-17-lavande.png',
      'Bleu':  '/images/iphones/iphone-17-bleu-brume.png',
      'Vert':  '/images/iphones/iphone-17-noir.png',       // TODO image manquante, fallback noir
    },
  },
  'iPhone 17 Air': {
    storages: ['128Go', '256Go'],
    colors: {
      'Noir':  '/images/iphones/iphone-air-noir-cosmos.png',
      'Blanc': '/images/iphones/iphone-air-blanc-nuage.png',
      'Bleu':  '/images/iphones/iphone-air-bleu-ciel.png',
      'Rose':  '/images/iphones/iphone-air-blanc-nuage.png', // TODO image manquante, fallback blanc
    },
  },
  'iPhone 17 Pro': {
    storages: ['128Go', '256Go', '512Go', '1To'],
    colors: {
      'Orange cosmique': '/images/iphones/iphone-17-pro-orange-cosmique.png',
      'Bleu intense':    '/images/iphones/iphone-17-pro-bleu-profond.png',
      'Titane noir':     '/images/iphones/iphone-17-pro-orange-cosmique.png', // TODO image manquante, fallback orange
    },
  },
  'iPhone 17 Pro Max': {
    storages: ['256Go', '512Go', '1To'],
    colors: {
      'Orange cosmique': '/images/iphones/iphone-17-pro-max-orange-cosmique.png',
      'Bleu intense':    '/images/iphones/iphone-17-pro-max-bleu-profond.png',
      'Titane noir':     '/images/iphones/iphone-17-pro-max-orange-cosmique.png', // TODO image manquante, fallback orange
    },
  },
}

// Helper : récupère les infos canoniques d'un modèle
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

// Helper : récupère l'image exacte pour modèle + couleur
export const getCanonicalImage = (modelName, colorName) => {
  const model = getCanonicalModel(modelName)
  if (!model) return null
  if (colorName && model.colors[colorName]) {
    return model.colors[colorName]
  }
  // Fallback : première couleur du modèle
  const firstColor = Object.keys(model.colors)[0]
  return model.colors[firstColor] || null
}
