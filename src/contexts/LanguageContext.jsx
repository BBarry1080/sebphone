import { createContext, useContext, useState } from 'react'

const LANGUAGES = {
  fr: { label: 'Français', flag: '🇧🇪🇫🇷' },
  nl: { label: 'Nederlands', flag: '🇧🇪🇳🇱' },
  en: { label: 'English', flag: '🇬🇧' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
}

const COUNTRIES = [
  {
    name: 'België / Belgique',
    flag: '🇧🇪',
    langs: ['fr', 'nl', 'en'],
  },
  {
    name: 'France',
    flag: '🇫🇷',
    langs: ['fr', 'en'],
  },
  {
    name: 'Deutschland',
    flag: '🇩🇪',
    langs: ['de', 'en'],
  },
  {
    name: 'Nederland',
    flag: '🇳🇱',
    langs: ['nl', 'en'],
  },
]

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem('sebphone_lang') || 'fr'
  )
  const [country, setCountry] = useState(
    localStorage.getItem('sebphone_country') || 'België / Belgique'
  )

  const changeLang = (newLang, newCountry) => {
    setLang(newLang)
    if (newCountry) setCountry(newCountry)
    localStorage.setItem('sebphone_lang', newLang)
    if (newCountry) localStorage.setItem('sebphone_country', newCountry)
  }

  return (
    <LanguageContext.Provider value={{ lang, country, changeLang, LANGUAGES, COUNTRIES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
export { LANGUAGES, COUNTRIES }
