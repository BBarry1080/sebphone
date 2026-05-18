import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Smartphone, Tablet, Watch, Headphones, Laptop, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const services = [
  {
    Icon: Smartphone,
    titleKey: 'services_phones_title',
    descKey: 'services_phones_desc',
    tagKeys: ['condition_new', 'condition_refurbished', 'condition_used'],
    to: '/iphone',
  },
  {
    Icon: Tablet,
    titleKey: 'services_tablets_title',
    descKey: 'services_tablets_desc',
    tagKeys: ['condition_new', 'condition_refurbished', 'condition_used'],
    to: '/catalogue/tablette',
  },
  {
    Icon: Watch,
    titleKey: 'services_watches_title',
    descKey: 'services_watches_desc',
    to: '/catalogue/montre',
  },
  {
    Icon: Headphones,
    titleKey: 'services_earphones_title',
    descKey: 'services_earphones_desc',
    to: '/catalogue/ecouteur',
  },
  {
    Icon: Laptop,
    titleKey: 'services_computers_title',
    descKey: 'services_computers_desc',
    to: '/catalogue/ordinateur',
  },
  {
    Icon: ShoppingBag,
    titleKey: 'services_accessories_title',
    descKey: 'services_accessories_desc',
    to: '/catalogue/accessoire',
  },
];

export default function Services() {
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
            {t('services_title')}
          </h2>
          <p className="text-[#555555] text-base max-w-xl mx-auto">
            {t('services_subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {services.map(({ Icon, titleKey, descKey, tagKeys, to }, i) => (
            <motion.div
              key={titleKey}
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
                <h3 className="font-poppins font-semibold text-[#1B2A4A] text-sm md:text-base mb-2">{t(titleKey)}</h3>
                {tagKeys && (
                  <div className="flex flex-wrap justify-center gap-1 mb-2">
                    {tagKeys.map((tagKey) => (
                      <span key={tagKey} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-[#00B4CC] border border-cyan-100">
                        {t(tagKey)}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[#555555] text-xs md:text-sm leading-relaxed">{t(descKey)}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
