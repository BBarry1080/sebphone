import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS, MAGASINS_ADMIN as MAGASINS_LIST, MAGASINS_PHYSIQUES } from '../../utils/magasins'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  Plus, X, Printer, Download,
  Search, Eye, Trash2, Upload,
  FileText, AlertCircle, MoreVertical,
  Pencil
} from 'lucide-react'
import { useCurrentUser, useIsAdmin } from '../../hooks/usePermissions'
import { IPHONE_ON_DEMAND } from '../../data/iphoneOnDemand'

export default function Registre() {
  const currentUser = useCurrentUser()
  const isAdmin = useIsAdmin()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMagasin, setSelectedMagasin] = useState('tous')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFront, setUploadingFront] = useState(false)
  const [uploadingBack, setUploadingBack] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [idError, setIdError] = useState(null)
  const [imeiError, setImeiError] = useState(null)
  const [imeiDuplicate, setImeiDuplicate] = useState(false)
  const [idType, setIdType] = useState("Carte d'identité")
  const [editingEntry, setEditingEntry] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)

  const [modelSearch, setModelSearch]                   = useState('')
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)
  const [availableColors, setAvailableColors]           = useState([])
  const [paymentModes, setPaymentModes]                 = useState([])

  const validateIdNumber = (value) => value && value.length >= 3

  const validateIMEI = (imei) => {
    if (!/^\d{15}$/.test(imei)) return false
    let sum = 0
    for (let i = 0; i < 15; i++) {
      let digit = parseInt(imei[i])
      if (i % 2 === 1) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
    }
    return sum % 10 === 0
  }

  const initialForm = () => ({
    seller_first_name: '',
    seller_last_name: '',
    seller_address: '',
    seller_phone: '',
    seller_id_number: '',
    seller_id_type: "Carte d'identité",
    seller_birth_date: '',
    seller_id_front_url: '',
    seller_id_back_url: '',
    imei: '',
    brand: 'Apple',
    model: '',
    color: '',
    storage: '',
    phone_condition: 'occasion',
    phone_grade: 'Bon état',
    fournisseur: 'SebPhone',
    purchase_price: '',
    payment_method: 'Cash',
    cash_amount: '',
    virement_amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    magasin_id: currentUser?.magasin_id || 'anderlecht',
    notes: '',
  })

  const [form, setForm] = useState(initialForm())

  const emptyPhone = () => ({
    brand: 'Apple',
    model: '',
    color: '',
    storage: '',
    imei: '',
    purchase_price: '',
    payment_method: '',
    cash_amount: '',
    virement_amount: '',
    phone_condition: 'occasion',
    phone_grade: 'Bon état',
  })
  const [phones, setPhones] = useState([emptyPhone()])

  const addPhone = () => setPhones((prev) => [...prev, emptyPhone()])
  const removePhone = (index) => {
    if (phones.length === 1) return
    setPhones((prev) => prev.filter((_, i) => i !== index))
  }
  const updatePhone = (index, field, value) => {
    setPhones((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }
  const togglePhonePaymentMethod = (index, method) => {
    const current = phones[index].payment_method || ''
    const has = current.split(' + ').includes(method)
    let updated
    if (has) {
      updated = current.split(' + ').filter((m) => m !== method).join(' + ')
    } else {
      updated = current ? `${current} + ${method}` : method
    }
    updatePhone(index, 'payment_method', updated)
  }

  useEffect(() => { fetchEntries() }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null)
      setShowModelSuggestions(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const modelSuggestions = form.brand === 'Apple' && modelSearch.length > 0
    ? IPHONE_ON_DEMAND.filter((iphone) =>
        iphone.model.toLowerCase().includes(modelSearch.toLowerCase())
      )
    : []

  const handleSelectModel = (iphone) => {
    setForm((f) => ({ ...f, model: iphone.model, color: '' }))
    setModelSearch(iphone.model)
    setAvailableColors(iphone.colors || [])
    setShowModelSuggestions(false)
  }

  const togglePaymentMode = (mode) => {
    setPaymentModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }

  const handleAddToStock = async (entry) => {
    const confirmed = window.confirm(
      `Ajouter ${entry.brand} ${entry.model} au stock ?\n` +
      `IMEI: ${entry.imei}\n` +
      `Prix d'achat: ${entry.purchase_price}€`
    )
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('phones')
        .insert([{
          name: `${entry.brand} ${entry.model}`,
          model: entry.model,
          brand: entry.brand,
          color: entry.color || '',
          storage: entry.storage || '',
          condition: 'occasion',
          grade: 'Bon état',
          price: Math.round((entry.purchase_price || 0) * 1.3),
          purchase_price: entry.purchase_price,
          imei: entry.imei,
          status: 'disponible',
          magasins: [entry.magasin_id],
          fournisseur: `${entry.seller_first_name} ${entry.seller_last_name}`,
          notes: `Racheté le ${new Date(entry.transaction_date).toLocaleDateString('fr-BE')} — ${entry.payment_method || 'Cash'}`,
          parts_replaced: [],
        }])

      if (error) throw error
      alert(`✅ ${entry.brand} ${entry.model} ajouté au stock !`)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const fetchEntries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('purchase_registry')
      .select('*')
      .order('transaction_date', { ascending: false })
    if (error) console.error('Fetch error:', error)
    setEntries(data || [])
    setLoading(false)
  }

  const uploadIdPhoto = async (file, side) => {
    if (!file) return null
    const setSetting = side === 'front' ? setUploadingFront : setUploadingBack
    setSetting(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${side}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('id-cards')
        .upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = await supabase.storage
        .from('id-cards')
        .createSignedUrl(fileName, 31536000)
      const url = urlData?.signedUrl || ''
      if (side === 'front') {
        setForm((f) => ({ ...f, seller_id_front_url: url }))
      } else {
        setForm((f) => ({ ...f, seller_id_back_url: url }))
      }
      return url
    } catch (err) {
      console.error('Upload error:', err)
      setError('Erreur upload photo : ' + err.message)
      return null
    } finally {
      setSetting(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    const requiredSeller = [
      'seller_first_name', 'seller_last_name',
      'seller_address', 'seller_phone', 'seller_id_number',
      'seller_birth_date',
    ]
    for (const field of requiredSeller) {
      if (!form[field]) {
        setError(`Champ vendeur manquant : ${field}`)
        return
      }
    }

    for (let i = 0; i < phones.length; i++) {
      const p = phones[i]
      if (!p.imei) { setError(`Téléphone ${i + 1} : IMEI obligatoire`); return }
      if (!p.model) { setError(`Téléphone ${i + 1} : modèle obligatoire`); return }
      if (!p.purchase_price || parseFloat(p.purchase_price) <= 0) {
        setError(`Téléphone ${i + 1} : prix d'achat obligatoire`); return
      }
      if (!p.payment_method) { setError(`Téléphone ${i + 1} : mode de paiement obligatoire`); return }
    }

    setSubmitting(true)
    try {
      const sharedSeller = {
        seller_first_name:   form.seller_first_name,
        seller_last_name:    form.seller_last_name,
        seller_address:      form.seller_address,
        seller_phone:        form.seller_phone,
        seller_id_number:    form.seller_id_number,
        seller_id_type:      form.seller_id_type || idType,
        seller_birth_date:   form.seller_birth_date,
        seller_id_front_url: form.seller_id_front_url,
        seller_id_back_url:  form.seller_id_back_url,
        magasin_id:          form.magasin_id,
        fournisseur:         form.fournisseur,
        transaction_date:    new Date(form.transaction_date).toISOString(),
      }

      if (editingEntry) {
        const p = phones[0]
        const isMixte = p.payment_method?.includes('+')
        const mixedNotes = isMixte
          ? `${form.notes || ''} | Cash: ${p.cash_amount || 0}€ / Virement: ${p.virement_amount || 0}€`.trim()
          : (form.notes || null)
        const payload = {
          ...sharedSeller,
          brand:            p.brand,
          model:            p.model,
          color:            p.color || '',
          storage:          p.storage || '',
          imei:             p.imei,
          purchase_price:   parseFloat(p.purchase_price),
          payment_method:   p.payment_method,
          phone_condition:  p.phone_condition,
          phone_grade:      p.phone_condition !== 'neuf' ? p.phone_grade : null,
          reconditioning_status: p.phone_condition === 'reconditionne' ? (editingEntry.reconditioning_status || 'en_attente') : null,
          notes:            mixedNotes,
        }
        const { error: updateError } = await supabase
          .from('purchase_registry')
          .update(payload)
          .eq('id', editingEntry.id)
        if (updateError) throw updateError
        setSuccess('Entrée modifiée avec succès !')
      } else {
        const inserts = phones.map((p) => {
          const isMixte = p.payment_method?.includes('+')
          const mixedNotes = isMixte
            ? `${form.notes || ''} | Cash: ${p.cash_amount || 0}€ / Virement: ${p.virement_amount || 0}€`.trim()
            : (form.notes || null)
          return {
            ...sharedSeller,
            added_by:         currentUser?.name || 'Admin',
            brand:            p.brand,
            model:            p.model,
            color:            p.color || '',
            storage:          p.storage || '',
            imei:             p.imei,
            purchase_price:   parseFloat(p.purchase_price),
            payment_method:   p.payment_method,
            phone_condition:  p.phone_condition,
            phone_grade:      p.phone_condition !== 'neuf' ? p.phone_grade : null,
            reconditioning_status: p.phone_condition === 'reconditionne' ? 'en_attente' : null,
            added_to_stock:   false,
            notes:            mixedNotes,
          }
        })
        const { error: insertError } = await supabase
          .from('purchase_registry')
          .insert(inserts)
        if (insertError) throw insertError
        setSuccess(`${phones.length} téléphone(s) enregistré(s) !`)
      }

      setShowForm(false)
      setEditingEntry(null)
      setForm(initialForm())
      setPhones([emptyPhone()])
      setIdType("Carte d'identité")
      setIdError(null)
      setImeiError(null)
      setImeiDuplicate(false)
      setPaymentModes([])
      setModelSearch('')
      setAvailableColors([])
      fetchEntries()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette entrée du registre ?')) return
    const { error } = await supabase
      .from('purchase_registry')
      .delete()
      .eq('id', id)
    if (!error) fetchEntries()
  }

  const filteredEntries = entries.filter((entry) => {
    const matchSearch = !searchQuery ||
      `${entry.seller_first_name} ${entry.seller_last_name}`
        .toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.imei?.includes(searchQuery) ||
      entry.model?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchMagasin = selectedMagasin === 'tous' || entry.magasin_id === selectedMagasin
    const matchDateFrom = !dateFrom || new Date(entry.transaction_date) >= new Date(dateFrom)
    const matchDateTo = !dateTo || new Date(entry.transaction_date) <= new Date(dateTo + 'T23:59:59')
    return matchSearch && matchMagasin && matchDateFrom && matchDateTo
  })

  const printEntry = (entry) => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(27, 42, 74)
    doc.text("SEBPHONE — Registre d'achat", 20, 20)
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`Date : ${new Date(entry.transaction_date).toLocaleDateString('fr-BE')}`, 20, 30)
    doc.text(`Magasin : ${MAGASINS[entry.magasin_id]?.nom || entry.magasin_id}`, 20, 37)
    doc.setDrawColor(0, 180, 204)
    doc.line(20, 42, 190, 42)

    doc.setFontSize(13)
    doc.setTextColor(27, 42, 74)
    doc.text('VENDEUR', 20, 52)

    autoTable(doc, {
      startY: 56,
      head: [],
      body: [
        ['Nom complet', `${entry.seller_first_name} ${entry.seller_last_name}`],
        ['Adresse', entry.seller_address],
        ['Téléphone', entry.seller_phone || '—'],
        ["N° Carte d'identité", entry.seller_id_number],
        ['Date de naissance', entry.seller_birth_date
          ? new Date(entry.seller_birth_date).toLocaleDateString('fr-BE')
          : ''],
      ],
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 120 }
      }
    })

    doc.setFontSize(13)
    doc.setTextColor(27, 42, 74)
    doc.text('APPAREIL', 20, doc.lastAutoTable.finalY + 15)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 19,
      head: [],
      body: [
        ['IMEI', entry.imei],
        ['Marque', entry.brand],
        ['Modèle', entry.model],
        ["Prix d'achat", `${entry.purchase_price}€`],
        ['Mode de paiement', entry.payment_method || 'Cash'],
      ],
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 120 }
      }
    })

    if (entry.notes) {
      doc.setFontSize(11)
      doc.text(`Notes : ${entry.notes}`, 20, doc.lastAutoTable.finalY + 15)
    }

    const finalY = doc.lastAutoTable.finalY + 35
    doc.line(20, finalY, 90, finalY)
    doc.line(120, finalY, 190, finalY)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('Signature du vendeur', 20, finalY + 5)
    doc.text('Cachet & signature SebPhone', 120, finalY + 5)

    doc.save(`registre-${entry.seller_last_name}-${entry.imei}.pdf`)
  }

  const exportExcel = () => {
    const data = filteredEntries.map((e) => ({
      'Date': new Date(e.transaction_date).toLocaleDateString('fr-BE'),
      'Magasin': MAGASINS[e.magasin_id]?.nom || e.magasin_id,
      'Prénom': e.seller_first_name,
      'Nom': e.seller_last_name,
      'Adresse': e.seller_address,
      'Téléphone': e.seller_phone || '',
      'N° CI': e.seller_id_number,
      'Date naissance': e.seller_birth_date,
      'IMEI': e.imei,
      'Marque': e.brand,
      'Modèle': e.model,
      'Prix achat': e.purchase_price,
      'Mode de paiement': e.payment_method || 'Cash',
      'Ajouté par': e.added_by,
      'Notes': e.notes || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Registre')
    XLSX.writeFile(wb, `registre-sebphone-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.setTextColor(27, 42, 74)
    doc.text("SEBPHONE — Registre d'achats complet", 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Exporté le ${new Date().toLocaleDateString('fr-BE')} — ${filteredEntries.length} entrées`, 14, 22)

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Magasin', 'Vendeur', 'N° CI', 'IMEI', 'Modèle', 'Prix', 'Ajouté par']],
      body: filteredEntries.map((e) => [
        new Date(e.transaction_date).toLocaleDateString('fr-BE'),
        MAGASINS[e.magasin_id]?.nom?.replace('Seb Telecom — ', '') || e.magasin_id,
        `${e.seller_first_name} ${e.seller_last_name}`,
        e.seller_id_number,
        e.imei,
        `${e.brand} ${e.model}`,
        `${e.purchase_price}€`,
        e.added_by || 'Admin',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [27, 42, 74], fontSize: 9 },
      styles: { fontSize: 8 },
    })

    doc.save(`registre-complet-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Registre d'achats</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <AlertCircle size={14} className="text-orange-500"/>
            Document légal obligatoire — Confidentiel
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-all cursor-pointer">
            <Download size={16}/> Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer">
            <FileText size={16}/> PDF complet
          </button>
          <button onClick={() => { setPhones([emptyPhone()]); setForm(initialForm()); setShowForm(true) }}
            className="flex items-center gap-2 bg-[#00B4CC] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all cursor-pointer">
            <Plus size={16}/> Nouvel achat
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16}/> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-600">
          ✅ {success}
        </div>
      )}

      {/* FILTRES */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
            <input type="text" placeholder="Nom, IMEI, modèle..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"/>
          </div>
          <select value={selectedMagasin} onChange={(e) => setSelectedMagasin(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none">
            <option value="tous">Tous les magasins</option>
            {MAGASINS_LIST.map((m) => (
              <option key={m.id} value={m.id}>{m.nom.replace('Seb Telecom — ', '')}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"/>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"/>
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredEntries.length} entrée(s) trouvée(s)</p>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Vendeur', 'N° CI', 'IMEI', 'Appareil', 'Fournisseur', 'Prix', 'Paiement', 'Magasin', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Aucune entrée dans le registre
                  </td>
                </tr>
              ) : filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(entry.transaction_date).toLocaleDateString('fr-BE')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1B2A4A] text-sm">
                      {entry.seller_first_name} {entry.seller_last_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-32">{entry.seller_address}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{entry.seller_id_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{entry.imei}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#1B2A4A] text-sm">{entry.brand} {entry.model}</p>
                    {entry.phone_condition && (
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.phone_condition === 'neuf'
                          ? 'bg-blue-100 text-blue-700'
                          : entry.phone_condition === 'reconditionne'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {entry.phone_condition === 'neuf' ? '🆕 Neuf' : entry.phone_condition === 'reconditionne' ? '🔧 Reconditionné' : '📱 Occasion'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{entry.fournisseur || '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">{entry.purchase_price}€</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.payment_method === 'Cash'
                        ? 'bg-green-100 text-green-700'
                        : entry.payment_method?.includes('+')
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {entry.payment_method === 'Cash' ? '💵 ' : entry.payment_method?.includes('+') ? '💵🏦 ' : '🏦 '}
                      {entry.payment_method || 'Cash'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {MAGASINS[entry.magasin_id]?.nom?.replace('Seb Telecom — ', '') || entry.magasin_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu(openMenu === entry.id ? null : entry.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
                        <MoreVertical size={16}/>
                      </button>

                      {openMenu === entry.id && (
                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-44 py-1">
                          <button
                            onClick={() => { setSelectedEntry(entry); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Eye size={14}/> Voir le détail
                          </button>
                          <button
                            onClick={() => { printEntry(entry); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Printer size={14}/> Imprimer la fiche
                          </button>
                          <button
                            onClick={() => {
                              setEditingEntry(entry)
                              setIdType(entry.seller_id_type || "Carte d'identité")
                              setPhones([{
                                brand:            entry.brand || 'Apple',
                                model:            entry.model || '',
                                color:            entry.color || '',
                                storage:          entry.storage || '',
                                imei:             entry.imei || '',
                                purchase_price:   entry.purchase_price?.toString() || '',
                                payment_method:   entry.payment_method || 'Cash',
                                cash_amount:      '',
                                virement_amount:  '',
                                phone_condition:  entry.phone_condition || 'occasion',
                                phone_grade:      entry.phone_grade || 'Bon état',
                              }])
                              setForm({
                                seller_first_name: entry.seller_first_name || '',
                                seller_last_name:  entry.seller_last_name || '',
                                seller_address:    entry.seller_address || '',
                                seller_phone:      entry.seller_phone || '',
                                seller_id_number:  entry.seller_id_number || '',
                                seller_id_type:    entry.seller_id_type || "Carte d'identité",
                                seller_birth_date: entry.seller_birth_date || '',
                                seller_id_front_url: entry.seller_id_front_url || '',
                                seller_id_back_url:  entry.seller_id_back_url || '',
                                imei:              entry.imei || '',
                                brand:             entry.brand || 'Apple',
                                model:             entry.model || '',
                                color:             entry.color || '',
                                storage:           entry.storage || '',
                                phone_condition:   entry.phone_condition || 'occasion',
                                phone_grade:       entry.phone_grade || 'Bon état',
                                fournisseur:       entry.fournisseur || 'SebPhone',
                                purchase_price:    entry.purchase_price || '',
                                payment_method:    entry.payment_method || 'Cash',
                                cash_amount:       '',
                                virement_amount:   '',
                                transaction_date:  entry.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
                                magasin_id:        entry.magasin_id || 'anderlecht',
                                notes:             entry.notes || '',
                              })
                              setShowForm(true)
                              setOpenMenu(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Pencil size={14}/> Modifier
                          </button>
                          <button
                            onClick={() => { handleAddToStock(entry); setOpenMenu(null) }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#00B4CC] hover:bg-cyan-50 font-medium cursor-pointer">
                            <Plus size={14}/> Ajouter au stock
                          </button>
                          {isAdmin && (
                            <>
                              <div className="border-t border-gray-100 my-1"/>
                              <button
                                onClick={() => { handleDelete(entry.id); setOpenMenu(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 cursor-pointer">
                                <Trash2 size={14}/> Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A] text-lg">
                {editingEntry ? "Modifier l'entrée" : 'Nouvel achat — Registre légal'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingEntry(null)
                  setForm(initialForm())
                  setPhones([emptyPhone()])
                  setIdType("Carte d'identité")
                  setIdError(null)
                  setImeiError(null)
                  setImeiDuplicate(false)
                  setPaymentModes([])
                  setModelSearch('')
                  setAvailableColors([])
                }}
                className="cursor-pointer">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* SECTION VENDEUR */}
              <div>
                <h4 className="font-semibold text-[#1B2A4A] mb-3 text-sm uppercase tracking-wide">
                  👤 Informations vendeur
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Prénom *</label>
                    <input type="text" value={form.seller_first_name}
                      onChange={(e) => setForm((f) => ({ ...f, seller_first_name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Mohamed"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nom *</label>
                    <input type="text" value={form.seller_last_name}
                      onChange={(e) => setForm((f) => ({ ...f, seller_last_name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Dupont"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Adresse complète *</label>
                    <input type="text" value={form.seller_address}
                      onChange={(e) => setForm((f) => ({ ...f, seller_address: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Rue de la Loi 1, 1000 Bruxelles"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Numéro de téléphone *</label>
                    <input type="tel" value={form.seller_phone}
                      onChange={(e) => setForm((f) => ({ ...f, seller_phone: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="+32 472 12 34 56"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Type de document *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Carte d'identité", 'Passeport', 'Permis de conduire'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setIdType(type)
                            setForm((f) => ({ ...f, seller_id_type: type }))
                            setIdError(null)
                          }}
                          className={`py-2 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer
                            ${idType === type
                              ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                              : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'}`}>
                          {type === "Carte d'identité" ? '🪪' : type === 'Passeport' ? '📕' : '🚗'} {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">N° {idType} / Registre National *</label>
                    <input type="text" value={form.seller_id_number}
                      onChange={(e) => setForm((f) => ({ ...f, seller_id_number: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-mono"
                      placeholder="Numéro de document"/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Date de naissance *</label>
                    <input type="date" value={form.seller_birth_date}
                      onChange={(e) => setForm((f) => ({ ...f, seller_birth_date: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"/>
                  </div>
                </div>
              </div>

              {/* UPLOAD PHOTOS CI */}
              <div>
                <h4 className="font-semibold text-[#1B2A4A] mb-3 text-sm uppercase tracking-wide">
                  📷 Photos carte d'identité
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Recto</label>
                    <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm
                      ${form.seller_id_front_url ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 hover:border-[#00B4CC] text-gray-400'}`}>
                      {uploadingFront ? (
                        <div className="w-5 h-5 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin"/>
                      ) : form.seller_id_front_url ? (
                        <>
                          <span className="text-xl">✅</span>
                          <span className="text-xs mt-1">Photo recto OK</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20}/>
                          <span className="text-xs mt-1">Cliquez pour upload</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => uploadIdPhoto(e.target.files[0], 'front')}/>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Verso</label>
                    <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all text-sm
                      ${form.seller_id_back_url ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 hover:border-[#00B4CC] text-gray-400'}`}>
                      {uploadingBack ? (
                        <div className="w-5 h-5 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin"/>
                      ) : form.seller_id_back_url ? (
                        <>
                          <span className="text-xl">✅</span>
                          <span className="text-xs mt-1">Photo verso OK</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20}/>
                          <span className="text-xs mt-1">Cliquez pour upload</span>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => uploadIdPhoto(e.target.files[0], 'back')}/>
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION APPAREILS — multi-téléphones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[#1B2A4A] text-sm uppercase tracking-wide">
                    📱 Téléphones rachetés
                  </h4>
                  {!editingEntry && (
                    <button
                      type="button"
                      onClick={addPhone}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#00B4CC] hover:text-cyan-700 transition-colors cursor-pointer"
                    >
                      <Plus size={14} />
                      Ajouter un téléphone
                    </button>
                  )}
                </div>

                {phones.map((phone, index) => {
                  const phoneSuggestions = phone.brand === 'Apple' && phone.model.length > 0
                    ? IPHONE_ON_DEMAND.filter((i) => i.model.toLowerCase().includes(phone.model.toLowerCase()))
                    : []
                  const phoneColors = phone.brand === 'Apple'
                    ? (IPHONE_ON_DEMAND.find((i) => i.model === phone.model)?.colors || [])
                    : []
                  const isMixte = phone.payment_method?.includes('+')

                  return (
                    <div key={index} className="border-2 border-gray-100 rounded-xl p-4 mb-3 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 uppercase">Téléphone {index + 1}</span>
                        {phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhone(index)}
                            className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {/* État */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {['neuf', 'occasion', 'reconditionne'].map((cond) => (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => {
                              updatePhone(index, 'phone_condition', cond)
                              if (cond === 'neuf') updatePhone(index, 'phone_grade', null)
                              else if (!phone.phone_grade) updatePhone(index, 'phone_grade', 'Bon état')
                            }}
                            className={`py-2 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                              phone.phone_condition === cond
                                ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                                : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                            }`}
                          >
                            {cond === 'neuf' ? '🆕 Neuf' : cond === 'occasion' ? '📱 Occasion' : '🔧 Recond.'}
                          </button>
                        ))}
                      </div>

                      {/* Grade */}
                      {phone.phone_condition !== 'neuf' && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          {['Comme neuf', 'Très bon état', 'Bon état'].map((grade) => (
                            <button
                              key={grade}
                              type="button"
                              onClick={() => updatePhone(index, 'phone_grade', grade)}
                              className={`py-1.5 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                                phone.phone_grade === grade
                                  ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                                  : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                              }`}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Marque *</label>
                          <select
                            value={phone.brand}
                            onChange={(e) => {
                              updatePhone(index, 'brand', e.target.value)
                              updatePhone(index, 'model', '')
                              updatePhone(index, 'color', '')
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                          >
                            {['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Google', 'Sony', 'Autre'].map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Stockage</label>
                          <select
                            value={phone.storage}
                            onChange={(e) => updatePhone(index, 'storage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                          >
                            <option value="">—</option>
                            {['16Go','32Go','64Go','128Go','256Go','512Go','1To'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Modèle *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={phone.model}
                              onChange={(e) => updatePhone(index, 'model', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                              placeholder={phone.brand === 'Apple' ? '12, 14 Pro, 15...' : 'Modèle du téléphone'}
                            />
                            {phoneSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto mt-1">
                                {phoneSuggestions.map((iphone) => (
                                  <button
                                    key={iphone.model}
                                    type="button"
                                    onClick={() => {
                                      updatePhone(index, 'model', iphone.model)
                                      updatePhone(index, 'color', '')
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-50 hover:text-[#00B4CC] border-b border-gray-50 last:border-0 cursor-pointer"
                                  >
                                    {iphone.model}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Couleur</label>
                          {phoneColors.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {phoneColors.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => updatePhone(index, 'color', color)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all cursor-pointer ${
                                    phone.color === color
                                      ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                                      : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                                  }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={phone.color}
                              onChange={(e) => updatePhone(index, 'color', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                              placeholder="Noir, Blanc..."
                            />
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">IMEI *</label>
                          <input
                            type="text"
                            value={phone.imei}
                            onChange={(e) => updatePhone(index, 'imei', e.target.value.replace(/\s/g, ''))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-mono"
                            placeholder="352999XXXXXXXXX"
                            maxLength={20}
                          />
                          {phone.imei.length === 15 && (
                            <p className={`text-xs mt-1 ${validateIMEI(phone.imei) ? 'text-green-600' : 'text-red-500'}`}>
                              {validateIMEI(phone.imei) ? '✅ IMEI valide' : '⚠️ IMEI invalide (Luhn)'}
                            </p>
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Mode de paiement *</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['Cash', 'Virement bancaire'].map((method) => {
                              const selected = (phone.payment_method || '').split(' + ').includes(method)
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => togglePhonePaymentMethod(index, method)}
                                  className={`py-2 rounded-xl text-xs font-medium border-2 transition-all cursor-pointer ${
                                    selected
                                      ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                                      : 'border-gray-200 text-gray-600 hover:border-[#00B4CC]'
                                  }`}
                                >
                                  {method === 'Cash' ? '💵 Cash' : '🏦 Virement'}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Prix d'achat (€) *</label>
                          {!isMixte && (
                            <input
                              type="number"
                              value={phone.purchase_price}
                              onChange={(e) => updatePhone(index, 'purchase_price', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                              placeholder="150"
                            />
                          )}
                          {isMixte && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">💵 Cash (€)</label>
                                <input
                                  type="number"
                                  value={phone.cash_amount || ''}
                                  onChange={(e) => {
                                    const cash = parseFloat(e.target.value) || 0
                                    const virement = parseFloat(phone.virement_amount) || 0
                                    updatePhone(index, 'cash_amount', e.target.value)
                                    updatePhone(index, 'purchase_price', (cash + virement).toString())
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">🏦 Virement (€)</label>
                                <input
                                  type="number"
                                  value={phone.virement_amount || ''}
                                  onChange={(e) => {
                                    const virement = parseFloat(e.target.value) || 0
                                    const cash = parseFloat(phone.cash_amount) || 0
                                    updatePhone(index, 'virement_amount', e.target.value)
                                    updatePhone(index, 'purchase_price', (cash + virement).toString())
                                  }}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                                  placeholder="0"
                                />
                              </div>
                              {phone.purchase_price && (
                                <div className="col-span-2 bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 text-xs font-bold text-green-700">
                                  Total : {phone.purchase_price}€
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {phones.length > 1 && (
                  <div className="bg-[#1B2A4A] rounded-xl p-3 text-white text-sm flex justify-between mb-3">
                    <span className="font-medium">Total {phones.length} téléphones</span>
                    <span className="font-black text-[#00B4CC]">
                      {phones.reduce((acc, p) => acc + (parseFloat(p.purchase_price) || 0), 0)}€
                    </span>
                  </div>
                )}

                {/* Champs partagés (vendeur/transaction) */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Fournisseur *</label>
                    <select
                      value={form.fournisseur}
                      onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                    >
                      <option value="SebPhone">💻 SebPhone</option>
                      {MAGASINS_PHYSIQUES.map((m) => {
                        const short = m.nom.replace('Seb Telecom — ', '')
                        return <option key={m.id} value={short}>📍 {short}</option>
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Date de transaction *</label>
                    <input
                      type="date"
                      value={form.transaction_date}
                      onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin *</label>
                    <select
                      value={form.magasin_id}
                      onChange={(e) => setForm((f) => ({ ...f, magasin_id: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
                    >
                      {MAGASINS_LIST.map((m) => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optionnel)</label>
                    <textarea
                      value={form.notes}
                      rows={2}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none resize-none"
                      placeholder="Remarques..."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                  ⚠️ {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full bg-[#1B2A4A] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#243660] transition-all disabled:opacity-50 cursor-pointer">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    {editingEntry ? 'Modification...' : 'Enregistrement...'}
                  </span>
                ) : editingEntry ? "✏️ Modifier l'entrée" : '📋 Enregistrer dans le registre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A]">Détail de l'entrée</h3>
              <button onClick={() => setSelectedEntry(null)} className="cursor-pointer">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
              {[
                ['Vendeur', `${selectedEntry.seller_first_name} ${selectedEntry.seller_last_name}`],
                ['Adresse', selectedEntry.seller_address],
                ['Téléphone', selectedEntry.seller_phone || '—'],
                ['N° CI', selectedEntry.seller_id_number],
                ['Date naissance', selectedEntry.seller_birth_date
                  ? new Date(selectedEntry.seller_birth_date).toLocaleDateString('fr-BE') : '—'],
                ['IMEI', selectedEntry.imei],
                ['Appareil', `${selectedEntry.brand} ${selectedEntry.model}`],
                ['Prix achat', `${selectedEntry.purchase_price}€`],
                ['Mode de paiement', selectedEntry.payment_method || 'Cash'],
                ['Date transaction', new Date(selectedEntry.transaction_date).toLocaleDateString('fr-BE')],
                ['Magasin', MAGASINS[selectedEntry.magasin_id]?.nom || '—'],
                ['Ajouté par', selectedEntry.added_by || 'Admin'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-500 font-medium">{label}</span>
                  <span className="text-[#1B2A4A] font-semibold text-right max-w-48">{value}</span>
                </div>
              ))}

              {(selectedEntry.seller_id_front_url || selectedEntry.seller_id_back_url) && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {selectedEntry.seller_id_front_url && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Recto CI</p>
                      <img src={selectedEntry.seller_id_front_url} alt="CI Recto"
                        className="w-full rounded-lg border border-gray-200"/>
                    </div>
                  )}
                  {selectedEntry.seller_id_back_url && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Verso CI</p>
                      <img src={selectedEntry.seller_id_back_url} alt="CI Verso"
                        className="w-full rounded-lg border border-gray-200"/>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { printEntry(selectedEntry); setSelectedEntry(null) }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1B2A4A] text-white rounded-xl py-2.5 text-sm font-semibold cursor-pointer">
                  <Printer size={16}/> Imprimer la fiche
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
