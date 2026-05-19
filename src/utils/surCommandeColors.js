export const getSurCommandeColors = (modelName) => {
  const modelColors = {
    'iPhone 17 Pro Max': ['Titane naturel', 'Titane désert', 'Titane noir', 'Titane blanc'],
    'iPhone 17 Pro': ['Titane naturel', 'Titane désert', 'Titane noir', 'Titane blanc'],
    'iPhone 17 Air': ['Blanc', 'Noir', 'Bleu', 'Rose'],
    'iPhone 17': ['Blanc', 'Noir', 'Bleu', 'Rose', 'Vert'],
    'iPhone 16 Pro Max': ['Titane naturel', 'Titane blanc', 'Titane noir', 'Titane du désert'],
    'iPhone 16 Pro': ['Titane naturel', 'Titane blanc', 'Titane noir', 'Titane du désert'],
    'iPhone 16 Plus': ['Blanc', 'Noir', 'Rose', 'Bleu azur', 'Vert jade', 'Ultraviolet'],
    'iPhone 16': ['Blanc', 'Noir', 'Rose', 'Bleu azur', 'Vert jade', 'Ultraviolet'],
    'iPhone 16e': ['Blanc', 'Noir'],
    'iPhone 15 Pro Max': ['Titane naturel', 'Titane blanc', 'Titane noir', 'Titane bleu'],
    'iPhone 15 Pro': ['Titane naturel', 'Titane blanc', 'Titane noir', 'Titane bleu'],
    'iPhone 15 Plus': ['Noir', 'Blanc', 'Rose', 'Jaune', 'Vert'],
    'iPhone 15': ['Noir', 'Blanc', 'Rose', 'Jaune', 'Vert'],
    'iPhone 14 Pro Max': ['Violet intense', 'Or', 'Argent', 'Noir sidéral'],
    'iPhone 14 Pro': ['Violet intense', 'Or', 'Argent', 'Noir sidéral'],
    'iPhone 14 Plus': ['Bleu', 'Violet', 'Minuit', 'Lumière stellaire', 'PRODUCT RED'],
    'iPhone 14': ['Bleu', 'Violet', 'Minuit', 'Lumière stellaire', 'PRODUCT RED'],
    'iPhone 13 Pro Max': ['Or', 'Argent', 'Graphite', 'Bleu alpin', 'Vert sierra'],
    'iPhone 13 Pro': ['Or', 'Argent', 'Graphite', 'Bleu alpin', 'Vert sierra'],
    'iPhone 13': ['Minuit', 'Lumière stellaire', 'Bleu', 'Rose', 'PRODUCT RED', 'Vert'],
    'iPhone 13 mini': ['Minuit', 'Lumière stellaire', 'Bleu', 'Rose', 'PRODUCT RED', 'Vert'],
    'Samsung Galaxy S25 Ultra': ['Noir', 'Blanc', 'Titane bleu', 'Titane gris'],
    'Samsung Galaxy S25+': ['Noir', 'Blanc', 'Bleu givré', 'Rose doré'],
    'Samsung Galaxy S25': ['Noir', 'Blanc', 'Bleu givré', 'Rose doré', 'Menthe'],
  }
  return modelColors[modelName] || ['Noir', 'Blanc', 'Argent']
}
