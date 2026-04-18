import { motion } from 'framer-motion';
import { Smartphone, Tablet, Watch, Headphones, Laptop, ShoppingBag } from 'lucide-react';

const services = [
  {
    Icon: Smartphone,
    title: 'Smartphones reconditionnés',
    desc: 'iPhone et Samsung reconditionnés. Testés, certifiés et garantis 6 à 24 mois.',
  },
  {
    Icon: Tablet,
    title: 'Tablettes reconditionnées',
    desc: 'iPad et Galaxy Tab reconditionés. Écran parfait, batterie vérifiée, garantie incluse.',
  },
  {
    Icon: Watch,
    title: 'Montres connectées',
    desc: 'Apple Watch et Galaxy Watch. Autonomie et toutes les fonctions vérifiées.',
  },
  {
    Icon: Headphones,
    title: 'Écouteurs & casques',
    desc: 'AirPods, Galaxy Buds et casques reconditionnés. Qualité audio testée et garantie.',
  },
  {
    Icon: Laptop,
    title: 'Ordinateurs reconditionnés',
    desc: 'MacBook et PC portables reconditionnés. Tests complets, garantie 12 mois incluse.',
  },
  {
    Icon: ShoppingBag,
    title: 'Accessoires',
    desc: 'Coques, protections, câbles, chargeurs. Compatibles iPhone et Samsung.',
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
          {services.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group flex flex-col items-center text-center p-5 md:p-6 rounded-2xl bg-white border border-gray-100 hover:border-[#00B4CC] hover:shadow-lg transition-all duration-200"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 group-hover:bg-[#00B4CC] flex items-center justify-center mb-4 transition-colors duration-200">
                <Icon size={26} className="text-[#00B4CC] group-hover:text-white transition-colors duration-200" />
              </div>
              <h3 className="font-poppins font-semibold text-[#1B2A4A] text-sm md:text-base mb-2">{title}</h3>
              <p className="text-[#555555] text-xs md:text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
