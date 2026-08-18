// Date et purge de session, partagées entre le login, la déconnexion manuelle,
// la déconnexion automatique de minuit et le garde de session caisse.

// Date du jour en heure belge, au format 'YYYY-MM-DD' (en-CA le donne
// directement). Volontairement pas `toISOString()`, qui renvoie la date UTC :
// entre minuit et 1h ou 2h du matin, elle est encore la veille à Bruxelles.
export const dateBelge = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Brussels',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

// Heure/minute/seconde belges, indépendantes du fuseau du poste.
export const heuresBelges = () => {
  const parts = new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const lire = (type) => Number(parts.find((p) => p.type === type)?.value || 0)
  return { h: lire('hour'), m: lire('minute'), s: lire('second') }
}

// Millisecondes restantes jusqu'au prochain minuit belge.
export const msJusquaMinuitBelge = () => {
  const { h, m, s } = heuresBelges()
  return ((23 - h) * 3600 + (59 - m) * 60 + (60 - s)) * 1000
}

// Vide TOUTE la session locale : identité + drapeau admin + les sessions caisse
// de chaque magasin. Ces dernières ont une clé dynamique, d'où le balayage par
// préfixe (les clés sont collectées avant suppression : retirer une entrée en
// cours d'itération décale les index et en sauterait).
export const purgeSessionLocale = () => {
  localStorage.removeItem('sebphone_admin')
  localStorage.removeItem('sebphone_user')
  const clesCaisse = []
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i)
    if (cle && cle.startsWith('sebphone_caisse_session_')) clesCaisse.push(cle)
  }
  clesCaisse.forEach((cle) => localStorage.removeItem(cle))
}
