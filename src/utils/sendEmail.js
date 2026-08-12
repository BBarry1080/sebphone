import emailjs from '@emailjs/browser'
import { LOGO_SEBPHONE_BASE64 } from '../lib/logos'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_hfoq4dg'
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'rqbaYNMIGNP6IQB9O'

emailjs.init(PUBLIC_KEY)

export async function generateOrderConfirmationPdf(p) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210

  doc.setFillColor(27, 42, 74)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.addImage(LOGO_SEBPHONE_BASE64, 'PNG', 15, 7, 21, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Confirmation de commande', 42, 20)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL)', pageWidth - 15, 14, { align: 'right' })
  doc.text('Rue du Bailli 22, 1000 Bruxelles', pageWidth - 15, 19, { align: 'right' })
  doc.text('TVA BE 1028.764.677', pageWidth - 15, 24, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  let y = 48

  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(`Bonjour ${p.to_name || 'Client'},`, 15, y); y += 8
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.text('Votre commande est confirmée. Voici le récapitulatif :', 15, y); y += 10

  doc.setDrawColor(27, 42, 74); doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold'); doc.setFontSize(11)
  doc.text('Appareil', 15, y); y += 6
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  doc.text(`${p.phone_name || ''}`, 15, y); y += 5
  doc.text(`Couleur : ${p.phone_color || '—'}   ·   Stockage : ${p.phone_storage || '—'}   ·   Grade : ${p.phone_grade || '—'}`, 15, y); y += 8

  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold'); doc.setFontSize(11)
  doc.text('Paiement', 15, y); y += 6
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  doc.text(`${p.payment_label || ''}`, 15, y); y += 5
  doc.text(`Payé : ${p.deposit_paid || '—'}   ·   Restant : ${p.remaining || '—'}   ·   Total : ${p.price_total || '—'}`, 15, y); y += 6
  if (p.warning_message) {
    doc.setTextColor(200, 100, 0)
    doc.text(p.warning_message, 15, y); doc.setTextColor(0, 0, 0); y += 6
  }
  y += 2

  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold'); doc.setFontSize(11)
  doc.text('Retrait / Livraison', 15, y); y += 6
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  doc.text(`${p.pickup_mode || ''}   ·   ${p.pickup_date || ''}`, 15, y); y += 5
  doc.text(`${p.magasin_nom || ''} — ${p.magasin_adresse || ''}`, 15, y); y += 5
  doc.text(`Accessoires : ${p.accessory_pack || 'Aucun'}   ·   Remplacement batterie : ${p.battery_replace || 'Non'}`, 15, y); y += 8

  doc.setDrawColor(27, 42, 74); doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold')
  doc.setTextColor(0, 180, 204)
  doc.text(`Référence : ${p.reservation_code || ''}`, 15, y)

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL) — Rue du Bailli 22, 1000 Bruxelles — TVA BE 1028.764.677',
    pageWidth / 2, 285, { align: 'center' })
  doc.text('@sebtelecom — Instagram / TikTok / Snapchat',
    pageWidth / 2, 290, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}

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
      adresse: "Rue du Finistère 12, 1000 Bruxelles"
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

  if (!clientEmail) {
    console.error('❌ Pas d\'email client !')
    return false
  }

  try {
    const pdfBase64 = await generateOrderConfirmationPdf(templateParams)
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      { ...templateParams, my_attachment: pdfBase64 }
    )
    return true
  } catch (error) {
    console.error('❌ EmailJS erreur:', JSON.stringify(error))
    return false
  }
}
