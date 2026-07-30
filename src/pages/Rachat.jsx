import { useState } from 'react'
import { ArrowLeft, CheckCircle, Phone, TrendingDown, MapPin, ExternalLink, X } from 'lucide-react'
import { IPHONE_DATABASE } from '../data/iphoneDatabase'
import { STARTING_PRICES } from '../data/startingPrices'
import { useLanguage } from '../contexts/LanguageContext'

const STORES = [
  { name: "Anderlecht", address: "Chaussée de Mons 711, 1070 Anderlecht", maps: "https://maps.google.com/?q=Chaussée+de+Mons+711+Anderlecht" },
  { name: "Molenbeek", address: "Rue de l'Église Sainte-Anne 93, 1081 Molenbeek", maps: "https://maps.google.com/?q=Rue+Eglise+Sainte+Anne+93+Molenbeek" },
  { name: "Louise", address: "Rue du Bailli 22, 1000 Bruxelles", maps: "https://maps.google.com/?q=Rue+du+Bailli+22+Bruxelles" },
  { name: "Rue Neuve", address: "Rue du Finistère 12, 1000 Bruxelles", maps: "https://maps.google.com/?q=Rue+du+Finistere+12+Bruxelles" },
  { name: "Tubize", address: "Rue de Bruxelles 18, 1400 Tubize", maps: "https://maps.google.com/?q=Rue+de+Bruxelles+18+Tubize" },
  { name: "Saint-Gilles", address: "Chaussée de Forest 26, Saint-Gilles", maps: "https://maps.google.com/?q=Chaussée+de+Forest+26+Saint-Gilles" },
]

function StoresModal({ onClose }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-poppins font-bold text-[#1B2A4A] text-lg">{t('rachat_stores_title')}</h2>
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
  { key: 'power',   labelKey: 'rachat_question_power' },
  { key: 'network', labelKey: 'rachat_question_network' },
  { key: 'faceid',  labelKey: 'rachat_question_faceid' },
  { key: 'camera',  labelKey: 'rachat_question_camera' },
  { key: 'speaker', labelKey: 'rachat_question_speaker' },
  { key: 'sim',     labelKey: 'rachat_question_sim' },
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
  const { t } = useLanguage()
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('rachat_estimate_title')}</p>
      <p className={`text-3xl font-bold mb-4 ${estimatedPrice ? 'text-[#00B4CC]' : 'text-gray-300'}`}>
        {estimatedPrice ? `${estimatedPrice} €` : '—'}
      </p>
      {(model || storage) && (
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-2 text-sm">
          {model && <div className="flex justify-between"><span className="text-gray-400">{t('revendre_model')}</span><span className="font-medium text-[#1B2A4A]">{model}</span></div>}
          {storage && <div className="flex justify-between"><span className="text-gray-400">{t('rachat_capacity_label')}</span><span className="font-medium text-[#1B2A4A]">{storage}</span></div>}
          {answers.battery && <div className="flex justify-between"><span className="text-gray-400">{t('rachat_battery_label')}</span><span className="font-medium text-[#1B2A4A]">{answers.battery}%</span></div>}
        </div>
      )}
    </div>
  )
}

export default function Rachat() {
  const { t } = useLanguage()
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
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">{t('rachat_success_title')}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {t('rachat_success_callback')} <strong>{contact.phone}</strong>
          <br />
          {t('rachat_success_for')} <strong>{model} {storage}</strong>.
        </p>
        <div className="bg-[#1B2A4A] text-white rounded-2xl p-5 mb-6">
          <p className="text-sm text-gray-300 mb-1">{t('rachat_our_estimate')}</p>
          <p className="text-4xl font-bold text-[#00B4CC]">{estimatedPrice} €</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 justify-center">
          <Phone size={14} className="text-[#00B4CC]" />
          {t('rachat_a_question')} <strong className="text-[#1B2A4A]">0472 72 85 24</strong>
        </div>
        <button onClick={() => { setStep(1); setModel(''); setStorage(''); setAnswers({ battery:'', batteryUnknown:false, functions:{}, funcStep:0, screenFunc:'', screenCracks:'', screenWear:'', frame:'', back:'' }); setDone(false); setSent(false) }}
          className="mt-6 text-sm text-[#00B4CC] underline cursor-pointer">
          {t('rachat_new_estimate')}
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
        <h2 className="font-poppins font-bold text-2xl text-[#1B2A4A] mb-6 text-center">{t('rachat_your_estimate')}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: price */}
          <div className="bg-[#1B2A4A] rounded-2xl p-6 text-white">
            <p className="text-sm text-gray-300 mb-1">{t('rachat_your_estimate_up')}</p>
            <p className="text-5xl font-bold text-[#00B4CC] mb-4">{estimatedPrice} €</p>
            <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2 mb-5">
              <p className="text-yellow-300 text-xs font-medium">{t('rachat_valid_14days')}</p>
            </div>
            <div className="flex items-center gap-1 text-gray-300 text-xs mb-3">
              <TrendingDown size={14} />
              <span>{t('rachat_value_forecast')} <strong className="text-white">{estimatedPrice - in12} €</strong></span>
            </div>
            <div className="flex justify-between text-center mt-4 border-t border-white/10 pt-4">
              {[[t('rachat_today'), estimatedPrice, true], [t('rachat_3months'), in3, false], [t('rachat_6months'), in6, false], [t('rachat_12months'), in12, false]].map(([label, val, active]) => (
                <div key={label}>
                  <p className={`text-sm font-bold ${active ? 'text-[#00B4CC]' : 'text-white/60'}`}>{val} €</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-400">
              <p className="font-medium text-gray-300 mb-2">{t('rachat_your_answers')}</p>
              <div className="flex justify-between"><span>{t('revendre_model')}</span><span className="text-white">{model}</span></div>
              <div className="flex justify-between mt-1"><span>{t('rachat_capacity_label')}</span><span className="text-white">{storage}</span></div>
              {answers.battery && <div className="flex justify-between mt-1"><span>{t('rachat_battery_label')}</span><span className="text-white">{answers.battery}%</span></div>}
            </div>
          </div>

          {/* Right: CTA + contact */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_tradein')} {model}</h3>
              <ul className="text-sm text-gray-500 flex flex-col gap-2 mb-6">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> {t('rachat_benefit_delivery')}</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> {t('rachat_benefit_data')}</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-[#00B4CC]" /> {t('rachat_benefit_payment')}</li>
              </ul>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder={t('rachat_form_name')}
                  value={contact.name}
                  onChange={e => setContact(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-all"
                />
                <input
                  type="tel"
                  placeholder={t('rachat_form_phone')}
                  value={contact.phone}
                  onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] transition-all"
                />
                <button
                  onClick={() => { if (contact.name && contact.phone) setSent(true) }}
                  disabled={!contact.name || !contact.phone}
                  className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all cursor-pointer"
                >
                  {t('rachat_sell_for')} {estimatedPrice} €
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
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">{t('rachat_title')}</h1>
          <p className="text-sm text-[#555555] mt-0.5">{t('rachat_subtitle')}</p>
        </div>
        <button
          onClick={() => setShowStores(true)}
          className="flex items-center gap-2 px-6 py-3 border-2 border-[#1B2A4A] text-[#1B2A4A] rounded-xl font-semibold hover:bg-[#1B2A4A] hover:text-white transition-all cursor-pointer"
        >
          <MapPin size={18} />
          {t('rachat_stores_title')}
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
              <ArrowLeft size={14} /> {t('rachat_back_btn')}
            </button>
          )}

          {/* STEP 1 — Modèle */}
          {step === 1 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step1_title')}</h2>
              <p className="text-sm text-gray-400 mb-1">{t('rachat_step1_sub')}</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ {t('rachat_goto')} <strong>{t('rachat_step1_path')}</strong>
              </div>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] bg-white mb-4"
              >
                <option value="">{t('rachat_step1_placeholder')}</option>
                {IPHONE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button
                onClick={next} disabled={!model}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
              >
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 2 — Stockage */}
          {step === 2 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step2_title')}</h2>
              <p className="text-sm text-gray-400 mb-1">{t('rachat_step2_sub')}</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ {t('rachat_goto')} <strong>{t('rachat_step2_path')}</strong>
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
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 3 — Batterie */}
          {step === 3 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step3_title')}</h2>
              <p className="text-sm text-gray-400 mb-1">{t('rachat_step3_sub')}</p>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-xl px-4 py-2.5 mb-4">
                ℹ️ {t('rachat_goto')} <strong>{t('rachat_step3_path')}</strong>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                <div className={`p-4 rounded-xl border-2 transition-all ${!answers.batteryUnknown ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200'}`}>
                  <p className="text-sm font-medium text-[#1B2A4A] mb-2">{t('rachat_step3_input')}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1" max="100"
                      value={answers.battery}
                      onChange={e => { setAns('battery', e.target.value); setAns('batteryUnknown', false) }}
                      placeholder={t('rachat_step3_placeholder')}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#00B4CC]"
                    />
                    <span className="text-gray-500 font-medium">%</span>
                  </div>
                </div>
                <Radio
                  label={t('rachat_step3_unknown')}
                  desc={t('rachat_step3_unknown_desc')}
                  selected={answers.batteryUnknown}
                  onClick={() => { setAns('batteryUnknown', true); setAns('battery', '85') }}
                />
              </div>
              <button
                onClick={next} disabled={!answers.battery && !answers.batteryUnknown}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
              >
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 4 — Vérification fonctionnelle (6 sous-questions) */}
          {step === 4 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step4_title')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step4_sub')}</p>

              {/* Réponses déjà données */}
              {FUNC_QUESTIONS.slice(0, funcStep).map(q => (
                <div key={q.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm text-gray-600">{t(q.labelKey).split(' ').slice(0, 4).join(' ')}...</span>
                  </div>
                  <button onClick={() => setAns('funcStep', q.key === 'power' ? 0 : FUNC_QUESTIONS.findIndex(f => f.key === q.key))}
                    className="text-xs text-[#00B4CC] cursor-pointer">{t('rachat_edit')}</button>
                </div>
              ))}

              {!funcDone ? (
                <div className="border-2 border-[#00B4CC]/20 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-400 mb-2">{funcStep + 1}/6</p>
                  <p className="font-medium text-[#1B2A4A] text-sm mb-4">{t(curFunc.labelKey)}</p>
                  <div className="flex gap-3">
                    {[[t('rachat_yes'), true], [t('rachat_no'), false]].map(([label, val]) => (
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
                  {t('rachat_continue')}
                </button>
              )}
            </div>
          )}

          {/* STEP 5 — Fonctionnalité écran */}
          {step === 5 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step5_title')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step5_sub')}</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'issues_spots', label: t('rachat_screen_spots') },
                  { val: 'issues_pixels', label: t('rachat_screen_pixels') },
                  { val: 'issues_lines', label: t('rachat_screen_lines') },
                  { val: 'ok', label: t('rachat_screen_all_ok') },
                ].map(({ val, label }) => (
                  <Radio key={val} label={label} selected={answers.screenFunc === val}
                    onClick={() => setAns('screenFunc', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenFunc}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 6 — Fissures écran */}
          {step === 6 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_step6_title')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step6_sub')}</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissures', label: t('rachat_cracks_cracks'), desc: t('rachat_cracks_cracks_d') },
                  { val: 'eclats', label: t('rachat_cracks_chips'), desc: t('rachat_cracks_chips_d') },
                  { val: 'raye', label: t('rachat_cracks_scratched'), desc: t('rachat_cracks_scratched_d') },
                  { val: 'ok', label: t('rachat_cracks_none') },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.screenCracks === val}
                    onClick={() => setAns('screenCracks', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenCracks}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 7 — Usure écran */}
          {step === 7 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_question_screen')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step7_sub')}</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'usure_visible', label: t('rachat_wear_visible'), desc: t('rachat_screen_visible_d') },
                  { val: 'quelques', label: t('rachat_wear_some'), desc: t('rachat_screen_some_d') },
                  { val: 'minimes', label: t('rachat_wear_minimal'), desc: t('rachat_screen_minimal_d') },
                  { val: 'ok', label: t('rachat_wear_none'), desc: t('rachat_screen_none_d') },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.screenWear === val}
                    onClick={() => setAns('screenWear', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.screenWear}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 8 — Côtés */}
          {step === 8 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_question_sides')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step8_sub')}</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissure', label: t('rachat_frame_cracked'), desc: t('rachat_frame_cracked_d') },
                  { val: 'usure_visible', label: t('rachat_wear_visible'), desc: t('rachat_frame_visible_d') },
                  { val: 'quelques', label: t('rachat_wear_some'), desc: t('rachat_frame_some_d') },
                  { val: 'minimes', label: t('rachat_wear_minimal'), desc: t('rachat_frame_minimal_d') },
                  { val: 'ok', label: t('rachat_wear_none'), desc: t('rachat_frame_none_d') },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.frame === val}
                    onClick={() => setAns('frame', val)} />
                ))}
              </div>
              <button onClick={next} disabled={!answers.frame}
                className="w-full bg-[#1B2A4A] hover:bg-[#243660] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                {t('rachat_continue')}
              </button>
            </div>
          )}

          {/* STEP 9 — Dos */}
          {step === 9 && (
            <div>
              <h2 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-1">{t('rachat_question_back')}</h2>
              <p className="text-sm text-gray-400 mb-4">{t('rachat_step9_sub')}</p>
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { val: 'fissure', label: t('rachat_backc_cracked'), desc: t('rachat_backc_cracked_d') },
                  { val: 'usure_visible', label: t('rachat_wear_visible'), desc: t('rachat_backc_visible_d') },
                  { val: 'quelques', label: t('rachat_wear_some'), desc: t('rachat_backc_some_d') },
                  { val: 'minimes', label: t('rachat_wear_minimal'), desc: t('rachat_backc_minimal_d') },
                  { val: 'ok', label: t('rachat_wear_none'), desc: t('rachat_backc_none_d') },
                ].map(({ val, label, desc }) => (
                  <Radio key={val} label={label} desc={desc} selected={answers.back === val}
                    onClick={() => setAns('back', val)} />
                ))}
              </div>
              <button onClick={() => setDone(true)} disabled={!answers.back}
                className="w-full bg-[#00B4CC] hover:bg-[#0099b3] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                {t('rachat_see_estimate')}
              </button>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
