import { LOGO_SEBPHONE_BASE64 } from '../lib/logos'
import { lineTotal } from './cart'

const ICONS = {
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="7" y1="3" x2="7" y2="7"/><line x1="17" y1="3" x2="17" y2="7"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 L12 4 L21 12"/><path d="M5 10 L5 20 L19 20 L19 10"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20 C4 15 8 13 12 13 C16 13 20 15 20 20"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21 C12 21 5 14 5 9 C5 5 8 2 12 2 C16 2 19 5 19 9 C19 14 12 21 12 21 Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="3"/><path d="M8 17 L8 21 L12 17"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="16" r="2.5"/><circle cx="18" cy="16" r="2.5"/><line x1="10.5" y1="7" x2="7.5" y2="14"/><line x1="13.5" y1="7" x2="16.5" y2="14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"/></svg>',
}

const TICKET_CSS = `
  * { box-sizing: border-box; }
  body { margin:0; padding:0; background:#e9e9e9; font-family: Arial, Helvetica, sans-serif; color:#111; }
  .page { width:210mm; background:#fff; padding:14mm 14mm 10mm 14mm; position:relative; overflow:hidden; display:flex; flex-direction:column; }
  .page.fill-page { height:297mm; }
  .bottom-block { margin-top:auto; }
  :root { --blue:#1685c5; --cyan:#0fb4b2; --gradient: linear-gradient(90deg, #1678ba 0%, #0fb4b2 100%); }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:34px; flex-shrink:0; }
  .logo-area { width:40%; }
  .logo { width:245px; max-width:100%; height:auto; display:block; }
  .invoice-header { width:56%; padding-top:5px; }
  .invoice-title { margin:0; font-size:30px; font-weight:800; letter-spacing:-0.5px; white-space:nowrap; }
  .invoice-title .black { color:#111; }
  .invoice-title .gradient { background: var(--gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .title-line { width:145px; height:4px; background:var(--gradient); margin-top:8px; margin-bottom:19px; border-radius:3px; }
  .company-name { font-size:16px; font-weight:700; margin-bottom:5px; }
  .company-info { font-size:13px; line-height:1.55; color:#333; margin-bottom:14px; }
  .info-list { display:flex; flex-direction:column; gap:8px; }
  .info-row { display:flex; align-items:center; gap:10px; font-size:13px; }
  .info-icon { width:24px; height:24px; border:2px solid var(--blue); border-radius:5px; display:flex; justify-content:center; align-items:center; color:var(--blue); flex-shrink:0; }
  .info-icon svg { width:13px; height:13px; display:block; }
  .info-row strong { font-weight:700; }
  .customer-message { background:#f7f8fa; border:1px solid #eeeeee; border-radius:9px; padding:21px 24px; margin-bottom:30px; flex-shrink:0; }
  .customer-message .hello { color:#1678b8; font-weight:700; font-size:15px; margin-bottom:10px; }
  .customer-message p { margin:0; font-size:13px; line-height:1.55; color:#333; }
  .items-table { width:100%; border-collapse:separate; border-spacing:0; margin-bottom:24px; overflow:hidden; border-radius:8px; flex-shrink:0; }
  .items-table thead { background:var(--gradient); color:white; }
  .items-table th { padding:12px 14px; font-size:13px; text-transform:uppercase; font-weight:700; text-align:left; line-height:1.2; }
  .items-table th:nth-child(2), .items-table th:nth-child(3), .items-table th:nth-child(4) { text-align:center; }
  .items-table td { padding:10px 14px; font-size:13px; border-bottom:1px solid #ddd; line-height:1.2; }
  .items-table td:nth-child(2), .items-table td:nth-child(3), .items-table td:nth-child(4) { text-align:center; }
  .items-table tbody tr:last-child td { border-bottom:0; }
  .totals-wrapper { width:48%; margin-left:auto; margin-top:2px; margin-bottom:40px; flex-shrink:0; }
  .total-line { height:36px; border:1px solid #cfcfcf; border-radius:7px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; margin-bottom:8px; font-size:13px; background:#fff; }
  .total-line span, .total-line strong { line-height:36px; }
  .total-line strong { font-size:14px; }
  .total-final { height:40px; border:none; background:var(--gradient); color:white; font-weight:700; font-size:15px; margin-top:2px; }
  .total-final span { line-height:40px; }
  .total-final .amount { font-size:17px; }
  .thanks { border-top:1px solid #d5d5d5; padding-top:20px; margin-bottom:30px; display:flex; align-items:center; justify-content:center; gap:16px; }
  .check-circle { width:45px; height:45px; border:3px solid var(--cyan); border-radius:50%; display:flex; justify-content:center; align-items:center; color:var(--blue); flex-shrink:0; }
  .check-circle svg { width:22px; height:22px; display:block; }
  .thanks-title { font-size:15px; font-weight:700; margin-bottom:5px; }
  .thanks-text { font-size:13px; color:#444; }
  .footer-info { background:#f7f8fa; border:1px solid #eeeeee; border-radius:8px; padding:19px 22px; display:grid; grid-template-columns:1fr 1fr 1fr; margin-bottom:12px; }
  .footer-column { padding:0 18px; min-height:82px; }
  .footer-column:first-child { padding-left:0; }
  .footer-column:last-child { padding-right:0; }
  .footer-column + .footer-column { border-left:1px solid #bbb; }
  .footer-title { display:flex; align-items:center; gap:9px; font-weight:700; font-size:13px; margin-bottom:9px; }
  .footer-icon { width:25px; height:25px; background:var(--gradient); color:white; border-radius:50%; display:flex; justify-content:center; align-items:center; flex-shrink:0; }
  .footer-icon svg { width:13px; height:13px; display:block; }
  .footer-column p { font-size:11.5px; line-height:1.55; margin:0; color:#333; }
  .footer-link { color:#1678b8; font-weight:700; }
  .legal-footer { min-height:57px; border-radius:7px; background:var(--gradient); color:white; display:flex; align-items:center; justify-content:space-between; padding:10px 20px; }
  .legal-left { display:flex; align-items:center; gap:12px; }
  .shield { width:29px; height:29px; border:2px solid white; clip-path: polygon(50% 0%, 90% 16%, 90% 60%, 50% 100%, 10% 60%, 10% 16%); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .shield svg { width:13px; height:13px; display:block; }
  .legal-text { font-size:11.5px; line-height:1.45; }
  .thank-you { font-family:"Brush Script MT","Segoe Script",cursive; font-size:27px; transform:rotate(-4deg); white-space:nowrap; }

  .page.compact .header { margin-bottom:16px; }
  .page.compact .logo { width:185px; }
  .page.compact .invoice-header { padding-top:0; }
  .page.compact .invoice-title { font-size:23px; }
  .page.compact .title-line { margin-top:4px; margin-bottom:9px; height:3px; }
  .page.compact .company-info { margin-bottom:8px; }
  .page.compact .info-list { gap:4px; }
  .page.compact .info-row { font-size:12px; }
  .page.compact .customer-message { padding:10px 16px; margin-bottom:14px; }
  .page.compact .customer-message .hello { font-size:13px; margin-bottom:4px; }
  .page.compact .customer-message p { font-size:12px; line-height:1.4; }
  .page.compact .items-table { margin-bottom:12px; }
  .page.compact .items-table th { padding:7px 14px; font-size:11.5px; }
  .page.compact .items-table td { padding:4px 14px; font-size:11.5px; }
  .page.compact .totals-wrapper { margin-bottom:16px; }
  .page.compact .total-line { height:28px; margin-bottom:4px; font-size:12px; }
  .page.compact .total-line span, .page.compact .total-line strong { line-height:28px; }
  .page.compact .total-final { height:32px; }
  .page.compact .total-final span { line-height:32px; }
  .page.compact .thanks { padding-top:10px; margin-bottom:14px; gap:10px; }
  .page.compact .check-circle { width:32px; height:32px; }
  .page.compact .check-circle svg { width:16px; height:16px; }
  .page.compact .thanks-title { font-size:13px; margin-bottom:2px; }
  .page.compact .thanks-text { font-size:11.5px; }
  .page.compact .footer-info { padding:12px 16px; margin-bottom:8px; }
  .page.compact .footer-column { min-height:56px; }
  .page.compact .footer-title { margin-bottom:5px; }
  .page.compact .footer-icon { width:20px; height:20px; }
  .page.compact .footer-icon svg { width:11px; height:11px; }
  .page.compact .footer-column p { font-size:10.5px; }
  .page.compact .legal-footer { min-height:40px; padding:7px 16px; }
  .page.compact .shield { width:24px; height:24px; }
  .page.compact .shield svg { width:11px; height:11px; }
  .page.compact .legal-text { font-size:10.5px; }
  .page.compact .thank-you { font-size:22px; }
`

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]))

const buildTicketHtml = (sale, magasinLabel, magasinAdresse) => {
  const rate = 21
  let totalTTC = 0
  const rows = (sale.items || []).map((c) => {
    const tot = lineTotal(c)
    totalTTC += tot
    const totHT = tot / (1 + rate / 100)
    return `<tr>
      <td>${escapeHtml(c.item_name)}</td>
      <td>${escapeHtml(c.quantity)}</td>
      <td>${totHT.toFixed(2)} €</td>
      <td>${tot.toFixed(2)} €</td>
    </tr>`
  }).join('')
  const totalHT = totalTTC / (1 + rate / 100)
  const totalTVA = totalTTC - totalHT
  const dateStr = new Date(sale.created_at || Date.now()).toLocaleDateString('fr-BE')

  return `<div class="page">
    <header class="header">
      <div class="logo-area"><img src="${LOGO_SEBPHONE_BASE64}" alt="SEBPHONE" class="logo"></div>
      <div class="invoice-header">
        <h1 class="invoice-title"><span class="black">TICKET / </span><span class="gradient">FACTURE</span></h1>
        <div class="title-line"></div>
        <div class="company-name">SLT GROUP (SRL)</div>
        <div class="company-info">Rue du Bailli 22, 1000 Bruxelles<br>TVA BE 1028.764.677</div>
        <div class="info-list">
          <div class="info-row"><div class="info-icon">${ICONS.calendar}</div><span><strong>Date :</strong> ${dateStr}</span></div>
          <div class="info-row"><div class="info-icon">${ICONS.hash}</div><span><strong>Ticket n°</strong> ${escapeHtml(sale.ticketNumber)}</span></div>
          <div class="info-row"><div class="info-icon">${ICONS.store}</div><span><strong>Magasin :</strong> ${escapeHtml(magasinLabel)}${magasinAdresse ? ' — ' + escapeHtml(magasinAdresse) : ''}</span></div>
          <div class="info-row"><div class="info-icon">${ICONS.user}</div><span><strong>Vendeur :</strong> ${escapeHtml(sale.staffName || 'Staff')}</span></div>
        </div>
      </div>
    </header>
    <section class="customer-message">
      <div class="hello">Bonjour,</div>
      <p>Merci pour votre confiance et votre achat chez SEBPHONE.<br>Vous trouverez ci-dessous le récapitulatif de votre commande.<br>À très bientôt !</p>
    </section>
    <table class="items-table">
      <thead><tr><th style="width:48%">Description</th><th style="width:15%">Qté</th><th style="width:18%">Prix HT</th><th style="width:19%">Total TTC</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals-wrapper">
      <div class="total-line"><span>Total HT</span><strong>${totalHT.toFixed(2)} €</strong></div>
      <div class="total-line"><span>TVA (${rate}%)</span><strong>${totalTVA.toFixed(2)} €</strong></div>
      <div class="total-line total-final"><span>TOTAL TTC</span><span class="amount">${totalTTC.toFixed(2)} €</span></div>
    </div>
    <div class="bottom-block">
      <section class="thanks">
        <div class="check-circle">${ICONS.check}</div>
        <div><div class="thanks-title">Merci pour votre achat !</div><div class="thanks-text">Nous espérons vous revoir très bientôt.</div></div>
      </section>
      <section class="footer-info">
        <div class="footer-column"><div class="footer-title"><div class="footer-icon">${ICONS.pin}</div><span>SLT GROUP (SRL)</span></div><p>Rue du Bailli 22,<br>1000 Bruxelles<br>TVA BE 1028.764.677</p></div>
        <div class="footer-column"><div class="footer-title"><div class="footer-icon">${ICONS.chat}</div><span class="footer-link">Besoin d'aide ?</span></div><p>0472 72 85 24<br>contact@sebphone.be</p></div>
        <div class="footer-column"><div class="footer-title"><div class="footer-icon">${ICONS.share}</div><span class="footer-link">Suivez-nous !</span></div><p><span class="footer-link">@sebtelecom</span><br>Instagram / TikTok / Snapchat</p></div>
      </section>
      <footer class="legal-footer">
        <div class="legal-left"><div class="shield">${ICONS.check}</div><div class="legal-text"><strong>Garantie légale conforme à la législation en vigueur.</strong><br>Conservez ce ticket comme preuve d'achat.</div></div>
        <div class="thank-you">Thank you!</div>
      </footer>
    </div>
  </div>`
}

export const generateTicketPdfBase64 = async (sale, magasinLabel, magasinAdresse) => {
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.innerHTML = `<style>${TICKET_CSS}</style>${buildTicketHtml(sale, magasinLabel, magasinAdresse)}`
  document.body.appendChild(container)

  try {
    const pageEl = container.querySelector('.page')
    const itemCount = (sale.items || []).length
    const measureHeightMM = () => (pageEl.scrollHeight / pageEl.scrollWidth) * 210

    const heightBefore = measureHeightMM()
    let usedCompact = false
    if (itemCount <= 10 && heightBefore > 280) {
      pageEl.classList.add('compact')
      usedCompact = true
    }
    const heightAfterCompact = measureHeightMM()

    let filled = false
    if (heightAfterCompact <= 290) {
      pageEl.classList.add('fill-page')
      filled = true
    }

    console.log(`PDF ticket - mesure : ${heightBefore.toFixed(0)}mm brut -> ${heightAfterCompact.toFixed(0)}mm ${usedCompact ? '(compact)' : '(normal)'} -> ${filled ? '1 page garantie (fill-page)' : 'pagination multi-page (contenu > 1 page)'}, ${itemCount} articles`)

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidthMM = 210
    const pageHeightMM = 297
    const imgHeightMM = (canvas.height * pageWidthMM) / canvas.width

    if (filled) {
      doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, pageHeightMM)
    } else if (imgHeightMM <= pageHeightMM) {
      doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMM, imgHeightMM)
    } else {
      let positionMM = 0
      let heightLeftMM = imgHeightMM
      doc.addImage(imgData, 'JPEG', 0, positionMM, pageWidthMM, imgHeightMM)
      heightLeftMM -= pageHeightMM
      while (heightLeftMM > 2) {
        positionMM -= pageHeightMM
        doc.addPage()
        doc.addImage(imgData, 'JPEG', 0, positionMM, pageWidthMM, imgHeightMM)
        heightLeftMM -= pageHeightMM
      }
    }

    const base64 = doc.output('datauristring').split(',')[1]
    const sizeKB = Math.round((base64.length * 0.75) / 1024)
    const pageCount = doc.internal.getNumberOfPages()
    console.log(`PDF ticket genere : ~${sizeKB} Ko sur ${pageCount} page(s), ${itemCount} articles`)
    return base64
  } finally {
    document.body.removeChild(container)
  }
}
