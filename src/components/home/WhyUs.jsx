import { motion } from 'framer-motion';
import { ShieldCheck, Star, Truck } from 'lucide-react';

const reasons = [
  {
    Icon: ShieldCheck,
    title: 'Stock certifié',
    desc: 'Chaque téléphone est testé et vérifié par nos techniciens avant mise en vente. Qualité garantie.',
  },
  {
    Icon: Star,
    title: 'Pièces de qualité',
    desc: 'Nous utilisons uniquement des pièces OEM ou d\'origine pour les reconditionnés. Durabilité assurée.',
  },
  {
    Icon: Truck,
    title: 'Livraison rapide',
    desc: 'Livraison en 24-48h partout en Belgique. Click & Collect disponible en magasin.',
  },
];

export default function WhyUs() {
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
            POURQUOI NOUS <span className="text-[#00B4CC]">CHOISIR ?</span>
          </h2>
          <p className="text-[#555555] text-base max-w-lg mx-auto">
            SEBPHONE, c'est la confiance, la qualité et le service — depuis votre canapé jusqu'à votre porte.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {reasons.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-[#F5F5F5] rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-lg hover:bg-white border border-transparent hover:border-[#00B4CC]/20 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mb-5">
                <Icon size={32} className="text-[#00B4CC]" />
              </div>
              <h3 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-3">{title}</h3>
              <p className="text-[#555555] text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
