export const grades = [
  {
    id: 'imparfait',
    number: 1,
    name: 'Imparfait',
    warranty: '6 mois',
    badge: null,
    conclusion: 'Pour ceux qui se contentent du minimum.',
    features: [
      { icon: 'screen', text: 'Écran & batterie compatibles', type: 'warning' },
      { icon: 'alert', text: 'Face ID peut être absent', type: 'warning' },
      { separator: true },
      { icon: 'check', text: 'Écran d\'origine constructeur', type: 'alt', label: 'ou' },
      { icon: 'time', text: 'Traces d\'usure très prononcées', type: 'info' },
    ],
  },
  {
    id: 'correct',
    number: 2,
    name: 'Correct',
    warranty: '12 mois',
    badge: { emoji: '🛒', text: 'Le plus acheté en magasin' },
    conclusion: 'Pour ceux qui veulent une bonne affaire.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Quelques traces d\'usure visibles', type: 'info' },
    ],
  },
  {
    id: 'tres_bon',
    number: 3,
    name: 'Très bon',
    warranty: '12 mois',
    badge: { emoji: '🌐', text: 'Le plus acheté en ligne' },
    conclusion: 'Pour ceux qui veulent une très bonne affaire.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Peu de traces d\'usure', type: 'info' },
    ],
  },
  {
    id: 'parfait',
    number: 4,
    name: 'Parfait',
    warranty: '24 mois',
    badge: { emoji: '🎁', text: 'Idéal en cadeau' },
    conclusion: 'Pour ceux qui sont très exigeants.',
    features: [
      { icon: 'screen', text: 'Écran d\'origine constructeur', type: 'good' },
      { icon: 'time', text: 'Aucune trace d\'usure', type: 'good' },
    ],
  },
];
