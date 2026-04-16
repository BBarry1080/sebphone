import { motion } from 'framer-motion';
import { CheckCircle, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

export default function ConfirmationCard({ phone, form }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center text-center py-8"
    >
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle size={40} className="text-[#22C55E]" />
      </div>

      <h2 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">
        Réservation confirmée !
      </h2>
      <p className="text-[#555555] text-sm mb-6 max-w-sm">
        Merci <strong>{form.firstName}</strong> ! Votre réservation pour le{' '}
        <strong>{phone?.name}</strong> a bien été enregistrée.
      </p>

      {/* Details card */}
      <div className="w-full bg-[#F5F5F5] rounded-2xl p-6 mb-6 text-left">
        <h3 className="font-semibold text-[#1B2A4A] text-sm mb-4">Récapitulatif</h3>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-[#555555]">Téléphone</span>
            <span className="font-medium text-[#1B2A4A]">{phone?.name}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-[#555555]">Prix total</span>
            <span className="font-bold text-[#00B4CC]">{phone?.price}€</span>
          </li>
          <li className="flex justify-between">
            <span className="text-[#555555]">Acompte</span>
            <span className="font-bold text-[#1B2A4A]">50€</span>
          </li>
          <li className="flex justify-between">
            <span className="text-[#555555]">Mode</span>
            <span className="font-medium text-[#1B2A4A]">
              {form.delivery === 'collect' ? 'Click & Collect' : 'Livraison à domicile'}
            </span>
          </li>
        </ul>
      </div>

      {/* Next steps */}
      <div className="w-full bg-cyan-50 border border-cyan-200 rounded-2xl p-5 mb-6 text-left">
        <p className="font-semibold text-[#00B4CC] text-sm mb-3">Prochaines étapes</p>
        <ol className="flex flex-col gap-2">
          {[
            'Notre équipe vous contacte sous 2h pour confirmer la disponibilité',
            'Paiement de l\'acompte de 50€ pour sécuriser le téléphone',
            form.delivery === 'collect'
              ? 'Venez récupérer votre téléphone en magasin'
              : 'Livraison à votre adresse sous 24-48h',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#555555]">
              <span className="w-5 h-5 rounded-full bg-[#00B4CC] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Contact */}
      <p className="text-sm text-[#555555] mb-6">
        Une question ? Contactez-nous :
      </p>
      <div className="flex gap-4 mb-8">
        <a
          href="tel:+3249240540057"
          className="flex items-center gap-2 text-[#00B4CC] font-medium text-sm hover:underline"
        >
          <Phone size={16} />
          +32(0)492/40.54.57
        </a>
        <a
          href="mailto:contact@sebphone.be"
          className="flex items-center gap-2 text-[#00B4CC] font-medium text-sm hover:underline"
        >
          <Mail size={16} />
          Email
        </a>
      </div>

      <Button variant="secondary" size="md" onClick={() => navigate('/boutique')}>
        <ArrowLeft size={16} className="mr-1" />
        Retour à la boutique
      </Button>
    </motion.div>
  );
}
