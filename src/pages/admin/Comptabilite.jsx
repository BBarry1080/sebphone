import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS, MAGASINS_LIST, MAGASINS_PHYSIQUES, MAGASINS_ADMIN } from '../../utils/magasins'
import {
  TrendingUp, ShoppingBag, CreditCard,
  Banknote, Store, Plus, X, Eye, Wrench, Receipt
} from 'lucide-react'
import { useRequirePermission, useCurrentUser, usePermission } from '../../hooks/usePermissions'

export default function Comptabilite() {
  useRequirePermission('voir_comptabilite')
  const currentUser = useCurrentUser()
  const isAdmin = currentUser.role === 'admin' || !currentUser.role
  const canAddPayments = usePermission('ajouter_paiements')

  const adminMagasinsForStats = MAGASINS_ADMIN.filter((m) => m.id !== 'sebphone')
  const allowedMagasins = isAdmin
    ? adminMagasinsForStats
    : adminMagasinsForStats.filter((m) => {
        const key = 'compta_' + m.id.replace(/-/g, '_')
        return currentUser.permissions?.[key] === true
      })

  const [phones, setPhones] = useState([])
  const [payments, setPayments] = useState([])
  const [reconStock, setReconStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMagasin, setSelectedMagasin] = useState('tous')
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [showTVADetail, setShowTVADetail]   = useState(false)
  const [newPayment, setNewPayment] = useState({
    magasin_id: MAGASINS_LIST[0]?.id || 'anderlecht',
    payment_method: 'cash',
    amount: '',
    purchase_price: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [phonesRes, paymentsRes, reconRes] = await Promise.all([
      supabase.from('phones').select('*'),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('purchase_registry')
        .select('purchase_price')
        .eq('phone_condition', 'reconditionne')
        .eq('reconditioning_status', 'en_attente'),
    ])
    setPhones(phonesRes.data || [])
    setPayments(paymentsRes.data || [])
    setReconStock(reconRes.data || [])
    setLoading(false)
  }

  const totalReconStock = reconStock.reduce((a, e) => a + (e.purchase_price || 0), 0)

  const filteredPhones = selectedMagasin === 'tous'
    ? phones
    : phones.filter((p) => Array.isArray(p.magasins) && p.magasins.includes(selectedMagasin))

  const stockDisponible = filteredPhones.filter((p) => p.status === 'disponible')
  const stockVendu      = filteredPhones.filter((p) => p.status === 'vendu')

  const totalPrixAchat          = stockDisponible.reduce((acc, p) => acc + (p.purchase_price || 0), 0)
  const totalBeneficePotentiel  = stockDisponible.reduce((acc, p) => acc + ((p.price || 0) - (p.purchase_price || 0)), 0)
  const totalBeneficeRealise    = stockVendu.reduce((acc, p) => acc + ((p.price || 0) - (p.purchase_price || 0)), 0)
  const totalTVA                = stockVendu.reduce((acc, p) => acc + (p.tva_amount || 0), 0)

  const soldPhonesDetail = phones
    .filter((p) => p.status === 'vendu')
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))

  const isCash       = (method) => method?.toLowerCase().includes('cash')
  const isVirement   = (method) => method?.toLowerCase().includes('virement')
  const isBancontact = (method) => method?.toLowerCase().includes('bancontact')
  const isStripe     = (method) => method?.toLowerCase().includes('stripe')
  const isMixte      = (method) => isCash(method) && isVirement(method)

  const filteredPayments = selectedMagasin === 'tous'
    ? payments
    : payments.filter((p) => p.magasin_id === selectedMagasin)

  const totalCash       = filteredPayments.filter((p) => isCash(p.payment_method)).reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalVirement   = filteredPayments.filter((p) => isVirement(p.payment_method)).reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalMixte      = filteredPayments.filter((p) => isMixte(p.payment_method)).reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalBancontact = filteredPayments.filter((p) => isBancontact(p.payment_method)).reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalStripe     = filteredPayments.filter((p) => isStripe(p.payment_method)).reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalRevenu     = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0)

  console.log('filteredPayments:', filteredPayments.length)
  console.log('totalRevenu:', totalRevenu)

  const handleAddPayment = async () => {
    if (!newPayment.amount) return
    const { error } = await supabase.from('payments').insert([{
      magasin_id:    newPayment.magasin_id,
      payment_method: newPayment.payment_method,
      amount:        parseFloat(newPayment.amount),
      purchase_price: parseFloat(newPayment.purchase_price) || 0,
      description:   newPayment.description || null,
      payment_date:  new Date(newPayment.payment_date).toISOString(),
    }])
    if (!error) {
      setShowAddPayment(false)
      setNewPayment({
        magasin_id: MAGASINS_LIST[0]?.id || 'anderlecht',
        payment_method: 'cash',
        amount: '',
        purchase_price: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0],
      })
      fetchData()
    }
  }

  const statsByMagasin = allowedMagasins.map((mag) => {
    const magPhones   = phones.filter((p) => Array.isArray(p.magasins) && p.magasins.includes(mag.id))
    const dispo       = magPhones.filter((p) => p.status === 'disponible')
    const vendu       = magPhones.filter((p) => p.status === 'vendu')
    const magPayments = payments.filter((p) => p.magasin_id === mag.id)
    return {
      ...mag,
      nbDispo:             dispo.length,
      nbVendu:             vendu.length,
      prixAchat:           dispo.reduce((a, p) => a + (p.purchase_price || 0), 0),
      beneficePotentiel:   dispo.reduce((a, p) => a + ((p.price || 0) - (p.purchase_price || 0)), 0),
      beneficeRealise:     vendu.reduce((a, p) => a + ((p.price || 0) - (p.purchase_price || 0)), 0),
      tva:                 vendu.reduce((a, p) => a + (p.tva_amount || 0), 0),
      cash:        magPayments.filter((p) => isCash(p.payment_method)).reduce((a, p) => a + p.amount, 0),
      virement:    magPayments.filter((p) => isVirement(p.payment_method)).reduce((a, p) => a + p.amount, 0),
      mixte:       magPayments.filter((p) => isMixte(p.payment_method)).reduce((a, p) => a + p.amount, 0),
      bancontact:  magPayments.filter((p) => isBancontact(p.payment_method)).reduce((a, p) => a + p.amount, 0),
      stripe:      magPayments.filter((p) => isStripe(p.payment_method)).reduce((a, p) => a + p.amount, 0),
      ca:          magPayments.reduce((a, p) => a + (p.amount || 0), 0),
    }
  })

  const sebphonePhones = phones.filter((p) => p.paid_by === 'sebphone')
  const sebphoneDispo  = sebphonePhones.filter((p) => p.status === 'disponible')
  const sebphoneVendu  = sebphonePhones.filter((p) => p.status === 'vendu')
  const sebphonePayments = payments.filter((p) => p.magasin_id === 'sebphone')
  const sebphoneStats = isAdmin ? {
    id: 'sebphone',
    nom: 'SebPhone',
    nbDispo:           sebphoneDispo.length,
    nbVendu:           sebphoneVendu.length,
    prixAchat:         sebphoneDispo.reduce((a, p) => a + (p.purchase_price || 0), 0),
    beneficePotentiel: sebphoneDispo.reduce((a, p) => a + ((p.price || 0) - (p.purchase_price || 0)), 0),
    beneficeRealise:   sebphoneVendu.reduce((a, p) => a + ((p.price || 0) - (p.purchase_price || 0)), 0),
    tva:               sebphoneVendu.reduce((a, p) => a + (p.tva_amount || 0), 0),
    cash:        sebphonePayments.filter((p) => isCash(p.payment_method)).reduce((a, p) => a + p.amount, 0),
    virement:    sebphonePayments.filter((p) => isVirement(p.payment_method)).reduce((a, p) => a + p.amount, 0),
    mixte:       sebphonePayments.filter((p) => isMixte(p.payment_method)).reduce((a, p) => a + p.amount, 0),
    bancontact:  sebphonePayments.filter((p) => p.payment_method === 'bancontact').reduce((a, p) => a + p.amount, 0),
    stripe:      sebphonePayments.filter((p) => p.payment_method === 'stripe').reduce((a, p) => a + p.amount, 0),
    ca:          sebphonePayments.reduce((a, p) => a + (p.amount || 0), 0),
  } : null

  const allStats = sebphoneStats ? [sebphoneStats, ...statsByMagasin] : statsByMagasin

  const fmt = (n) => n.toLocaleString('fr-BE')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Comptabilité</h1>
          <p className="text-sm text-gray-500 mt-1">Vue globale de tous les magasins</p>
        </div>
        {canAddPayments && (
          <button
            onClick={() => setShowAddPayment(true)}
            className="flex items-center gap-2 bg-[#00B4CC] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all"
          >
            <Plus size={16} />
            Ajouter un paiement
          </button>
        )}
      </div>

      {/* FILTRE MAGASIN */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedMagasin('tous')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedMagasin === 'tous' ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous les magasins
        </button>
        {MAGASINS_ADMIN.map((mag) => (
          <button
            key={mag.id}
            onClick={() => setSelectedMagasin(mag.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedMagasin === mag.id ? 'bg-[#1B2A4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {mag.nom.replace('Seb Telecom — ', '')}
          </button>
        ))}
      </div>

      {/* CARDS GLOBALES */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <ShoppingBag size={18} className="text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Prix d'achat stock</span>
          </div>
          <p className="text-2xl font-black text-[#1B2A4A]">{fmt(totalPrixAchat)}€</p>
          <p className="text-xs text-gray-400 mt-1">{stockDisponible.length} appareils disponibles</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-cyan-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-cyan-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Chiffre d'affaires</span>
          </div>
          <p className="text-2xl font-black text-cyan-600">{fmt(totalRevenu)}€</p>
          <p className="text-xs text-gray-400 mt-1">Total encaissé ({filteredPayments.length} paiements)</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <Wrench size={18} className="text-orange-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Stock en reconditionnement</span>
          </div>
          <p className="text-2xl font-black text-orange-600">{fmt(totalReconStock)}€</p>
          <p className="text-xs text-gray-400 mt-1">Prix d'achat — en attente ({reconStock.length})</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Bénéfice potentiel</span>
          </div>
          <p className="text-2xl font-black text-green-600">{fmt(totalBeneficePotentiel)}€</p>
          <p className="text-xs text-gray-400 mt-1">Réalisé : {fmt(totalBeneficeRealise)}€</p>
        </div>

        <div
          onClick={() => setShowTVADetail((v) => !v)}
          className={`bg-white rounded-2xl p-5 border shadow-sm cursor-pointer transition-all ${
            showTVADetail ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Receipt size={18} className="text-purple-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">TVA collectée</span>
            <Eye size={14} className="text-gray-400 ml-auto" />
          </div>
          <p className="text-2xl font-black text-purple-600">{totalTVA.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€</p>
          <p className="text-xs text-gray-400 mt-1">Cliquez pour le détail</p>
        </div>

        <div
          onClick={() => setSelectedMethod(selectedMethod === 'virement' ? null : 'virement')}
          className={`bg-white rounded-2xl p-5 border shadow-sm cursor-pointer transition-all ${
            selectedMethod === 'virement' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Virement bancaire</span>
            <Eye size={14} className="text-gray-400 ml-auto" />
          </div>
          <p className="text-2xl font-black text-blue-600">{fmt(totalVirement)}€</p>
          <p className="text-xs text-gray-400 mt-1">Cliquez pour le détail</p>
        </div>

        <div
          onClick={() => setSelectedMethod(selectedMethod === 'cash' ? null : 'cash')}
          className={`bg-white rounded-2xl p-5 border shadow-sm cursor-pointer transition-all ${
            selectedMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-500'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Banknote size={18} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500 font-medium">Cash</span>
            <Eye size={14} className="text-gray-400 ml-auto" />
          </div>
          <p className="text-2xl font-black text-green-600">{fmt(totalCash)}€</p>
          <p className="text-xs text-gray-400 mt-1">Cliquez pour le détail</p>
        </div>
      </div>

      {/* STRIPE card (séparée, pleine largeur) */}
      {totalStripe > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <CreditCard size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Stripe (en ligne)</p>
              <p className="text-xl font-black text-purple-600">{fmt(totalStripe)}€</p>
            </div>
          </div>
        </div>
      )}

      {/* DÉTAIL TVA */}
      {showTVADetail && (
        <div className="bg-white rounded-2xl border border-purple-200 shadow-sm mb-8 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1B2A4A] flex items-center gap-2">
              <Receipt size={18} className="text-purple-600" />
              Détail TVA collectée
            </h3>
            <button onClick={() => setShowTVADetail(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-100">
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-xs text-purple-500 mb-1">TVA sur marge</p>
              <p className="font-bold text-purple-700">
                {soldPhonesDetail.filter((p) => p.tva_regime === 'marge').reduce((a, p) => a + (p.tva_amount || 0), 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
              </p>
              <p className="text-xs text-purple-400">
                {soldPhonesDetail.filter((p) => p.tva_regime === 'marge').length} ventes
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-blue-500 mb-1">TVA normale 21%</p>
              <p className="font-bold text-blue-700">
                {soldPhonesDetail.filter((p) => p.tva_regime === 'normale').reduce((a, p) => a + (p.tva_amount || 0), 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
              </p>
              <p className="text-xs text-blue-400">
                {soldPhonesDetail.filter((p) => p.tva_regime === 'normale').length} ventes
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Téléphone', 'Régime TVA', 'Prix TTC', 'Prix HT', 'TVA', 'Magasin'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {soldPhonesDetail
                  .filter((p) => selectedMagasin === 'tous' || p.magasins?.includes(selectedMagasin))
                  .map((phone) => (
                    <tr key={phone.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {phone.updated_at ? new Date(phone.updated_at).toLocaleDateString('fr-BE') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#1B2A4A] text-sm">{phone.name || phone.model}</p>
                        <p className="text-xs text-gray-400">{phone.color}{phone.color && phone.storage ? ' · ' : ''}{phone.storage}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          phone.tva_regime === 'marge' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {phone.tva_regime === 'marge' ? '📊 Marge' : '💼 Normale'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#1B2A4A]">
                        {(phone.price || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(phone.price_ht || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-purple-600">
                        {(phone.tva_amount || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {phone.magasins?.[0] ? (MAGASINS[phone.magasins[0]]?.nom?.replace('Seb Telecom — ', '') || phone.magasins[0]) : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-right text-gray-600">TOTAL TVA</td>
                  <td className="px-4 py-3 text-sm text-purple-600">
                    {totalTVA.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {soldPhonesDetail.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">Aucune vente enregistrée</div>
            )}
          </div>
        </div>
      )}

      {/* DÉTAIL PAIEMENTS */}
      {selectedMethod && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-bold text-[#1B2A4A]">
              Détail — {selectedMethod === 'virement' ? 'Virement bancaire' : 'Cash'}
            </h3>
            <button onClick={() => setSelectedMethod(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Par magasin</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statsByMagasin.map((mag) => (
                <div key={mag.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{mag.nom.replace('Seb Telecom — ', '')}</p>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600">💵 Cash : {fmt(mag.cash)}€</span>
                    <span className="text-blue-600">🏦 Virement : {fmt(mag.virement)}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Magasin', 'Description', 'Prix achat', 'Montant'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 ${i === 4 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPayments
                  .filter((p) => selectedMethod === 'virement' ? isVirement(p.payment_method) : isCash(p.payment_method))
                  .map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString('fr-BE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(MAGASINS[payment.magasin_id]?.nom || payment.magasin_id).replace('Seb Telecom — ', '')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.purchase_price ? `${payment.purchase_price}€` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-green-600">
                        +{payment.amount}€
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredPayments.filter((p) => selectedMethod === 'virement' ? isVirement(p.payment_method) : isCash(p.payment_method)).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                Aucun paiement {selectedMethod === 'virement' ? 'virement' : 'cash'} enregistré
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABLEAU PAR MAGASIN */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-[#1B2A4A] flex items-center gap-2">
            <Store size={18} className="text-[#00B4CC]" />
            Détail par magasin
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Magasin', 'Stock dispo', 'Vendus', 'Prix achat', 'Bénéf. potentiel', 'TVA', 'CA', 'Cash', 'Virement'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 ${
                      i === 0 ? 'text-left' : i <= 2 ? 'text-center' : 'text-right'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allStats.map((mag) => (
                <tr key={mag.id} className={`border-t border-gray-100 hover:bg-gray-50 ${
                  mag.id === 'sebphone' ? 'bg-cyan-50/50 font-medium' : ''
                }`}>
                  <td className="px-4 py-3 font-medium text-[#1B2A4A] text-sm">
                    {mag.id === 'sebphone' ? (
                      <span className="flex items-center gap-2">
                        <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded-full">💻 SebPhone</span>
                        <span className="text-xs text-gray-400">(entité financière)</span>
                      </span>
                    ) : (
                      mag.nom.replace('Seb Telecom — ', '')
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                      {mag.nbDispo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {mag.nbVendu}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-orange-600">
                    {fmt(mag.prixAchat)}€
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                    {fmt(mag.beneficePotentiel)}€
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-purple-600">
                    {(mag.tva || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-cyan-600">
                    {fmt(mag.ca)}€
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    {fmt(mag.cash)}€
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600">
                    {fmt(mag.virement)}€
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm text-[#1B2A4A]">TOTAL</td>
                <td className="px-4 py-3 text-center text-sm">{stockDisponible.length}</td>
                <td className="px-4 py-3 text-center text-sm">{stockVendu.length}</td>
                <td className="px-4 py-3 text-right text-sm text-orange-600">{fmt(totalPrixAchat)}€</td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{fmt(totalBeneficePotentiel)}€</td>
                <td className="px-4 py-3 text-right text-sm text-purple-600">{totalTVA.toLocaleString('fr-BE', { minimumFractionDigits: 2 })}€</td>
                <td className="px-4 py-3 text-right text-sm text-cyan-600">{fmt(totalRevenu)}€</td>
                <td className="px-4 py-3 text-right text-sm">{fmt(totalCash)}€</td>
                <td className="px-4 py-3 text-right text-sm text-blue-600">{fmt(totalVirement)}€</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL AJOUTER PAIEMENT */}
      {showAddPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2A4A]">Ajouter un paiement</h3>
              <button onClick={() => setShowAddPayment(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Magasin</label>
                <select
                  value={newPayment.magasin_id}
                  onChange={(e) => setNewPayment((p) => ({ ...p, magasin_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-[#00B4CC]"
                >
                  {MAGASINS_LIST.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'virement bancaire', 'stripe'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setNewPayment((p) => ({ ...p, payment_method: method }))}
                      className={`py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                        newPayment.payment_method === method
                          ? 'border-[#00B4CC] bg-cyan-50 text-[#00B4CC]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Montant encaissé (€)</label>
                <input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                  placeholder="ex: 450"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Prix d'achat du téléphone (€)</label>
                <input
                  type="number"
                  value={newPayment.purchase_price}
                  onChange={(e) => setNewPayment((p) => ({ ...p, purchase_price: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                  placeholder="ex: 200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Description (optionnel)</label>
                <input
                  type="text"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                  placeholder="ex: Vente iPhone 14 Pro — Anderlecht"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#1B2A4A] mb-1 block">Date</label>
                <input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment((p) => ({ ...p, payment_date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                />
              </div>

              <button
                onClick={handleAddPayment}
                className="w-full bg-[#1B2A4A] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#243660] transition-all"
              >
                Enregistrer le paiement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
