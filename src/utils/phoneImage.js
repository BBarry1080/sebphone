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
    "rouge":   "/images/iphones/iphone-7-rouge.png",
  },

  // ── iPhone 7 Plus — fichiers locaux ───────────────────────────────────────
  "iphone 7 plus": {
    default:        "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "noir":         "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "noir de jais": "/images/iphones/iphone-7-plus-noir-de-jais.png",
    "argent":       "/images/iphones/iphone-7-plus-argent.png",
    "or":           "/images/iphones/iphone-7-plus-or.png",
    "or rose":      "/images/iphones/iphone-7-plus-or-rose.png",
    "rouge":        "/images/iphones/iphone-7-plus-noir-de-jais.png",
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
    "or":          "/images/iphones/iphone-11-pro-max-argent.png",
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
    default: "/images/ipads/ipad-11-default.webp",
    "bleu": "/images/ipads/ipad-11-bleu.webp",
  },
  "ipad air 11": {
    default: "/images/ipads/ipad-air-11-default.webp",
    "gris sideral": "/images/ipads/ipad-air-11-gris-sideral.webp",
  },
  "ipad pro 11": {
    default: "/images/ipads/ipad-pro-11-default.webp",
    "argent": "/images/ipads/ipad-pro-11-argent.webp",
    "noir sideral": "/images/ipads/ipad-pro-11-noir-sideral.webp",
  },
  "ipad pro 13": {
    default: "/images/ipads/ipad-pro-13-default.webp",
    "argent": "/images/ipads/ipad-pro-13-argent.webp",
    "noir sideral": "/images/ipads/ipad-pro-13-default.webp",
  },
  "ipad pro 11 m5": {
    default: "/images/ipads/ipad-pro-11-m5-default.webp",
    "noir sideral": "/images/ipads/ipad-pro-11-m5-noir-sideral.webp",
  },
  "ipad 7e generation": {
    default: "/images/ipads/ipad-7e-generation-default.png",
    "argent": "/images/ipads/ipad-7e-generation-argent.png",
  },
  "ipad 6e generation": {
    default: "/images/ipads/ipad-6e-generation-default.png",
    "argent": "/images/ipads/ipad-6e-generation-argent.png",
  },
  "ipad air 2": {
    default: "/images/ipads/ipad-air-2-default.jpg",
    "or": "/images/ipads/ipad-air-2-or.jpg",
    "argent": "/images/ipads/ipad-air-2-argent.jpg",
    "gris sideral": "/images/ipads/ipad-air-2-gris-sideral.jpg",
  },
  "ipad air 2 + cellular": {
    default:       "/images/ipads/ipad-air-2-argent.png",
    "argent":      "/images/ipads/ipad-air-2-argent.png",
    "or":          "/images/ipads/ipad-air-2-or.png",
    "gris sideral":"/images/ipads/ipad-air-2-gris-sideral.png",
  },
  "ipad 3": {
    default: "/images/ipads/ipad-3-default.png",
    "argent": "/images/ipads/ipad-3-argent.png",
  },

  // ── AirPODS ─────────────────────────────────────────────────────────────
  "airpods 3": {
    default: "/images/airpods/airpods-3-default.png",
    "blanc": "/images/airpods/airpods-3-blanc.png",
  },
  "airpods 4": {
    default: "/images/airpods/airpods-4-default.jpg",
    "blanc": "/images/airpods/airpods-4-blanc.jpg",
  },
  "airpods 4 anc": {
    default: "/images/airpods/airpods-4-anc-default.jpg",
    "blanc": "/images/airpods/airpods-4-anc-blanc.jpg",
  },
  "airpods pro 2": {
    default: "/images/airpods/airpods-pro-2-default.jpg",
    "blanc": "/images/airpods/airpods-pro-2-blanc.jpg",
  },
  "airpods pro 3": {
    default: "/images/airpods/airpods-pro-3-default.jpg",
    "blanc": "/images/airpods/airpods-pro-3-blanc.jpg",
  },
  "airpods max": {
    default: "/images/airpods/airpods-max-default.jpg",
    "minuit": "/images/airpods/airpods-max-minuit.jpg",
    "lumiere stellaire": "/images/airpods/airpods-max-lumiere-stellaire.jpg",
    "bleu": "/images/airpods/airpods-max-bleu.jpg",
    "violet": "/images/airpods/airpods-max-violet.jpg",
    "orange": "/images/airpods/airpods-max-orange.jpg",
  },

  // ── APPLE WATCH ─────────────────────────────────────────────────────────
  "apple watch se 3": {
    default: "/images/watch/apple-watch-se-3-default.png",
    "minuit": "/images/watch/apple-watch-se-3-minuit.png",
    "lumiere stellaire": "/images/watch/apple-watch-se-3-lumiere-stellaire.png",
    "argent": "/images/watch/apple-watch-se-3-argent.png",
  },
  "apple watch series 11 42mm": {
    default: "/images/watch/apple-watch-series-11-42mm-default.png",
    "noir": "/images/watch/apple-watch-series-11-42mm-noir.png",
  },
  "apple watch series 11 46mm": {
    default: "/images/watch/apple-watch-series-11-46mm-default.png",
    "noir": "/images/watch/apple-watch-series-11-46mm-noir.png",
  },
  "apple watch ultra 3": {
    default: "/images/watch/apple-watch-ultra-3-default.png",
    "titane noir": "/images/watch/apple-watch-ultra-3-titane-noir.png",
  },

  // ── SAMSUNG — URLs officielles/CDN ───────────────────────────────────────
  "samsung galaxy s21": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_GRIS_ALL_8592.webp",
    "gris": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_GRIS_ALL_8592.webp",
  },
  "samsung galaxy s21+": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21PLUS_WHITE_ALL_713e.webp",
    "blanc": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21PLUS_WHITE_ALL_713e.webp",
  },
  "samsung galaxy s21 ultra": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_ULTRA_BLEU_ALL_a676.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_ULTRA_BLEU_ALL_a676.webp",
  },
  "samsung galaxy s21 fe": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_FE_5G_GREEN_ALL_56fb.webp",
    "vert": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S21_FE_5G_GREEN_ALL_56fb.webp",
  },
  "samsung galaxy s22": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_VERT_ALL_95a1.webp",
    "vert": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_VERT_ALL_95a1.webp",
  },
  "samsung galaxy s22+": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_PLUS_ROSE_ALL_d6b8.webp",
    "rose": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_PLUS_ROSE_ALL_d6b8.webp",
  },
  "samsung galaxy s22 ultra": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_ULTRA_MARRON_ALL_8962.webp",
    "marron": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S22_ULTRA_MARRON_ALL_8962.webp",
  },
  "samsung galaxy s23": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_WHITE_ALL_911c.webp",
    "blanc": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_WHITE_ALL_911c.webp",
  },
  "samsung galaxy s23+": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_PLUS_VIOLET_ALL_d8ce.webp",
    "violet": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_PLUS_VIOLET_ALL_d8ce.webp",
  },
  "samsung galaxy s23 ultra": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_ULTRA_GREY_ALL_597a.webp",
    "gris": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_S23_ULTRA_GREY_ALL_597a.webp",
  },
  "samsung galaxy s23 fe": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/a/f/africa_fr_galaxy_s23_fe_s711_sm_s711blgcafa_538426379_4dab.webp",
  },
  "samsung galaxy s24": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/2401/gallery/be-galaxy-s24-sm-s921bzageub-539429801?imbypass=true",
  },
  "samsung galaxy s24+": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/2401/gallery/be-galaxy-s24-sm-s921bzkgeub-539429847?imbypass=true",
  },
  "samsung galaxy s24 ultra": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_S24_Ultra_gris_1_0dd0.webp",
    "gris": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_S24_Ultra_gris_1_0dd0.webp",
  },
  "samsung galaxy s24 fe": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/S/a/Samsung_S24_FE_gris_All_d140.webp",
    "gris": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/S/a/Samsung_S24_FE_gris_All_d140.webp",
  },
  "samsung galaxy s25": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/2501/gallery/be-galaxy-s25-s931-534299-sm-s931bzkgeub-544692880?imbypass=true",
  },
  "samsung galaxy s25+": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/2501/gallery/be-galaxy-s25-s936-sm-s936bdbdeub-544684226?imbypass=true",
  },
  "samsung galaxy s25 ultra": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/2501/gallery/be-galaxy-s25-s938-sm-s938bztgeub-544722123?imbypass=true",
  },
  "samsung galaxy s25 edge": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/ps_2504/gallery/be-galaxy-s25-s937-sm-s937blbgeub-546081908?imbypass=true",
  },
  "samsung galaxy s26": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/s2602/gallery/be-galaxy-s26-s942-sm-s942bzvheub-550903856?imbypass=true",
  },
  "samsung galaxy s26+": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/s2602/gallery/be-galaxy-s26-s947-sm-s947blbgeub-550931670?imbypass=true",
  },
  "samsung galaxy s26 ultra": {
    default: "https://images.samsung.com/is/image/samsung/p6pim/be/s2602/gallery/be-galaxy-s26-ultra-s948-sm-s948bzwgeub-550857037?imbypass=true",
  },
  "samsung galaxy a14": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A14_Duos_noir_all_1e9a.webp",
    "noir": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A14_Duos_noir_all_1e9a.webp",
  },
  "samsung galaxy a15": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A15_bleu_clair_all_5e3f.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A15_bleu_clair_all_5e3f.webp",
  },
  "samsung galaxy a25": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A25_noir_all_bceb.webp",
    "noir": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A25_noir_all_bceb.webp",
  },
  "samsung galaxy a34": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A34_5G_Duos_blanc_all_1858.webp",
    "blanc": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A34_5G_Duos_blanc_all_1858.webp",
  },
  "samsung galaxy a35": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A35_bleu_all_01f0.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A35_bleu_all_01f0.webp",
  },
  "samsung galaxy a54": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/A/5/A54___BLACK___ALL_fcef.webp",
    "noir": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/A/5/A54___BLACK___ALL_fcef.webp",
  },
  "samsung galaxy a55": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A55_bleu_clair_all_ccd7.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_A55_bleu_clair_all_ccd7.webp",
  },
  "samsung galaxy z flip 3": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FLIP_3_GREEN_ALL_2280.webp",
    "vert": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FLIP_3_GREEN_ALL_2280.webp",
  },
  "samsung galaxy z flip 4": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FLIP_4_BLEU_ALL_2e86.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FLIP_4_BLEU_ALL_2e86.webp",
  },
  "samsung galaxy z flip 5": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/f/r/fr_galaxy_z_flip5_f731_sm_f731bzaheub_537308940_2f2b.webp",
  },
  "samsung galaxy z flip 6": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/GalaxyZFlip6_Bleu_all_3970.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/GalaxyZFlip6_Bleu_all_3970.webp",
  },
  "samsung galaxy z fold 3": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FOLD_3_GREEN_ALL_dfdf.webp",
    "vert": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_Z_FOLD_3_GREEN_ALL_dfdf.webp",
  },
  "samsung galaxy z fold 4": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_FOLD4_WHITE_ALL_dec7.webp",
    "blanc": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/A/GALAXY_FOLD4_WHITE_ALL_dec7.webp",
  },
  "samsung galaxy z fold 5": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/f/r/fr_galaxy_z_fold5_f946_sm_f946bzkbeub_537292657_6f59.webp",
  },
  "samsung galaxy z fold 6": {
    default: "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_Z_Fold6_BLUE___BACK_4e1e.webp",
    "bleu": "https://dphtbnmpp0f6d.cloudfront.net/media/catalog/product/cache/b40488bd01a4e3ef64104ffa50fb0b7d/G/a/Galaxy_Z_Fold6_BLUE___BACK_4e1e.webp",
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
