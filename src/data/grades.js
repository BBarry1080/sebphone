export const grades = [
  {
    id: 'bon_etat',
    number: 1,
    name: 'Bon état',
    warranty: '24 mois',
    badge: null,
    conclusion: 'Pour ceux qui veulent un bon rapport qualité/prix.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Traces d\'usure visibles', type: 'info' },
    ],
  },
  {
    id: 'tres_bon_etat',
    number: 2,
    name: 'Très bon état',
    warranty: '24 mois',
    badge: { emoji: '🛒', text: 'Le plus acheté en magasin' },
    conclusion: 'Pour ceux qui veulent une très bonne affaire.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Peu de traces d\'usure', type: 'info' },
    ],
  },
  {
    id: 'comme_neuf',
    number: 3,
    name: 'Comme neuf',
    warranty: '24 mois',
    badge: { emoji: '🌐', text: 'Le plus acheté en ligne' },
    conclusion: 'Pour ceux qui veulent un téléphone quasi neuf.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Aucune trace d\'usure visible', type: 'good' },
    ],
  },
  {
    id: 'neuf',
    number: 4,
    name: 'Neuf',
    warranty: '24 mois',
    badge: { emoji: '🎁', text: 'Idéal en cadeau' },
    conclusion: 'Pour ceux qui sont très exigeants.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'check', text: 'Aucune trace d\'usure — comme sorti de boîte', type: 'good' },
    ],
  },
]
