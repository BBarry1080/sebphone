import { useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

const FLAGS = {
  'België / Belgique': (
    <svg width="20" height="14" viewBox="0 0 20 14" style={{display:'inline-block'}}>
      <rect width="6.67" height="14" fill="#000"/>
      <rect x="6.67" width="6.67" height="14" fill="#FFD90C"/>
      <rect x="13.33" width="6.67" height="14" fill="#F00"/>
    </svg>
  ),
  'France': (
    <svg width="20" height="14" viewBox="0 0 20 14" style={{display:'inline-block'}}>
      <rect width="6.67" height="14" fill="#002395"/>
      <rect x="6.67" width="6.67" height="14" fill="#fff"/>
      <rect x="13.33" width="6.67" height="14" fill="#ED2939"/>
    </svg>
  ),
  'Deutschland': (
    <svg width="20" height="14" viewBox="0 0 20 14" style={{display:'inline-block'}}>
      <rect width="20" height="4.67" fill="#000"/>
      <rect y="4.67" width="20" height="4.67" fill="#DD0000"/>
      <rect y="9.33" width="20" height="4.67" fill="#FFCE00"/>
    </svg>
  ),
  'Nederland': (
    <svg width="20" height="14" viewBox="0 0 20 14" style={{display:'inline-block'}}>
      <rect width="20" height="4.67" fill="#AE1C28"/>
      <rect y="4.67" width="20" height="4.67" fill="#fff"/>
      <rect y="9.33" width="20" height="4.67" fill="#21468B"/>
    </svg>
  ),
}

export default function LanguageSelector() {
  const { lang, country, changeLang, COUNTRIES } = useLanguage()
  const [open, setOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(null)

  const currentFlag = FLAGS[country] || '🌐'

  return (
    <div className="relative">
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium
                   text-gray-700 hover:text-[#1B2A4A] transition-colors">
        <span className="inline-flex items-center">{currentFlag}</span>
        <span className="uppercase text-xs font-bold">{lang}</span>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); setSelectedCountry(null) }}
          />
          <div className="absolute right-0 top-8 z-50 bg-white rounded-2xl
                          shadow-xl border border-gray-100 w-72 p-4">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-[#1B2A4A]">
                Sélectionner la région et la langue
              </p>
              <button
                onClick={() => { setOpen(false); setSelectedCountry(null) }}
                className="text-gray-400 hover:text-gray-600 text-lg">
                ×
              </button>
            </div>

            {/* Liste pays */}
            <div className="space-y-2">
              {COUNTRIES.map(c => (
                <div key={c.name}>
                  <button
                    onClick={() => setSelectedCountry(
                      selectedCountry === c.name ? null : c.name
                    )}
                    className={`w-full flex items-center justify-between
                                px-3 py-2 rounded-xl text-sm transition-all
                      ${selectedCountry === c.name || country === c.name
                        ? 'bg-[#f0f7ff] border border-[#1B2A4A]'
                        : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center">{FLAGS[c.name] || c.flag}</span>
                      <span className="font-medium text-[#1B2A4A]">{c.name}</span>
                    </div>
                    {/* Boutons langues */}
                    <div className="flex gap-1">
                      {c.langs.map(l => (
                        <button
                          key={l}
                          onClick={(e) => {
                            e.stopPropagation()
                            changeLang(l, c.name)
                            setOpen(false)
                            setSelectedCountry(null)
                          }}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold
                            uppercase border transition-all
                            ${lang === l && country === c.name
                              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
