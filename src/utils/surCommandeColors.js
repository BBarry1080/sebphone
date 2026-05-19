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

export const getSurCommandeStorages = (modelName) => {
  if (!modelName) return ['128Go', '256Go']
  const name = modelName.toLowerCase()

  // iPhone 17 série
  if (name.includes('iphone 17 pro max') || name.includes('iphone 17 pro'))
    return ['256Go', '512Go', '1To']
  if (name.includes('iphone 17 air'))
    return ['128Go', '256Go']
  if (name.includes('iphone 17'))
    return ['256Go', '512Go']

  // iPhone 16 série
  if (name.includes('iphone 16 pro max') || name.includes('iphone 16 pro'))
    return ['256Go', '512Go', '1To']
  if (name.includes('iphone 16 plus') || name.includes('iphone 16e'))
    return ['128Go', '256Go', '512Go']
  if (name.includes('iphone 16'))
    return ['128Go', '256Go', '512Go']

  // iPhone 15 série
  if (name.includes('iphone 15 pro max') || name.includes('iphone 15 pro'))
    return ['256Go', '512Go', '1To']
  if (name.includes('iphone 15 plus') || name.includes('iphone 15'))
    return ['128Go', '256Go', '512Go']

  // iPhone 14 série
  if (name.includes('iphone 14 pro max') || name.includes('iphone 14 pro'))
    return ['128Go', '256Go', '512Go', '1To']
  if (name.includes('iphone 14'))
    return ['128Go', '256Go', '512Go']

  // iPhone 13 et moins
  if (name.includes('iphone 13') || name.includes('iphone 12'))
    return ['128Go', '256Go', '512Go']

  // Samsung
  if (name.includes('samsung galaxy s2'))
    return ['128Go', '256Go', '512Go', '1To']
  if (name.includes('samsung'))
    return ['128Go', '256Go', '512Go']

  // Défaut
  return ['64Go', '128Go', '256Go', '512Go']
}
