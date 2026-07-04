const PLACEHOLDER = "https://placehold.co/400x400/f5f5f5/999?text=iPhone"

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE_MAP — clé = nom modèle normalisé, valeur = { colorKey: imagePath }
// Règle : fichier local si disponible, sinon Apple CDN, sinon PLACEHOLDER
// ─────────────────────────────────────────────────────────────────────────────
const IMAGE_MAP = {

  // ── iPhone 7 — fichiers locaux ────────────────────────────────────────────
  "iphone 7": {
    default:   "/images/iphones/iphone-7-noir.png",
    "noir":    "/images/iphones/iphone-7-noir.png",
    "argent":  "/images/iphones/iphone-7-argent.png",
    "or":      "/images/iphones/iphone-7-or.png",
    "or rose": "/images/iphones/iphone-7-rose.png",
    "rouge":   "https://store.storeimages.cdn-apple.com/4668/as-images.apple.com/is/iphone7-red-select-2017?wid=400&hei=400&fmt=jpeg",
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

  // ── iPhone 16e — fichiers locaux ─────────────────────────────────────────
  "iphone 16e": {
    default: "/images/iphones/iphone-16e-noir.png",
    "noir":  "/images/iphones/iphone-16e-noir.png",
    "blanc": "/images/iphones/iphone-16e-blanc.png",
  },

  // ── iPhone 17 — fichiers locaux ──────────────────────────────────────────
  "iphone 17": {
    default:    "/images/iphones/iphone-17-noir.png",
    "noir":     "/images/iphones/iphone-17-noir.png",
    "bleu ciel":"/images/iphones/iphone-17-bleu-brume.png",
    "bleu":     "/images/iphones/iphone-17-bleu-brume.png",
    "rose":     "/images/iphones/iphone-17-lavande.png",
  },

  // ── iPhone 17e — fallback temporaire 16e en attendant les vrais visuels ──
  "iphone 17e": {
    default: "/images/iphones/iphone-16e-noir.png",
    "noir":  "/images/iphones/iphone-16e-noir.png",
    "blanc": "/images/iphones/iphone-16e-blanc.png",
    "rose":  "/images/iphones/iphone-16e-blanc.png",
  },

  // ── iPhone 17 Air — fichiers locaux iphone-air-*.png ─────────────────────
  "iphone 17 air": {
    default:   "/images/iphones/iphone-air-noir-cosmos.png",
    "noir":    "/images/iphones/iphone-air-noir-cosmos.png",
    "blanc":   "/images/iphones/iphone-air-blanc-nuage.png",
    "bleu":    "/images/iphones/iphone-air-bleu-ciel.png",
    "or":      "/images/iphones/iphone-air-or-clair.png",
    "rose":    "/images/iphones/iphone-air-blanc-nuage.png",
  },

  // ── iPhone 17 Pro — fichiers locaux ──────────────────────────────────────
  "iphone 17 pro": {
    default:          "/images/iphones/iphone-17-pro-orange-cosmique.png",
    "orange cosmique":"/images/iphones/iphone-17-pro-orange-cosmique.png",
    "bleu intense":   "/images/iphones/iphone-17-pro-bleu-profond.png",
    "argent":         "/images/iphones/iphone-17-pro-argent.png",
    "titane noir":    "/images/iphones/iphone-17-pro-orange-cosmique.png",
  },

  // ── iPhone 17 Pro Max — fichiers locaux ──────────────────────────────────
  "iphone 17 pro max": {
    default:          "/images/iphones/iphone-17-pro-max-orange-cosmique.png",
    "orange cosmique":"/images/iphones/iphone-17-pro-max-orange-cosmique.png",
    "argent":         "/images/iphones/iphone-17-pro-max-argent.png",
    "bleu intense":   "/images/iphones/iphone-17-pro-max-bleu-profond.png",
    "titane noir":    "/images/iphones/iphone-17-pro-max-orange-cosmique.png",
  },

  // ── MacBook Air M4 — fichiers locaux ─────────────────────────────────────
  "macbook air m4": {
    default:       "/images/macs/macbook-air-m4-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m4-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m4-argent.png",
    "or":          "/images/macs/macbook-air-m4-or.png",
    "minuit":      "/images/macs/macbook-air-m4-minuit.png",
  },

  // ── MacBook Air M3 — fichiers locaux ─────────────────────────────────────
  "macbook air m3": {
    default:       "/images/macs/macbook-air-m3-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m3-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m3-argent.png",
    "or":          "/images/macs/macbook-air-m3-or.png",
    "minuit":      "/images/macs/macbook-air-m3-minuit.png",
  },

  // ── MacBook Air 13" M4 ──────────────────────────────────────────────────
  "macbook air 13 m4": {
    default:       "/images/macs/macbook-air-m4-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m4-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m4-argent.png",
    "or":          "/images/macs/macbook-air-m4-or.png",
    "minuit":      "/images/macs/macbook-air-m4-minuit.png",
  },

  // ── MacBook Air 15" M4 ──────────────────────────────────────────────────
  "macbook air 15 m4": {
    default:       "/images/macs/macbook-air-m4-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m4-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m4-argent.png",
    "or":          "/images/macs/macbook-air-m4-or.png",
    "minuit":      "/images/macs/macbook-air-m4-minuit.png",
  },

  // ── MacBook Air 13" M3 ──────────────────────────────────────────────────
  "macbook air 13 m3": {
    default:       "/images/macs/macbook-air-m3-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m3-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m3-argent.png",
    "or":          "/images/macs/macbook-air-m3-or.png",
    "minuit":      "/images/macs/macbook-air-m3-minuit.png",
  },

  // ── MacBook Air 15" M3 ──────────────────────────────────────────────────
  "macbook air 15 m3": {
    default:       "/images/macs/macbook-air-m3-gris-sideral.png",
    "gris sideral":"/images/macs/macbook-air-m3-gris-sideral.png",
    "argent":      "/images/macs/macbook-air-m3-argent.png",
    "or":          "/images/macs/macbook-air-m3-or.png",
    "minuit":      "/images/macs/macbook-air-m3-minuit.png",
  },

  // ── iPADS ───────────────────────────────────────────────────────────────
  "ipad 11": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-finish-select-202503-blue?wid=5120&hei=2880&fmt=webp&qlt=90&.v=aHYyeWZ6TVBzTWw5WlZ2bFJCZno2cjdIcnY1QlRYMFlvWlhuNHdTVUZQS1Z4L0VZT3V2TzUvUTBrMmhIQlZsS3lPWjFvdU5EZVdwUnRCZ2RHSDBFS3NRZ2ZhNWVISml5WG1SY0E5S0hPaFoyUXQrc1F4VFIwcWJZNzNTUVpwSTY&traceId=1",
    "bleu": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-finish-select-202503-blue?wid=5120&hei=2880&fmt=webp&qlt=90&.v=aHYyeWZ6TVBzTWw5WlZ2bFJCZno2cjdIcnY1QlRYMFlvWlhuNHdTVUZQS1Z4L0VZT3V2TzUvUTBrMmhIQlZsS3lPWjFvdU5EZVdwUnRCZ2RHSDBFS3NRZ2ZhNWVISml5WG1SY0E5S0hPaFoyUXQrc1F4VFIwcWJZNzNTUVpwSTY&traceId=1",
  },
  "ipad air 11": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-air-finish-select-gallery-202405-11inch-space-gray?wid=5120&hei=2880&fmt=webp&qlt=90&.v=SzlUeW5ITUpKK1FKdDdNS0xNUVhmM3hxSU9Rc1hENld5ZlZGbisxZU9hWHRiNzVnbmkvN1ZZYkRMenpIV2Q5emdCOVI4SUNZWW56UDRQN0hkK2RSSEFDb1F2RTNvUEVHRkpGaGtOSVFHak5ZWG1Bb2Y1bnlJNll0dFBJUmxDYUcrUjFWME04VFo1RjFVZk82TGFEcklB&traceId=1",
    "gris sideral": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-air-finish-select-gallery-202405-11inch-space-gray?wid=5120&hei=2880&fmt=webp&qlt=90&.v=SzlUeW5ITUpKK1FKdDdNS0xNUVhmM3hxSU9Rc1hENld5ZlZGbisxZU9hWHRiNzVnbmkvN1ZZYkRMenpIV2Q5emdCOVI4SUNZWW56UDRQN0hkK2RSSEFDb1F2RTNvUEVHRkpGaGtOSVFHak5ZWG1Bb2Y1bnlJNll0dFBJUmxDYUcrUjFWME04VFo1RjFVZk82TGFEcklB&traceId=1",
  },
  "ipad pro 11": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-11inch-silver?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUJLNkVlVkZpVE5VcEU5RHJDbXpCOXF2TWlpSzUzejRCZGt2SjJUNGl1VEE4bm1RcmlWRWp2eDN1WHNkSjNmUmEvQ0hVc0dNMTRHeWE3dDZOT0ZZVDk&traceId=1",
    "argent": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-11inch-silver?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUJLNkVlVkZpVE5VcEU5RHJDbXpCOXF2TWlpSzUzejRCZGt2SjJUNGl1VEE4bm1RcmlWRWp2eDN1WHNkSjNmUmEvQ0hVc0dNMTRHeWE3dDZOT0ZZVDk&traceId=1",
    "noir sideral": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-11inch-spaceblack?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUFkTVhEZDlmdGh2cFlYWEZ5TmhXMlpGQnBBWVp4a3ZSd0Y4NzlDUVE4dUoyTGQvczVjTzVnd1B6UVQwaE1kY2pTL29BZENSMUorTENnaisrZ2Q1V2I1SmdseVdkemNCYWFjKzF3OGpkUDFB&traceId=1",
  },
  "ipad pro 13": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-13inch-spaceblack?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNDByMHhIZkdBbFEwRFROUE9ubkFjT0FkTVhEZDlmdGh2cFlYWEZ5TmhXMlpGQnBBWVp4a3ZSd0Y4NzlDUVE0dUoyTGQvczVjTzVnd1B6UVQwaE1kY2ltdVdwbG5WMFRSbXYxQVhPWGZnNzlPSWh1UVhJRldSUVRIMWxicWhmRG1R&traceId=1",
    "noir sideral": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-13inch-spaceblack?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNDByMHhIZkdBbFEwRFROUE9ubkFjT0FkTVhEZDlmdGh2cFlYWEZ5TmhXMlpGQnBBWVp4a3ZSd0Y4NzlDUVE0dUoyTGQvczVjTzVnd1B6UVQwaE1kY2ltdVdwbG5WMFRSbXYxQVhPWGZnNzlPSWh1UVhJRldSUVRIMWxicWhmRG1R&traceId=1",
    "argent": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-13inch-silver?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUJLNkVlVkZpVE5VcEU5RHJDbXpCOXF2TWlpSzUzejRCZGt2SjJUNGl1VEE4bm1RcmlWRWp2eDN1WHNkSjNmUmEvQ0hVc0dNMTRHeWE3dDZOT0ZZVDk&traceId=1",
  },
  "ipad pro 11 m5": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-11inch-spaceblack?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUFkTVhEZDlmdGh2cFlYWEZ5TmhXMlpGQnBBWVp4a3ZSd0Y4NzlDUVE4dUoyTGQvczVjTzVnd1B6UVQwaE1kY2pTL29BZENSMUorTENnaisrZ2Q1V2I1SmdseVdkemNCYWFjKzF3OGpkUDFB&traceId=1",
    "noir sideral": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-pro-finish-select-202405-11inch-spaceblack?wid=5120&hei=2880&fmt=webp&qlt=90&.v=YXpaUEtKWGhlNnNrVGZkTEo4T0xsNEsrMGFueUl5dllOTm9xWTIwTHNieUFkTVhEZDlmdGh2cFlYWEZ5TmhXMlpGQnBBWVp4a3ZSd0Y4NzlDUVE4dUoyTGQvczVjTzVnd1B6UVQwaE1kY2pTL29BZENSMUorTENnaisrZ2Q1V2I1SmdseVdkemNCYWFjKzF3OGpkUDFB&traceId=1",
  },
  "ipad 7e generation": {
    default: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111911_sp807-ipad-7th-gen.png",
    "argent": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111911_sp807-ipad-7th-gen.png",
  },
  "ipad 6e generation": {
    default: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111957_sp774-ipad-6-gen.png",
    "argent": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111957_sp774-ipad-6-gen.png",
  },
  "ipad air 2": {
    default: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/112017_SP708-gold.jpeg",
    "or": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/112017_SP708-gold.jpeg",
    "argent": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/112017_SP708-gold.jpeg",
    "gris sideral": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/112017_SP708-gold.jpeg",
  },
  "ipad air 2 + cellular": {
    default:       "/images/ipads/ipad-air-2-argent.png",
    "argent":      "/images/ipads/ipad-air-2-argent.png",
    "or":          "/images/ipads/ipad-air-2-or.png",
    "gris sideral":"/images/ipads/ipad-air-2-gris-sideral.png",
  },
  "ipad 3": {
    default: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111904_ipad-air-2019.jpg",
    "argent": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111904_ipad-air-2019.jpg",
  },

  // ── AirPODS ─────────────────────────────────────────────────────────────
  "airpods 3": {
    default: "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111863_airpods-3rdgen-2.png",
    "blanc": "https://cdsassets.apple.com/live/SZLF0YNV/images/sp/111863_airpods-3rdgen-2.png",
  },
  "airpods 4": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-4-select-202409_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=WnVKRVRUTFVsYThXaWkydWViL1Q3ZDZGTE9TV3RDcGJJclBqdUtzdTJYYjNHc3NlSmU2dzJyR1kxZEwyTE1neUJkRlpCNVhYU3AwTldRQldlSnpRa0NZZXAxWFNjRXhITDI1RVE5YVpyU0E",
    "blanc": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-4-select-202409_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=WnVKRVRUTFVsYThXaWkydWViL1Q3ZDZGTE9TV3RDcGJJclBqdUtzdTJYYjNHc3NlSmU2dzJyR1kxZEwyTE1neUJkRlpCNVhYU3AwTldRQldlSnpRa0NZZXAxWFNjRXhITDI1RVE5YVpyU0E",
  },
  "airpods 4 anc": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-4-anc-select-202409_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=Qklmb1JJend3cVIxSUxIeFBIRk96cUNGMHVRUVpqOEFiUFU0R0xNRVFxdkhJa2hkRmxkTlJIMk9SdFNSaWFNODE1UUxLT2t0cW42N3FvQzVqaGhrVVcvdmFyQU52eG9rbk9Lb1pmQWN1MGgrYWpGdS9XeFgvbS9ITnNYOEhYaG4",
    "blanc": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-4-anc-select-202409_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=Qklmb1JJend3cVIxSUxIeFBIRk96cUNGMHVRUVpqOEFiUFU0R0xNRVFxdkhJa2hkRmxkTlJIMk9SdFNSaWFNODE1UUxLT2t0cW42N3FvQzVqaGhrVVcvdmFyQU52eG9rbk9Lb1pmQWN1MGgrYWpGdS9XeFgvbS9ITnNYOEhYaG4",
  },
  "airpods pro 2": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-pro-3-hero-select-202509?wid=976&hei=916&fmt=jpeg&qlt=90&.v=cmp4MmZ6OWxOeHNNTXh4SzlBNUpEb1RucE9zZTI5eEREaWZpY29lSld3eWVDYXovZDMyN1dXU211bjZoVlVUcWJGcXNRQnFCV0w3WVRjTExvdm1ic1YxRUxFRmRlWDBITzhnRmZ5OTRmaVdKTExiOEFsRmxtQ2Nua0tRSC83MkI",
    "blanc": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-pro-3-hero-select-202509?wid=976&hei=916&fmt=jpeg&qlt=90&.v=cmp4MmZ6OWxOeHNNTXh4SzlBNUpEb1RucE9zZTI5eEREaWZpY29lSld3eWVDYXovZDMyN1dXU211bjZoVlVUcWJGcXNRQnFCV0w3WVRjTExvdm1ic1YxRUxFRmRlWDBITzhnRmZ5OTRmaVdKTExiOEFsRmxtQ2Nua0tRSC83MkI",
  },
  "airpods pro 3": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-pro-3-hero-select-202509?wid=976&hei=916&fmt=jpeg&qlt=90&.v=cmp4MmZ6OWxOeHNNTXh4SzlBNUpEb1RucE9zZTI5eEREaWZpY29lSld3eWVDYXovZDMyN1dXU211bjZoVlVUcWJGcXNRQnFCV0w3WVRjTExvdm1ic1YxRUxFRmRlWDBITzhnRmZ5OTRmaVdKTExiOEFsRmxtQ2Nua0tRSC83MkI",
    "blanc": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-pro-3-hero-select-202509?wid=976&hei=916&fmt=jpeg&qlt=90&.v=cmp4MmZ6OWxOeHNNTXh4SzlBNUpEb1RucE9zZTI5eEREaWZpY29lSld3eWVDYXovZDMyN1dXU211bjZoVlVUcWJGcXNRQnFCV0w3WVRjTExvdm1ic1YxRUxFRmRlWDBITzhnRmZ5OTRmaVdKTExiOEFsRmxtQ2Nua0tRSC83MkI",
  },
  "airpods max": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
    "lumiere stellaire": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
    "minuit": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
    "bleu": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
    "violet": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
    "orange": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/airpods-max-select-202409-midnight_FV1?wid=976&hei=916&fmt=jpeg&qlt=90&.v=azQxRkVJKzd6V3J0aGNqWFhLMzBmdmVWNWdHYnp5cHkwMldsSElEOHpyd0cyWGRFNFZ5QTk3bFlteis2Q2NNaWpENFdPQTN0TWQ4ejhtTWxrUHVDeElGZGV2eWhZaEljUzNSeDlxcDVuWGszbTFldUtUQzN0ellEWHZ3UUFYSS8",
  },

  // ── APPLE WATCH ─────────────────────────────────────────────────────────
  "apple watch se 3": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/se-case-size-select-202509-midnight-40mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=S0ZpY0dROXo2U0dDeTlxWXM0bXUycjBvakh1aHZuL3FLK09FcWhjUzhyVXBTWHRqQXAxMUZ6VkVsSloyUktPMXpvSEo2UzBKSm5BUmFETEIwa1Jzd1BXdlJRYjdSZWJHVUh4aFVDb0hhVVVBekpGN1FPM1VpemRHM1FDeGhkc24",
    "minuit": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/se-case-size-select-202509-midnight-40mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=S0ZpY0dROXo2U0dDeTlxWXM0bXUycjBvakh1aHZuL3FLK09FcWhjUzhyVXBTWHRqQXAxMUZ6VkVsSloyUktPMXpvSEo2UzBKSm5BUmFETEIwa1Jzd1BXdlJRYjdSZWJHVUh4aFVDb0hhVVVBekpGN1FPM1VpemRHM1FDeGhkc24",
    "lumiere stellaire": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/se-case-size-select-202509-midnight-40mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=S0ZpY0dROXo2U0dDeTlxWXM0bXUycjBvakh1aHZuL3FLK09FcWhjUzhyVXBTWHRqQXAxMUZ6VkVsSloyUktPMXpvSEo2UzBKSm5BUmFETEIwa1Jzd1BXdlJRYjdSZWJHVUh4aFVDb0hhVVVBekpGN1FPM1VpemRHM1FDeGhkc24",
    "argent": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/se-case-size-select-202509-midnight-40mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=S0ZpY0dROXo2U0dDeTlxWXM0bXUycjBvakh1aHZuL3FLK09FcWhjUzhyVXBTWHRqQXAxMUZ6VkVsSloyUktPMXpvSEo2UzBKSm5BUmFETEIwa1Jzd1BXdlJRYjdSZWJHVUh4aFVDb0hhVVVBekpGN1FPM1VpemRHM1FDeGhkc24",
  },
  "apple watch series 11 42mm": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s11-case-size-select-202509-aluminum-jet-black-42mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=UFd5c0w0Q1h4Zlp0b0lmaDI3Q0E3ZFQ1R3hUZGRwcVR2alVFTjJibjJkRVdFeEtkd2lBUEtxWldFZTNXeGFkVVU0ZHFaSW5XTXJ0SWJGUmV5V3pIUW54TS9QOFlhVHZoV2xFZjU3V3B4aXV6MGt0Wjd5K3AzM2lLbkJRNlNHWm1ISUg0OGxZRUZZN1ROY3ZDeUZ5dFVR",
    "noir": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s11-case-size-select-202509-aluminum-jet-black-42mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=UFd5c0w0Q1h4Zlp0b0lmaDI3Q0E3ZFQ1R3hUZGRwcVR2alVFTjJibjJkRVdFeEtkd2lBUEtxWldFZTNXeGFkVVU0ZHFaSW5XTXJ0SWJGUmV5V3pIUW54TS9QOFlhVHZoV2xFZjU3V3B4aXV6MGt0Wjd5K3AzM2lLbkJRNlNHWm1ISUg0OGxZRUZZN1ROY3ZDeUZ5dFVR",
  },
  "apple watch series 11 46mm": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s11-case-size-select-202509-aluminum-jet-black-46mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=UFd5c0w0Q1h4Zlp0b0lmaDI3Q0E3ZFQ1R3hUZGRwcVR2alVFTjJibjJkRVdFeEtkd2lBUEtxWldFZTNXeGFkVXpLaG5vK3dJZXFBTTZ0d05aVlpoUVh4TS9QOFlhVHZoV2xFZjU3V3B4aXV6MGt0Wjd5K3AzM2lLbkJRNlNHWm03a3QzeWdWTlIvUnZnODJzZW53Z0ZR",
    "noir": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/s11-case-size-select-202509-aluminum-jet-black-46mm?wid=5120&hei=3280&fmt=p-jpg&qlt=80&.v=UFd5c0w0Q1h4Zlp0b0lmaDI3Q0E3ZFQ1R3hUZGRwcVR2alVFTjJibjJkRVdFeEtkd2lBUEtxWldFZTNXeGFkVXpLaG5vK3dJZXFBTTZ0d05aVlpoUVh4TS9QOFlhVHZoV2xFZjU3V3B4aXV6MGt0Wjd5K3AzM2lLbkJRNlNHWm03a3QzeWdWTlIvUnZnODJzZW53Z0ZR",
  },
  "apple watch ultra 3": {
    default: "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MYPD3ref_VW_PF+watch-case-49-titanium-black-ultra3_VW_PF+watch-face-49-ocean-ultra3_VW_PF?wid=5120&hei=3280&bgc=fafafa&trim=1&fmt=p-jpg&qlt=80&.v=S3FLWkZyMGRrZDlwU1BOTmJwcHJYRm1IN3VzMk1RRVk0dFdXMjgyTlo1NXFTWHJCR3FSb1VlOHBrc2tSM1pwQ1N0aFFqWGVmNnNHZW1DcGxyVUR5WTEwRGhLeG1XWk04UENwdVBBQnI4SVhzc1NPS2R0ZktuREx6cStIRjJwQjFrYTl2ZFJTUEpaRjZqdkJhWWEwblV5bmJVazJMS2NZeDNpd3p6WnVuWUthMkxNZkh4MDB4dUpVaFAyTU5LMk1GVGdVbWxFQXYxektET004MmZRaG9sQQ",
    "titane noir": "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/MYPD3ref_VW_PF+watch-case-49-titanium-black-ultra3_VW_PF+watch-face-49-ocean-ultra3_VW_PF?wid=5120&hei=3280&bgc=fafafa&trim=1&fmt=p-jpg&qlt=80&.v=S3FLWkZyMGRrZDlwU1BOTmJwcHJYRm1IN3VzMk1RRVk0dFdXMjgyTlo1NXFTWHJCR3FSb1VlOHBrc2tSM1pwQ1N0aFFqWGVmNnNHZW1DcGxyVUR5WTEwRGhLeG1XWk04UENwdVBBQnI4SVhzc1NPS2R0ZktuREx6cStIRjJwQjFrYTl2ZFJTUEpaRjZqdkJhWWEwblV5bmJVazJMS2NZeDNpd3p6WnVuWUthMkxNZkh4MDB4dUpVaFAyTU5LMk1GVGdVbWxFQXYxektET004MmZRaG9sQQ",
  },
}

// Variantes de couleurs (FR + EN) pour fallback intelligent quand
// la couleur exacte n'est pas dans l'IMAGE_MAP d'un mod\u00e8le.
const COLOR_VARIANTS = {
  'noir':           ['black', 'noir', 'midnight', 'minuit', 'graphite', 'noir spatial', 'noir cosmos', 'noir de jais', 'gris sideral'],
  'blanc':          ['white', 'blanc', 'starlight', 'lumiere stellaire', 'silver', 'argent', 'titane blanc', 'titane naturel'],
  'bleu':           ['blue', 'bleu', 'pacific', 'alpine', 'alpin', 'azur', 'outremer', 'ciel', 'brume', 'titane bleu'],
  'vert':           ['green', 'vert', 'jade', 'olive', 'cyprus', 'sarcelle', 'vert alpin', 'vert nuit'],
  'rose':           ['pink', 'rose', 'coral', 'corail', 'lavande', 'or rose'],
  'rouge':          ['red', 'rouge', 'product red'],
  'violet':         ['purple', 'violet', 'ultraviolet', 'deep purple', 'violet intense'],
  'or':             ['gold', 'or', 'yellow', 'jaune'],
  'titane naturel': ['natural titanium', 'titane naturel'],
  'titane blanc':   ['white titanium', 'titane blanc'],
  'titane noir':    ['black titanium', 'titane noir'],
  'titane desert':  ['desert titanium', 'titane desert', 'titane du desert'],
}

export function getPhoneImage(modelName, colorName = null) {
  if (!modelName || typeof modelName !== 'string') return PLACEHOLDER

  const normalize = (str) => {
    if (!str || typeof str !== 'string') return ''
    return str
      .toLowerCase()
      .replace(/^apple\s+/i, '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['"]/g, '')
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

    // 1. match exact normalis\u00e9
    for (const [k, v] of Object.entries(map)) {
      if (normalize(k) === colorKey) return v
    }

    // 2. match par variantes (FR/EN aliases) : trouve la famille de couleur
    // (ex. 'white' / 'blanc' / 'starlight' partagent la m\u00eame famille 'blanc')
    let family = null
    for (const [canonical, variants] of Object.entries(COLOR_VARIANTS)) {
      if (variants.some((v) => colorKey.includes(v) || v.includes(colorKey))) {
        family = { canonical, variants }
        break
      }
    }
    if (family) {
      const candidates = [family.canonical, ...family.variants]
      for (const candidate of candidates) {
        for (const [k, v] of Object.entries(map)) {
          const nk = normalize(k)
          if (nk === candidate || nk.includes(candidate) || candidate.includes(nk)) {
            return v
          }
        }
      }
    }
  }

  return map.default || PLACEHOLDER
}

// Ordre générationnel officiel Apple pour le tri public et admin
export const IPHONE_ORDER = [
  'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
  'iPhone 7', 'iPhone 7 Plus',
  'iPhone 8', 'iPhone 8 Plus',
  'iPhone SE (2020)', 'iPhone SE (2022)',
  'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
  'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
  'iPhone 12', 'iPhone 12 mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
  'iPhone 13', 'iPhone 13 mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
  'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
  'iPhone 16e', 'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
  'iPhone 17e', 'iPhone 17', 'iPhone 17 Air', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
]

export function getPublicModelIndex(modelName) {
  const clean = (modelName || '')
    .replace(/^Apple\s+/i, '')
    .toLowerCase()
    .trim()
  const idx = IPHONE_ORDER.findIndex((m) =>
    m.toLowerCase() === clean || clean.includes(m.toLowerCase())
  )
  return idx === -1 ? 999 : idx
}

export { PLACEHOLDER, IMAGE_MAP }
