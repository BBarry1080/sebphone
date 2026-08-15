// Types de pièce du catalogue de réparation (table reparation_ecrans.type_piece).
// Partagé entre StockMagasin.jsx et PiecesNavigator.jsx.
export const TYPES_PIECE = [
  { id: 'ecran', label: 'Écran', aQualite: true },
  { id: 'carte_mere', label: 'Carte mère', aQualite: false },
  { id: 'port_chargement', label: 'Port de chargement', aQualite: false },
  { id: 'vitre_arriere', label: 'Vitre arrière', aQualite: false },
  { id: 'batterie', label: 'Batterie', aQualite: false },
  { id: 'camera_lens', label: 'Caméra lentille', aQualite: false },
  { id: 'camera_avant', label: 'Caméra avant', aQualite: false },
  { id: 'camera_arriere', label: 'Caméra arrière', aQualite: false },
  { id: 'boutons', label: 'Boutons', aQualite: false },
  { id: 'baffle_haut', label: 'Baffle du haut', aQualite: false },
  { id: 'baffle_bas', label: 'Baffle du bas', aQualite: false },
  { id: 'micro', label: 'Micro', aQualite: false },
  { id: 'chassis', label: 'Châssis', aQualite: false },
  { id: 'capteur_flex', label: 'Capteur flex', aQualite: false },
]

// Qualités d'une pièce : libellé + couleur du badge, au même endroit
// pour éviter que les deux se désynchronisent d'un écran à l'autre.
export const QUALITES = {
  compatible:          { label: 'Compatible',       badge: 'bg-amber-50 text-amber-700' },
  original_equivalent: { label: 'Qualité originale', badge: 'bg-cyan-50 text-cyan-700' },
  original:            { label: '100% Original',    badge: 'bg-purple-50 text-purple-700' },
}

export const qualiteLabel = (q) => QUALITES[q]?.label || QUALITES.original.label
export const qualiteBadge = (q) => QUALITES[q]?.badge || QUALITES.original.badge
