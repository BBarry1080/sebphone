import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MAGASINS_PHYSIQUES } from '../../utils/magasins'
import { logActivity } from '../../lib/logActivity'
import ReceiptTicket from './ReceiptTicket'
import {
  ShoppingCart, Users, Truck, Boxes, Wrench, ClipboardList, X,
  Plus, Pencil, Trash2, Settings, UserCheck, History, PiggyBank,
  Euro, Briefcase, Ticket, Calendar, Bell,
} from 'lucide-react'

const COLORS = {
  navy: '#15223d',
  cyan: '#22d3ee',
  blue: '#2563eb',
  amber: '#f59e0b',
  green: '#16a34a',
  purple: '#8b5cf6',
  pink: '#ec4899',
  slate: '#64748b',
  teal: '#0d9488',
  indigo: '#4f46e5',
  emerald: '#059669',
  rose: '#e11d48',
}

const PANNE_OPTIONS = [
  'Écran cassé',
  'Batterie défectueuse',
  'Vitre arrière',
  'Face ID / Touch ID',
  'Connecteur de charge',
  'Haut-parleur / micro',
  'Caméra',
  'Bouton (home / power)',
  'Réparation logicielle',
  'Diagnostic',
  'Autre',
]

const pad4 = (n) => String(n).padStart(4, '0')

// Carte d'acces rapide, style maquette : icone pastel a gauche,
// titre + description, fleche en bas a droite
function QuickCard({ color, icon: Icon, title, description, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
      style={{ minHeight: 150 }}>
      <div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: `${color}1a`, color }}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
        <p className="font-bold text-base" style={{ color: COLORS.navy }}>{title}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex justify-end mt-3">
        <span className="text-gray-300 text-lg">→</span>
      </div>
    </button>
  )
}

export default function CaisseAccueil({
  magasin,
  magasinLabel,
  staffName = '',
  caTotal = 0,
  ticketCount = 0,
  beneficeJour = 0,
  lastClosure = null,
  onOpenCaisse,
  onOpenGestion,
  onOpenParametresCaisse,
  onOpenPointage,
  onOpenTresorerie,
  onOpenReparationsHub,
  onEditRefundFacture = () => {},
  showParametresCaisseTile = false,
  showTresorerieTile = false,
  showBenefice = false,
  onAcompteRecorded = () => {},
}) {
  const [showClientModal, setShowClientModal] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [showClotureDetail, setShowClotureDetail] = useState(false)
  const [showBonPrintable, setShowBonPrintable] = useState(false)
  const [repairsInProgress, setRepairsInProgress] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  const [clientForm, setClientForm] = useState({
    nom: '', date: today, client_number: '', magasin_id: magasin,
    type_panne: '', prix: '', devis: false, tel: '', email: '',
    montant_paye: '', payment_method: 'cash',
  })
  const [repairForm, setRepairForm] = useState({
    nom: '', date: today, appareil: '', imei: '', bon_number: '', client_number: '',
    magasin_id: magasin, type_panne: '', prix: '', devis: false, tel: '', email: '',
    montant_paye: '', payment_method: 'cash',
    ecran_modele: '', ecran_qualite: '',
  })
  const [lastBon, setLastBon] = useState(null)
  const [typePannePrixMap, setTypePannePrixMap] = useState({})
  const [repairTicketData, setRepairTicketData] = useState(null)
  const [showRepairTicketModal, setShowRepairTicketModal] = useState(false)

  useEffect(() => {
    const loadTypePannePrix = async () => {
      const { data } = await supabase.from('type_panne_prix').select('*')
      const map = {}
      ;(data || []).forEach((r) => { map[r.type_panne] = r })
      setTypePannePrixMap(map)
    }
    loadTypePannePrix()
  }, [])

  // Catalogue écrans par modèle (chargé au mount)
  const [ecranCatalog, setEcranCatalog] = useState([])
  const [ecranMarqueSel, setEcranMarqueSel] = useState('')
  const [ecranGammeSel, setEcranGammeSel]   = useState('')
  const [ecranModeleSel, setEcranModeleSel] = useState('')

  useEffect(() => {
    supabase.from('reparation_ecrans').select('*')
      .then(({ data }) => setEcranCatalog(data || []))
  }, [])

  const ecranMarques = useMemo(
    () => [...new Set(ecranCatalog.map((e) => e.marque).filter(Boolean))].sort(),
    [ecranCatalog]
  )
  const ecranGammes = useMemo(() => {
    if (!ecranMarqueSel) return []
    return [...new Set(
      ecranCatalog.filter((e) => e.marque === ecranMarqueSel).map((e) => e.gamme).filter(Boolean)
    )].sort()
  }, [ecranCatalog, ecranMarqueSel])
  const ecranModeles = useMemo(() => {
    if (!ecranMarqueSel || !ecranGammeSel) return []
    return [...new Set(
      ecranCatalog
        .filter((e) => e.marque === ecranMarqueSel && e.gamme === ecranGammeSel)
        .map((e) => e.modele)
        .filter(Boolean)
    )].sort()
  }, [ecranCatalog, ecranMarqueSel, ecranGammeSel])
  const ecranQualitesDisponibles = useMemo(() => {
    if (!ecranMarqueSel || !ecranGammeSel || !ecranModeleSel) return []
    return ecranCatalog.filter((e) =>
      e.marque === ecranMarqueSel && e.gamme === ecranGammeSel && e.modele === ecranModeleSel
    )
  }, [ecranCatalog, ecranMarqueSel, ecranGammeSel, ecranModeleSel])

  // Détail du jour (popup)
  const [showDetailJour, setShowDetailJour] = useState(false)
  const [loadingDetailJour, setLoadingDetailJour] = useState(false)
  const [detailJour, setDetailJour] = useState(null)
  const [showFactureModal, setShowFactureModal] = useState(false)
  const [factureToShow, setFactureToShow] = useState(null)

  const openFacture = (t) => {
    setFactureToShow(t)
    setShowFactureModal(true)
  }

  const fetchDetailJour = async () => {
    setLoadingDetailJour(true)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startISO = startOfDay.toISOString()
    const todayDate = new Date().toISOString().slice(0, 10)

    const [salesRes, repairsRes, ordersRes, paymentsRes] = await Promise.all([
      supabase.from('shop_sales').select('*')
        .eq('magasin_id', magasin).gte('created_at', startISO)
        .order('created_at', { ascending: false }),
      supabase.from('repairs').select('*')
        .eq('magasin_id', magasin)
        .neq('status', 'abandonne')
        .order('date', { ascending: false }),
      supabase.from('orders').select('*, phones(purchase_price, model, storage, color, battery_health, imei)')
        .eq('magasin_id', magasin).gte('created_at', startISO)
        .eq('status', 'recupere')
        .order('created_at', { ascending: false }),
      supabase.from('payments').select('*')
        .eq('magasin_id', magasin).gte('created_at', startISO),
    ])

    const sales = salesRes.data || []
    const repairsJour = repairsRes.data || []
    const orders = ordersRes.data || []
    const payments = paymentsRes.data || []

    const saleIds = sales.map((s) => s.id)
    let saleItems = []
    if (saleIds.length > 0) {
      const { data } = await supabase.from('shop_sale_items')
        .select('*, shop_items(purchase_price)')
        .in('sale_id', saleIds)
      saleItems = data || []
    }

    const beneficeAccessoires = saleItems.reduce((sum, item) => {
      const cout = Number(item.shop_items?.purchase_price) || 0
      const vente = Number(item.unit_price) || 0
      return sum + (vente - cout) * Number(item.quantity || 1)
    }, 0)

    const beneficePhones = orders.reduce((sum, o) => {
      const cout = Number(o.phones?.purchase_price) || 0
      const vente = Number(o.final_price) || 0
      return sum + (vente - cout)
    }, 0)

    const totalCashSales = sales.reduce((s, x) => s + (Number(x.cash_amount) || 0), 0)
    const totalBancoSales = sales.reduce((s, x) => s + (Number(x.bancontact_amount) || 0), 0)
    const totalVirSales = sales.reduce((s, x) => s + (Number(x.virement_amount) || 0), 0)

    const totalCashPhones = payments.filter((p) => p.payment_method === 'cash')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const totalBancoPhones = payments.filter((p) => p.payment_method === 'bancontact')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const totalVirPhones = payments.filter((p) => p.payment_method === 'virement')
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)

    const totalCash = totalCashSales + totalCashPhones
    const totalBancontact = totalBancoSales + totalBancoPhones
    const totalVirement = totalVirSales + totalVirPhones

    const salesWithItems = sales.map((s) => ({
      ...s,
      items: saleItems.filter((si) => si.sale_id === s.id),
    }))

    setDetailJour({
      ticketsCaisse: salesWithItems,
      reparationsJour: repairsJour.filter((r) => r.date === todayDate),
      reparationsOuvertes: repairsJour
        .filter((r) => {
          const solde = (Number(r.prix) || 0) - (Number(r.montant_paye) || 0)
          const pasSoldee = solde > 0.01
          const pasTerminee = r.suivi_statut === 'en_cours'
          return (pasSoldee || pasTerminee) && r.date !== todayDate
        })
        .map((r) => ({
          ...r,
          _joursDepuis: Math.floor(
            (new Date(todayDate).getTime() - new Date(r.date).getTime()) / 86400000
          ),
          _solde: (Number(r.prix) || 0) - (Number(r.montant_paye) || 0),
        })),
      ventesPhoneJour: orders,
      totalCash, totalBancontact, totalVirement,
      totalConsolide: totalCash + totalBancontact + totalVirement,
      beneficeAccessoires, beneficePhones,
      beneficeTotalCalcule: beneficeAccessoires + beneficePhones,
    })
    setLoadingDetailJour(false)
  }

  const openDetailJour = () => {
    setShowDetailJour(true)
    if (!detailJour) fetchDetailJour()
  }

  useEffect(() => {
    setDetailJour(null)
  }, [magasin])

  const beneficeAffiche = detailJour?.beneficeTotalCalcule ?? beneficeJour

  // Fournisseurs
  const [showFournisseurs, setShowFournisseurs] = useState(false)
  const [fournisseurs, setFournisseurs] = useState([])
  const [loadingFournisseurs, setLoadingFournisseurs] = useState(false)
  const [showFournForm, setShowFournForm] = useState(false)
  const [editingFourn, setEditingFourn] = useState(null)
  const [savingFourn, setSavingFourn] = useState(false)
  const [fournForm, setFournForm] = useState({
    nom: '', contact: '', tel: '', email: '',
    adresse: '', ville: '', cp: '', pays: 'Belgique', notes: '',
  })

  const fetchFournisseurs = async () => {
    setLoadingFournisseurs(true)
    const { data } = await supabase
      .from('fournisseurs')
      .select('*')
      .order('nom', { ascending: true })
    setFournisseurs(data || [])
    setLoadingFournisseurs(false)
  }

  useEffect(() => {
    if (showFournisseurs) fetchFournisseurs()
  }, [showFournisseurs])

  const openNewFournForm = () => {
    setEditingFourn(null)
    setFournForm({
      nom: '', contact: '', tel: '', email: '',
      adresse: '', ville: '', cp: '', pays: 'Belgique', notes: '',
    })
    setShowFournForm(true)
  }

  const openEditFournForm = (f) => {
    setEditingFourn(f)
    setFournForm({
      nom: f.nom || '',
      contact: f.contact || '',
      tel: f.tel || '',
      email: f.email || '',
      adresse: f.adresse || '',
      ville: f.ville || '',
      cp: f.cp || '',
      pays: f.pays || 'Belgique',
      notes: f.notes || '',
    })
    setShowFournForm(true)
  }

  const handleSaveFourn = async () => {
    if (!fournForm.nom.trim()) { alert('Nom requis'); return }
    setSavingFourn(true)
    const payload = {
      nom: fournForm.nom.trim(),
      contact: fournForm.contact.trim() || null,
      tel: fournForm.tel.trim() || null,
      email: fournForm.email.trim() || null,
      adresse: fournForm.adresse.trim() || null,
      ville: fournForm.ville.trim() || null,
      cp: fournForm.cp.trim() || null,
      pays: fournForm.pays.trim() || 'Belgique',
      notes: fournForm.notes.trim() || null,
    }
    if (editingFourn) {
      const { error } = await supabase
        .from('fournisseurs')
        .update(payload)
        .eq('id', editingFourn.id)
      setSavingFourn(false)
      if (error) { alert('Erreur : ' + error.message); return }
      logActivity('fournisseur_update', `Fournisseur modifié — ${payload.nom}`)
    } else {
      const { error } = await supabase.from('fournisseurs').insert(payload)
      setSavingFourn(false)
      if (error) { alert('Erreur : ' + error.message); return }
      logActivity('fournisseur_create', `Nouveau fournisseur — ${payload.nom}`)
    }
    setShowFournForm(false)
    setEditingFourn(null)
    fetchFournisseurs()
  }

  const handleDeleteFourn = async (f) => {
    if (!window.confirm(`Supprimer le fournisseur ${f.nom} ?`)) return
    const { error } = await supabase.from('fournisseurs').delete().eq('id', f.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('fournisseur_delete', `Fournisseur supprimé — ${f.nom}`)
    fetchFournisseurs()
  }

  useEffect(() => {
    // Une reparation est "en cours" tant qu'elle n'est pas soldee OU pas
    // terminee techniquement. Les deux conditions doivent etre remplies
    // pour qu'elle bascule dans l'historique.
    const fetchRepairsCount = async () => {
      const { data } = await supabase
        .from('repairs')
        .select('prix, montant_paye, suivi_statut')
        .eq('magasin_id', magasin)
        .neq('status', 'abandonne')
      const enCours = (data || []).filter((r) => {
        const solde = (Number(r.prix) || 0) - (Number(r.montant_paye) || 0)
        const pasSoldee = solde > 0.01
        const pasTerminee = r.suivi_statut === 'en_cours'
        return pasSoldee || pasTerminee
      })
      setRepairsInProgress(enCours.length)
    }
    if (magasin) fetchRepairsCount()
  }, [magasin, showRepairModal])

  const openClientModal = async () => {
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('magasin_id', magasin)
    setClientForm({
      nom: '', date: today,
      client_number: 'CL-' + pad4((count || 0) + 1),
      magasin_id: magasin, type_panne: '', prix: '', devis: false, tel: '', email: '',
      montant_paye: '', payment_method: 'cash',
    })
    setShowClientModal(true)
  }

  const openRepairModal = async () => {
    const { count: repairCount } = await supabase
      .from('repairs')
      .select('*', { count: 'exact', head: true })
      .eq('magasin_id', magasin)
    const { count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('magasin_id', magasin)
    setRepairForm({
      nom: '', date: today, appareil: '', imei: '',
      bon_number: 'BON-' + pad4((repairCount || 0) + 1),
      client_number: 'CL-' + pad4((clientCount || 0) + 1),
      magasin_id: magasin, type_panne: '', prix: '', devis: false, tel: '', email: '',
      montant_paye: '', payment_method: 'cash',
      ecran_modele: '', ecran_qualite: '',
    })
    setEcranMarqueSel('')
    setEcranGammeSel('')
    setEcranModeleSel('')
    setShowRepairModal(true)
  }

  const recordAcompte = async (montant, method, saleType, reference) => {
    if (!montant || Number(montant) <= 0) return
    const currentSebUser = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )
    const amount = Number(montant)
    await supabase.from('shop_sales').insert({
      magasin_id: magasin,
      staff_name: currentSebUser?.name || 'Staff',
      staff_id: currentSebUser?.role === 'employe' ? currentSebUser?.id : null,
      total_amount: amount,
      payment_method: method,
      cash_amount: method === 'cash' ? amount : 0,
      bancontact_amount: method === 'bancontact' ? amount : 0,
      virement_amount: method === 'virement' ? amount : 0,
      change_amount: 0,
      change_confirmed: true,
      global_discount: 0,
      sale_type: saleType,
      reference: reference,
    })
    onAcompteRecorded()
  }

  const handleSaveClient = async () => {
    if (!clientForm.nom.trim()) { alert('Nom requis'); return }
    const { error } = await supabase.from('clients').insert({
      client_number: clientForm.client_number,
      nom: clientForm.nom.trim(),
      date: clientForm.date,
      magasin_id: clientForm.magasin_id,
      type_panne: clientForm.type_panne || null,
      prix: clientForm.prix ? Number(clientForm.prix) : null,
      devis: clientForm.devis,
      tel: clientForm.tel || null,
      email: clientForm.email || null,
      montant_paye: clientForm.montant_paye ? Number(clientForm.montant_paye) : 0,
    })
    if (error) { alert('Erreur : ' + error.message); return }
    await recordAcompte(
      clientForm.montant_paye,
      clientForm.payment_method,
      'acompte_client',
      clientForm.client_number
    )
    setShowClientModal(false)
    alert(`Client ${clientForm.client_number} enregistré`)
  }

  const handleGenerateBon = async () => {
    if (!repairForm.nom.trim()) { alert('Nom requis'); return }
    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const payload = {
      bon_number: repairForm.bon_number,
      client_nom: repairForm.nom.trim(),
      client_number: repairForm.client_number,
      magasin_id: repairForm.magasin_id,
      date: repairForm.date,
      appareil: repairForm.appareil || null,
      imei: repairForm.imei || null,
      type_panne: repairForm.type_panne || null,
      prix: repairForm.prix ? Number(repairForm.prix) : null,
      devis: repairForm.devis,
      tel: repairForm.tel || null,
      email: repairForm.email || null,
      status: 'en_attente',
      montant_paye: repairForm.montant_paye ? Number(repairForm.montant_paye) : 0,
      ecran_modele: repairForm.ecran_modele || null,
      ecran_qualite: repairForm.ecran_qualite || null,
      staff_name: currentSebUser?.name || 'Staff',
    }
    const { error } = await supabase.from('repairs').insert(payload)
    if (error) { alert('Erreur : ' + error.message); return }
    await recordAcompte(
      repairForm.montant_paye,
      repairForm.payment_method,
      'acompte_reparation',
      repairForm.bon_number
    )
    setLastBon(payload)

    const vendeurName = currentSebUser?.name || 'Admin'
    const prixNum = Number(payload.prix || 0)
    const payeNum = Number(payload.montant_paye || 0)
    const numericTicket = parseInt(String(payload.bon_number).replace(/\D/g, ''), 10) || 1
    setRepairTicketData({
      ticketNumber: numericTicket,
      vendeur: vendeurName,
      dateTime: new Date(),
      items: [{
        qte: 1,
        name: `Réparation — ${payload.type_panne || 'Diagnostic'}`,
        tot: prixNum,
      }],
      payments: payeNum > 0
        ? [{ type: repairForm.payment_method, amount: payeNum }]
        : [],
      repairInfo: {
        bonNumber: payload.bon_number,
        clientNom: payload.client_nom,
        appareil: payload.appareil,
        imei: payload.imei,
        typePanne: payload.type_panne,
      },
      extraLines: [
        { label: 'Montant payé', value: `${payeNum.toFixed(2)}€` },
        { label: 'Restant dû', value: `${(prixNum - payeNum).toFixed(2)}€` },
      ],
    })

    setShowRepairModal(false)
    setShowBonPrintable(true)
    setTimeout(() => window.print(), 300)
  }

  const magasinName = (id) => MAGASINS_PHYSIQUES.find((m) => m.id === id)?.nom || id

  return (
    <div className="max-w-5xl mx-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #bon-print, #bon-print * { visibility: visible; }
          #bon-print { position: absolute; top: 0; left: 0; width: 100%; padding: 20px; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* EN-TETE */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>
            Bonjour, {(staffName || 'Admin').split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Voici un aperçu de votre activité aujourd'hui.
          </p>
        </div>
      </div>

      {/* APERCU DU JOUR + DERNIERE CLOTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <button onClick={openDetailJour}
          className="lg:col-span-2 text-left rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all"
          style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #1e5f5f 60%, ${COLORS.teal} 100%)` }}>
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">
              Aperçu du jour
            </p>
            <p className="text-sm font-bold opacity-90">
              {magasinLabel || magasinName(magasin)}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                <Euro size={18} />
              </div>
              <p className="text-[10px] uppercase opacity-70 tracking-wide">CA du jour</p>
              <p className="text-2xl font-bold mt-0.5">{Number(caTotal).toFixed(2)}€</p>
            </div>
            {showBenefice && (
              <div className="flex flex-col items-start">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                  <Briefcase size={18} />
                </div>
                <p className="text-[10px] uppercase opacity-70 tracking-wide">Bénéfice du jour</p>
                <p className="text-2xl font-bold mt-0.5">
                  {detailJour || beneficeJour > 0 ? `${Number(beneficeAffiche).toFixed(2)}€` : '—'}
                </p>
              </div>
            )}
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                <Ticket size={18} />
              </div>
              <p className="text-[10px] uppercase opacity-70 tracking-wide">Tickets créés</p>
              <p className="text-2xl font-bold mt-0.5">{ticketCount}</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                <Wrench size={18} />
              </div>
              <p className="text-[10px] uppercase opacity-70 tracking-wide">Réparations en cours</p>
              <p className="text-2xl font-bold mt-0.5">{repairsInProgress}</p>
            </div>
          </div>
        </button>

        <button onClick={() => setShowClotureDetail(true)}
          className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${COLORS.amber}1a`, color: COLORS.amber }}>
              <ClipboardList size={22} strokeWidth={2.2} />
            </div>
            <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wide">Dernière clôture</p>
            <p className="text-2xl font-bold mt-1" style={{ color: COLORS.navy }}>
              {lastClosure ? new Date(lastClosure.period_end).toLocaleDateString('fr-BE') : 'Aucune'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {lastClosure ? `${Number(lastClosure.ca_total || 0).toFixed(2)}€` : 'Cliquez pour détails'}
            </p>
          </div>
          <span className="text-xs font-bold mt-4" style={{ color: COLORS.navy }}>
            Voir l'historique →
          </span>
        </button>
      </div>

      {/* ACCES RAPIDES */}
      <p className="text-[11px] font-bold uppercase text-gray-400 tracking-widest mb-3">
        Accès rapides
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {showTresorerieTile && (
          <QuickCard color={COLORS.emerald} icon={PiggyBank}
            title="Chiffres d'affaires"
            description="Consultez vos chiffres, clôtures & dépenses"
            onClick={onOpenTresorerie} />
        )}
        <QuickCard color={COLORS.blue} icon={ShoppingCart}
          title="Caisse"
          description="Gérez vos ventes et mouvements de caisse"
          onClick={onOpenCaisse} />
        <QuickCard color={COLORS.purple} icon={Truck}
          title="Fournisseurs"
          description="Gérez vos fournisseurs et achats"
          onClick={() => setShowFournisseurs(true)} />
        <QuickCard color={COLORS.cyan} icon={Boxes}
          title="Stock"
          description="Catégories, produits & inventaire"
          onClick={onOpenGestion} />
        <QuickCard color={COLORS.green} icon={UserCheck}
          title="Clients"
          description="Enregistrer un nouveau client"
          onClick={() => setShowClientModal(true)} />
        <QuickCard color={COLORS.indigo} icon={Calendar}
          title="Planning"
          description="Mon planning & mes heures"
          onClick={onOpenPointage} />
        <QuickCard color={COLORS.amber} icon={Wrench}
          title="Réparations"
          description="Rechercher, planifier et suivre"
          onClick={onOpenReparationsHub} />
        {showParametresCaisseTile && (
          <QuickCard color={COLORS.slate} icon={Settings}
            title="Paramètres"
            description="PIN, horaires, salaires & plus"
            onClick={onOpenParametresCaisse} />
        )}
      </div>

      {/* A NE PAS OUBLIER */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: `${COLORS.blue}1a`, color: COLORS.blue }}>
            <Bell size={20} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wide">À ne pas oublier</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Pensez à vérifier vos tâches récurrentes et clôturer votre journée.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL CLIENT */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: COLORS.navy }}>
                Nouveau client
              </h3>
              <button onClick={() => setShowClientModal(false)}
                className="text-gray-400 hover:text-gray-700">
                <X size={20}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Nom / Prénom *
                </label>
                <input value={clientForm.nom}
                  onChange={(e) => setClientForm((f) => ({ ...f, nom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                <input type="date" value={clientForm.date}
                  onChange={(e) => setClientForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  N° client
                </label>
                <input value={clientForm.client_number} readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Magasin</label>
                <select value={clientForm.magasin_id}
                  onChange={(e) => setClientForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  {MAGASINS_PHYSIQUES.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type de panne</label>
                <select value={clientForm.type_panne}
                  onChange={(e) => setClientForm((f) => ({ ...f, type_panne: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">—</option>
                  {PANNE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prix (€)</label>
                <input type="number" value={clientForm.prix}
                  onChange={(e) => setClientForm((f) => ({ ...f, prix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Montant déjà payé (€)
                </label>
                <input type="number" step="0.01" min="0" value={clientForm.montant_paye}
                  onChange={(e) => setClientForm((f) => ({ ...f, montant_paye: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                {(() => {
                  const reste = Number(clientForm.prix || 0) - Number(clientForm.montant_paye || 0)
                  return (
                    <p className={`text-xs mt-1 font-medium ${reste < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      Montant restant : {reste.toFixed(2)} €
                    </p>
                  )
                })()}
              </div>
              {Number(clientForm.montant_paye) > 0 && (
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Méthode de paiement
                  </label>
                  <select value={clientForm.payment_method}
                    onChange={(e) => setClientForm((f) => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="cash">Cash</option>
                    <option value="bancontact">Bancontact</option>
                    <option value="virement">Virement</option>
                  </select>
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={clientForm.devis}
                  onChange={(e) => setClientForm((f) => ({ ...f, devis: e.target.checked }))}
                  className="w-4 h-4 accent-[#22d3ee]"/>
                <label className="text-sm text-gray-700">Devis requis avant intervention</label>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone</label>
                <input type="tel" value={clientForm.tel}
                  onChange={(e) => setClientForm((f) => ({ ...f, tel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                <input type="email" value={clientForm.email}
                  onChange={(e) => setClientForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowClientModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={handleSaveClient}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold"
                style={{ background: COLORS.navy }}>
                Enregistrer le client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉPARATION */}
      {showRepairModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: COLORS.navy }}>
                Nouvelle réparation
              </h3>
              <button onClick={() => setShowRepairModal(false)}
                className="text-gray-400 hover:text-gray-700">
                <X size={20}/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Nom / Prénom *
                </label>
                <input value={repairForm.nom}
                  onChange={(e) => setRepairForm((f) => ({ ...f, nom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                <input type="date" value={repairForm.date}
                  onChange={(e) => setRepairForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Appareil (modèle)</label>
                <input value={repairForm.appareil}
                  onChange={(e) => setRepairForm((f) => ({ ...f, appareil: e.target.value }))}
                  placeholder="ex: iPhone 13, Samsung A54..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">IMEI / N° série</label>
                <input value={repairForm.imei}
                  onChange={(e) => setRepairForm((f) => ({ ...f, imei: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">N° client</label>
                <input value={repairForm.client_number} readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 font-mono"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Magasin</label>
                <select value={repairForm.magasin_id}
                  onChange={(e) => setRepairForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  {MAGASINS_PHYSIQUES.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type de panne</label>
                <select value={repairForm.type_panne}
                  onChange={(e) => {
                    const val = e.target.value
                    const def = typePannePrixMap[val]?.prix_defaut
                    setRepairForm((f) => ({
                      ...f,
                      type_panne: val,
                      prix: (def && def > 0) ? String(def) : f.prix,
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">—</option>
                  {PANNE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prix (€)</label>
                <input type="number" value={repairForm.prix}
                  onChange={(e) => setRepairForm((f) => ({ ...f, prix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                {(() => {
                  const tp = typePannePrixMap[repairForm.type_panne]
                  if (!tp) return null
                  const min = Number(tp.prix_min || 0)
                  const max = Number(tp.prix_max || 0)
                  if (min === 0 && max === 0) return null
                  const prix = Number(repairForm.prix || 0)
                  const outOfRange = max > 0 && (prix < min || prix > max)
                  return (
                    <p className={`text-[10px] mt-1 ${outOfRange ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
                      Fourchette habituelle : {min}€ - {max}€
                    </p>
                  )
                })()}
              </div>
              {repairForm.type_panne === 'Écran cassé' && (
                <div className="col-span-2 bg-cyan-50 rounded-xl p-3 space-y-2 border border-cyan-100">
                  <p className="text-xs font-bold text-[#1B2A4A]">📱 Modèle & qualité de l'écran</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Marque</label>
                      <select value={ecranMarqueSel}
                        onChange={(e) => {
                          setEcranMarqueSel(e.target.value)
                          setEcranGammeSel('')
                          setEcranModeleSel('')
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                        <option value="">—</option>
                        {ecranMarques.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Gamme</label>
                      <select value={ecranGammeSel}
                        disabled={!ecranMarqueSel}
                        onChange={(e) => {
                          setEcranGammeSel(e.target.value)
                          setEcranModeleSel('')
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        <option value="">{!ecranMarqueSel ? '— Marque d\'abord —' : '—'}</option>
                        {ecranGammes.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Modèle</label>
                      <select value={ecranModeleSel}
                        disabled={!ecranGammeSel}
                        onChange={(e) => setEcranModeleSel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400">
                        <option value="">{!ecranGammeSel ? '— Gamme d\'abord —' : '—'}</option>
                        {ecranModeles.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {ecranQualitesDisponibles.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Qualité</label>
                      <div className="flex gap-2 flex-wrap">
                        {ecranQualitesDisponibles.map((row) => (
                          <button key={row.id} type="button"
                            disabled={!row.disponible}
                            onClick={() => {
                              setRepairForm((f) => ({
                                ...f,
                                prix: String(row.prix_defaut),
                                appareil: row.modele,
                                ecran_modele: row.modele,
                                ecran_qualite: row.qualite,
                              }))
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all
                              ${repairForm.ecran_qualite === row.qualite
                                ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                                : row.disponible
                                  ? 'bg-white text-gray-600 border-gray-200 hover:border-[#00B4CC]'
                                  : 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'}`}>
                            {row.qualite === 'compatible' ? 'Compatible'
                              : row.qualite === 'original_equivalent' ? 'Qualité originale'
                              : '100% Original'}
                            {!row.disponible && ' (indispo)'}
                          </button>
                        ))}
                      </div>
                      {(() => {
                        const sel = ecranQualitesDisponibles.find((r) => r.qualite === repairForm.ecran_qualite)
                        if (!sel) return null
                        return (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Prix min : {Number(sel.prix_min).toFixed(2)}€
                          </p>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Montant déjà payé (€)
                </label>
                <input type="number" step="0.01" min="0" value={repairForm.montant_paye}
                  onChange={(e) => setRepairForm((f) => ({ ...f, montant_paye: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                {(() => {
                  const reste = Number(repairForm.prix || 0) - Number(repairForm.montant_paye || 0)
                  return (
                    <p className={`text-xs mt-1 font-medium ${reste < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      Montant restant : {reste.toFixed(2)} €
                    </p>
                  )
                })()}
              </div>
              {Number(repairForm.montant_paye) > 0 && (
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Méthode de paiement
                  </label>
                  <select value={repairForm.payment_method}
                    onChange={(e) => setRepairForm((f) => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="cash">Cash</option>
                    <option value="bancontact">Bancontact</option>
                    <option value="virement">Virement</option>
                  </select>
                </div>
              )}
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={repairForm.devis}
                  onChange={(e) => setRepairForm((f) => ({ ...f, devis: e.target.checked }))}
                  className="w-4 h-4 accent-[#22d3ee]"/>
                <label className="text-sm text-gray-700">Devis requis avant intervention</label>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone</label>
                <input type="tel" value={repairForm.tel}
                  onChange={(e) => setRepairForm((f) => ({ ...f, tel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                <input type="email" value={repairForm.email}
                  onChange={(e) => setRepairForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowRepairModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={handleGenerateBon}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold"
                style={{ background: COLORS.navy }}>
                Générer le bon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOURNISSEURS */}
      {showFournisseurs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {showFournForm && (
                  <button onClick={() => { setShowFournForm(false); setEditingFourn(null) }}
                    className="text-gray-400 hover:text-[#1B2A4A] text-lg">
                    ←
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-lg" style={{ color: COLORS.navy }}>
                    {showFournForm
                      ? (editingFourn ? 'Modifier le fournisseur' : 'Nouveau fournisseur')
                      : 'Fournisseurs'}
                  </h3>
                  {!showFournForm && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fournisseurs.length} fournisseur{fournisseurs.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!showFournForm && (
                  <button onClick={openNewFournForm}
                    className="flex items-center gap-1.5 bg-[#1B2A4A] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#00B4CC]">
                    <Plus size={14} /> Nouveau fournisseur
                  </button>
                )}
                <button onClick={() => { setShowFournisseurs(false); setShowFournForm(false); setEditingFourn(null) }}
                  className="text-gray-400 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5">
              {showFournForm ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nom *</label>
                    <input value={fournForm.nom}
                      onChange={(e) => setFournForm((f) => ({ ...f, nom: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Personne de contact</label>
                    <input value={fournForm.contact}
                      onChange={(e) => setFournForm((f) => ({ ...f, contact: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone</label>
                    <input type="tel" value={fournForm.tel}
                      onChange={(e) => setFournForm((f) => ({ ...f, tel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email</label>
                    <input type="email" value={fournForm.email}
                      onChange={(e) => setFournForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Adresse</label>
                    <input value={fournForm.adresse}
                      onChange={(e) => setFournForm((f) => ({ ...f, adresse: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ville</label>
                    <input value={fournForm.ville}
                      onChange={(e) => setFournForm((f) => ({ ...f, ville: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Code postal</label>
                    <input value={fournForm.cp}
                      onChange={(e) => setFournForm((f) => ({ ...f, cp: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pays</label>
                    <input value={fournForm.pays}
                      onChange={(e) => setFournForm((f) => ({ ...f, pays: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                    <textarea rows={3} value={fournForm.notes}
                      onChange={(e) => setFournForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] resize-none" />
                  </div>
                  <div className="col-span-2 flex gap-3 mt-2">
                    <button onClick={() => { setShowFournForm(false); setEditingFourn(null) }}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                      Annuler
                    </button>
                    <button onClick={handleSaveFourn}
                      disabled={savingFourn}
                      className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                      style={{ background: COLORS.navy }}>
                      {savingFourn ? 'Enregistrement...' : (editingFourn ? 'Sauvegarder' : 'Créer')}
                    </button>
                  </div>
                </div>
              ) : loadingFournisseurs ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : fournisseurs.length === 0 ? (
                <p className="text-center text-gray-400 py-12 text-sm">
                  Aucun fournisseur enregistré.
                </p>
              ) : (
                <div className="space-y-2">
                  {fournisseurs.map((f) => (
                    <div key={f.id}
                      className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ color: COLORS.navy }}>{f.nom}</p>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3">
                          {f.contact && <span>👤 {f.contact}</span>}
                          {f.tel && <span>📞 {f.tel}</span>}
                          {f.email && <span>✉️ {f.email}</span>}
                        </div>
                        {(f.adresse || f.ville || f.cp || f.pays) && (
                          <p className="text-xs text-gray-400 mt-1">
                            {[f.adresse, f.cp, f.ville, f.pays].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {f.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{f.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditFournForm(f)}
                          className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteFourn(f)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FACTURE INDIVIDUELLE */}
      {showFactureModal && factureToShow && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl my-8 p-4">
            <ReceiptTicket
              magasin={magasin}
              ticketNumber={detailJour.ticketsCaisse.findIndex((t) => t.id === factureToShow.id) + 1}
              vendeur={factureToShow.staff_name || 'Admin'}
              dateTime={new Date(factureToShow.created_at)}
              items={(factureToShow.items || []).map((si) => ({
                qte: si.quantity,
                name: si.item_name,
                tot: Number(si.total_price),
              }))}
              payments={[
                ...(Number(factureToShow.cash_amount) > 0 ? [{ type: 'cash', amount: Number(factureToShow.cash_amount) }] : []),
                ...(Number(factureToShow.bancontact_amount) > 0 ? [{ type: 'bancontact', amount: Number(factureToShow.bancontact_amount) }] : []),
                ...(Number(factureToShow.virement_amount) > 0 ? [{ type: 'virement', amount: Number(factureToShow.virement_amount) }] : []),
              ]}
              changeAmount={Number(factureToShow.change_amount) || 0}
              tvaRate={21}
              paperWidth="80mm"
            />
            <button
              onClick={() => {
                onEditRefundFacture(factureToShow)
                setShowFactureModal(false)
                setFactureToShow(null)
                setShowDetailJour(false)
              }}
              className="w-full mt-2 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:opacity-90">
              ✏️ Modifier / ↩️ Rembourser ce ticket
            </button>
            <button onClick={() => { setShowFactureModal(false); setFactureToShow(null) }}
              className="w-full mt-2 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* POPUP DÉTAIL DU JOUR */}
      {showDetailJour && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: COLORS.navy }}>
                Détail du jour
              </h3>
              <button onClick={() => setShowDetailJour(false)}
                className="text-gray-400 hover:text-gray-700">
                <X size={20}/>
              </button>
            </div>

            {loadingDetailJour || !detailJour ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-5">

                {/* a) Résumé haut */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">CA total</p>
                    <p className="text-xl font-bold mt-1" style={{ color: COLORS.navy }}>
                      {detailJour.totalConsolide.toFixed(2)}€
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Bénéfice</p>
                    <p className="text-xl font-bold text-green-600 mt-1">
                      {detailJour.beneficeTotalCalcule.toFixed(2)}€
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Tickets</p>
                    <p className="text-xl font-bold mt-1" style={{ color: COLORS.navy }}>
                      {detailJour.ticketsCaisse.length + detailJour.reparationsJour.length + detailJour.ventesPhoneJour.length}
                    </p>
                  </div>
                </div>

                {/* b) Répartition paiement */}
                <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>💵 Cash</span>
                    <span className="font-bold">{detailJour.totalCash.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>💳 Bancontact</span>
                    <span className="font-bold">{detailJour.totalBancontact.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>🏦 Virement</span>
                    <span className="font-bold">{detailJour.totalVirement.toFixed(2)}€</span>
                  </div>
                </div>

                {/* c) Tickets caisse */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                    Tickets caisse ({detailJour.ticketsCaisse.length})
                  </p>
                  {detailJour.ticketsCaisse.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Aucun ticket</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {detailJour.ticketsCaisse.map((t) => {
                        const heure = new Date(t.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
                        const isAcompte = t.sale_type && t.sale_type !== 'vente'
                        return (
                          <div key={t.id}
                            className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-gray-500">{heure}</span>
                              {isAcompte ? (
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Acompte
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Vente
                                </span>
                              )}
                              <span className="text-gray-500">{t.payment_method}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold" style={{ color: COLORS.navy }}>
                                {Number(t.total_amount).toFixed(2)}€
                              </span>
                              <button onClick={() => openFacture(t)}
                                title="Voir la facture"
                                className="text-[#00B4CC] hover:text-[#1B2A4A]">
                                🧾
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* d) Réparations */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Réparations ({detailJour.reparationsJour.length})
                  </p>
                  <p className="text-[11px] italic text-gray-400 mb-2">
                    Revenu informatif — non inclus dans le bénéfice (coût des pièces non suivi)
                  </p>
                  {detailJour.reparationsJour.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Aucune réparation</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {detailJour.reparationsJour.map((r) => {
                        const statusColor =
                          r.status === 'termine'   ? 'bg-green-100 text-green-700' :
                          r.status === 'en_cours'  ? 'bg-amber-100 text-amber-700' :
                          r.status === 'abandonne' ? 'bg-gray-200 text-gray-500' :
                                                     'bg-blue-100 text-blue-700'
                        const openRepairTicket = () => {
                          const prixNum = Number(r.prix || 0)
                          const payeNum = Number(r.montant_paye || 0)
                          const numericTicket = parseInt(String(r.bon_number || '').replace(/\D/g, ''), 10) || 1
                          setRepairTicketData({
                            ticketNumber: numericTicket,
                            vendeur: 'Admin',
                            dateTime: new Date(r.created_at || r.date || Date.now()),
                            items: [{ qte: 1, name: `Réparation — ${r.type_panne || 'Diagnostic'}`, tot: prixNum }],
                            payments: [],
                            repairInfo: {
                              bonNumber: r.bon_number,
                              clientNom: r.client_nom,
                              appareil: r.appareil,
                              imei: r.imei,
                              typePanne: r.type_panne,
                              statut: r.status,
                            },
                            extraLines: [
                              { label: 'Montant payé', value: `${payeNum.toFixed(2)}€` },
                              { label: 'Restant dû', value: `${(prixNum - payeNum).toFixed(2)}€` },
                            ],
                          })
                          setShowRepairTicketModal(true)
                        }
                        return (
                          <div key={r.id}
                            onClick={openRepairTicket}
                            className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs cursor-pointer hover:bg-gray-100">
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                              <span className="font-semibold text-[#1B2A4A] truncate">{r.client_nom}</span>
                              <span className="text-gray-500 truncate">{r.type_panne || '—'}</span>
                              <span className={`${statusColor} text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap`}>
                                {r.status}
                              </span>
                            </div>
                            <span className="font-bold whitespace-nowrap" style={{ color: COLORS.navy }}>
                              {r.prix != null ? `${Number(r.prix).toFixed(2)}€` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* d-bis) Réparations encore ouvertes des jours précédents */}
                {detailJour.reparationsOuvertes?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase mb-1">
                      ⏳ Encore ouvertes ({detailJour.reparationsOuvertes.length})
                    </p>
                    <p className="text-[11px] italic text-gray-400 mb-2">
                      Déposées les jours précédents, pas encore soldées ou pas encore terminées
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {detailJour.reparationsOuvertes.map((r) => {
                        const solde = r._solde
                        const jours = r._joursDepuis
                        return (
                          <div key={r.id}
                            className="flex items-center justify-between gap-2 bg-amber-50 rounded-lg px-2 py-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate" style={{ color: COLORS.navy }}>
                                {r.bon_number} · {r.client_nom}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {r.appareil || '—'}{r.type_panne ? ` · ${r.type_panne}` : ''}
                              </p>
                              <p className={`text-[10px] font-bold ${jours >= 7 ? 'text-red-500' : 'text-gray-400'}`}>
                                Déposé le {new Date(r.date).toLocaleDateString('fr-BE')}
                                {jours > 0 ? ` · il y a ${jours}j` : ''}
                                {r.suivi_statut === 'en_cours' ? ' · en atelier' : ''}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-amber-700 whitespace-nowrap">
                              {solde > 0.01 ? `${solde.toFixed(2)}€ dû` : 'payé'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* e) Ventes téléphones */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                    Ventes téléphones ({detailJour.ventesPhoneJour.length})
                  </p>
                  {detailJour.ventesPhoneJour.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Aucune vente</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {detailJour.ventesPhoneJour.map((o, idx) => {
                        const cout = Number(o.phones?.purchase_price) || 0
                        const vente = Number(o.final_price) || 0
                        const margeConnue = o.phones?.purchase_price != null && cout > 0
                        const marge = vente - cout
                        const openPhoneTicket = () => {
                          setRepairTicketData({
                            ticketNumber: idx + 1,
                            vendeur: o.staff_name || 'Admin',
                            dateTime: new Date(o.created_at),
                            items: [{
                              qte: 1,
                              name: o.phones?.model || o.phone_name || 'Téléphone',
                              tot: vente,
                            }],
                            payments: [],
                            repairInfo: null,
                            extraLines: [
                              o.phones?.imei && { label: 'IMEI / N° série', value: o.phones.imei },
                              o.phones?.storage && { label: 'Stockage', value: o.phones.storage },
                              o.phones?.color && { label: 'Couleur', value: o.phones.color },
                              o.phones?.battery_health != null && { label: 'Batterie', value: `${o.phones.battery_health}%` },
                            ].filter(Boolean),
                          })
                          setShowRepairTicketModal(true)
                        }
                        return (
                          <div key={o.id}
                            onClick={openPhoneTicket}
                            className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs cursor-pointer hover:bg-gray-100">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[#1B2A4A] truncate">{o.phone_name}</p>
                              {margeConnue ? (
                                <p className={`text-[10px] ${marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Marge : {marge >= 0 ? '+' : ''}{marge.toFixed(2)}€
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-400">Marge inconnue</p>
                              )}
                            </div>
                            <span className="font-bold whitespace-nowrap" style={{ color: COLORS.navy }}>
                              {vente.toFixed(2)}€
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

            <button onClick={() => setShowDetailJour(false)}
              className="w-full mt-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* POPUP DÉTAIL DERNIÈRE CLÔTURE */}
      {showClotureDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: COLORS.navy }}>
                Dernière clôture
              </h3>
              <button onClick={() => setShowClotureDetail(false)}
                className="text-gray-400 hover:text-gray-700">
                <X size={20}/>
              </button>
            </div>
            {lastClosure ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Date</span>
                  <span className="font-bold" style={{ color: COLORS.navy }}>
                    {new Date(lastClosure.period_end).toLocaleString('fr-BE')}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>CA total</span>
                  <span className="font-bold" style={{ color: COLORS.navy }}>
                    {Number(lastClosure.ca_total || 0).toFixed(2)}€
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tickets</span>
                  <span className="font-bold" style={{ color: COLORS.navy }}>
                    {lastClosure.ticket_count || 0}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>💵 Cash</span>
                    <span>{Number(lastClosure.cash_total || 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>💳 Bancontact</span>
                    <span>{Number(lastClosure.bancontact_total || 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>🏦 Virement</span>
                    <span>{Number(lastClosure.virement_total || 0).toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-6 text-sm">
                Aucune clôture enregistrée pour l'instant
              </p>
            )}
            <button onClick={() => setShowClotureDetail(false)}
              className="w-full mt-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY BOUTONS APRÈS GÉNÉRATION DU BON (visible à l'écran) */}
      {showBonPrintable && lastBon && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 flex flex-col gap-2 print:!hidden">
          <p className="text-xs font-bold text-[#1B2A4A]">Bon {lastBon.bon_number} généré</p>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:border-[#1B2A4A]">
              🖨️ Imprimer A4
            </button>
            <button onClick={() => setShowRepairTicketModal(true)}
              className="px-3 py-1.5 bg-[#1B2A4A] text-white rounded-lg text-xs font-bold hover:bg-[#00B4CC]">
              🧾 Ticket caisse
            </button>
            <button onClick={() => setShowBonPrintable(false)}
              className="px-3 py-1.5 text-gray-400 hover:text-red-500 text-lg leading-none">
              ×
            </button>
          </div>
        </div>
      )}

      {/* MODAL TICKET RÉPARATION (utilise ReceiptTicket) */}
      {showRepairTicketModal && repairTicketData && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto print:!hidden">
          <div className="bg-white rounded-2xl shadow-xl my-8 p-4">
            <ReceiptTicket
              magasin={magasin}
              ticketNumber={repairTicketData.ticketNumber}
              vendeur={repairTicketData.vendeur}
              dateTime={repairTicketData.dateTime}
              items={repairTicketData.items}
              payments={repairTicketData.payments}
              changeAmount={0}
              tvaRate={21}
              paperWidth="80mm"
              repairInfo={repairTicketData.repairInfo}
              extraLines={repairTicketData.extraLines}
            />
            <button onClick={() => setShowRepairTicketModal(false)}
              className="w-full mt-2 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* BON DE RÉPARATION IMPRIMABLE (visible seulement en @media print) */}
      {showBonPrintable && lastBon && (
        <div id="bon-print" style={{ display: 'none' }} className="print:!block">
          <style>{`@media print { #bon-print { display: block !important; } }`}</style>
          <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '2px solid #15223d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.teal})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18 }}>
                  SP
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 20, color: COLORS.navy }}>SEBPHONE</div>
                  <div style={{ fontSize: 11, color: '#666' }}>Réparation & vente de smartphones</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#666' }}>Bon n°</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16, color: COLORS.navy }}>{lastBon.bon_number}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{new Date(lastBon.date).toLocaleDateString('fr-BE')}</div>
              </div>
            </div>

            <h1 style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.navy, margin: '16px 0 8px' }}>
              Bon de prise en charge — Réparation
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Client</div><div>{lastBon.client_nom}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>N° client</div><div style={{ fontFamily: 'monospace' }}>{lastBon.client_number}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Magasin</div><div>{magasinName(lastBon.magasin_id)}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Date de dépôt</div><div>{new Date(lastBon.date).toLocaleDateString('fr-BE')}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Appareil</div><div>{lastBon.appareil || '—'}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>IMEI / N° série</div><div style={{ fontFamily: 'monospace' }}>{lastBon.imei || '—'}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Type de panne</div><div>{lastBon.type_panne || '—'}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Prix estimé</div><div style={{ fontWeight: 'bold' }}>{lastBon.prix != null ? `${Number(lastBon.prix).toFixed(2)}€` : '—'}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Contact</div><div style={{ fontSize: 12 }}>{lastBon.tel || '—'}<br/>{lastBon.email || '—'}</div></div>
            </div>

            <div style={{ marginTop: 16 }}>
              {lastBon.devis ? (
                <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: '#fff7ed', color: '#9a3412', fontSize: 12, fontWeight: 'bold', border: '1px solid #fed7aa' }}>
                  Devis requis avant intervention
                </span>
              ) : (
                <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: '#f0fdf4', color: '#166534', fontSize: 12, fontWeight: 'bold', border: '1px solid #bbf7d0' }}>
                  Intervention directe autorisée
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 32 }}>
              <div>
                <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 11, color: '#666' }}>Signature client</div>
              </div>
              <div>
                <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 11, color: '#666' }}>Signature technicien</div>
              </div>
            </div>

            <div style={{ marginTop: 24, fontSize: 9, color: '#666', lineHeight: 1.5, borderTop: '1px solid #eee', paddingTop: 8 }}>
              SLT GROUP (SRL) — TVA BE 1028.764.677 — RUE DU BAILLI 22, 1000 Bruxelles — Tel : 0492/40.54.57.
              Ce bon atteste du dépôt d'un appareil en atelier. Les appareils non récupérés sous 90 jours après notification
              seront considérés comme abandonnés. Le prix mentionné est indicatif ; en cas de dépassement, un devis
              complémentaire sera soumis pour accord avant intervention.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
