import { LOGO_SEBPHONE_BASE64 } from '../lib/logos'

export const pdfHeader = (doc, title) => {
  const pageWidth = 210
  doc.setFillColor(27, 42, 74)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.addImage(LOGO_SEBPHONE_BASE64, 'PNG', 15, 7, 21, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text(title, 42, 20)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL)', pageWidth - 15, 14, { align: 'right' })
  doc.text('Rue du Bailli 22, 1000 Bruxelles', pageWidth - 15, 19, { align: 'right' })
  doc.text('TVA BE 1028.764.677', pageWidth - 15, 24, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

export const pdfFooter = (doc) => {
  const pageWidth = 210
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL) — Rue du Bailli 22, 1000 Bruxelles — TVA BE 1028.764.677',
    pageWidth / 2, 285, { align: 'center' })
  doc.text('@sebtelecom — Instagram / TikTok / Snapchat',
    pageWidth / 2, 290, { align: 'center' })
}
