const PLACEHOLDER = "https://placehold.co/400x400/f5f5f5/999?text=iPhone"

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE_MAP — clé = nom modèle normalisé, valeur = { colorKey: imagePath }
// Règle : fichier local si disponible, sinon Apple CDN, sinon PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────
const IMAGE_MAP = {

  // ── iPhone 7 — CDN uniquement ──────────────────────────────────────────────
  "iphone 7": {
    default:      "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-silver-select-2016?wid=400&hei=400&fmt=jpeg",
    "noir":       "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-black-select-2016?wid=400&hei=400&fmt=jpeg",
    "argent":     "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-silver-select-2016?wid=400&hei=400&fmt=jpeg",
    "or":         "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-gold-select-2016?wid=400&hei=400&fmt=jpeg",
    "or rose":    "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-rosegold-select-2016?wid=400&hei=400&fmt=jpeg",
    "rouge":      "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-red-select-2017?wid=400&hei=400&fmt=jpeg",
  },

  // ── iPhone 7 Plus — fichiers locaux ───────────────────────────────────────
  "iphone 7 plus": {
    default:        "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "noir":         "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "noir de jais": "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "argent":       "/images/iphones/iphone-7-plus-argent.png",
    "or":           "/images/iphones/iphone-7-plus-or.png",
    "or rose":      "/images/iphones/iphone-7-plus-or-rose.png",
    "rouge":        "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7plus-red-select-2017?wid=400&hei=400&fmt=jpeg",
  },

  // ── iPhone 8 — fichiers locaux ────────────────────────────────────────────
  "iphone 8": {
    default:       "/images/iphones/iphone-8-argent.png",
    "argent":      "/images/iphones/iphone-8-argent.png",
    "or":          "/images/iphones/iphone-8-or.png",
    "gris sideral":"/images/iphones/iphone-8-gris-sideral.png",
    "rouge":       "/images/iphones/iphone-8-rouge.png",
  },

  // ── iPhone 8 Plus — fichiers locaux ──────────────────────────────────────
  "iphone 8 plus": {
    default:       "/images/iphones/iphone-8-plus-argent.png",
    "argent":      "/images/iphones/iphone-8-plus-argent.png",
    "or":          "/images/iphones/iphone-8-plus-or.png",
    "gris sideral":"/images/iphones/iphone-8-plus-gris-sideral.png",
    "rouge":       "/images/iphones/iphone-8-plus-rouge.png",
  },

  // ── iPhone SE (2020) — fichiers locaux ───────────────────────────────────
  "iphone se (2020)": {
    default: "/images/iphones/iphone-se-2020-blanc.png",
    "blanc": "/images/iphones/iphone-se-2020-blanc.png",
    "noir":  "/images/iphones/iphone-se-2020-noir.png",
    "rouge": "/images/iphones/iphone-se-2020-rouge.png",
  },

  // ── iPhone X — fichiers locaux ────────────────────────────────────────────
  "iphone x": {
    default:       "/images/iphones/iphone-x-argent.png",
    "argent":      "/images/iphones/iphone-x-argent.png",
    "gris sideral":"/images/iphones/iphone-x-gris-sideral.png",
  },

  // ── iPhone XR — fichiers locaux ───────────────────────────────────────────
  "iphone xr": {
    default: "/images/iphones/iphone-xr-noir.png",
    "noir":  "/images/iphones/iphone-xr-noir.png",
    "blanc": "/images/iphones/iphone-xr-blanc.png",
    "rouge": "/images/iphones/iphone-xr-rouge.png",
    "bleu":  "/images/iphones/iphone-xr-bleu.png",
    "jaune": "/images/iphones/iphone-xr-jaune.png",
    "corail":"/images/iphones/iphone-xr-corail.png",
  },

  // ── iPhone XS — fichiers locaux ───────────────────────────────────────────
  "iphone xs": {
    default:       "/images/iphones/iphone-xs-argent.png",
    "argent":      "/images/iphones/iphone-xs-argent.png",
    "or":          "/images/iphones/iphone-xs-or.png",
    "gris sideral":"/images/iphones/iphone-xs-gris-sideral.png",
  },

  // ── iPhone XS Max — fichiers locaux ──────────────────────────────────────
  "iphone xs max": {
    default:       "/images/iphones/iphone-xs-max-argent.png",
    "argent":      "/images/iphones/iphone-xs-max-argent.png",
    "or":          "/images/iphones/iphone-xs-max-or.png",
    "gris sideral":"/images/iphones/iphone-xs-max-gris-sideral.png",
  },

  // ── iPhone 11 — fichiers locaux ───────────────────────────────────────────
  "iphone 11": {
    default: "/images/iphones/iphone-11-noir.png",
    "noir":  "/images/iphones/iphone-11-noir.png",
    "blanc": "/images/iphones/iphone-11-blanc.png",
    "rouge": "/images/iphones/iphone-11-rouge.png",
    "vert":  "/images/iphones/iphone-11-vert.png",
    "jaune": "/images/iphones/iphone-11-jaune.png",
    "violet":"/images/iphones/iphone-11-violet.png",
  },

  // ── iPhone 11 Pro — fichiers locaux ──────────────────────────────────────
  "iphone 11 pro": {
    default:       "/images/iphones/iphone-11-pro-argent.png",
    "argent":      "/images/iphones/iphone-11-pro-argent.png",
    "or":          "/images/iphones/iphone-11-pro-or.png",
    "gris sideral":"/images/iphones/iphone-11-pro-gris-sideral.png",
    "vert nuit":   "/images/iphones/iphone-11-pro-vert-nuit.png",
  },

  // ── iPhone 11 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 11 pro max": {
    default:       "/images/iphones/iphone-11-pro-max-argent.png",
    "argent":      "/images/iphones/iphone-11-pro-max-argent.png",
    "or":          "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone11promax-gold-select?wid=400&hei=400&fmt=jpeg",
    "gris sideral":"/images/iphones/iphone-11-pro-max-gris-sideral.png",
    "vert nuit":   "/images/iphones/iphone-11-pro-max-vert-nuit.png",
  },

  // ── iPhone SE (2022) — fichiers locaux ───────────────────────────────────
  "iphone se (2022)": {
    default:          "/images/iphones/iphone-se-2022-minuit.png",
    "minuit":         "/images/iphones/iphone-se-2022-minuit.png",
    "rouge":          "/images/iphones/iphone-se-2022-rouge.png",
    "lumiere stellaire":"/images/iphones/iphone-se-2022-lumiere-stellaire.png",
  },

  // ── iPhone 12 mini — fichiers locaux ─────────────────────────────────────
  "iphone 12 mini": {
    default: "/images/iphones/iphone-12-mini-noir.png",
    "noir":  "/images/iphones/iphone-12-mini-noir.png",
    "blanc": "/images/iphones/iphone-12-mini-blanc.png",
    "rouge": "/images/iphones/iphone-12-mini-rouge.png",
    "bleu":  "/images/iphones/iphone-12-mini-bleu.png",
    "vert":  "/images/iphones/iphone-12-mini-vert.png",
    "violet":"/images/iphones/iphone-12-mini-violet.png",
  },

  // ── iPhone 12 — fichiers locaux ───────────────────────────────────────────
  "iphone 12": {
    default: "/images/iphones/iphone-12-noir.png",
    "noir":  "/images/iphones/iphone-12-noir.png",
    "blanc": "/images/iphones/iphone-12-blanc.png",
    "rouge": "/images/iphones/iphone-12-rouge.png",
    "bleu":  "/images/iphones/iphone-12-bleu.png",
    "vert":  "/images/iphones/iphone-12-vert.png",
    "violet":"/images/iphones/iphone-12-violet.png",
  },

  // ── iPhone 12 Pro — fichiers locaux ──────────────────────────────────────
  "iphone 12 pro": {
    default:         "/images/iphones/iphone-12-pro-argent.png",
    "argent":        "/images/iphones/iphone-12-pro-argent.png",
    "or":            "/images/iphones/iphone-12-pro-or.png",
    "graphite":      "/images/iphones/iphone-12-pro-graphite.png",
    "bleu pacifique":"/images/iphones/iphone-12-pro-bleu-pacifique.png",
  },

  // ── iPhone 12 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 12 pro max": {
    default:         "/images/iphones/iphone-12-pro-max-argent.png",
    "argent":        "/images/iphones/iphone-12-pro-max-argent.png",
    "or":            "/images/iphones/iphone-12-pro-max-or.png",
    "graphite":      "/images/iphones/iphone-12-pro-max-graphite.png",
    "bleu pacifique":"/images/iphones/iphone-12-pro-max-bleu-pacifique.png",
  },

  // ── iPhone 13 mini — fichiers locaux ─────────────────────────────────────
  "iphone 13 mini": {
    default:          "/images/iphones/iphone-13-mini-minuit.png",
    "minuit":         "/images/iphones/iphone-13-mini-minuit.png",
    "lumiere stellaire":"/images/iphones/iphone-13-mini-lumiere-stellaire.png",
    "rouge":          "/images/iphones/iphone-13-mini-rouge.png",
    "bleu":           "/images/iphones/iphone-13-mini-bleu.png",
    "rose":           "/images/iphones/iphone-13-mini-rose.png",
    "vert":           "/images/iphones/iphone-13-mini-vert.png",
  },

  // ── iPhone 13 — fichiers locaux ───────────────────────────────────────────
  "iphone 13": {
    default:          "/images/iphones/iphone-13-minuit.png",
    "minuit":         "/images/iphones/iphone-13-minuit.png",
    "lumiere stellaire":"/images/iphones/iphone-13-lumiere-stellaire.png",
    "rouge":          "/images/iphones/iphone-13-rouge.png",
    "bleu":           "/images/iphones/iphone-13-bleu.png",
    "rose":           "/images/iphones/iphone-13-rose.png",
    "vert":           "/images/iphones/iphone-13-vert.png",
  },

  // ── iPhone 13 Pro — fichiers locaux (bleu-sierra = "Bleu alpin") ─────────
  "iphone 13 pro": {
    default:    "/images/iphones/iphone-13-pro-graphite.png",
    "graphite": "/images/iphones/iphone-13-pro-graphite.png",
    "argent":   "/images/iphones/iphone-13-pro-argent.png",
    "or":       "/images/iphones/iphone-13-pro-or.png",
    "bleu alpin":"/images/iphones/iphone-13-pro-bleu-sierra.png",
    "vert alpin":"/images/iphones/iphone-13-pro-vert-alpin.png",
  },

  // ── iPhone 13 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 13 pro max": {
    default:    "/images/iphones/iphone-13-pro-max-graphite.png",
    "graphite": "/images/iphones/iphone-13-pro-max-graphite.png",
    "argent":   "/images/iphones/iphone-13-pro-max-argent.png",
    "or":       "/images/iphones/iphone-13-pro-max-or.png",
    "bleu alpin":"/images/iphones/iphone-13-pro-max-bleu-sierra.png",
    "vert alpin":"/images/iphones/iphone-13-pro-max-vert-alpin.png",
  },

  // ── iPhone 14 — fichiers locaux ───────────────────────────────────────────
  "iphone 14": {
    default:          "/images/iphones/iphone-14-minuit.png",
    "minuit":         "/images/iphones/iphone-14-minuit.png",
    "lumiere stellaire":"/images/iphones/iphone-14-lumiere-stellaire.png",
    "rouge":          "/images/iphones/iphone-14-rouge.png",
    "bleu":           "/images/iphones/iphone-14-bleu.png",
    "violet":         "/images/iphones/iphone-14-violet.png",
    "jaune":          "/images/iphones/iphone-14-jaune.png",
  },

  // ── iPhone 14 Plus — fichiers locaux ─────────────────────────────────────
  "iphone 14 plus": {
    default:          "/images/iphones/iphone-14-plus-minuit.png",
    "minuit":         "/images/iphones/iphone-14-plus-minuit.png",
    "lumiere stellaire":"/images/iphones/iphone-14-plus-lumiere-stellaire.png",
    "rouge":          "/images/iphones/iphone-14-plus-rouge.png",
    "bleu":           "/images/iphones/iphone-14-plus-bleu.png",
    "violet":         "/images/iphones/iphone-14-plus-violet.png",
    "jaune":          "/images/iphones/iphone-14-plus-jaune.png",
  },

  // ── iPhone 14 Pro — fichiers locaux (noir-cosmos = "Noir spatial") ───────
  "iphone 14 pro": {
    default:       "/images/iphones/iphone-14-pro-noir-cosmos.png",
    "noir spatial":"/images/iphones/iphone-14-pro-noir-cosmos.png",
    "argent":      "/images/iphones/iphone-14-pro-argent.png",
    "or":          "/images/iphones/iphone-14-pro-or.png",
    "violet intense":"/images/iphones/iphone-14-pro-violet-intense.png",
  },

  // ── iPhone 14 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 14 pro max": {
    default:       "/images/iphones/iphone-14-pro-max-noir-cosmos.png",
    "noir spatial":"/images/iphones/iphone-14-pro-max-noir-cosmos.png",
    "argent":      "/images/iphones/iphone-14-pro-max-argent.png",
    "or":          "/images/iphones/iphone-14-pro-max-or.png",
    "violet intense":"/images/iphones/iphone-14-pro-max-violet-intense.png",
  },

  // ── iPhone 15 — fichiers locaux ───────────────────────────────────────────
  "iphone 15": {
    default: "/images/iphones/iphone-15-noir.png",
    "noir":  "/images/iphones/iphone-15-noir.png",
    "rose":  "/images/iphones/iphone-15-rose.png",
    "jaune": "/images/iphones/iphone-15-jaune.png",
    "vert":  "/images/iphones/iphone-15-vert.png",
    "bleu":  "/images/iphones/iphone-15-bleu.png",
  },

  // ── iPhone 15 Plus — fichiers locaux ─────────────────────────────────────
  "iphone 15 plus": {
    default: "/images/iphones/iphone-15-plus-noir.png",
    "noir":  "/images/iphones/iphone-15-plus-noir.png",
    "rose":  "/images/iphones/iphone-15-plus-rose.png",
    "jaune": "/images/iphones/iphone-15-plus-jaune.png",
    "vert":  "/images/iphones/iphone-15-plus-vert.png",
    "bleu":  "/images/iphones/iphone-15-plus-bleu.png",
  },

  // ── iPhone 15 Pro — fichiers locaux ──────────────────────────────────────
  "iphone 15 pro": {
    default:        "/images/iphones/iphone-15-pro-titane-naturel.png",
    "titane naturel":"/images/iphones/iphone-15-pro-titane-naturel.png",
    "titane bleu":  "/images/iphones/iphone-15-pro-titane-bleu.png",
    "titane blanc": "/images/iphones/iphone-15-pro-titane-blanc.png",
    "titane noir":  "/images/iphones/iphone-15-pro-titane-noir.png",
  },

  // ── iPhone 15 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 15 pro max": {
    default:        "/images/iphones/iphone-15-pro-max-titane-naturel.png",
    "titane naturel":"/images/iphones/iphone-15-pro-max-titane-naturel.png",
    "titane bleu":  "/images/iphones/iphone-15-pro-max-titane-bleu.png",
    "titane blanc": "/images/iphones/iphone-15-pro-max-titane-blanc.png",
    "titane noir":  "/images/iphones/iphone-15-pro-max-titane-noir.png",
  },

  // ── iPhone 16 — fichiers locaux (sarcelle = "Vert jade", outremer = "Bleu outremer") ──
  "iphone 16": {
    default:        "/images/iphones/iphone-16-noir.png",
    "noir":         "/images/iphones/iphone-16-noir.png",
    "blanc":        "/images/iphones/iphone-16-blanc.png",
    "rose":         "/images/iphones/iphone-16-rose.png",
    "bleu outremer":"/images/iphones/iphone-16-outremer.png",
    "vert jade":    "/images/iphones/iphone-16-sarcelle.png",
  },

  // ── iPhone 16 Plus — fichiers locaux ─────────────────────────────────────
  "iphone 16 plus": {
    default:        "/images/iphones/iphone-16-plus-noir.png",
    "noir":         "/images/iphones/iphone-16-plus-noir.png",
    "blanc":        "/images/iphones/iphone-16-plus-blanc.png",
    "rose":         "/images/iphones/iphone-16-plus-rose.png",
    "bleu outremer":"/images/iphones/iphone-16-plus-outremer.png",
    "vert jade":    "/images/iphones/iphone-16-plus-sarcelle.png",
  },

  // ── iPhone 16 Pro — fichiers locaux ("Titane désert" → titane-desert) ────
  "iphone 16 pro": {
    default:        "/images/iphones/iphone-16-pro-titane-noir.png",
    "titane naturel":"/images/iphones/iphone-16-pro-titane-naturel.png",
    "titane blanc": "/images/iphones/iphone-16-pro-titane-blanc.png",
    "titane noir":  "/images/iphones/iphone-16-pro-titane-noir.png",
    "titane desert":"/images/iphones/iphone-16-pro-titane-desert.png",
  },

  // ── iPhone 16 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 16 pro max": {
    default:        "/images/iphones/iphone-16-pro-max-titane-noir.png",
    "titane naturel":"/images/iphones/iphone-16-pro-max-titane-naturel.png",
    "titane blanc": "/images/iphones/iphone-16-pro-max-titane-blanc.png",
    "titane noir":  "/images/iphones/iphone-16-pro-max-titane-noir.png",
    "titane desert":"/images/iphones/iphone-16-pro-max-titane-desert.png",
  },

  // ── iPhone 17 — fichiers locaux partiels ─────────────────────────────────
  "iphone 17": {
    default:   "/images/iphones/iphone-17-noir.png",
    "noir":    "/images/iphones/iphone-17-noir.png",
    "bleu ciel":"/images/iphones/iphone-17-bleu-brume.png",
    "rose":    "/images/iphones/iphone-17-lavande.png",
    "argent":  "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-white?wid=400&hei=400&fmt=jpeg",
  },

  // ── iPhone 17 Plus — CDN (pas de fichiers locaux) ────────────────────────
  "iphone 17 plus": {
    default: "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-black?wid=400&hei=400&fmt=jpeg",
    "noir":  "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-black?wid=400&hei=400&fmt=jpeg",
    "argent":"https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-finish-select-202409-6-7inch-white?wid=400&hei=400&fmt=jpeg",
  },

  // ── iPhone 17 Pro — fichiers locaux partiels ─────────────────────────────
  "iphone 17 pro": {
    default:         "/images/iphones/iphone-17-pro-orange-cosmique.png",
    "orange cosmique":"/images/iphones/iphone-17-pro-orange-cosmique.png",
    "bleu intense":  "/images/iphones/iphone-17-pro-bleu-profond.png",
    "argent": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-whitetitanium?wid=400&hei=400&fmt=jpeg",
  },

  // ── iPhone 17 Pro Max — fichiers locaux partiels ─────────────────────────
  "iphone 17 pro max": {
    default:         "/images/iphones/iphone-17-pro-max-orange-cosmique.png",
    "orange cosmique":"/images/iphones/iphone-17-pro-max-orange-cosmique.png",
    "argent": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-whitetitanium?wid=400&hei=400&fmt=jpeg",
    "bleu intense": "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blacktitanium?wid=400&hei=400&fmt=jpeg",
  },
}

export function getPhoneImage(modelName, colorName = null) {
  if (!modelName || typeof modelName !== 'string') return PLACEHOLDER

  const normalize = (str) => {
    if (!str || typeof str !== 'string') return ''
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
  }

  const key = normalize(modelName)

  let map = null
  for (const [k, v] of Object.entries(IMAGE_MAP)) {
    if (normalize(k) === key) { map = v; break }
  }

  if (!map) return PLACEHOLDER

  if (colorName && typeof colorName === 'string') {
    const colorKey = normalize(colorName)
    for (const [k, v] of Object.entries(map)) {
      if (normalize(k) === colorKey) return v
    }
  }

  return map.default || PLACEHOLDER
}

export { PLACEHOLDER }
