import { useEffect } from 'react'
import { X } from 'lucide-react'

// Visionneuse plein écran d'une image unique.
//
// z-[110] : au-dessus de tout le reste du projet, dont les modales les plus
// hautes (z-[100] dans StockMagasin). La lightbox s'ouvre depuis une modale
// dans plusieurs cas, elle doit donc passer devant.
export default function ImageLightbox({ url, alt, onClose }) {
  // Échap ferme. Le hook est déclaré avant tout retour anticipé pour ne pas
  // violer les règles des hooks, et ne s'arme que lorsqu'une image est ouverte.
  useEffect(() => {
    if (!url) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [url, onClose])

  if (!url) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/80 flex flex-col items-center justify-center p-4 gap-3">
      <button
        onClick={onClose}
        title="Fermer"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X size={22} />
      </button>

      {/* stopPropagation : cliquer l'image ne referme pas la visionneuse */}
      <img
        src={url}
        alt={alt || ''}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-lg"
      />

      {alt && (
        <p onClick={(e) => e.stopPropagation()}
          className="text-white text-sm font-bold text-center max-w-2xl">
          {alt}
        </p>
      )}
    </div>
  )
}
