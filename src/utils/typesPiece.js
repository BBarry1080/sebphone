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
