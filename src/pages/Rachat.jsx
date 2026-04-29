import { useState } from 'react'
import { ArrowLeft, CheckCircle, Phone, TrendingDown, MapPin, ExternalLink, X } from 'lucide-react'
import { IPHONE_DATABASE } from '../data/iphoneDatabase'
import { STARTING_PRICES } from '../data/startingPrices'

const STORES = [
  { name: "Anderlecht", address: "Chaussée de Mons 711, 1070 Anderlecht", maps: "https://maps.google.com/?q=Chaussée+de+Mons+711+Anderlecht" },
  { name: "Molenbeek", address: "Rue de l'Église Sainte-Anne 93, 1081 Molenbeek", maps: "https://maps.google.com/?q=Rue+Eglise+Sainte+Anne+93+Molenbeek" },
  { name: "Louise", address: "Rue du Bailli 22, 1000 Bruxelles", maps: "https://maps.google.com/?q=Rue+du+Bailli+22+Bruxelles" },
  { name: "Rue Neuve", address: "Pass. du Nord 23, 1000 Bruxelles", maps: "https://maps.google.com/?q=Passage+du+Nord+23+Bruxelles" },
  { name: "Tubize", address: "Rue de Bruxelles 18, 1400 Tubize", maps: "https://maps.google.com/?q=Rue+de+Bruxelles+18+Tubize" },
  { name: "Saint-Gilles", address: "Chaussée de Forest 26, Saint-Gilles", maps: "https://maps.google.com/?q=Chaussée+de+Forest+26+Saint-Gilles" },
]

function StoresModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-poppins font-bold text-[#1B2A4A] text-lg">Nos points de vente</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
          {STORES.map((store) => (
            <div key={store.name} className="flex items-start justify-between p-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#00B4CC] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1B2A4A]">Seb Telecom — {store.name}</p>
                  <p className="text-sm text-gray-500">{store.address}</p>
                </div>
              </div>
              <a
                href={store.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#00B4CC] font-medium flex items-center gap-1 flex-shrink-0 ml-4 hover:underline"
              >
                <ExternalLink size={12} />
                Maps
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Prix de base rachat = ~45% du prix de référence
function getBaseRachat(model) {
  const ref = STARTING_PRICES[model]
  if (!ref) return null
  return Math.round(ref * 0.45)
}

// ── Calcul prix selon les réponses
function calcPrice(model, answers) {
  const base = getBaseRachat(model)
  if (!base) return null

  let price = base

  // Batterie
  const bat = parseInt(answers.battery || '100')
  if (bat < 80) price *= 0.70
  else if (bat < 85) price *= 0.80
  else if (bat < 90) price *= 0.90

  // Fonctions
  const funcFails = Object.values(answers.functions || {}).filter(v => v === false).length
  price -= funcFails * Math.round(base * 0.08)

  // Écran fonctionnalité
  if (answers.screenFunc === 'issues') price -= Math.round(base * 0.10)

  // Écran fissures
  if (answers.screenCracks === 'fissures') price *= 0.60
  else if (answers.screenCracks === 'eclats') price *= 0.75
  else if (answers.screenCracks === 'raye') price *= 0.80

  // État écran
  if (answers.screenWear === 'usure_visible') price *= 0.88
  else if (answers.screenWear === 'quelques') price *= 0.93
  else if (answers.screenWear === 'minimes') price *= 0.97

  // État côtés
  if (answers.frame === 'fissure') price *= 0.75
  else if (answers.frame === 'usure_visible') price *= 0.88
  else if (answers.frame === 'quelques') price *= 0.93
  else if (answers.frame === 'minimes') price *= 0.97

  // État dos
  if (answers.back === 'fissure') price *= 0.75
  else if (answers.back === 'usure_visible') price *= 0.88
  else if (answers.back === 'quelques') price *= 0.93
  else if (answers.back === 'minimes') price *= 0.97

  return Math.max(5, Math.round(price))
}

const IPHONE_MODELS = IPHONE_DATABASE.map(m => m.model)
const STORAGES = ['64 Go', '128 Go', '256 Go', '512 Go', '1 To']
const FUNC_QUESTIONS = [
  { key: 'power',   label: "Votre iPhone s'allume-t-il et reste-t-il allumé sans redémarrer tout seul ?" },
  { key: 'network', label: 'Votre iPhone peut-il se connecter à un réseau ?' },
  { key: 'faceid',  label: 'Votre Face ID fonctionne-t-il ?' },
  { key: 'camera',  label: 'Votre caméra frontale fonctionne-t-elle ?' },
  { key: 'speaker', label: 'Le haut-parleur en haut de ton iPhone fonctionne-t-il ?' },
  { key: 'sim',     label: 'Ton iPhone a-t-il un emplacement pour carte SIM ?' },
]

const TOTAL_STEPS = 9

function Radio({ label, desc, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left cursor-pointer
        ${selected ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <div>
        <p className={`font-medium text-sm ${selected ? 'text-[#1B2A4A]' : 'text-[#333]'}`}>{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-3
        ${selected ? 'border-[#00B4CC] bg-[#00B4CC]' : 'border-gray-300'}`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  )
}

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1B2A4A] rounded-full transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{step}/{TOTAL_STEPS}</span>
    </div>
  )
}

function SummaryPanel({ model, storage, answers, estimatedPrice }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Valeur estimée</p>
      <p className={`text-3xl font-bold mb-4 ${estimatedPrice ? 'text-[#00B4CC]' : 'text-gray-300'}`}>
        {estimatedPrice ? `${estimatedPrice} €` : '—'}
      </p>
      {(model || storage) && (
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-2 text-sm">
          {model && <div className="flex justify-between"><span className="text-gray-400">Modèle</span><span className="font-medium text-[#1B2A4A]">{model}</span></div>}
          {storage && <div className="flex justify-between"><span className="text-gray-400">Capacité</span><span className="font-medium text-[#1B2A4A]">{storage}</span></div>}
          {answers.battery && <div className="flex justify-between"><span className="text-gray-400">Batterie</span><span className="font-medium text-[#1B2A4A]">{answers.battery}%</span></div>}
        </div>
      )}
    </div>
  )
}

export default function Rachat() {
  const [showStores, setShowStores] = useState(false)
  const [step, setStep]       = useState(1)
  const [model, setModel]     = useState('')
  const [storage, setStorage] = useState('')
  const [answers, setAnswers] = useState({
    battery: '',
    batteryUnknown: false,
    functions: {},
    funcStep: 0,
    screenFunc: '',
    screenCracks: '',
    screenWear: '',
    frame: '',
    back: '',
  })
  const [done, setDone]       = useState(false)
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [sent, setSent]       = useState(false)

  const estimatedPrice = model ? calcPrice(model, answers) : null

  function setAns(key, val) {
    setAnswers(p => ({ ...p, [key]: val }))
  }

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function back() {
    if (step === 1) return
    setStep(s => s - 1)
  }

  // Step 4 is multi-question (6 functional questions)
  const funcStep  = answers.funcStep || 0
  const curFunc   = FUNC_QUESTIONS[funcStep]
  const funcDone  = funcStep >= FUNC_QUESTIONS.length

  if (sent) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 pb-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Demande reçue !</h1>
        <p className="text-gray-500 text-sm mb-6">
          Nous vous rappelons sous <strong>24h</strong> au <strong>{contact.phone}</strong> pour confirmer notre offre de rachat pour votre <strong>{model} {storage}</strong>.
        </p>
        <div className="bg-[#1B2A4A] text-white rounded-2xl p-5 mb-6">
          <p className="text-sm text-gray-300 mb-1">Notre estimation</p>
          <p className="text-4xl font-bold text-[#00B4CC]">{estimatedPrice} €</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 justify-center">
          <Phone size={14} className="text-[#00B4CC]" />
          Une question ? <strong className="text-[#1B2A4A]">0472 72 85 24</strong>
        </div>
        <button onClick={() => { setStep(1); setModel(''); setStorage(''); setAnswers({ battery:'', batteryUnknown:false, functions:{}, funcStep:0, screenFunc:'', screenCracks:'', screenWear:'', frame:'', back:'' }); setDone(false); setSent(false) }}
          className="mt-6 text-sm text-[#00B4CC] underline cursor-pointer">
          Nouvelle estimation
        </button>
      </main>
    )
  }

  if (done) {
    const in3  = Math.round(estimatedPrice * 0.91)
    const in6  = Math.round(estimatedPrice * 0.83)
    const in12 = Math.round(estimatedPrice * 0.69)
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-12">
        <h2 className="font-poppins font-bold text-2xl text-[#1B2A4A] mb-6 text-center">Votre estimation de prix</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: price */}
          <div className="bg-[#1B2A4A] rounded-2xl p-6 text-white">
            <p className="text-sm text-gray-300 mb-1">VOTRE ESTIMATION DE PRIX</p>
            <p className="text-5xl font-bold text-[#00B4CC] mb-4">{estimatedPrice} €</p>
            <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2 mb-5">
              <p className="text-yellow-300 text-xs font-medium">✓ Valable 14 jours après confirmation</p>
            </div>
            <div className="flex items-center gap-1 text-gray-300 text-xs mb-3">
              <TrendingDown size={14} />
              <span>Prévision de valeur — ne pas attendre coûte jusqu'à <strong className="text-white">{estimatedPrice - in12} €</strong></span>
            </div>
            <div className="flex justify-between text-center mt-4 border-t border-white/10 pt-4">
              {[['Aujourd\'hui', estimatedPrice, true], ['3 mois', in3, false], ['6 mois', in6, false], ['12 mois', in12, false]].map(([label, val, active]) => (
                <div key={label}>
                  <p className={`text-sm font-bold ${active ? 'text-[#00B4CC]' : 'text-white/60'}`}>{val} €</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-400">
              <p className="font-medium text-gray-300 mb-2">Vos réponses</p>
              <div className="flex justify-between"><span>Modèle</span><span className="text-white">{model}</span></div>
              <div className="flex justify-between mt-1"><span>Capacité</span><span className="text-white">{storage}</span></div>
              {answers.battery && <div className="flex justify-between mt-1"><span>Batterie</span><span className="text-white">{answers.battery}%</span></div>}
            </div>
          </div>

          {/* Right: CTA + contact */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Reprise {model}</h3>
              <ul className="text-sm text-gray-500 flex flex-col gap-2 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> Livraison gratuite et sécurisée</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> Suppression sécurisée des données</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> Paiement rapide en boutique</li>
              </ul>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Votre prénom"
                  value={contact.name}
                  onChange={e => setContact(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-all"
                />
                <input
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                  value={contact.phone}
                  onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-all"
                />
                <button
                  onClick={() => { if (contact.name && contact.phone) setSent(true) }}
                  disabled={!contact.name || !contact.phone}
                  className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all cursor-pointer"
                >
                  Vendre pour {estimatedPrice} €
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-12">
      {showStores && <StoresModal onClose={() => setShowStores(false)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">Revendre mon iPhone</h1>
          <p className="text-sm text-[#555555] mt-0.5">Estimation gratuite en 2 minutes</p>
        </div>
        <button
          onClick={() => setShowStores(true)}
          className="flex items-center gap-2 px-6 py-3 border-2 border-[#1B2A4A] text-[#1B2A4A] rounded-xl font-semibold hover:bg-[#1B2A4A] hover:text-white transition-all cursor-pointer"
        >
          <MapPin size={18} />
          Nos points de vente
        </button>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">

        {/* Left panel */}
        <SummaryPanel model={model} storage={storage} answers={answers} estimatedPrice={step >= 3 ? estimatedPrice : null} />

        {/* Right panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <ProgressBar step={step} />

          {step > 1 && (
            <button onClick={back} className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#1B2A4A] mb-4 cursor-pointer transition-colors">
              <ArrowLeft size={14} /> Retour
            </button>
          )}

          {/* STEP 1 — Modèle */}
          {step === 1 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Modèle d'iPhone</h2>
              <p className="text-sm text-gray-400 mb-1">Vérifie le modèle de ton iPhone</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ Allez dans <strong>Réglages → Général → Informations → Nom du modèle</strong>
              </div>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] bg-white mb-4"
              >
                <option value="">Sélectionnez le modèle d'iPhone</option>
                {IPHONE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button
                onClick={next} disabled={!model}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 2 — Stockage */}
          {step === 2 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Capacité de stockage</h2>
              <p className="text-sm text-gray-400 mb-1">Vérifiez la capacité de stockage de l'appareil</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ Allez dans <strong>Réglages → Général → Informations</strong>
              </div>
              <div className="flex flex-col gap-2 mb-4">
                {STORAGES.map(s => (
                  <Radio key={s} label={s} selected={storage === s} onClick={() => setStorage(s)} />
                ))}
              </div>
              <button
                onClick={next} disabled={!storage}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 3 — Batterie */}
          {step === 3 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">État de santé de la batterie</h2>
              <p className="text-sm text-gray-400 mb-1">Vérifiez la capacité maximale de la batterie</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ Allez dans <strong>Réglages → Batterie → État de la batterie et charge.</strong>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                <div className={`p-4 rounded-xl border-2 transition-all ${!answers.batteryUnknown ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200'}`}>
                  <p className="text-sm font-medium text-[#1B2A4A] mb-2">Entrez la capacité de la batterie</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1" max="100"
                      value={answers.battery}
                      onChange={e => { setAns('battery', e.target.value); setAns('batteryUnknown', false) }}
                      placeholder="ex: 89"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                    />
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                </div>
                <Radio
                  label="Impossible de vérifier"
                  desc="Nous confirmerons la capacité après inspection"
                  selected={answers.batteryUnknown}
                  onClick={() => { setAns('batteryUnknown', true); setAns('battery', '85') }}
                />
              </div>
              <button
                onClick={next} disabled={!answers.battery && !answers.batteryUnknown}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 4 — Vérification fonctionnelle (6 sous-questions) */}
          {step === 4 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Vérification fonctionnelle</h2>
              <p className="text-sm text-gray-400 mb-4">Vérifiez les fonctionnalités de votre appareil</p>

              {/* Réponses déjà données */}
              {FUNC_QUESTIONS.slice(0, funcStep).map(q => (
                <div key={q.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm text-gray-600">{q.label.split(' ').slice(0, 4).join(' ')}...</span>
                  </div>
                  <button onClick={() => setAns('funcStep', q.key === 'power' ? 0 : FUNC_QUESTIONS.findIndex(f => f.key === q.key))}
                    className="text-xs text-[#00B4CC] cursor-pointer">Modifier</button>
                </div>
              ))}

              {!funcDone ? (
                <div className="border-2 border-[#00B4CC]/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-2">{funcStep + 1}/6</p>
                  <p className="font-medium text-[#1B2A4A] text-sm mb-4">{curFunc.label}</p>
                  <div className="flex gap-3">
                    {[['OUI', true], ['NON', false]].map(([label, val]) => (
                      <button key={label} onClick={() => {
                        setAnswers(p => ({
                          ...p,
                          functions: { ...p.functions, [curFunc.key]: val },
                          funcStep: funcStep + 1,
                        }))
                      }}
                        className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-sm hover:border-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-all cursor-pointer">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  onClick={next}
                  className="w-full bg-[#1B2A4A] hover:bg-[#243660] text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer mt-2"
                >
                  Continuer →
                </button>
              )}
            </div>
          )}

          {/* STEP 5 — Fonctionnalité écran */}
          {step === 5 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Fonctionnalité de l'écran</h2>
              <p className="text-sm text-gray-400 mb-4">Vérifiez la présence de taches lumineuses, pixels morts ou lignes/brûlures d'écran.</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'issues_spots', label: 'Taches lumineuses' },
                  { val: 'issues_pixels', label: 'Pixels morts' },
                  { val: 'issues_lines', label: 'Lignes visibles sur l\'écran ou brûlures d\'écran' },
                  { val: 'ok', label: 'Tout fonctionne' },
                ].map(({ val, label }) => (
                  <Radio key={val} label={label} selected={answers.screenFunc === val}
                    onClick={() => setAns('screenFunc', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenFunc}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 6 — Fissures écran */}
          {step === 6 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">Écran</h2>
              <p className="text-sm text-gray-400 mb-4">Inspectez l'écran pour détecter les fissures, les éclats et les rayures profondes.</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissures', label: 'Fissures', desc: 'Une ou plusieurs fissures visibles.' },
                  { val: 'eclats', label: 'Éclats', desc: 'Un ou plusieurs éclats détectés en inspectant les bords.' },
                  { val: 'raye', label: 'Fortement rayé', desc: 'Nombreuses rayures visibles sans source de lumière.' },
                  { val: 'ok', label: 'Aucune fissure, aucun éclat ni rayure profonde' },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.screenCracks === val}
                    onClick={() => setAns('screenCracks', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenCracks}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 7 — Usure écran */}
          {step === 7 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">État de l'écran</h2>
              <p className="text-sm text-gray-400 mb-4">Inspectez l'écran pour détecter des rayures et des signes d'usure.</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'usure_visible', label: 'Usure visible', desc: 'Rayures visibles, ressenties en passant le doigt.' },
                  { val: 'quelques', label: 'Quelques signes d\'usure', desc: 'Légères rayures aux coins.' },
                  { val: 'minimes', label: 'Signes d\'usure minimes', desc: 'Micro-rayures visibles uniquement à la lumière.' },
                  { val: 'ok', label: 'Aucun signe d\'utilisation', desc: 'L\'écran a l\'air comme neuf.' },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.screenWear === val}
                    onClick={() => setAns('screenWear', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenWear}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 8 — Côtés */}
          {step === 8 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">État des côtés</h2>
              <p className="text-sm text-gray-400 mb-4">Inspectez les côtés pour détecter les rayures et l'usure.</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissure', label: 'Fissuré ou cassé', desc: 'Côtés pliés, courbés ou fissurés.' },
                  { val: 'usure_visible', label: 'Usure visible', desc: 'Rayures visibles, bosses ou décoloration.' },
                  { val: 'quelques', label: 'Quelques signes d\'usure', desc: 'Rayures, marques ou petite éraflure.' },
                  { val: 'minimes', label: 'Signes d\'usure minimes', desc: 'Légères rayures non visibles au premier coup d\'œil.' },
                  { val: 'ok', label: 'Aucun signe d\'utilisation', desc: 'Le contour a l\'air comme neuf.' },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.frame === val}
                    onClick={() => setAns('frame', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.frame}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Continuer →
              </button>
            </div>
          )}

          {/* STEP 9 — Dos */}
          {step === 9 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">État du dos de l'iPhone</h2>
              <p className="text-sm text-gray-400 mb-4">Inspectez l'arrière pour détecter les rayures et l'usure.</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissure', label: 'Fissuré ou cassé.', desc: 'Le verre arrière est clairement fissuré, ou le métal est bosselé.' },
                  { val: 'usure_visible', label: 'Usure visible', desc: 'Rayures visibles, bosses ou traces de décoloration.' },
                  { val: 'quelques', label: 'Quelques signes d\'usure', desc: 'Rayures visibles ou marques d\'usure.' },
                  { val: 'minimes', label: 'Signes d\'usure minimes', desc: 'Légères rayures non visibles au premier coup d\'œil.' },
                  { val: 'ok', label: 'Aucun signe d\'utilisation', desc: 'L\'arrière de l\'appareil a l\'air comme neuf.' },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.back === val}
                    onClick={() => setAns('back', val)} />
                ))}
              </div>
              <button onClick={() => setDone(true)} disabled={!answers.back}
                className="w-full bg-[#00B4CC] hover:bg-[#0099b3] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Voir mon estimation →
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
