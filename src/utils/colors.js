const COLOR_MAP = {
  'noir': '#1C1C1E',
  'black': '#1C1C1E',
  'noir de jais': '#000000',

  'blanc': '#F5F5F0',
  'white': '#F5F5F0',
  'lumiere stellaire': '#FAF6EF',
  'lumière stellaire': '#FAF6EF',

  'gris sideral': '#5A5A5F',
  'gris sidéral': '#5A5A5F',
  'titane naturel': '#B5A99A',
  'titane noir': '#2C2C2C',
  'titane blanc': '#E8E4DC',
  'titane bleu': '#4A6B7A',
  'titane desert': '#C4A882',
  'titane désert': '#C4A882',
  'graphite': '#4A4A4F',

  'or': '#C8A96E',
  'gold': '#C8A96E',
  'or rose': '#E8C4B8',

  'rouge': '#FF3B30',
  'red': '#FF3B30',

  'bleu': '#007AFF',
  'blue': '#007AFF',
  'bleu pacifique': '#3D6B8C',
  'bleu outremer': '#2C3E8C',
  'bleu alpin': '#4A7C6F',
  'bleu sierra': '#5B8FA8',

  'vert': '#34C759',
  'green': '#34C759',
  'vert nuit': '#1D3A2F',
  'vert jade': '#3A7D6B',

  'violet': '#AF52DE',
  'purple': '#AF52DE',
  'violet intense': '#5E2D7E',

  'rose': '#FF6B9D',
  'pink': '#FF6B9D',

  'jaune': '#FFD60A',
  'yellow': '#FFD60A',

  'corail': '#FF6B6B',

  'minuit': '#1C2732',
  'midnight': '#1C2732',

  'argent': '#C7C7CC',
  'silver': '#C7C7CC',
}

export function getColorHex(colorName) {
  if (!colorName) return '#888888'
  const key = colorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  for (const [k, v] of Object.entries(COLOR_MAP)) {
    const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (kNorm === key) return v
  }
  return '#888888'
}
