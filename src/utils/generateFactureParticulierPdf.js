import { pdfHeader, pdfFooter } from './pdfBrand'

export const generateFactureParticulierPdf = async (p) => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210
  pdfHeader(doc, 'Facture')
  let y = 48

  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('CLIENT', 15, y)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(11)
  doc.text(p.to_name || '', 15, y + 6)
  doc.setFontSize(9)
  doc.text(`Date : ${p.pickup_date || ''}`, pageWidth - 15, y, { align: 'right' })
  doc.text(`Réf : ${p.reservation_code || ''}`, pageWidth - 15, y + 5, { align: 'right' })
  doc.text(`Magasin : ${p.magasin_nom || ''}`, pageWidth - 15, y + 10, { align: 'right' })

  y += 26
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.setDrawColor(27, 42, 74)
  doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y)
  y += 6
  doc.text('Appareil', 15, y)
  y += 6
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.text(`${p.phone_name || ''}`, 15, y); y += 5
  doc.text(`Couleur : ${p.phone_color || '—'}   ·   Stockage : ${p.phone_storage || '—'}`, 15, y); y += 5
  doc.text(`État : ${p.phone_condition || '—'}   ·   Grade : ${p.phone_grade || '—'}`, 15, y); y += 5
  doc.text(`IMEI : ${p.phone_imei || '—'}`, 15, y); y += 8

  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold'); doc.setFontSize(11)
  doc.text('Prix', 15, y); y += 6
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  doc.text('Prix initial', 15, y)
  doc.text(`${p.price_original || '—'}`, pageWidth - 15, y, { align: 'right' }); y += 5
  if (p.discount_amount && p.discount_amount !== '0€') {
    doc.text('Remise', 15, y)
    doc.text(`-${p.discount_amount}`, pageWidth - 15, y, { align: 'right' }); y += 5
  }
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2)
  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(0, 180, 204)
  doc.text('Total', 15, y)
  doc.text(`${p.price_total || '—'}`, pageWidth - 15, y, { align: 'right' })
  doc.setTextColor(0, 0, 0); y += 8

  doc.setFontSize(9); doc.setFont(undefined, 'normal')
  doc.text(`${p.payment_label || ''}   ·   ${p.payment_method || ''}`, 15, y); y += 5
  doc.text(`Payé : ${p.deposit_paid || '—'}   ·   Restant : ${p.remaining || '—'}`, 15, y); y += 6
  if (p.warning_message) {
    doc.setTextColor(200, 100, 0)
    doc.text(p.warning_message, 15, y); doc.setTextColor(0, 0, 0); y += 6
  }

  y += 4
  doc.setDrawColor(27, 42, 74); doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFontSize(9)
  doc.text(`${p.magasin_nom || ''} — ${p.magasin_adresse || ''}`, 15, y); y += 5
  doc.text(`Garantie 24 mois — jusqu'au ${p.warranty_expiry || '—'}`, 15, y); y += 8
  doc.setFont(undefined, 'italic'); doc.setTextColor(120, 120, 120)
  doc.text(p.tva_mention || '', 15, y)

  pdfFooter(doc)
  return doc.output('datauristring').split(',')[1]
}
