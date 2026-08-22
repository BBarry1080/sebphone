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
// Les clés sont les valeurs acceptées par la contrainte CHECK de
// reparation_ecrans.qualite — la base fait référence.
// labelCourt sert aux pastilles compactes, où le libellé complet casserait
// la mise en page — il vit ici pour ne pas se désynchroniser de label.
export const QUALITES = {
  compatible:          { label: 'Compatible',        labelCourt: 'Compatible',    badge: 'bg-amber-50 text-amber-700' },
  original_equivalent: { label: 'Qualité originale', labelCourt: 'Qualité orig.', badge: 'bg-cyan-50 text-cyan-700' },
  '100_original':      { label: '100% Original',     labelCourt: '100% Orig.',    badge: 'bg-purple-50 text-purple-700' },
}

export const qualiteLabel = (q) => QUALITES[q]?.label || QUALITES['100_original'].label
export const qualiteBadge = (q) => QUALITES[q]?.badge || QUALITES['100_original'].badge
export const qualiteLabelCourt = (q) => QUALITES[q]?.labelCourt || QUALITES['100_original'].labelCourt
