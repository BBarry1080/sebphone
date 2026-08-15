import { LOGO_SEBTELECOM_BASE64 } from '../lib/logos'
import { lineTotal } from './cart'
import { MAGASINS } from './magasins'

export const generateTicketPdfBase64 = async (sale, magasinLabel, magasin = null) => {
  const adresse = MAGASINS[magasin]?.adresse || MAGASINS.louise.adresse
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210

  doc.setFillColor(27, 42, 74)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.addImage(LOGO_SEBTELECOM_BASE64, 'PNG', 15, 7, 21, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Facture', 42, 20)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL)', pageWidth - 15, 14, { align: 'right' })
  doc.text(adresse, pageWidth - 15, 19, { align: 'right' })
  doc.text('TVA BE 1028.764.677', pageWidth - 15, 24, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  let y = 48

  if (sale.clientNom) {
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('CLIENT', 15, y)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(11)
    doc.text(sale.clientNom, 15, y + 6)
  }
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(`Date : ${new Date(sale.created_at || Date.now()).toLocaleDateString('fr-BE')}`, pageWidth - 15, y, { align: 'right' })
  doc.text(`Ticket n° ${sale.ticketNumber || ''}`, pageWidth - 15, y + 5, { align: 'right' })
  doc.text(`Magasin : ${magasinLabel || ''}`, pageWidth - 15, y + 10, { align: 'right' })
  if (sale.staffName) {
    doc.text(`Vendeur : ${sale.staffName}`, pageWidth - 15, y + 15, { align: 'right' })
  }

  y += 28
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.setDrawColor(27, 42, 74)
  doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y)
  y += 5
  doc.text('Description', 15, y)
  doc.text('Qté', 120, y, { align: 'center' })
  doc.text('Prix HT', 155, y, { align: 'right' })
  doc.text('Total TTC', pageWidth - 15, y, { align: 'right' })
  y += 2
  doc.line(15, y, pageWidth - 15, y)
  y += 6

  doc.setFont(undefined, 'normal')
  const rate = 21
  let totalTTC = 0
  ;(sale.items || []).forEach((c) => {
    const tot = lineTotal(c)
    totalTTC += tot
    const totHT = tot / (1 + rate / 100)
    doc.text(String(c.item_name || '').slice(0, 55), 15, y)
    doc.text(String(c.quantity), 120, y, { align: 'center' })
    doc.text(`${totHT.toFixed(2)}€`, 155, y, { align: 'right' })
    doc.text(`${tot.toFixed(2)}€`, pageWidth - 15, y, { align: 'right' })
    y += 6
    if (y > 260) { doc.addPage(); y = 20 }
  })

  y += 6
  const totalHT = totalTTC / (1 + rate / 100)
  const totalTVA = totalTTC - totalHT

  doc.setFontSize(10)
  doc.text('Total HT', 155, y, { align: 'right' })
  doc.text(`${totalHT.toFixed(2)}€`, pageWidth - 15, y, { align: 'right' })
  y += 5
  doc.text(`TVA (${rate}%)`, 155, y, { align: 'right' })
  doc.text(`${totalTVA.toFixed(2)}€`, pageWidth - 15, y, { align: 'right' })
  y += 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(140, y, pageWidth - 15, y)
  y += 6
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(0, 180, 204)
  doc.text('Total TTC', 155, y, { align: 'right' })
  doc.text(`${totalTTC.toFixed(2)}€`, pageWidth - 15, y, { align: 'right' })

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text(
    `SLT GROUP (SRL) — ${adresse} — TVA BE 1028.764.677`,
    pageWidth / 2, 285, { align: 'center' }
  )
  doc.text(
    '@sebtelecom — Instagram / TikTok / Snapchat',
    pageWidth / 2, 290, { align: 'center' }
  )

  return doc.output('datauristring').split(',')[1]
}
