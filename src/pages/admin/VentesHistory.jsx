import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS } from '../../utils/magasins'
import { Search, Eye, FileText, X, Pencil, Trash2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'

export default function VentesHistory() {
  const isAdmin = useIsAdmin()
  const canEdit = usePermission('modifier_commandes')
  const canAddVente = usePermission('ajouter_vente_directe')
  const [sales, setSales]                     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [selectedMagasin, setSelectedMagasin] = useState('tous')
  const [saleOrigin, setSaleOrigin]           = useState('tous')
  const [selectedSale, setSelectedSale]       = useState(null)
  const [editingSale, setEditingSale]         = useState(null)
  const [editForm, setEditForm]               = useState({})
  const [saving, setSaving]                   = useState(false)

  const [priceSettings, setPriceSettings] = useState({ min: 0, max: 5000 })
  const [modelLimits, setModelLimits]     = useState([])

  const [showAddSale, setShowAddSale]     = useState(false)
  const [addSaleLoading, setAddSaleLoading] = useState(false)
  const emptyPhone = {
    model: '', brand: 'Apple', color: '', storage: '',
    condition: 'occasion', grade: '', imei: '',
    categorie: 'telephone',
    purchase_price: '', sale_price: '',
    foundPhoneId: null,
    lookupDone: false,
  }
  const emptyAddSaleForm = {
    customer_firstname: '', customer_name: '',
    customer_email: '', customer_phone: '',
    sale_magasin: '',
    discount_value: '', discount_type: 'fixed',
    is_company_sale: false,
    company_name: '', company_vat: '', company_address: '',
    payments: [{ method: 'cash', amount: '' }],
    phones: [{ ...emptyPhone }],
  }
  const [addSaleForm, setAddSaleForm] = useState(emptyAddSaleForm)

  useEffect(() => { fetchSales() }, [])

  useEffect(() => {
    const fetchLimits = async () => {
      const { data: s } = await supabase
        .from('price_settings').select('*').eq('id', 1).single()
      if (s) setPriceSettings({
        min: Number(s.global_min) || 0,
        max: Number(s.global_max) || 5000,
      })
      const { data: ml } = await supabase
        .from('model_price_limits').select('*')
      setModelLimits((ml || []).map((l) => ({
        ...l,
        price_min: l.price_min != null ? Number(l.price_min) : null,
        price_max: l.price_max != null ? Number(l.price_max) : null,
      })))
    }
    fetchLimits()
  }, [])

  const handleImeiLookup = async (index) => {
    const imei = addSaleForm.phones[index]?.imei
    if (!imei || imei.length < 6) return
    const { data } = await supabase
      .from('phones').select('*')
      .eq('imei', imei).eq('status', 'disponible')
      .maybeSingle()

    if (data) {
      setAddSaleForm((f) => ({
        ...f,
        phones: f.phones.map((p, i) => i === index ? {
          ...p,
          model: data.name || data.model,
          brand: data.brand || 'Apple',
          color: data.color || '',
          storage: data.storage || '',
          condition: data.condition || 'occasion',
          grade: data.grade || '',
          categorie: data.categorie || 'telephone',
          purchase_price: data.purchase_price || '',
          sale_price: data.price || '',
          foundPhoneId: data.id,
          lookupDone: true,
        } : p),
      }))
    } else {
      setAddSaleForm((f) => ({
        ...f,
        phones: f.phones.map((p, i) => i === index
          ? { ...p, foundPhoneId: null, lookupDone: true }
          : p),
      }))
    }
  }

  const addPhoneRow = () => setAddSaleForm((f) => ({
    ...f,
    phones: [...f.phones, { ...emptyPhone }],
  }))
  const removePhoneRow = (index) => setAddSaleForm((f) => ({
    ...f,
    phones: f.phones.filter((_, i) => i !== index),
  }))
  const updatePhoneField = (index, field, value) => setAddSaleForm((f) => ({
    ...f,
    phones: f.phones.map((p, i) => i === index ? { ...p, [field]: value } : p),
  }))

  const handleAddSale = async () => {
    if (!addSaleForm.customer_firstname || !addSaleForm.customer_name) {
      alert('Prénom et nom du client obligatoires'); return
    }
    if (!addSaleForm.sale_magasin) {
      alert('Magasin/canal de vente obligatoire'); return
    }
    if (!addSaleForm.phones.length) {
      alert('Ajoutez au moins un téléphone'); return
    }
    for (const [i, p] of addSaleForm.phones.entries()) {
      if (!p.model) { alert(`Appareil ${i + 1} : modèle obligatoire`); return }
      if (!p.imei || p.imei.length < 6) {
        alert(`Appareil ${i + 1} : IMEI obligatoire`); return
      }
      if (!p.sale_price) {
        alert(`Appareil ${i + 1} : prix de vente obligatoire`); return
      }
    }

    for (const [i, p] of addSaleForm.phones.entries()) {
      const ml = (modelLimits || []).find((l) => l.model_name === p.model)
      const lMin = Number(ml?.price_min ?? priceSettings?.min ?? 0) || 0
      const lMax = Number(ml?.price_max ?? priceSettings?.max ?? 5000) || 5000
      const sp = Number(p.sale_price) || 0
      if (lMin > 0 && sp < lMin) {
        alert(`⛔ Appareil ${i + 1} (${p.model}) : prix ${sp}€ sous le minimum ${lMin}€`)
        return
      }
      if (lMax > 0 && sp > lMax) {
        alert(`⛔ Appareil ${i + 1} (${p.model}) : prix ${sp}€ dépasse le maximum ${lMax}€`)
        return
      }
    }

    setAddSaleLoading(true)
    try {
      const saleCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const customerFull = `${addSaleForm.customer_firstname} ${addSaleForm.customer_name}`
      const saleDate = new Date().toISOString()
      const orderIds = []
      const soldPhones = []

      for (const p of addSaleForm.phones) {
        let phoneId = p.foundPhoneId
        const finalPrice = Number(p.sale_price) || 0

        if (!phoneId) {
          const { data: newPhone, error: pErr } = await supabase
            .from('phones').insert({
              name: p.model, model: p.model, brand: p.brand,
              color: p.color || '—', storage: p.storage || '—',
              condition: p.condition, grade: p.grade || '',
              imei: p.imei, categorie: p.categorie,
              purchase_price: Number(p.purchase_price) || 0,
              price: finalPrice, status: 'vendu',
              fournisseur: addSaleForm.sale_magasin,
              magasins: [addSaleForm.sale_magasin],
              tva_regime: 'marge', parts_replaced: [],
              visible_on_site: false,
              added_by: 'Vente directe',
              added_by_magasin: addSaleForm.sale_magasin,
            }).select().single()
          if (pErr) throw pErr
          phoneId = newPhone.id
        } else {
          await supabase.from('phones').update({
            status: 'vendu', price: finalPrice, imei: p.imei,
          }).eq('id', phoneId)
        }

        const { data: orderData, error: oErr } = await supabase
          .from('orders').insert({
            phone_id: phoneId,
            reservation_code: saleCode,
            customer_name: customerFull,
            customer_email: addSaleForm.customer_email || null,
            customer_phone: addSaleForm.customer_phone || null,
            status: 'recupere',
            magasin_id: addSaleForm.sale_magasin,
            final_price: finalPrice,
            total_amount: finalPrice,
            phone_name: p.model,
            phone_color: p.color || '—',
            phone_storage: p.storage || '—',
            phone_grade: p.grade || '',
            discount_value: Number(addSaleForm.discount_value) || null,
            discount_type: addSaleForm.discount_type,
            is_company_sale: addSaleForm.is_company_sale,
            company_name: addSaleForm.company_name || null,
            company_vat: addSaleForm.company_vat || null,
            company_address: addSaleForm.company_address || null,
            encaisse_at: saleDate,
          }).select().single()
        if (oErr) throw oErr
        orderIds.push(orderData.id)
        soldPhones.push({ ...p, phoneId, finalPrice, orderId: orderData.id })
      }

      const validPayments = addSaleForm.payments.filter((p) => Number(p.amount) > 0)
      if (validPayments.length > 0) {
        await supabase.from('payments').insert(
          validPayments.map((pay) => ({
            phone_id: soldPhones[0].phoneId,
            order_id: orderIds[0],
            payment_method: pay.method,
            amount: Number(pay.amount),
            magasin_id: addSaleForm.sale_magasin,
            payment_date: saleDate,
            description: `Vente groupée ${saleCode} (${soldPhones.length} appareils)`,
          }))
        )
      }

      if (addSaleForm.customer_email) {
        try {
          const emailjs = (await import('@emailjs/browser')).default
          const SERVICE_ID = 'service_nn74puq'
          const PUBLIC_KEY = 'rqbaYNMIGNP6IQB9O'
          const templateId = addSaleForm.is_company_sale
            ? 'template_qukek6a' : 'template_pzv7w8d'
          const totalFinal = soldPhones.reduce((s, p) => s + p.finalPrice, 0)
          const phonesList = soldPhones.map((p) =>
            `${p.model} ${p.color} ${p.storage} (IMEI: ${p.imei}) - ${p.finalPrice}€`
          ).join(' | ')
          const paymentLabel = validPayments
            .map((p) => `${p.method}: ${p.amount}€`).join(' + ')

          await emailjs.send(SERVICE_ID, templateId, {
            to_email: addSaleForm.customer_email,
            to_name: customerFull,
            phone_name: soldPhones.length > 1
              ? `${soldPhones.length} appareils`
              : soldPhones[0].model,
            phone_imei: soldPhones.map((p) => p.imei).join(', '),
            phones_list: phonesList,
            price_total: `${totalFinal.toFixed(2)}€`,
            payment_method: paymentLabel,
            magasin_nom: MAGASINS[addSaleForm.sale_magasin]?.nom || 'SebPhone',
            magasin_adresse: MAGASINS[addSaleForm.sale_magasin]?.adresse || '',
            invoice_url: `https://sebphone.be/facture/${saleCode}`,
            company_name: addSaleForm.company_name || '',
            company_vat: addSaleForm.company_vat || '',
          }, PUBLIC_KEY)
        } catch (e) {
          console.warn('Email facture non envoyé:', e)
        }
      }

      alert(`✅ Vente groupée enregistrée (${soldPhones.length} appareil(s)) — Code: ${saleCode}`)
      setShowAddSale(false)
      setAddSaleForm(emptyAddSaleForm)
      fetchSales()
    } catch (err) {
      console.error('Erreur vente groupée:', err)
      alert('Erreur : ' + err.message)
    }
    setAddSaleLoading(false)
  }

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

  const openEdit = async (sale) => {
    setEditingSale(sale)
    setEditForm({
      customer_name:  sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      customer_email: sale.customer_email || '',
      phone_name:     sale.phone_name || '',
      phone_color:    sale.phone_color || '',
      phone_storage:  sale.phone_storage || '',
      phone_grade:    sale.phone_grade || '',
      imei:           sale.phone?.imei || '',
      total_amount:   sale.total_amount || '',
      magasin_id:     sale.magasin_id || '',
      encaisse_at:    sale.encaisse_at ? new Date(sale.encaisse_at).toISOString().split('T')[0] : '',
      payments:       [], // sera chargé depuis la DB
    })

    const { data: existingPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('phone_id', sale.phone_id)

    setEditForm((f) => ({
      ...f,
      payments: existingPayments?.length > 0
        ? existingPayments.map((p) => ({
            id: p.id,
            method: p.payment_method,
            amount: p.amount,
          }))
        : [{ method: 'cash', amount: sale.total_amount || '' }],
    }))
  }

  const handleSaveEdit = async () => {
    if (!editingSale) return
    setSaving(true)
    try {
      await supabase.from('orders').update({
        customer_name:  editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email,
        phone_name:     editForm.phone_name,
        phone_color:    editForm.phone_color,
        phone_storage:  editForm.phone_storage,
        phone_grade:    editForm.phone_grade,
        total_amount:   parseFloat(editForm.total_amount) || 0,
        final_price:    parseFloat(editForm.total_amount) || 0,
        magasin_id:     editForm.magasin_id,
        encaisse_at:    new Date(editForm.encaisse_at).toISOString(),
      }).eq('id', editingSale.id)

      if (editingSale.phone_id) {
        await supabase.from('phones').update({
          name:    editForm.phone_name,
          model:   editForm.phone_name,
          color:   editForm.phone_color,
          storage: editForm.phone_storage,
          grade:   editForm.phone_grade,
          price:   parseFloat(editForm.total_amount) || 0,
          ...(editForm.imei ? { imei: editForm.imei } : {}),
        }).eq('id', editingSale.phone_id)

        // Supprime les anciens payments
        await supabase.from('payments')
          .delete()
          .eq('phone_id', editingSale.phone_id)

        // Insère les nouveaux
        const newPayments = editForm.payments
          .filter((p) => p.amount > 0)
          .map((p) => ({
            phone_id: editingSale.phone_id,
            magasin_id: editForm.magasin_id,
            payment_method: p.method,
            amount: parseFloat(p.amount),
            purchase_price: editingSale.phone?.purchase_price || 0,
            description: `Vente ${editForm.phone_name} — ${editForm.customer_name}`,
            payment_date: new Date(editForm.encaisse_at).toISOString(),
          }))

        if (newPayments.length > 0) {
          await supabase.from('payments').insert(newPayments)
        }
      }

      setEditingSale(null)
      fetchSales()
    } catch (err) {
      console.error('Erreur modification:', err)
      alert('Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Supprimer la vente de ${sale.customer_name || 'ce client'} — ${sale.phone_name || ''} ?`)) return
    try {
      if (sale.phone_id) {
        await supabase.from('payments').delete().eq('phone_id', sale.phone_id)
        await supabase.from('phones').update({
          status: 'disponible',
          price: sale.phone?.purchase_price ? sale.phone.purchase_price * 1.3 : (sale.phone?.price || 0),
        }).eq('id', sale.phone_id)
      }
      await supabase.from('orders').delete().eq('id', sale.id)
      fetchSales()
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert('Erreur lors de la suppression')
    }
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
    const matchOrigin = saleOrigin === 'tous' ? true
      : saleOrigin === 'site'
        ? (sale.stripe_payment_id != null || sale.payment_intent_id != null)
        : (sale.stripe_payment_id == null && sale.payment_intent_id == null)
    return matchSearch && matchMagasin && matchOrigin
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
        {(canAddVente || isAdmin) && (
          <button
            onClick={() => setShowAddSale(true)}
            className="flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all"
          >
            + Ajouter une vente
          </button>
        )}
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

        <div className="flex gap-2 mt-3">
          {[
            { value: 'tous',    label: 'Tous' },
            { value: 'magasin', label: '🏪 Magasin' },
            { value: 'site',    label: '🌐 Site web' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSaleOrigin(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                saleOrigin === value
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'
              }`}
            >
              {label}
            </button>
          ))}
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
                        {(isAdmin || canEdit) && (
                          <>
                            <button
                              onClick={() => openEdit(sale)}
                              title="Modifier la vente"
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale)}
                              title="Supprimer la vente"
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
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

      {editingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-[#1B2A4A] text-lg">Modifier la vente</h2>
              <button onClick={() => setEditingSale(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-[#00B4CC] uppercase">Client</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                  <input
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Téléphone</label>
                  <input
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, customer_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Email</label>
                  <input
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm((f) => ({ ...f, customer_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
              </div>

              <p className="text-xs font-bold text-[#00B4CC] uppercase mt-2">Téléphone</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Modèle</label>
                  <input
                    value={editForm.phone_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Couleur</label>
                  <input
                    value={editForm.phone_color}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone_color: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stockage</label>
                  <input
                    value={editForm.phone_storage}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone_storage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Grade</label>
                  <input
                    value={editForm.phone_grade}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone_grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
              </div>

              <p className="text-xs font-bold text-[#00B4CC] uppercase mt-2">Vente</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Montant (€)</label>
                  <input
                    type="number"
                    value={editForm.total_amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, total_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    IMEI
                  </label>
                  <input
                    type="text"
                    value={editForm.imei || ''}
                    onChange={e => setEditForm(f => ({ ...f, imei: e.target.value }))}
                    placeholder="Ex: 352999823425561"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl
                               text-sm font-mono focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date de vente</label>
                  <input
                    type="date"
                    value={editForm.encaisse_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, encaisse_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Magasin</label>
                  <select
                    value={editForm.magasin_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, magasin_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                  >
                    {Object.entries(MAGASINS).map(([id, mag]) => (
                      <option key={id} value={id}>{mag.nom.replace('Seb Telecom — ', '')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs font-bold text-[#00B4CC] uppercase mt-2">
                Paiement
              </p>

              {/* Liste des paiements */}
              {editForm.payments?.map((payment, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  {/* Boutons mode */}
                  <div className="flex gap-1">
                    {['cash', 'bancontact', 'virement bancaire'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          payments: f.payments.map((p, idx) =>
                            idx === i ? { ...p, method } : p
                          ),
                        }))}
                        className={`px-2 py-1 rounded-lg text-xs font-medium border
                          ${payment.method === method
                            ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                            : 'bg-white text-gray-600 border-gray-200'}`}>
                        {method === 'cash' ? '💵' : method === 'bancontact' ? '💳' : '🏦'}
                        {' '}{method}
                      </button>
                    ))}
                  </div>
                  {/* Montant */}
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => setEditForm((f) => ({
                      ...f,
                      payments: f.payments.map((p, idx) =>
                        idx === i ? { ...p, amount: e.target.value } : p
                      ),
                    }))}
                    placeholder="Montant €"
                    className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                  />
                  {/* Supprimer ligne */}
                  {editForm.payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditForm((f) => ({
                        ...f,
                        payments: f.payments.filter((_, idx) => idx !== i),
                      }))}
                      className="text-red-400 hover:text-red-600 text-lg font-bold">
                      ×
                    </button>
                  )}
                </div>
              ))}

              {/* Ajouter un mode */}
              <button
                type="button"
                onClick={() => setEditForm((f) => ({
                  ...f,
                  payments: [...(f.payments || []), { method: 'cash', amount: '' }],
                }))}
                className="text-xs text-[#00B4CC] font-medium hover:underline mt-1">
                + Ajouter un mode de paiement
              </button>

              {/* Total vs montant vente */}
              {(() => {
                const total = (editForm.payments || []).reduce((a, p) =>
                  a + (parseFloat(p.amount) || 0), 0)
                const diff = total - (parseFloat(editForm.total_amount) || 0)
                return total > 0 && (
                  <p className={`text-xs mt-1 font-medium
                    ${Math.abs(diff) < 0.01 ? 'text-green-600'
                      : diff > 0 ? 'text-red-500' : 'text-orange-500'}`}>
                    Total paiements : {total.toFixed(2)}€
                    {Math.abs(diff) < 0.01 ? ' ✓ Correct'
                      : diff > 0 ? ` (+${diff.toFixed(2)}€ dépassement)`
                      : ` (${diff.toFixed(2)}€ manquant)`}
                  </p>
                )
              })()}

              <div className="border-t border-gray-100 pt-4 mt-2">
                <button
                  onClick={async () => {
                    if (!window.confirm('Remettre ce téléphone en stock ? La vente sera supprimée.')) return
                    const saleToDelete = editingSale
                    setEditingSale(null)
                    await handleDeleteSale(saleToDelete)
                  }}
                  className="w-full py-2 rounded-xl border-2 border-orange-300 text-orange-600 text-sm font-medium hover:bg-orange-50 transition-all cursor-pointer"
                >
                  📦 Remettre en stock (annuler la vente)
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setEditingSale(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-[#1B2A4A] text-white text-sm font-bold hover:bg-[#00B4CC] transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-[#1B2A4A] text-lg">+ Ajouter une vente</h2>
              <button onClick={() => setShowAddSale(false)}>
                <X size={20} className="text-gray-400"/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addSaleForm.phones.map((p, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      Appareil {idx + 1}
                    </p>
                    {addSaleForm.phones.length > 1 && (
                      <button onClick={() => removePhoneRow(idx)}
                        className="text-xs text-red-500 font-bold hover:underline">
                        ✕ Retirer
                      </button>
                    )}
                  </div>

                  <div className="bg-blue-50 rounded-xl p-3 mb-3">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                      IMEI — rechercher en stock
                    </label>
                    <div className="flex gap-2">
                      <input type="text" value={p.imei}
                        onChange={(e) => updatePhoneField(idx, 'imei', e.target.value)}
                        placeholder="Saisir l'IMEI..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"/>
                      <button onClick={() => handleImeiLookup(idx)}
                        className="px-4 py-2 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold">
                        Rechercher
                      </button>
                    </div>
                    {p.lookupDone && p.foundPhoneId && (
                      <p className="text-xs text-green-600 font-bold mt-2">
                        ✓ Téléphone trouvé en stock — pré-rempli, modifiable
                      </p>
                    )}
                    {p.lookupDone && !p.foundPhoneId && (
                      <p className="text-xs text-orange-600 font-bold mt-2">
                        ⚠️ Aucun téléphone trouvé — vente directe, remplissez manuellement
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Modèle *</label>
                      <input type="text" value={p.model}
                        onChange={(e) => updatePhoneField(idx, 'model', e.target.value)}
                        placeholder="ex: iPhone 13 Pro"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Couleur</label>
                      <input type="text" value={p.color}
                        onChange={(e) => updatePhoneField(idx, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Stockage</label>
                      <input type="text" value={p.storage}
                        onChange={(e) => updatePhoneField(idx, 'storage', e.target.value)}
                        placeholder="ex: 128Go"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">État</label>
                      <select value={p.condition}
                        onChange={(e) => updatePhoneField(idx, 'condition', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="neuf">Neuf</option>
                        <option value="reconditionne">Reconditionné</option>
                        <option value="occasion">Occasion</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        Prix d'achat (€) {!p.foundPhoneId && '*'}
                      </label>
                      <input type="number" value={p.purchase_price}
                        onChange={(e) => updatePhoneField(idx, 'purchase_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prix de vente (€) *</label>
                      <input type="number" value={p.sale_price}
                        onChange={(e) => updatePhoneField(idx, 'sale_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={addPhoneRow}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-[#1B2A4A] hover:border-[#00B4CC] hover:text-[#00B4CC] transition-all">
                + Ajouter un téléphone
              </button>

              {(() => {
                const total = addSaleForm.phones.reduce((s, p) => s + (Number(p.sale_price) || 0), 0)
                const disc = Number(addSaleForm.discount_value) || 0
                const final = addSaleForm.discount_type === 'percent'
                  ? total * (1 - disc / 100)
                  : total - disc
                return (
                  <div className="bg-gray-50 rounded-xl p-3 flex justify-between">
                    <span className="text-sm text-gray-600">
                      Total ({addSaleForm.phones.length} appareil(s))
                    </span>
                    <span className="font-bold text-[#1B2A4A]">
                      {final.toFixed(2)}€
                    </span>
                  </div>
                )
              })()}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Magasin de vente *</label>
                <select value={addSaleForm.sale_magasin}
                  onChange={(e) => setAddSaleForm((f) => ({ ...f, sale_magasin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">Sélectionner...</option>
                  {Object.entries(MAGASINS)
                    .filter(([id]) => id !== 'sebphone')
                    .map(([id, m]) => (
                      <option key={id} value={id}>{m.nom}</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prénom client *</label>
                  <input type="text" value={addSaleForm.customer_firstname}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, customer_firstname: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nom client *</label>
                  <input type="text" value={addSaleForm.customer_name}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, customer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email (facture auto)</label>
                  <input type="email" value={addSaleForm.customer_email}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, customer_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone client</label>
                  <input type="tel" value={addSaleForm.customer_phone}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, customer_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Modes de paiement</label>
                {addSaleForm.payments.map((p, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={p.method}
                      onChange={(e) => setAddSaleForm((f) => ({
                        ...f, payments: f.payments.map((pp, idx) =>
                          idx === i ? { ...pp, method: e.target.value } : pp),
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">
                      <option value="cash">Espèces</option>
                      <option value="bancontact">Bancontact</option>
                      <option value="virement">Virement</option>
                    </select>
                    <input type="number" value={p.amount}
                      onChange={(e) => setAddSaleForm((f) => ({
                        ...f, payments: f.payments.map((pp, idx) =>
                          idx === i ? { ...pp, amount: e.target.value } : pp),
                      }))}
                      placeholder="Montant €"
                      className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                    {addSaleForm.payments.length > 1 && (
                      <button onClick={() => setAddSaleForm((f) => ({
                        ...f, payments: f.payments.filter((_, idx) => idx !== i),
                      }))}
                        className="text-red-500 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setAddSaleForm((f) => ({
                  ...f, payments: [...f.payments, { method: 'bancontact', amount: '' }],
                }))}
                  className="text-xs text-[#00B4CC] font-bold">
                  + Ajouter un mode de paiement
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="company"
                  checked={addSaleForm.is_company_sale}
                  onChange={(e) => setAddSaleForm((f) => ({ ...f, is_company_sale: e.target.checked }))}
                  className="w-4 h-4"/>
                <label htmlFor="company" className="text-sm text-gray-700">
                  Vente à une société (facture TVA)
                </label>
              </div>
              {addSaleForm.is_company_sale && (
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl">
                  <input type="text" placeholder="Nom société"
                    value={addSaleForm.company_name}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, company_name: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                  <input type="text" placeholder="N° TVA"
                    value={addSaleForm.company_vat}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, company_vat: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                  <input type="text" placeholder="Adresse société"
                    value={addSaleForm.company_address}
                    onChange={(e) => setAddSaleForm((f) => ({ ...f, company_address: e.target.value }))}
                    className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddSale(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium">
                  Annuler
                </button>
                <button onClick={handleAddSale} disabled={addSaleLoading}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-[#00B4CC] transition-all disabled:opacity-50">
                  {addSaleLoading ? 'Enregistrement...' : '✅ Enregistrer la vente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
