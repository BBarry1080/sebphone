import { motion } from 'framer-motion';
import { ShieldCheck, Star, Truck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const reasons = [
  { Icon: ShieldCheck, titleKey: 'whyus_quality_title', descKey: 'whyus_quality_desc' },
  { Icon: Star,        titleKey: 'whyus_price_title',   descKey: 'whyus_price_desc' },
  { Icon: Truck,       titleKey: 'whyus_service_title', descKey: 'whyus_service_desc' },
];

export default function WhyUs() {
  const { t } = useLanguage();
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
            {t('whyus_title')}
          </h2>
          <p className="text-[#555555] text-base max-w-lg mx-auto">
            {t('whyus_subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {reasons.map(({ Icon, titleKey, descKey }, i) => (
            <motion.div
              key={titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-[#F5F5F5] rounded-2xl p-8 flex flex-col items-center text-center hover:shadow-lg hover:bg-white border border-transparent hover:border-[#00B4CC]/20 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mb-5">
                <Icon size={32} className="text-[#00B4CC]" />
              </div>
              <h3 className="font-poppins font-bold text-[#1B2A4A] text-xl mb-3">{t(titleKey)}</h3>
              <p className="text-[#555555] text-sm leading-relaxed">{t(descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
