import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MAGASINS } from '../utils/magasins'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function Facture() {
  const { code } = useParams()
  const { t } = useLanguage()
  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { fetchOrder() }, [code])

  const fetchOrder = async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, phone:phones(*)')
      .eq('reservation_code', code)
      .single()
    if (err || !data) setError(t('invoice_not_found'))
    else setOrder(data)
    setLoading(false)
  }

  const generatePDF = () => {
    const doc            = new jsPDF()
    const saleDate       = new Date(order.encaisse_at || order.created_at)
    const warrantyExpiry = new Date(saleDate)
    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + 24)

    doc.setFillColor(27, 42, 74)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setFontSize(22)
    doc.setTextColor(0, 180, 204)
    doc.setFont('helvetica', 'bold')
    doc.text('SEB', 20, 22)
    doc.setTextColor(255, 255, 255)
    doc.text('PHONE', 36, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Ou tu veux, quand tu veux', 20, 30)
    doc.setTextColor(148, 163, 184)
    doc.text('contact@sebphone.be | 0472 72 85 24', 20, 36)

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(10)
    doc.text(t('invoice_title'), 140, 15)
    doc.setFontSize(9)
    doc.text(`Date : ${saleDate.toLocaleDateString('fr-BE')}`, 140, 22)
    doc.text(`Ref. : ${order.reservation_code}`, 140, 28)
    doc.text(`Magasin : ${MAGASINS[order.magasin_id]?.nom?.replace('Seb Telecom — ', '') || order.magasin_id || '—'}`, 140, 34)

    doc.setDrawColor(0, 180, 204)
    doc.line(20, 48, 190, 48)
    doc.setFontSize(12)
    doc.setTextColor(27, 42, 74)
    doc.setFont('helvetica', 'bold')
    doc.text(t('invoice_client'), 20, 58)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.text(order.customer_name || '—', 20, 66)
    if (order.customer_phone) doc.text(order.customer_phone, 20, 72)
    if (order.customer_email) doc.text(order.customer_email, 20, 78)

    doc.setFontSize(12)
    doc.setTextColor(27, 42, 74)
    doc.setFont('helvetica', 'bold')
    doc.text(t('invoice_phone_bought'), 20, 95)

    autoTable(doc, {
      startY: 99,
      head: [[t('invoice_designation'), t('invoice_detail')]],
      body: [
        ['Modele',   order.phone_name || '—'],
        ['Couleur',  order.phone_color || '—'],
        ['Stockage', order.phone_storage || '—'],
        ['Grade',    order.phone_grade || '—'],
        ['IMEI',     order.phone?.imei || '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [27, 42, 74], fontSize: 9 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 130 },
      },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [],
      body: [
        [t('invoice_payment_method'), order.payment_mode || '—'],
        [t('invoice_total'),         `${order.total_amount}€`],
      ],
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 80,  fontStyle: 'bold' },
        1: { cellWidth: 100, fontStyle: 'bold', textColor: [0, 180, 204], fontSize: 14 },
      },
    })

    const garantieY = doc.lastAutoTable.finalY + 15
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(20, garantieY, 170, 22, 3, 3, 'F')
    doc.setFontSize(11)
    doc.setTextColor(22, 101, 52)
    doc.setFont('helvetica', 'bold')
    doc.text(t('invoice_guarantee'), 28, garantieY + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Valable jusqu au ${warrantyExpiry.toLocaleDateString('fr-BE')}`, 28, garantieY + 17)

    const sigY = garantieY + 38
    doc.setDrawColor(200)
    doc.line(20, sigY, 85, sigY)
    doc.line(125, sigY, 190, sigY)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(t('invoice_signature'), 20, sigY + 5)
    doc.text('Cachet & signature SebPhone', 125, sigY + 5)

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('SLT Group SRL — N° TVA: BE 1028.764.677 — Chaussee de Mons 711, 1070 Anderlecht', 20, 285)

    doc.save(`facture-sebphone-${order.reservation_code}.pdf`)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-xl font-bold text-[#1B2A4A] mb-2">{t('invoice_not_found')}</p>
        <p className="text-gray-500 text-sm">Vérifiez le lien ou contactez SebPhone</p>
      </div>
    </div>
  )

  const saleDate       = new Date(order.encaisse_at || order.created_at)
  const warrantyExpiry = new Date(saleDate)
  warrantyExpiry.setMonth(warrantyExpiry.getMonth() + 24)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-[#1B2A4A] rounded-2xl p-6 mb-6 text-center">
          <span className="text-2xl font-black text-[#00B4CC]">SEB</span>
          <span className="text-2xl font-black text-white">PHONE</span>
          <p className="text-gray-400 text-sm mt-1">Facture de vente</p>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('invoice_ref')}</p>
          <p className="text-3xl font-black text-[#00B4CC] tracking-widest font-mono">{order.reservation_code}</p>
          <p className="text-xs text-gray-400 mt-2">Date : {saleDate.toLocaleDateString('fr-BE')}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-[#1B2A4A] mb-4">{t('invoice_phone_label')}</h3>
          {[
            ['Modèle',   order.phone_name],
            ['Couleur',  order.phone_color || '—'],
            ['Stockage', order.phone_storage || '—'],
            ['Grade',    order.phone_grade || '—'],
            ['IMEI',     order.phone?.imei || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-semibold text-[#1B2A4A]">{value}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 text-sm mt-2">
            <span className="font-bold text-[#1B2A4A] text-base">{t('invoice_total_paid')}</span>
            <span className="font-black text-[#00B4CC] text-xl">{order.total_amount}€</span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
          <p className="text-xl font-black text-green-700 mb-1">🛡️ Garantie SebPhone 24 mois</p>
          <p className="text-sm text-green-600">
            Valable jusqu'au <strong>{warrantyExpiry.toLocaleDateString('fr-BE')}</strong>
          </p>
          <p className="text-xs text-green-500 mt-1">Conservez cette page comme preuve de garantie</p>
        </div>

        <button
          onClick={generatePDF}
          className="w-full flex items-center justify-center gap-3 bg-[#1B2A4A] text-white rounded-2xl py-4 font-bold text-base hover:bg-[#243660] transition-all mb-4 cursor-pointer"
        >
          <Download size={20} />
          {t('invoice_download')}
        </button>

        <p className="text-xs text-gray-400 text-center">
          {t('invoice_questions')} Contactez-nous au 0472 72 85 24<br />
          ou par email : contact@sebphone.be
        </p>
      </div>
    </div>
  )
}
