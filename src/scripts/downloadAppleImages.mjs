import { IMAGE_MAP } from '../utils/phoneImage.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const download = async (url, filepath) => {
  const res = await fetch(url)
  if (!res.ok) {
    console.log(`❌ Erreur ${res.status}: ${url}`)
    return false
  }
  const buffer = await res.arrayBuffer()
  writeFileSync(filepath, Buffer.from(buffer))
  console.log(`✅ Sauvegardé: ${filepath}`)
  return true
}

const slugify = (str) => str
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')

const run = async () => {
  const updates = {}

  for (const [model, colors] of Object.entries(IMAGE_MAP)) {
    for (const [color, url] of Object.entries(colors)) {
      if (!url.startsWith('https://')) continue

      // Détermine le dossier selon le modèle
      let folder = 'iphones'
      if (model.includes('macbook')) folder = 'macs'
      else if (model.includes('ipad')) folder = 'ipads'
      else if (model.includes('airpods')) folder = 'airpods'
      else if (model.includes('watch')) folder = 'watch'
      else if (model.includes('samsung') || model.includes('galaxy')) folder = 'samsung'

      const dir = join('public', 'images', folder)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const ext = url.includes('fmt=webp') ? 'webp' :
                  url.includes('fmt=jpeg') || url.includes('.jpeg') ? 'jpg' : 'png'
      const filename = color === 'default'
        ? `${slugify(model)}-default.${ext}`
        : `${slugify(model)}-${slugify(color)}.${ext}`

      const filepath = join(dir, filename)
      const localPath = `/images/${folder}/${filename}`

      if (!existsSync(filepath)) {
        const ok = await download(url, filepath)
        if (ok) {
          if (!updates[model]) updates[model] = {}
          updates[model][color] = localPath
        }
      } else {
        console.log(`⏭️ Déjà existant: ${filepath}`)
        if (!updates[model]) updates[model] = {}
        updates[model][color] = localPath
      }
    }
  }

  console.log('\n📋 Résumé des chemins locaux générés:')
  console.log(JSON.stringify(updates, null, 2))
  console.log('\n✅ Téléchargement terminé !')
  console.log('👉 Copie les chemins ci-dessus dans phoneImage.js')
}

run().catch(console.error)
