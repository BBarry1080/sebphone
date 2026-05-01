import emailjs from '@emailjs/browser'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  || 'service_n3bi0nn'
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_hfoq4dg'
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'rqbaYNMIGNP6IQB9O'

emailjs.init(PUBLIC_KEY)

export async function sendConfirmationEmail(params) {
  const {
    clientEmail,
    clientName,
    phoneName,
    phoneColor,
    phoneStorage,
    grade,
    price,
    depositPaid,
    reservationCode,
    pickupMode,
    magasinId,
    magasinGmaps,
    pickupDate,
    accessoryPack,
    batteryReplace,
    accessoriesTotal,
    paymentMode,
  } = params

  const magasins = {
    "anderlecht": {
      nom: "Seb Telecom — Anderlecht",
      adresse: "Bergensesteenweg 711, 1070 Anderlecht"
    },
    "molenbeek": {
      nom: "Seb Telecom — Molenbeek",
      adresse: "Rue de l'Église Sainte-Anne 93, 1081 Koekelberg"
    },
    "rue-neuve": {
      nom: "Seb Telecom — Rue Neuve",
      adresse: "Pass. du N 23, 1000 Bruxelles"
    },
    "louise": {
      nom: "Seb Telecom — Louise",
      adresse: "Rue du Bailli 22, 1000 Bruxelles"
    }
  }

  const magasin = magasins[magasinId] || {
    nom: 'Magasin SebPhone',
    adresse: 'Bruxelles'
  }

  const isAcompte = paymentMode === 'acompte'
  const totalNum  = price || 0

  const templateParams = {
    to_email: clientEmail,
    to_name: clientName || 'Client',
    phone_name: phoneName || '',
    phone_color: phoneColor || '',
    phone_storage: phoneStorage || '',
    phone_grade: grade || '',
    phone_condition: '',
    payment_mode:   paymentMode || 'acompte',
    price_total:    totalNum + '€',
    deposit_paid:   isAcompte ? '50€' : totalNum + '€',
    remaining:      isAcompte ? (totalNum - 50) + '€' : '0€',
    payment_label:  isAcompte ? 'Acompte payé ✓' : 'Montant total payé ✓',
    warning_message: isAcompte ? "L'acompte de 50€ n'est pas remboursable." : '',
    reservation_code: reservationCode || '',
    reservation_url: `https://sebphone.be/commande/${reservationCode || ''}`,
    pickup_mode: pickupMode === 'click_collect'
      ? 'Click & Collect' : 'Livraison',
    magasin_nom: magasin.nom,
    magasin_adresse: magasin.adresse,
    magasin_gmaps: magasinGmaps || '#',
    pickup_date: pickupDate
      ? new Date(pickupDate).toLocaleDateString('fr-BE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'À définir avec le magasin',
    accessory_pack:    accessoryPack || 'Aucun',
    battery_replace:   batteryReplace ? 'Oui' : 'Non',
    accessories_total: (accessoriesTotal || 0) + '€',
    reply_to: 'contact@sebphone.be',
  }

  console.log('SERVICE_ID:', SERVICE_ID)
  console.log('TEMPLATE_ID:', TEMPLATE_ID)
  console.log('PUBLIC_KEY:', PUBLIC_KEY)
  console.log('clientEmail reçu:', clientEmail)
  console.log('to_email envoyé:', templateParams.to_email)
  console.log('to_name envoyé:', templateParams.to_name)
  console.log('reservation_code:', reservationCode)
  console.log('reservation_url:', templateParams.reservation_url)

  if (!clientEmail) {
    console.error('❌ Pas d\'email client !')
    return false
  }

  console.log('📧 Envoi email à:', clientEmail)
  console.log('📧 Params:', templateParams)

  try {
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams
    )
    console.log('✅ Email envoyé:', result)
    return true
  } catch (error) {
    console.error('❌ EmailJS erreur:', JSON.stringify(error))
    return false
  }
}
