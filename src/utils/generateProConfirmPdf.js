import { LOGO_SEBPHONE_BASE64 } from '../lib/logos'

export async function generateProConfirmPdf(p) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210

  doc.setFillColor(27, 42, 74)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.addImage(LOGO_SEBPHONE_BASE64, 'PNG', 15, 7, 21, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text(p.status_label || 'Compte Pro', 42, 20)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL)', pageWidth - 15, 14, { align: 'right' })
  doc.text('Rue du Bailli 22, 1000 Bruxelles', pageWidth - 15, 19, { align: 'right' })
  doc.text('TVA BE 1028.764.677', pageWidth - 15, 24, { align: 'right' })

  doc.setTextColor(0, 0, 0)
  let y = 50

  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`Bonjour ${p.to_name || p.contact_name || 'Client'},`, 15, y); y += 10

  doc.setDrawColor(27, 42, 74); doc.setLineWidth(0.5)
  doc.line(15, y, pageWidth - 15, y); y += 6
  doc.setFont(undefined, 'bold'); doc.setFontSize(11)
  doc.text('Contact', 15, y); y += 6
  doc.setFont(undefined, 'normal'); doc.setFontSize(10)
  doc.text(`Nom : ${p.contact_name || '—'}`, 15, y); y += 5
  doc.text(`Société : ${p.company_name || '—'}`, 15, y); y += 5
  doc.text(`N° TVA : ${p.vat_number || '—'}`, 15, y); y += 8

  doc.line(15, y, pageWidth - 15, y); y += 8
  doc.setFontSize(12)
  const lines = doc.splitTextToSize(p.message || '', pageWidth - 30)
  doc.text(lines, 15, y)
  y += lines.length * 6 + 4

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL) — Rue du Bailli 22, 1000 Bruxelles — TVA BE 1028.764.677',
    pageWidth / 2, 285, { align: 'center' })
  doc.text('@sebtelecom — Instagram / TikTok / Snapchat',
    pageWidth / 2, 290, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}
