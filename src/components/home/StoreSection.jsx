import { MapPin } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

const STORES = [
  { name: "Seb Telecom — Anderlecht", address: "Chaussée de Mons 711, 1070 Anderlecht", active: true },
  { name: "Seb Telecom — Molenbeek", address: "Rue de l'Église Sainte-Anne 93, 1081 Molenbeek", active: true },
  { name: "Seb Telecom — Louise", address: "Rue du Bailli 22, 1000 Bruxelles", active: true },
  { name: "Seb Telecom — Rue Neuve", address: "Pass. du Nord 23, 1000 Bruxelles", active: true },
  { name: "Seb Telecom — Tubize", address: "Rue de Bruxelles 18, 1400 Tubize", active: true },
  { name: "Seb Telecom — Saint-Gilles", address: "Chaussée de Forest 26, Saint-Gilles", active: true },
  { name: "Seb Telecom — Enghien", address: "Rue d'Hérinnes 38, 7850 Enghien", active: false, label: "Bientôt" },
]

export default function StoreSection() {
  const { t } = useLanguage()

  return (
    <section className="bg-[#F8F9FA] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-poppins font-bold text-2xl text-[#1B2A4A]">{t('stores_title')}</h2>
          <p className="text-[#555555] text-sm mt-1">{t('stores_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STORES.map((store) => (
            <div
              key={store.name}
              className={`relative bg-white rounded-xl border p-4 flex items-start gap-3 transition-all duration-200 ${
                store.active
                  ? 'border-gray-200 hover:border-[#00B4CC] hover:shadow-md group cursor-pointer'
                  : 'border-gray-200 opacity-60 cursor-default'
              }`}
            >
              {!store.active && (
                <span className="absolute top-3 right-3 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {t('stores_coming_soon')}
                </span>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                store.active
                  ? 'bg-[#00B4CC]/10 group-hover:bg-[#00B4CC]/20'
                  : 'bg-gray-100'
              }`}>
                <MapPin size={18} className={store.active ? 'text-[#00B4CC]' : 'text-gray-400'} />
              </div>
              <div className="min-w-0 pr-10">
                <p className="font-semibold text-[#1B2A4A] text-sm leading-tight mb-0.5">
                  {store.name.replace('Seb Telecom — ', '')}
                </p>
                <p className="text-xs text-[#888] leading-snug">{store.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
