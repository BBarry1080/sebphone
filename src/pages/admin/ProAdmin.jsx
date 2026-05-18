import { useEffect, useState } from 'react'
import { Check, X, Building2, Smartphone } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/usePermissions'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'rqbaYNMIGNP6IQB9O'
const PRO_TEMPLATE_ID = 'template_rs9zkwo'

export default function ProAdmin() {
  const currentUser = useCurrentUser()
  const [pending, setPending]   = useState([])
  const [processedAccounts, setProcessedAccounts] = useState([])
  const [phones, setPhones]     = useState([])
  const [proStock, setProStock] = useState([])
  const [loading, setLoading]   = useState(true)
  const [processing, setProcessing] = useState(null) // stocke l'id en cours
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [csvData, setCsvData] = useState([])
  const [importing, setImporting] = useState(false)

  const fetchAccounts = async () => {
    if (!isSupabaseReady) return
    // Demandes en attente
    const { data: pendingData } = await supabase
      .from('pro_accounts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPending(pendingData || [])

    // Comptes traités
    const { data: processed } = await supabase
      .from('pro_accounts')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('created_at', { ascending: false })
    setProcessedAccounts(processed || [])
  }

  const fetchAll = async () => {
    setLoading(true)
    if (!isSupabaseReady) { setLoading(false); return }
    const [{ data: phonesData }, { data: ps }] = await Promise.all([
      supabase
        .from('phones')
        .select('*')
        .or('fournisseur.eq.Price MyPhone,added_by_magasin.eq.sebphone')
        .eq('status', 'disponible')
        .order('created_at', { ascending: false }),
      supabase.from('pro_stock').select('*'),
    ])
    await fetchAccounts()
    setPhones(phonesData || [])
    setProStock(ps || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const approve = async (acc) => {
    setProcessing(acc.id)
    try {
      await supabase.from('pro_accounts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.email || 'Admin'
        })
        .eq('id', acc.id)

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, PRO_TEMPLATE_ID, {
          to_email: acc.email,
          to_name: acc.contact_name,
          contact_name: acc.contact_name,
          company_name: acc.company_name,
          vat_number: acc.vat_number || 'Non renseigné',
          subject: 'Compte professionnel approuvé',
          status_label: 'Compte approuvé !',
          status_class: 'status-approved',
          message: 'Félicitations ! Votre compte professionnel SebPhone a été approuvé. Vous pouvez dès maintenant accéder à notre catalogue exclusif réservé aux revendeurs.',
        }, EMAILJS_PUBLIC_KEY)
      } catch (emailErr) {
        console.warn('Email approbation non envoyé:', emailErr)
      }

      fetchAccounts()
      // Force re-fetch après 500ms
      setTimeout(() => fetchAccounts(), 500)
    } catch (err) {
      console.error('Erreur approbation:', err)
      alert('Erreur lors de l\'approbation')
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (acc) => {
    setProcessing(acc.id)
    try {
      await supabase.from('pro_accounts')
        .update({ status: 'rejected' })
        .eq('id', acc.id)

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, PRO_TEMPLATE_ID, {
          to_email: acc.email,
          to_name: acc.contact_name,
          contact_name: acc.contact_name,
          company_name: acc.company_name,
          vat_number: acc.vat_number || 'Non renseigné',
          subject: 'Demande de compte professionnel',
          status_label: 'Demande non retenue',
          status_class: 'status-pending',
          message: 'Après examen de votre dossier, nous ne sommes pas en mesure d\'approuver votre demande de compte professionnel pour le moment. Pour toute question, contactez-nous à contact@sebphone.be.',
        }, EMAILJS_PUBLIC_KEY)
      } catch (emailErr) {
        console.warn('Email refus non envoyé:', emailErr)
      }

      fetchAccounts()
      // Force re-fetch après 500ms
      setTimeout(() => fetchAccounts(), 500)
    } catch (err) {
      console.error('Erreur refus:', err)
      alert('Erreur lors du refus')
    } finally {
      setProcessing(null)
    }
  }

  const proStockFor = (phoneId) => proStock.find((s) => s.phone_id === phoneId)

  const togglePro = async (phone) => {
    const existing = proStockFor(phone.id)
    if (existing) {
      const { error } = await supabase
        .from('pro_stock')
        .update({ visible: !existing.visible })
        .eq('id', existing.id)
      if (error) { alert('Erreur: ' + error.message); return }
    } else {
      const { error } = await supabase
        .from('pro_stock')
        .insert([{
          phone_id:  phone.id,
          pro_price: phone.price || 0,
          lot_price: null,
          lot_size:  null,
          visible:   true,
        }])
      if (error) { alert('Erreur: ' + error.message); return }
    }
    fetchAll()
  }

  const updateProField = async (phoneId, field, value) => {
    const existing = proStockFor(phoneId)
    if (!existing) return
    const { error } = await supabase
      .from('pro_stock')
      .update({ [field]: value === '' ? null : Number(value) })
      .eq('id', existing.id)
    if (error) { alert('Erreur: ' + error.message); return }
    setProStock((prev) => prev.map((s) =>
      s.id === existing.id ? { ...s, [field]: value === '' ? null : Number(value) } : s))
  }

  // ── Import CSV Price My Phone ────────────────────────────────────
  const convertGrade = (productName) => {
    const name = productName.toLowerCase()
    if (name.includes('eco repair +') || name.includes('eco repair+'))
      return 'LCD'
    if (name.includes('eco repair'))
      return 'PEACE'
    if (name.includes('éco bat') || name.includes('eco bat'))
      return 'C-BAT'
    if (name.includes('éco rayure') || name.includes('eco rayure'))
      return 'C-REF'
    if (name.includes('éco') || name.includes('eco'))
      return 'C'
    if (name.includes('bc correct') || name.includes('correct'))
      return 'C'
    if (name.includes('très bon') || name.includes('tres bon'))
      return 'B'
    if (name.includes('excellent') || name.includes('ab ') || name.includes('ab\n'))
      return 'A+'
    return 'B'
  }

  const convertColor = (color) => {
    const colors = {
      'black': 'Noir', 'white': 'Blanc', 'blue': 'Bleu',
      'red': 'Rouge', 'green': 'Vert', 'yellow': 'Jaune',
      'pink': 'Rose', 'purple': 'Violet', 'gold': 'Or',
      'silver': 'Argent', 'grey': 'Gris sidéral', 'gray': 'Gris sidéral',
      'rose gold': 'Rose Gold', 'midnight': 'Minuit',
      'starlight': 'Lumière stellaire', 'coral': 'Corail',
      'orange': 'Orange', 'teal': 'Sarcelle',
      'graphite': 'Graphite', 'pacific blue': 'Bleu Pacifique',
      'sierra blue': 'Bleu alpin', 'alpine green': 'Vert alpin',
      'deep purple': 'Violet intense', 'space gray': 'Gris sidéral',
      'natural titanium': 'Titane naturel', 'black titanium': 'Titane noir',
    }
    const lower = color.toLowerCase()
    for (const [en, fr] of Object.entries(colors)) {
      if (lower === en || lower.includes(en)) return fr
    }
    return color
  }

  const parseCSVLine = (productName, prixAchat) => {
    // Retire "Apple " au début
    let name = productName.replace(/^Apple\s+/i, '').trim()

    // Vérifie iCloud verrouillé → skip
    if (name.toLowerCase().includes('icloud verrouillé') ||
        name.toLowerCase().includes('icloud verrouille')) {
      return null
    }

    // Extrait batterie si mentionnée
    const batterieMatch = name.match(/batterie\s+(\d+)\s*%/i)
    const battery = batterieMatch ? parseInt(batterieMatch[1]) : null
    name = name.replace(/batterie\s+\d+\s*%/i, '').trim()

    // Extrait stockage (ex: 128GB, 256GB)
    const storageMatch = name.match(/(\d+)\s*GB/i)
    const storage = storageMatch ? storageMatch[1] + 'Go' : ''
    name = name.replace(/\d+\s*GB/i, '').trim()

    // Grade PMP
    const grade = convertGrade(name)

    // Retire les mentions de grade du nom
    name = name
      .replace(/eco repair \+/gi, '')
      .replace(/eco repair/gi, '')
      .replace(/éco rayure/gi, '')
      .replace(/éco bat/gi, '')
      .replace(/éco/gi, '')
      .replace(/eco/gi, '')
      .replace(/ab excellent/gi, '')
      .replace(/excellent/gi, '')
      .replace(/très bon/gi, '')
      .replace(/bc correct/gi, '')
      .replace(/correct/gi, '')
      .trim()

    const modelPatterns = [
      'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16e', 'iPhone 16',
      'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
      'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
      'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 mini', 'iPhone 13',
      'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 mini', 'iPhone 12',
      'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
      'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
      'iPhone SE (2022)', 'iPhone SE (2020)', 'iPhone SE',
      'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7',
    ]

    let model = ''
    let colorPart = name
    for (const pattern of modelPatterns) {
      if (name.toLowerCase().includes(pattern.toLowerCase())) {
        model = pattern
        colorPart = name.replace(new RegExp(pattern, 'i'), '').trim()
        break
      }
    }

    const color = convertColor(colorPart.trim())

    const prixVente = parseFloat(prixAchat) // prix achat = prix vente par défaut

    return {
      name: model,
      model,
      brand: 'Apple',
      storage,
      color,
      grade,
      condition: 'occasion',
      price: prixVente,
      purchase_price: parseFloat(prixAchat),
      battery_health: battery,
      status: 'disponible',
      visible_on_site: false, // caché par défaut dans le stock pro
      categorie: 'telephone',
      fournisseur: 'Price MyPhone',
      tva_regime: 'marge',
      parts_replaced: [],
      magasins: [],
      has_esim: false,
    }
  }

  const handleCSVUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const lines = text.split('\n').filter((l) => l.trim())

      // Skip header
      const dataLines = lines.filter((l) =>
        !l.startsWith('Produit') &&
        l.includes(',') &&
        l.includes('"')
      )

      const parsed = dataLines.map((line) => {
        // Parse CSV ligne : "Nom du produit",prix
        const match = line.match(/"([^"]+)",(\d+)/)
        if (!match) return null
        return parseCSVLine(match[1], match[2])
      }).filter(Boolean)

      setCsvData(parsed)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (!csvData.length) return
    setImporting(true)

    try {
      // Insère par batch de 50
      for (let i = 0; i < csvData.length; i += 50) {
        const batch = csvData.slice(i, i + 50)
        const { error } = await supabase
          .from('phones')
          .insert(batch.map((p) => ({
            ...p,
            added_by: 'Admin',
            added_by_magasin: 'sebphone',
          })))
        if (error) throw error
      }

      alert(`✅ ${csvData.length} téléphones importés dans le stock pro !`)
      setCsvData([])
      setShowImportCSV(false)
      fetchAll() // refresh le stock pro
    } catch (err) {
      console.error('Erreur import:', err)
      alert('Erreur lors de l\'import: ' + err.message)
    }
    setImporting(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">👔 Espace Pro</h1>
          <p className="text-sm text-[#555]">Gestion des comptes et du stock professionnels</p>
        </div>
        <button
          onClick={() => setShowImportCSV(true)}
          className="flex items-center gap-2 bg-green-600 text-white
                     px-4 py-2 rounded-xl font-bold text-sm
                     hover:bg-green-700 transition-all">
          📥 Importer CSV Price MyPhone
        </button>
      </div>

      {/* Section A — Demandes d'accès */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#00B4CC]" />
          Demandes d'accès ({pending.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[#888] py-6 text-center">Chargement...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Aucune demande en attente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Société', 'Contact', 'Email', 'TVA', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((acc) => (
                  <tr key={acc.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{acc.company_name}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.contact_name}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.email}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.vat_number}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {acc.created_at ? new Date(acc.created_at).toLocaleDateString('fr-BE') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(acc)}
                          disabled={processing === acc.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 cursor-pointer ${processing === acc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Check size={13} /> Approuver
                        </button>
                        <button
                          onClick={() => reject(acc)}
                          disabled={processing === acc.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 cursor-pointer ${processing === acc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <X size={13} /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Comptes sociétés (traités) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2">
            🏢 Comptes sociétés ({processedAccounts.length})
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Société', 'Contact', 'Email', 'TVA', 'Date', 'Statut'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedAccounts.map(acc => (
              <tr key={acc.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-[#1B2A4A]">
                  {acc.company_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.contact_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.vat_number || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(acc.created_at).toLocaleDateString('fr-BE')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-lg font-bold
                    ${acc.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'}`}>
                    {acc.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
                  </span>
                </td>
              </tr>
            ))}
            {processedAccounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Aucun compte traité
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section B — Stock professionnel */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2 mb-4">
          <Smartphone size={18} className="text-[#00B4CC]" />
          Stock professionnel
        </h2>
        {loading ? (
          <p className="text-sm text-[#888] py-6 text-center">Chargement...</p>
        ) : phones.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Aucun téléphone disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Modèle', 'État', 'Stockage', 'Prix vente (€)', 'Visible pro', 'Prix pro (€)', 'Prix lot (€)', 'Taille lot'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phones.map((phone) => {
                  const ps = proStockFor(phone.id)
                  const isPro = ps && ps.visible
                  return (
                    <tr key={phone.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">
                        {phone.name || phone.model}
                        {isPro && (
                          <span className="ml-2 text-[10px] font-bold bg-[#00B4CC] text-white px-1.5 py-0.5 rounded">PRO</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{phone.condition}</td>
                      <td className="px-3 py-2 text-gray-600">{phone.storage || '—'}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          defaultValue={phone.price}
                          onBlur={async (e) => {
                            const newPrice = parseFloat(e.target.value)
                            if (!newPrice || newPrice === phone.price) return
                            await supabase.from('phones')
                              .update({ price: newPrice })
                              .eq('id', phone.id)
                          }}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center font-bold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => togglePro(phone)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                            isPro ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isPro ? 'Visible' : 'Masqué'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.pro_price ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'pro_price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.lot_price ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'lot_price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.lot_size ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'lot_size', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showImportCSV && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                📥 Importer stock Price MyPhone
              </h2>
              <button onClick={() => { setShowImportCSV(false); setCsvData([]) }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Coller le CSV directement */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Coller le contenu CSV directement
              </label>
              <textarea
                rows={6}
                placeholder={`Collez ici le contenu CSV Price MyPhone :\n"Apple iPhone 13 128GB Eco Repair Black",100\n"Apple iPhone 14 256GB Excellent Blue",200`}
                onChange={(e) => {
                  if (!e.target.value.trim()) return
                  // Parse le texte collé directement
                  const lines = e.target.value.split('\n').filter((l) => l.trim())
                  const parsed = lines.map((line) => {
                    const match = line.match(/"([^"]+)",(\d+)/)
                    if (!match) return null
                    return parseCSVLine(match[1], match[2])
                  }).filter(Boolean)
                  if (parsed.length > 0) setCsvData(parsed)
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-[#00B4CC] outline-none"
              />
            </div>

            <div className="text-center text-xs text-gray-400 my-2">— ou —</div>

            {/* Upload */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                Fichier CSV Price MyPhone
              </label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            {/* Preview */}
            {csvData.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-bold text-green-600 mb-2">
                  ✅ {csvData.length} téléphones détectés
                </p>
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Modèle', 'Stockage', 'Couleur', 'Grade', 'Achat', 'Vente'].map((h) => (
                          <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 10).map((p, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 font-medium">{p.model}</td>
                          <td className="px-2 py-1.5 text-gray-500">{p.storage}</td>
                          <td className="px-2 py-1.5 text-gray-500">{p.color}</td>
                          <td className="px-2 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-white text-[10px]
                              ${p.grade === 'A+' ? 'bg-green-500'
                                : p.grade === 'B' ? 'bg-blue-500'
                                : p.grade === 'C' ? 'bg-yellow-500'
                                : p.grade === 'C-BAT' ? 'bg-orange-400'
                                : p.grade === 'C-REF' ? 'bg-orange-600'
                                : p.grade === 'PEACE' ? 'bg-purple-500'
                                : p.grade === 'LCD' ? 'bg-red-400'
                                : 'bg-gray-400'}`}>
                              {p.grade}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-gray-500">{p.purchase_price}€</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={p.price}
                              onChange={(e) => setCsvData((prev) => prev.map((item, idx) =>
                                idx === i ? { ...item, price: parseFloat(e.target.value) || 0 } : item
                              ))}
                              className="w-20 px-1.5 py-1 border border-gray-200 rounded-lg text-xs font-bold text-center text-green-700"
                            />
                          </td>
                        </tr>
                      ))}
                      {csvData.length > 10 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-2 text-center text-gray-400 text-xs">
                            ... et {csvData.length - 10} autres téléphones
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportCSV(false); setCsvData([]) }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!csvData.length || importing}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-green-700 transition-all">
                {importing
                  ? 'Import en cours...'
                  : `📥 Importer ${csvData.length} téléphones`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
