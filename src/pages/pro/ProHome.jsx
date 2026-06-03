import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Smartphone, Tablet, Monitor, Watch, Headphones } from 'lucide-react'
import { useProAccount } from '../../hooks/useProAccount'
import ProLayout from '../../components/pro/ProLayout'
import BestSellersPro from '../../components/pro/BestSellersPro'
import GradeBadge from '../../components/pro/GradeBadge'

export default function ProHome() {
  const navigate = useNavigate()
  const proAccount = useProAccount()

  useEffect(() => {
    const stored = localStorage.getItem('sebphone_pro')
    if (!stored) navigate('/pro')
  }, [])

  const categories = [
    { label: 'Smartphones', icon: Smartphone, href: '/pro/catalogue/telephone' },
    { label: 'Tablettes', icon: Tablet, href: '/pro/catalogue/tablette' },
    { label: 'Ordinateurs', icon: Monitor, href: '/pro/catalogue/ordinateur' },
    { label: 'Montres', icon: Watch, href: '/pro/catalogue/montre' },
    { label: 'Écouteurs', icon: Headphones, href: '/pro/catalogue/ecouteur' },
  ]

  return (
    <ProLayout>
      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#00B4CC] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <span className="inline-block bg-white/15 px-3 py-1 rounded-full text-xs font-bold mb-4">
            💼 Espace Professionnel
          </span>
          <h1 className="text-3xl md:text-4xl font-black mb-3">
            Bienvenue {proAccount?.company_name || ''}
          </h1>
          <p className="text-white/80 max-w-xl">
            Accédez à nos tarifs revendeurs sur tout notre stock.
            Prix négociés, stock en temps réel, commande rapide.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link key={cat.href} to={cat.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-[#00B4CC] transition-all">
              <cat.icon size={28} className="text-[#00B4CC]" />
              <span className="text-sm font-bold text-[#1B2A4A]">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mb-12">
        <h2 className="text-2xl font-black text-[#1B2A4A] mb-1">
          Comprendre nos grades
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Le système de classification pour nos revendeurs
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { grade: 'A+', desc: 'Excellent état, comme neuf. Aucune trace d\'usure visible.' },
            { grade: 'B', desc: 'Très bon état. Traces d\'usage minimes, parfaitement fonctionnel.' },
            { grade: 'C', desc: 'État correct. Marques d\'usage visibles mais pleinement fonctionnel.' },
            { grade: 'C-BAT', desc: 'Fonctionnel — batterie à remplacer pour des performances optimales.' },
            { grade: 'C-REF', desc: 'Rayures présentes — à reconditionner esthétiquement.' },
            { grade: 'PIECE', desc: 'Nécessite le remplacement d\'une pièce détachée.' },
            { grade: 'LCD', desc: 'Écran / LCD à remplacer.' },
          ].map((item) => (
            <div key={item.grade}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
              <GradeBadge grade={item.grade} />
              <p className="text-sm text-gray-600 flex-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-bold text-amber-800 text-sm mb-1">
              TVA sur marge
            </p>
            <p className="text-xs text-amber-700">
              Régime Art. 313-343 du Code TVA belge. La TVA n'est pas
              déductible — le prix affiché est le prix final. Idéal pour
              la revente à des particuliers.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="font-bold text-blue-800 text-sm mb-1">
              TVA classique 21%
            </p>
            <p className="text-xs text-blue-700">
              TVA déductible récupérable. Le prix se décompose en HT +
              TVA 21%. Idéal pour la revente B2B avec facture TVA.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-black text-[#1B2A4A] mb-1">
          Best-sellers Pro
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Nos meilleures offres pour revendeurs
        </p>
        <BestSellersPro />
      </div>
    </ProLayout>
  )
}
