import { pdfHeader, pdfFooter } from './pdfBrand'

export const generateReviewGooglePdf = async (p) => {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210
  pdfHeader(doc, 'Merci !')
  let y = 60

  doc.setFontSize(22)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(27, 42, 74)
  doc.text(`Merci ${p.to_name || ''} !`, pageWidth / 2, y, { align: 'center' })
  y += 15

  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(60, 60, 60)
  const line = `Vous avez acquis votre ${p.phone_name || 'téléphone'} chez ${p.magasin_nom || 'nous'}.`
  doc.text(line, pageWidth / 2, y, { align: 'center' })
  y += 20

  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('Prenez 30 secondes pour laisser un avis Google :', pageWidth / 2, y, { align: 'center' })
  y += 15

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(0, 180, 204)
  const url = p.google_review_url || ''
  const urlLines = doc.splitTextToSize(url, pageWidth - 30)
  urlLines.forEach((l) => {
    doc.text(l, pageWidth / 2, y, { align: 'center' })
    y += 8
  })

  pdfFooter(doc)
  return doc.output('datauristring').split(',')[1]
}
