import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS } from '../../utils/magasins'
import { Search, Eye, FileText, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function VentesHistory() {
  const [sales, setSales]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [selectedMagasin, setSelectedMagasin] = useState('tous')
  const [selectedSale, setSelectedSale]       = useState(null)

  useEffect(() => { fetchSales() }, [])

  const fetchSales = async () => {
    setLoading(true)
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*, phone:phones(*)')
        .eq('status', 'recupere')
        .order('encaisse_at', { ascending: false })

      if (error) throw error

      const phoneIds = (ordersData || []).map((o) => o.phone_id).filter(Boolean)

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('phone_id, payment_method, amount')
        .in('phone_id', phoneIds)

      const merged = (ordersData || []).map((order) => ({
        ...order,
        payment: paymentsData?.filter((p) => p.phone_id === order.phone_id) || [],
      }))

      setSales(merged)
    } catch (err) {
      console.error('fetchSales error:', err)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const getPaymentMethod = (sale) => {
    if (sale?.payment?.length > 0) {
      const method = sale.payment[0].payment_method
      if (!method) return '—'
      const m = method.toLowerCase()
      if (m.includes('+')) return '💵🏦 Cash + Virement'
      if (m.includes('cash')) return '💵 Cash'
      if (m.includes('virement')) return '🏦 Virement bancaire'
      if (m.includes('bancontact')) return '💳 Bancontact'
      if (m.includes('stripe')) return '💳 Stripe'
      return method
    }
    return sale?.payment?.[0]?.payment_method || sale?.payment_method || '—'
  }

  const getWarranty = (saleDate) => {
    if (!saleDate) return { text: '—', color: 'gray', months: 0 }
    const sold   = new Date(saleDate)
    const expiry = new Date(sold)
    expiry.setMonth(expiry.getMonth() + 24)
    const now        = new Date()
    const monthsLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24 * 30))

    if (monthsLeft <= 0) return { text: 'Expirée',                     color: 'red',    expiry: expiry.toLocaleDateString('fr-BE') }
    if (monthsLeft <= 3) return { text: `${monthsLeft} mois restants`, color: 'orange', expiry: expiry.toLocaleDateString('fr-BE') }
    return                       { text: `${monthsLeft} mois restants`, color: 'green',  expiry: expiry.toLocaleDateString('fr-BE') }
  }

  const generateInvoice = (sale) => {
    const doc      = new jsPDF()
    const warranty = getWarranty(sale.encaisse_at)

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
    doc.text('Où tu veux, quand tu veux', 20, 30)
    doc.setTextColor(148, 163, 184)
    doc.text('contact@sebphone.be | 0472 72 85 24', 20, 36)

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(10)
    doc.text('FACTURE DE VENTE', 140, 15)
    doc.setFontSize(9)
    doc.text(`Date : ${new Date(sale.encaisse_at || sale.created_at).toLocaleDateString('fr-BE')}`, 140, 22)
    doc.text(`Réf. : ${sale.reservation_code || sale.id?.toString().substring(0, 8)}`, 140, 28)
    doc.text(`Magasin : ${MAGASINS[sale.magasin_id]?.nom?.replace('Seb Telecom — ', '') || sale.magasin_id || '—'}`, 140, 34)

    doc.setDrawColor(0, 180, 204)
    doc.line(20, 48, 190, 48)
    doc.setFontSize(12)
    doc.setTextColor(27, 42, 74)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENT', 20, 58)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.text(sale.customer_name || '—', 20, 66)
    if (sale.customer_phone) doc.text(sale.customer_phone, 20, 72)
    if (sale.customer_email) doc.text(sale.customer_email, 20, 78)

    doc.setFontSize(12)
    doc.setTextColor(27, 42, 74)
    doc.setFont('helvetica', 'bold')
    doc.text('TÉLÉPHONE VENDU', 20, 95)

    autoTable(doc, {
      startY: 99,
      head: [['Désignation', 'Détail']],
      body: [
        ['Modèle',    sale.phone_name || sale.phone?.model || '—'],
        ['Couleur',   sale.phone_color || '—'],
        ['Stockage',  sale.phone_storage || '—'],
        ['Grade',     sale.phone_grade || '—'],
        ['IMEI',      sale.phone?.imei || '—'],
        ['Condition', sale.phone?.condition || '—'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [27, 42, 74], fontSize: 9 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50,  fontStyle: 'bold' },
        1: { cellWidth: 130 },
      },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [],
      body: [
        ['Mode de paiement', sale.payment?.[0]?.payment_method || sale.payment_method || '—'],
        ['PRIX DE VENTE',    `${sale.total_amount}€`],
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
    doc.roundedRect(20, garantieY, 170, 20, 3, 3, 'F')
    doc.setFontSize(10)
    doc.setTextColor(22, 101, 52)
    doc.setFont('helvetica', 'bold')
    doc.text('GARANTIE SEBPHONE — 24 MOIS', 28, garantieY + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Valable jusqu'au ${warranty.expiry} — ${warranty.text}`, 28, garantieY + 15)

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('SLT Group SRL — N° TVA: BE 1028.764.677 — Chaussée de Mons 711, 1070 Anderlecht', 20, 285)

    doc.save(`facture-${sale.reservation_code || sale.id?.toString().substring(0, 8)}-${(sale.customer_name || 'client').replace(/\s/g, '-')}.pdf`)
  }

  const filtered = sales.filter((sale) => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !searchQuery
      || sale.customer_name?.toLowerCase().includes(q)
      || sale.phone?.imei?.includes(searchQuery)
      || sale.phone_name?.toLowerCase().includes(q)
      || sale.reservation_code?.toLowerCase().includes(q)
    const matchMagasin = selectedMagasin === 'tous' || sale.magasin_id === selectedMagasin
    return matchSearch && matchMagasin
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Historique des ventes</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} vente(s) enregistrée(s)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nom client, IMEI, modèle, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
            />
          </div>
          <select
            value={selectedMagasin}
            onChange={(e) => setSelectedMagasin(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
          >
            <option value="tous">Tous les magasins</option>
            {Object.entries(MAGASINS).map(([id, mag]) => (
              <option key={id} value={id}>{mag.nom.replace('Seb Telecom — ', '')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Client', 'Téléphone', 'IMEI', 'Prix', 'Garantie', 'Magasin', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Aucune vente enregistrée
                  </td>
                </tr>
              ) : filtered.map((sale) => {
                const warranty = getWarranty(sale.encaisse_at || sale.created_at)
                return (
                  <tr key={sale.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(sale.encaisse_at || sale.created_at).toLocaleDateString('fr-BE')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2A4A] text-sm">{sale.customer_name || '—'}</p>
                      {sale.customer_phone && (
                        <p className="text-xs text-gray-400">{sale.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1B2A4A] text-sm">{sale.phone_name || '—'}</p>
                      <p className="text-xs text-gray-400">
                        {sale.phone_color}{sale.phone_color && sale.phone_storage ? ' · ' : ''}{sale.phone_storage}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {sale.phone?.imei || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600 whitespace-nowrap">
                      {sale.total_amount}€
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        warranty.color === 'green'  ? 'bg-green-100 text-green-700'   :
                        warranty.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                                      'bg-red-100 text-red-700'
                      }`}>
                        🛡️ {warranty.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {MAGASINS[sale.magasin_id]?.nom?.replace('Seb Telecom — ', '') || sale.magasin_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 text-gray-400 hover:text-[#00B4CC] transition-colors cursor-pointer"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => generateInvoice(sale)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Générer facture PDF"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A]">Détail de la vente</h3>
              <button onClick={() => setSelectedSale(null)} className="cursor-pointer">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
              {[
                ['Client',           selectedSale.customer_name],
                ['Téléphone',        selectedSale.customer_phone || '—'],
                ['Email',            selectedSale.customer_email || '—'],
                ['Téléphone vendu',  `${selectedSale.phone_name || '—'} ${selectedSale.phone_color || ''} ${selectedSale.phone_storage || ''}`.trim()],
                ['IMEI',             selectedSale.phone?.imei || '—'],
                ['Grade',            selectedSale.phone_grade || '—'],
                ['Prix de vente',    `${selectedSale.total_amount}€`],
                ['Mode paiement',    getPaymentMethod(selectedSale)],
                ['Date de vente',    new Date(selectedSale.encaisse_at || selectedSale.created_at).toLocaleDateString('fr-BE')],
                ['Magasin',          MAGASINS[selectedSale.magasin_id]?.nom || '—'],
                ['Code réservation', selectedSale.reservation_code || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="text-[#1B2A4A] font-semibold text-right max-w-48">{value}</span>
                </div>
              ))}

              {(() => {
                const w = getWarranty(selectedSale.encaisse_at || selectedSale.created_at)
                return (
                  <div className={`p-3 rounded-xl text-sm font-medium ${
                    w.color === 'green'  ? 'bg-green-50 text-green-700'   :
                    w.color === 'orange' ? 'bg-orange-50 text-orange-700' :
                                           'bg-red-50 text-red-700'
                  }`}>
                    🛡️ Garantie SebPhone 24 mois<br />
                    <span className="text-xs font-normal">Expire le {w.expiry} — {w.text}</span>
                  </div>
                )
              })()}

              <button
                onClick={() => { generateInvoice(selectedSale); setSelectedSale(null) }}
                className="w-full flex items-center justify-center gap-2 bg-[#1B2A4A] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#243a64] transition-colors cursor-pointer"
              >
                <FileText size={16} />
                Générer la facture PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
