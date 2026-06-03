import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Smartphone, Tablet, Monitor, Watch, Headphones } from 'lucide-react'
import { useProAccount } from '../../hooks/useProAccount'
import ProLayout from '../../components/pro/ProLayout'
import BestSellersPro from '../../components/pro/BestSellersPro'

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
