import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Smartphone, Tablet, Watch, Headphones, Laptop, ShoppingBag } from 'lucide-react';

const services = [
  {
    Icon: Smartphone,
    title: 'Vente de téléphones',
    desc: 'iPhone et Samsung au meilleur prix. Testés, certifiés et garantis.',
    tags: ['Neuf', 'Reconditionné', 'Occasion'],
    to: '/iphone',
  },
  {
    Icon: Tablet,
    title: 'Vente de tablettes',
    desc: 'iPad et Galaxy Tab. Écran parfait, batterie vérifiée, garantie incluse.',
    tags: ['Neuf', 'Reconditionné', 'Occasion'],
    to: '/catalogue/tablette',
  },
  {
    Icon: Watch,
    title: 'Montres connectées',
    desc: 'Apple Watch et Galaxy Watch. Autonomie et toutes les fonctions vérifiées.',
    to: '/catalogue/montre',
  },
  {
    Icon: Headphones,
    title: 'Écouteurs & casques',
    desc: 'AirPods, Galaxy Buds et casques reconditionnés. Qualité audio testée et garantie.',
    to: '/catalogue/ecouteur',
  },
  {
    Icon: Laptop,
    title: 'Ordinateurs reconditionnés',
    desc: 'MacBook et PC portables reconditionnés. Tests complets, garantie 12 mois incluse.',
    to: '/catalogue/ordinateur',
  },
  {
    Icon: ShoppingBag,
    title: 'Accessoires',
    desc: 'Coques, protections, câbles, chargeurs. Compatibles iPhone et Samsung.',
    to: '/catalogue/accessoire',
  },
];

export default function Services() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-poppins font-bold text-3xl md:text-4xl text-[#1B2A4A] mb-3">
            NOS <span className="text-[#00B4CC]">SERVICES</span>
          </h2>
          <p className="text-[#555555] text-base max-w-xl mx-auto">
            Achat, vente d'appareils électroniques &amp; accessoires
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {services.map(({ Icon, title, desc, tags, to }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                to={to}
                className="group flex flex-col items-center text-center h-full p-5 md:p-6 rounded-2xl bg-white border border-gray-100 hover:border-[#00B4CC] hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 group-hover:bg-[#00B4CC] flex items-center justify-center mb-4 transition-colors duration-200">
                  <Icon size={26} className="text-[#00B4CC] group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="font-poppins font-semibold text-[#1B2A4A] text-sm md:text-base mb-2">{title}</h3>
                {tags && (
                  <div className="flex flex-wrap justify-center gap-1 mb-2">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-[#00B4CC] border border-cyan-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[#555555] text-xs md:text-sm leading-relaxed">{desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
