import { motion } from 'framer-motion';
import { Smartphone, Battery, Camera, Mic, TouchpadOff, Wrench } from 'lucide-react';

const services = [
  {
    Icon: Smartphone,
    title: 'Écran & Vitre arrière',
    desc: 'Remplacement écran cassé, vitre arrière fissurée. Pièces de qualité OEM.',
  },
  {
    Icon: Battery,
    title: 'Batterie',
    desc: 'Batterie neuve avec autonomie restaurée à 100%. Original ou OEM certifié.',
  },
  {
    Icon: Camera,
    title: 'Appareil photo',
    desc: 'Remplacement caméra avant/arrière. Photos nettes garanties.',
  },
  {
    Icon: Mic,
    title: 'Micro & Haut-parleur',
    desc: 'Problème de son ? Réparation micro, haut-parleur, sonnerie.',
  },
  {
    Icon: TouchpadOff,
    title: 'Tactile',
    desc: 'Dalle tactile non réactive ? Remplacement avec calibrage complet.',
  },
  {
    Icon: Wrench,
    title: 'Diagnostic offert',
    desc: 'Diagnostic gratuit avant toute réparation. Devis immédiat et transparent.',
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
            Réparation professionnelle de smartphones — rapide, certifiée, garantie.
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
