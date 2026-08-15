import { useState, useMemo } from 'react'
import { TYPES_PIECE } from '../../utils/typesPiece'

// Navigation à 3 niveaux dans le catalogue de pièces :
//   type de pièce → modèles → qualités
//
// Le composant ne dessine PAS les pièces : il navigue, puis passe les lignes
// du modèle sélectionné à `children` (render prop). Le parent garde donc son
// rendu de carte et son édition inline (editingEcran / ecranForm / …).
//
// Chaque instance a ses propres états de navigation : monter le composant dans
// deux onglets différents ne crée aucun couplage entre eux, ni avec la caisse.
export default function PiecesNavigator({
  pieces = [],
  getStock = () => 0,
  modelesConnus = [],
  onNewPiece = null,
  children,
}) {
  const [typeSel, setTypeSel] = useState(null)
  const [modeleSel, setModeleSel] = useState(null)
  const [marqueFiltre, setMarqueFiltre] = useState('all')

  // Toutes les pièces du type choisi — y compris `disponible = false`,
  // qu'il faut pouvoir rééditer depuis la gestion.
  const piecesDuType = useMemo(
    () => (typeSel ? pieces.filter((p) => p.type_piece === typeSel) : []),
    [pieces, typeSel]
  )

  // Marques proposées = celles présentes en base pour ce type + celles de la
  // liste de référence. Un type encore vide affiche donc quand même ses chips.
  const marquesDuType = useMemo(() => {
    const enBase = piecesDuType.map((p) => p.marque).filter(Boolean)
    const enReference = modelesConnus.map((r) => r.marque).filter(Boolean)
    return [...new Set([...enBase, ...enReference])].sort()
  }, [piecesDuType, modelesConnus])

  // Une seule marque disponible → pas de chips, on va droit aux modèles.
  const marqueActive = marquesDuType.length > 1 ? marqueFiltre : 'all'

  const modelesGroupes = useMemo(() => {
    const groups = {}
    piecesDuType
      .filter((p) => marqueActive === 'all' || p.marque === marqueActive)
      .forEach((p) => {
        const key = p.modele || '—'
        if (!groups[key]) groups[key] = []
        groups[key].push(p)
      })
    return groups
  }, [piecesDuType, marqueActive])

  // Modèles de référence absents du catalogue pour ce type : affichés grisés,
  // cliquables pour pré-remplir la création (aucune ligne créée en base avant saisie).
  // `modelesConnus` : [{ marque, modeles: [] }] — la même référence sert à tous
  // les types, chaque entrée gardant sa marque pour pré-remplir correctement.
  const modelesManquants = useMemo(() => {
    const presents = new Set(Object.keys(modelesGroupes))
    const out = []
    modelesConnus.forEach((ref) => {
      if (marqueActive !== 'all' && marqueActive !== ref.marque) return
      ;(ref.modeles || []).forEach((m) => {
        if (!presents.has(m)) out.push({ modele: m, marque: ref.marque })
      })
    })
    return out
  }, [modelesConnus, marqueActive, modelesGroupes])

  const retourTypes = () => {
    setTypeSel(null)
    setModeleSel(null)
    setMarqueFiltre('all')
  }

  // ── Niveau 1 : types de pièce ──
  if (!typeSel) {
    return (
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Type de pièce</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TYPES_PIECE.map((t) => {
            const nb = pieces.filter((p) => p.type_piece === t.id).length
            return (
              <button key={t.id} type="button"
                onClick={() => setTypeSel(t.id)}
                className="text-left bg-purple-50 hover:bg-purple-100 rounded-xl p-4 transition-all border border-purple-100 hover:border-purple-300">
                <p className="font-bold text-sm text-[#1B2A4A] line-clamp-2">{t.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {nb} pièce{nb > 1 ? 's' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const typeLabel = TYPES_PIECE.find((t) => t.id === typeSel)?.label || typeSel

  // ── Niveau 3 : qualités du modèle choisi (rendu délégué au parent) ──
  if (modeleSel) {
    const rows = modelesGroupes[modeleSel] || []
    return (
      <div>
        <button type="button" onClick={() => setModeleSel(null)}
          className="text-xs font-bold text-gray-500 hover:text-[#1B2A4A] mb-3">
          ← Modèles
        </button>
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
          {typeLabel} — {modeleSel}
        </p>
        <div className="space-y-2">
          {children ? children(rows) : null}
        </div>
      </div>
    )
  }

  // ── Niveau 2 : modèles ──
  const modeles = Object.keys(modelesGroupes).sort()

  return (
    <div>
      <button type="button" onClick={retourTypes}
        className="text-xs font-bold text-gray-500 hover:text-[#1B2A4A] mb-3">
        ← Types de pièce
      </button>
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{typeLabel} — Modèles</p>

      {marquesDuType.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['all', ...marquesDuType].map((m) => (
            <button key={m} type="button"
              onClick={() => setMarqueFiltre(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                marqueActive === m
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {m === 'all' ? 'Toutes' : m}
            </button>
          ))}
        </div>
      )}

      {modeles.length === 0 && modelesManquants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          Aucune pièce « {typeLabel} » dans le catalogue
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {modeles.map((modele) => {
            const rows = modelesGroupes[modele]
            const stockTotal = rows.reduce((s, r) => s + (getStock(r.id) || 0), 0)
            return (
              <button key={modele} type="button"
                onClick={() => setModeleSel(modele)}
                className="text-left bg-purple-50 hover:bg-purple-100 rounded-xl p-3 transition-all border border-purple-100 hover:border-purple-300">
                <p className="font-bold text-xs text-[#1B2A4A] line-clamp-2">{modele}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {rows.length} qualité{rows.length > 1 ? 's' : ''} · {stockTotal} en stock
                </p>
              </button>
            )
          })}
          {modelesManquants.map(({ modele, marque }) => (
            <button key={`manquant-${marque}-${modele}`} type="button"
              onClick={() => onNewPiece && onNewPiece(typeSel, modele, marque)}
              disabled={!onNewPiece}
              className="text-left bg-gray-50 hover:bg-purple-50 rounded-xl p-3 transition-all border border-gray-100 hover:border-purple-300 disabled:cursor-not-allowed">
              <p className="font-bold text-xs text-gray-600 line-clamp-2">{modele}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {marquesDuType.length > 1 ? `${marque} · ` : ''}Non configuré
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
