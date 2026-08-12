import { LOGO_SEBTELECOM_BASE64 } from '../lib/logos'

export async function generateRewardPdf(p) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = 210

  doc.setFillColor(27, 42, 74)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.addImage(LOGO_SEBTELECOM_BASE64, 'PNG', 15, 7, 21, 21)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text('Récompense fidélité', 42, 20)
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL)', pageWidth - 15, 14, { align: 'right' })
  doc.text('Rue du Bailli 22, 1000 Bruxelles', pageWidth - 15, 19, { align: 'right' })
  doc.text('TVA BE 1028.764.677', pageWidth - 15, 24, { align: 'right' })

  doc.setTextColor(27, 42, 74)
  doc.setFontSize(24)
  doc.setFont(undefined, 'bold')
  doc.text(`Bravo ${p.to_name || 'à vous'} !`, pageWidth / 2, 55, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(60, 60, 60)
  const introLines = doc.splitTextToSize(p.reward_description || '', pageWidth - 30)
  doc.text(introLines, pageWidth / 2, 68, { align: 'center' })

  const boxY = 90
  const boxH = 40
  doc.setDrawColor(0, 180, 204)
  doc.setLineWidth(0.6)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(25, boxY, pageWidth - 50, boxH)
  doc.setLineDashPattern([], 0)

  doc.setTextColor(0, 180, 204)
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('CODE PROMO', pageWidth / 2, boxY + 10, { align: 'center' })
  doc.setFontSize(28)
  doc.setTextColor(27, 42, 74)
  doc.text(p.promo_code || '—', pageWidth / 2, boxY + 27, { align: 'center' })

  doc.setTextColor(60, 60, 60)
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`Récompense : ${p.reward_type || ''}`, pageWidth / 2, boxY + boxH + 15, { align: 'center' })

  doc.setFont(undefined, 'italic')
  doc.setFontSize(10)
  doc.text('Valable en magasin sur présentation de ce document.',
    pageWidth / 2, boxY + boxH + 25, { align: 'center' })

  doc.setTextColor(120, 120, 120)
  doc.setFontSize(8)
  doc.setFont(undefined, 'normal')
  doc.text('SLT GROUP (SRL) — Rue du Bailli 22, 1000 Bruxelles — TVA BE 1028.764.677',
    pageWidth / 2, 285, { align: 'center' })
  doc.text('@sebtelecom — Instagram / TikTok / Snapchat',
    pageWidth / 2, 290, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}
