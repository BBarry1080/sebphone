import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Plus, X, Pencil, Trash2, Search, Receipt,
         AlertTriangle, Package, Tag, Boxes, Wrench,
         Menu, Lock, Unlock, LogOut,
         Settings, Clock, Save, UserCheck, Send, Calendar, History,
         PiggyBank, ChevronLeft, ChevronRight, Percent,
         Image as ImageIcon, Upload } from 'lucide-react'
import { MAGASINS_ADMIN as MAGASINS_LIST } from '../../utils/magasins'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'
import ReceiptTicket from '../../components/admin/ReceiptTicket'
import ZFinancierReport from '../../components/admin/ZFinancierReport'
import CaisseAccueil from '../../components/admin/CaisseAccueil'
import CaissePinLock from '../../components/admin/CaissePinLock'
import StaffScheduleCalendar from '../../components/admin/StaffScheduleCalendar'
import { calcSalairePeriode, getWeekBounds, calcDureeHeures, isShiftFinished } from '../../lib/calcSalaire'
import { logActivity } from '../../lib/logActivity'

const POS_CATEGORIES = [
  'Coque', 'Vitre de protection', 'Audio', 'Chargeur',
  'Carte mémoire', 'Ordinateur', 'Tablette', 'PlayStation',
  'Écran', 'Caméra', 'Batterie', 'Vitre arrière',
  'Autre téléphone', 'Écran Samsung',
]

// Couleur par magasin — pastilles du calendrier et cartes du coffre
const MAG_COLORS_CAL = {
  anderlecht: '#2563eb', molenbeek: '#16a34a',
  'rue-neuve': '#f59e0b', louise: '#8b5cf6',
}

// Code-barres interne EAN-13 (préfixe 200 = usage privé)
const generateBarcode = () => {
  const timePart = Date.now().toString().slice(-7)
  const randPart = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  const base = '200' + timePart + randPart
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10)
    sum += (i % 2 === 0) ? digit : digit * 3
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return base + String(checkDigit)
}

export default function StockMagasin() {
  const isAdmin = useIsAdmin()
  const hasPermission = usePermission('stock_magasin')
  const canManageStaff = usePermission('gerer_utilisateurs')
  const canAccessParamsCaisse = isAdmin || canManageStaff
  const canModifyPrices  = isAdmin || usePermission('modifier_prix_remises')
  const canRappelTicket  = isAdmin || usePermission('rappel_ticket')
  const canClotureLimitee = usePermission('cloture_limitee')
  const canSeeTresorerie = usePermission('voir_tresorerie')

  const [magasin, setMagasin] = useState('')

  // Tâches récurrentes (rappel par jour/magasin) — distinct de cloture_taches
  const [tachesDuJour, setTachesDuJour]           = useState([])
  const [showTacheReminder, setShowTacheReminder] = useState(false)
  const [showTachesAdmin, setShowTachesAdmin]     = useState(false)
  const [tachesAdminList, setTachesAdminList]     = useState([])
  const [tacheRecurrenteForm, setTacheRecurrenteForm] = useState({
    titre: '', description: '', jours_semaine: [], magasins: [], intervalle_rappel_min: 15,
  })
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState(null)
  const [activeTab, setActiveTab] = useState('stock') // stock | categories (dans posScreen='gestion')

  // Modals
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [editCat, setEditCat] = useState(null)

  // Form article
  const [itemForm, setItemForm] = useState({
    name: '', reference: '', barcode: '',
    category_id: '', sous_categorie: '',
    quantity: 0, quantity_alert: 3,
    purchase_price: 0, sale_price: 0,
    price_min: 0, price_max: 0,
    description: '',
    image_url: '', fournisseur_id: '',
    sans_stock: false,
    tva_rate: 21,
  })

  // Form catégorie
  const [catForm, setCatForm] = useState({
    name: '', color: 'blue',
  })

  // Fournisseurs (dropdown dans le form article) + upload image
  const [fournisseursList, setFournisseursList] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)

  const fetchFournisseursList = async () => {
    const { data } = await supabase
      .from('fournisseurs')
      .select('id, nom')
      .order('nom', { ascending: true })
    setFournisseursList(data || [])
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error: upErr } = await supabase.storage
        .from('shop-items')
        .upload(fileName, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage
        .from('shop-items')
        .getPublicUrl(fileName)
      setItemForm((f) => ({ ...f, image_url: urlData.publicUrl }))
    } catch (err) {
      alert('Erreur upload image : ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // Caisse
  const [cart, setCart] = useState([])
  const [cartSearch, setCartSearch] = useState('')
  const [repairsInCart, setRepairsInCart]                 = useState([])
  const [pendingRepairs, setPendingRepairs]               = useState([])
  const [loadingPendingRepairs, setLoadingPendingRepairs] = useState(false)
  // Nouvelle réparation créée depuis la caisse (via clic écran catalogue)
  const [newRepairsInCart, setNewRepairsInCart]           = useState([])
  const [showNewRepairForm, setShowNewRepairForm]         = useState(false)
  const [newRepairEcran, setNewRepairEcran]               = useState(null)
  const [newRepairClientData, setNewRepairClientData]     = useState({
    nom: '', tel: '', email: '', imei: '',
  })
  const [paymentSplits, setPaymentSplits] = useState([])
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('cash')
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('')
  const [showChangeConfirm, setShowChangeConfirm] = useState(false)
  const [pendingSaleData, setPendingSaleData] = useState(null)
  const [showTicket, setShowTicket] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [showEmailTicketForm, setShowEmailTicketForm] = useState(false)
  const [ticketEmailInput, setTicketEmailInput]       = useState('')
  const [sendingTicketEmail, setSendingTicketEmail]   = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [salesToday, setSalesToday] = useState([])
  const [caisseTotals, setCaisseTotals] = useState({
    cash: 0, bancontact: 0, virement: 0, total: 0,
  })

  // Mouvements de caisse (dépôts/retraits) + clôture Z
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [movementType, setMovementType] = useState('depot')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [movementPayment, setMovementPayment] = useState('cash')
  const [movements, setMovements] = useState([])
  const [lastClosure, setLastClosure] = useState(null)
  const [todaysClosure, setTodaysClosure] = useState(null)
  const [nowTick, setNowTick] = useState(Date.now())
  const [showClosureModal, setShowClosureModal] = useState(false)
  const [closureData, setClosureData] = useState(null)
  const [closureLoading, setClosureLoading] = useState(false)
  const [prelevementAmount, setPrelevementAmount] = useState('')
  const [selectedCategoryView, setSelectedCategoryView] = useState(null)
  const [selectedPosCategory, setSelectedPosCategory] = useState('Tout')
  const [posScreen, setPosScreen] = useState('accueil') // accueil | caisse | gestion | cloture | parametres | pointage | tresorerie | commissions | prix-reparations | recherche-ticket

  const [searchParams] = useSearchParams()
  const location = useLocation()
  useEffect(() => {
    const screenParam = searchParams.get('screen')
    if (screenParam === 'gestion') {
      setPosScreen('gestion')
      setActiveTab('stock')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  // Fenêtre de clôture manuelle : à partir de 19h00 (heure de Bruxelles)
  const brusselsHour = Number(
    new Date(nowTick).toLocaleString('en-GB', {
      timeZone: 'Europe/Brussels', hour: '2-digit', hour12: false
    })
  ) % 24
  const canCloseNow = brusselsHour >= 19

  useEffect(() => {
    const screenParam = searchParams.get('screen')
    if (!screenParam) {
      setPosScreen('accueil')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Recherche ticket
  const [searchQuery, setSearchQuery]         = useState('')
  const [searchDateStart, setSearchDateStart] = useState('')
  const [searchDateEnd, setSearchDateEnd]     = useState('')
  const [searchResults, setSearchResults]     = useState([])
  const [loadingSearch, setLoadingSearch]     = useState(false)
  const [selectedTicket, setSelectedTicket]   = useState(null)
  const [ticketRefunds, setTicketRefunds]     = useState([])
  // Modifier ticket
  const [showEditTicket, setShowEditTicket]   = useState(false)
  const [editTicketForm, setEditTicketForm]   = useState([])
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [savingEditTicket, setSavingEditTicket]   = useState(false)
  // Rembourser
  const [showRefundForm, setShowRefundForm]   = useState(false)
  const [refundForm, setRefundForm]           = useState([])
  const [refundPaymentMethod, setRefundPaymentMethod] = useState('cash')
  const [refundReason, setRefundReason]       = useState('')
  const [savingRefund, setSavingRefund]       = useState(false)
  // Mode devis (caisse)
  const [modeDevis, setModeDevis]             = useState(false)
  const [showDevisForm, setShowDevisForm]     = useState(false)
  const [devisEmail, setDevisEmail]           = useState('')
  const [devisClientName, setDevisClientName] = useState('')
  const [sendingDevis, setSendingDevis]       = useState(false)

  // Commissions (règles)
  const [commissionRules, setCommissionRules]     = useState([])
  const [loadingRules, setLoadingRules]           = useState(false)
  const [categoriesDistinct, setCategoriesDistinct] = useState([])
  const [showRuleForm, setShowRuleForm]           = useState(false)
  const [editingRule, setEditingRule]             = useState(null)
  const [ruleForm, setRuleForm]                   = useState({
    category_name: '', sous_categorie: '', rate: '', active: true,
  })
  const [savingRule, setSavingRule]               = useState(false)

  // Modal ticket Z (rouvert depuis le popup calendrier)
  const [showTicketModal, setShowTicketModal]     = useState(false)
  const [ticketToShow, setTicketToShow]           = useState(null)

  // Trésorerie / Chiffres d'affaires
  const [mouvements, setMouvements]                       = useState([])
  const [mouvementsMois, setMouvementsMois]               = useState([])
  const [loadingTreso, setLoadingTreso]                   = useState(false)
  const [showDepenseForm, setShowDepenseForm]             = useState(false)
  const [editingDescId, setEditingDescId]                 = useState(null)
  const [editingDescValue, setEditingDescValue]           = useState('')
  const cancelDescRef = useRef(false)
  const [depenseForm, setDepenseForm]                     = useState({
    magasin_id: '', montant: '', categorie: 'fournisseur',
    fournisseur_id: '', description: '',
    categorieAutre: '',
    holderType: '', holderDetailMagasin: '', holderDetailAutre: '',
    payment_method: 'cash',
    made_by: '', made_by_autre: '',
    target_date: '',
    closure_id: '',
    libelle_id: '',
  })
  // Combinaisons magasins libres (défaut : les 4 physiques cochés)
  const [selectedMagasinsCombo, setSelectedMagasinsCombo] = useState(
    new Set(['anderlecht', 'molenbeek', 'rue-neuve', 'louise'])
  )
  // Clôtures du mois affiché (calendrier unifié)
  const [cloturesMois, setCloturesMois]                   = useState([])
  // Coffre cliquable → modal "Qui détient quoi"
  const [showCoffreModal, setShowCoffreModal]             = useState(false)
  // Assignation caisse via popup jour
  const [assignHolderForClosure, setAssignHolderForClosure] = useState({})
  // Pré-remplir target_date depuis popup jour
  const [prefillTargetDate, setPrefillTargetDate]         = useState('')
  const [savingDepense, setSavingDepense]                 = useState(false)
  const [fournisseursListTreso, setFournisseursListTreso] = useState([])
  const [magasinsAvecHistorique, setMagasinsAvecHistorique] = useState([])
  const [libellesListTreso, setLibellesListTreso]         = useState([])
  const [closuresListTreso, setClosuresListTreso]         = useState([])
  const [loadingClosuresTreso, setLoadingClosuresTreso]   = useState(false)
  // Restriction du select Magasin quand on ouvre le formulaire depuis un jour précis du calendrier.
  // null = pas de restriction jour (comportement global via MAGASINS_CAISSE_DEPENSE).
  // array = magasins autorisés pour ce jour (ceux ayant clôturé ce jour-là).
  const [depenseMagasinJourFilter, setDepenseMagasinJourFilter] = useState(null)

  // Détenteur — édition d'un mouvement existant
  const [editingHolderMouvement, setEditingHolderMouvement] = useState(null)
  const [editHolderType, setEditHolderType]                 = useState('zinou')
  const [editHolderDetailMagasin, setEditHolderDetailMagasin] = useState('')
  const [editHolderDetailAutre, setEditHolderDetailAutre]   = useState('')
  const [savingHolder, setSavingHolder]                     = useState(false)

  // Vue d'ensemble — filtres + modaux + calendrier
  const [selectedDetenteur, setSelectedDetenteur]           = useState(null)
  const [selectedMagasinDetail, setSelectedMagasinDetail]   = useState(null)
  const [detenteurMagasinFilter, setDetenteurMagasinFilter] = useState('all')
  const [calMonthOffsetTreso, setCalMonthOffsetTreso]       = useState(0)
  const [selectedJourMouvements, setSelectedJourMouvements] = useState(null)

  // Prix réparations
  const [typePannePrixList, setTypePannePrixList] = useState([])
  const [loadingTypePannePrix, setLoadingTypePannePrix] = useState(false)
  const [editingTypePanne, setEditingTypePanne]   = useState(null)
  const [tpForm, setTpForm]                       = useState({ prix_defaut: '', prix_min: '', prix_max: '' })
  const [savingTypePanne, setSavingTypePanne]     = useState(false)

  // Délais réparation (sous-section de l'écran Prix)
  const [sectionPrixDelais, setSectionPrixDelais] = useState('prix') // 'prix' | 'delais' | 'ecrans' | 'taches'

  // Hub Réparations (posScreen === 'reparations-hub')
  const [reparationsHubTab, setReparationsHubTab]         = useState('recherche')
  const [reparationsHubData, setReparationsHubData]       = useState([])
  const [loadingReparationsHub, setLoadingReparationsHub] = useState(false)
  const [searchReparationsHub, setSearchReparationsHub]   = useState('')
  const [calHubMonthOffset, setCalHubMonthOffset]         = useState(0)
  const [selectedJourReparations, setSelectedJourReparations] = useState(null)
  // Nouvelle réparation depuis le hub (modal simplifié)
  const [showNewRepairFromHub, setShowNewRepairFromHub]   = useState(false)
  const [newRepairFromHubForm, setNewRepairFromHubForm]   = useState({
    nom: '', appareil: '', imei: '', type_panne: '', prix: '', tel: '', email: '',
  })
  const [savingNewRepairFromHub, setSavingNewRepairFromHub] = useState(false)
  const [delaiTypesList, setDelaiTypesList]       = useState([])
  const [loadingDelaiTypes, setLoadingDelaiTypes] = useState(false)
  const [editingDelai, setEditingDelai]           = useState(null)
  const [delaiForm, setDelaiForm]                 = useState({ label: '', delai_texte: '', ordre: 0 })
  const [savingDelai, setSavingDelai]             = useState(false)

  // Tâches de clôture (checklist + admin)
  const [clotureTachesList, setClotureTachesList] = useState([])
  const [checkedTaches, setCheckedTaches]         = useState({})
  const [editingTache, setEditingTache]           = useState(null)
  const [tacheForm, setTacheForm]                 = useState({ label: '', ordre: 0 })
  const [savingTache, setSavingTache]             = useState(false)
  const [showTacheForm, setShowTacheForm]         = useState(false)

  // Catalogue écrans par modèle
  const [ecranCatalogList, setEcranCatalogList]   = useState([])
  const [loadingEcranCatalog, setLoadingEcranCatalog] = useState(false)
  const [ecranMarqueFilter, setEcranMarqueFilter] = useState('Samsung')
  const [ecranSearch, setEcranSearch]             = useState('')
  const [editingEcran, setEditingEcran]           = useState(null)
  const [ecranForm, setEcranForm]                 = useState({
    prix_min: '', prix_defaut: '', prix_max: '',
    cout_achat: '',
    disponible: true, notes: '',
  })
  const [savingEcran, setSavingEcran]             = useState(false)

  // Création d'un nouveau modèle d'écran
  const [showNewEcranForm, setShowNewEcranForm]   = useState(false)
  const [newEcranForm, setNewEcranForm]           = useState({
    marque: '', marqueMode: 'existing',
    gamme: '', modele: '', modele_code: '',
    qualite: 'compatible',
    cout_achat: '', prix_min: '', prix_defaut: '', prix_max: '',
    disponible: true, notes: '',
  })
  const [savingNewEcran, setSavingNewEcran]       = useState(false)
  const [showDelaiForm, setShowDelaiForm]         = useState(false)

  // Devis — délai estimé
  const [devisDelaiId, setDevisDelaiId]           = useState('')

  const trueIsAdmin = isAdmin

  // Écran Pointage personnel (vue employé)
  const [myStaffRecord, setMyStaffRecord] = useState(null)
  const [loadingMyPointage, setLoadingMyPointage] = useState(false)
  const [showReplacementForm, setShowReplacementForm] = useState(false)
  const [replacementForm, setReplacementForm] = useState({
    date: '', repos: false, heure_debut: '10:00', heure_fin: '20:00', note: '',
  })
  const [sendingReplacement, setSendingReplacement] = useState(false)
  // Disponibilités proposées par l'employé
  const [showProposeDispo, setShowProposeDispo] = useState(false)
  const [dispoForm, setDispoForm] = useState({
    type: 'hebdo', jour_semaine: 'lundi', date: '', repos: false,
    heure_debut: '10:00', heure_fin: '18:00', motif: '',
  })
  const [myDispoList, setMyDispoList] = useState([])
  const [savingDispo, setSavingDispo] = useState(false)
  // Heures supplémentaires — vue employé
  const [myPendingHeuresSup, setMyPendingHeuresSup] = useState([])
  const [showDeclareHS, setShowDeclareHS] = useState(false)
  const [declareHSForm, setDeclareHSForm] = useState({
    date: new Date().toISOString().slice(0, 10), duree_heures: '', motif: '',
  })
  const [savingDeclareHS, setSavingDeclareHS] = useState(false)

  // Verrou PIN caisse
  const [caisseSession, setCaisseSession] = useState(null)
  const [todayScheduleForLive, setTodayScheduleForLive] = useState(null)

  // Paramètres caisse (PIN/horaires/salaire par employé)
  const [staffListCaisse, setStaffListCaisse]           = useState([])
  const [loadingStaffCaisse, setLoadingStaffCaisse]     = useState(false)
  const [selectedStaffCaisse, setSelectedStaffCaisse]   = useState(null)
  const [editPinCaisse, setEditPinCaisse]               = useState('')
  const [editWageCaisse, setEditWageCaisse]             = useState('')
  const [savingStaffCaisse, setSavingStaffCaisse]       = useState(false)
  const [pointageAujourdhui, setPointageAujourdhui]     = useState(null)
  const [salaireMoisCaisse, setSalaireMoisCaisse]       = useState(null)
  const [salaireSemaineCaisse, setSalaireSemaineCaisse] = useState(null)
  const [joursTravaillesSemaine, setJoursTravaillesSemaine] = useState([])
  const [liveTick, setLiveTick] = useState(0)
  const [loadingDetailCaisse, setLoadingDetailCaisse]   = useState(false)
  const [clockNow, setClockNow] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  })
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setClockNow(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Tick 1s pour les gains en direct — actif uniquement si pointage en cours (pas encore de départ)
  useEffect(() => {
    if (!pointageAujourdhui || pointageAujourdhui.heure_depart) return
    const t = setInterval(() => setLiveTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [pointageAujourdhui])

  // Fetch du planning du jour pour compteur "En direct" + détection heure sup au départ
  useEffect(() => {
    if (!caisseSession) { setTodayScheduleForLive(null); return }
    supabase.from('staff_schedule_dates')
      .select('heure_debut, heure_fin')
      .eq('staff_id', caisseSession.staffId)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle()
      .then(({ data }) => setTodayScheduleForLive(data))
  }, [caisseSession])

  const fetchMyPendingHeuresSup = async () => {
    if (!myStaffRecord?.id) return
    const { data } = await supabase
      .from('staff_heures_sup')
      .select('*')
      .eq('staff_id', myStaffRecord.id)
      .order('date', { ascending: false })
      .limit(10)
    setMyPendingHeuresSup(data || [])
  }

  useEffect(() => { fetchMyPendingHeuresSup() }, [myStaffRecord])

  const fetchMyDisponibilites = async () => {
    if (!myStaffRecord?.id) return
    const { data } = await supabase.from('staff_disponibilites')
      .select('*').eq('staff_id', myStaffRecord.id)
      .order('created_at', { ascending: false }).limit(10)
    setMyDispoList(data || [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMyDisponibilites() }, [myStaffRecord])

  const handleProposeDispo = async () => {
    if (!myStaffRecord?.id) return
    if (dispoForm.type === 'hebdo' && !dispoForm.jour_semaine) {
      alert('Choisis un jour'); return
    }
    if (dispoForm.type === 'date' && !dispoForm.date) {
      alert('Choisis une date'); return
    }
    setSavingDispo(true)
    const { error } = await supabase.from('staff_disponibilites').insert({
      staff_id: myStaffRecord.id,
      type: dispoForm.type,
      jour_semaine: dispoForm.type === 'hebdo' ? dispoForm.jour_semaine : null,
      date: dispoForm.type === 'date' ? dispoForm.date : null,
      repos: dispoForm.repos,
      heure_debut: dispoForm.repos ? null : dispoForm.heure_debut,
      heure_fin: dispoForm.repos ? null : dispoForm.heure_fin,
      motif: dispoForm.motif.trim() || null,
    })
    setSavingDispo(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setDispoForm({ type: 'hebdo', jour_semaine: 'lundi', date: '', repos: false, heure_debut: '10:00', heure_fin: '18:00', motif: '' })
    setShowProposeDispo(false)
    fetchMyDisponibilites()
    alert('Disponibilité envoyée, en attente de validation ✅')
  }

  const handleDeclareHeureSup = async () => {
    if (!declareHSForm.date || !declareHSForm.duree_heures) {
      alert('Date et durée obligatoires'); return
    }
    const duree = Number(declareHSForm.duree_heures)
    if (!duree || duree <= 0 || duree > 12) {
      alert('Durée invalide (entre 0 et 12h)'); return
    }
    setSavingDeclareHS(true)
    const { error } = await supabase.from('staff_heures_sup').insert({
      staff_id: myStaffRecord.id,
      date: declareHSForm.date,
      duree_heures: duree,
      motif: declareHSForm.motif || null,
      statut: 'en_attente',
    })
    setSavingDeclareHS(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setDeclareHSForm({ date: new Date().toISOString().slice(0, 10), duree_heures: '', motif: '' })
    setShowDeclareHS(false)
    fetchMyPendingHeuresSup()
    alert('✅ Demande envoyée, en attente de validation par le gérant')
  }

  const calcGainDirect = () => {
    if (!pointageAujourdhui || !pointageAujourdhui.heure_arrivee) return null
    const wage = Number(selectedStaffCaisse?.hourly_wage || 0)
    const arr = new Date(pointageAujourdhui.heure_arrivee)

    let end = pointageAujourdhui.heure_depart ? new Date(pointageAujourdhui.heure_depart) : new Date()
    let shiftTermine = false

    if (!pointageAujourdhui.heure_depart && todayScheduleForLive?.heure_fin) {
      const now = new Date()
      const [fh, fm] = todayScheduleForLive.heure_fin.split(':').map(Number)
      const finPrevue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), fh, fm, 0)
      if (now >= finPrevue) {
        end = finPrevue
        shiftTermine = true
      }
    }

    const heures = Math.max(0, (end - arr) / 3600000)
    const brut = heures * wage
    const net = brut - Number(pointageAujourdhui.penalite_retard || 0)

    let prevuDepuisMin = null
    if (todayScheduleForLive?.heure_debut) {
      const now = new Date()
      const [dh, dm] = todayScheduleForLive.heure_debut.split(':').map(Number)
      const debutPrevu = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dh, dm, 0)
      prevuDepuisMin = Math.max(0, (now - debutPrevu) / 60000)
    }

    return { heures, net, enCours: !pointageAujourdhui.heure_depart && !shiftTermine, shiftTermine, prevuDepuisMin }
  }

  const renderPointageAndSalaire = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="font-bold text-[#1B2A4A] mb-3">Aujourd'hui & ce mois</h3>
      <div className="bg-gray-50 rounded-xl p-3 mb-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pointage du jour</p>
        {pointageAujourdhui ? (
          <div className="text-sm space-y-1">
            <p>
              <span className="text-gray-500">Arrivée : </span>
              <span className="font-bold text-[#1B2A4A]">
                {new Date(pointageAujourdhui.heure_arrivee).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Départ : </span>
              {pointageAujourdhui.heure_depart ? (
                <span className="font-bold text-[#1B2A4A]">
                  {new Date(pointageAujourdhui.heure_depart).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <span className="text-amber-600 font-bold">En cours</span>
              )}
            </p>
            {pointageAujourdhui.penalite_retard > 0 && (
              <p className="text-red-600 font-bold text-xs mt-1">
                Retard de {pointageAujourdhui.retard_minutes} min — pénalité -{pointageAujourdhui.penalite_retard}€
              </p>
            )}
            {(() => {
              const g = calcGainDirect()
              if (!g) return null
              const totalMin = Math.round(g.heures * 60)
              const h = Math.floor(totalMin / 60)
              const m = totalMin % 60
              let prevuLabel = null
              if (g.prevuDepuisMin !== null) {
                const pH = Math.floor(g.prevuDepuisMin / 60)
                const pM = Math.round(g.prevuDepuisMin % 60)
                prevuLabel = `${pH}h ${String(pM).padStart(2, '0')}min`
              }
              return (
                <div className="mt-3 rounded-xl p-3 border border-cyan-100"
                  style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #ccfbf1 100%)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#1B2A4A] flex items-center gap-1">
                      {g.enCours
                        ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> En direct</>
                        : g.shiftTermine
                          ? <>Shift terminé</>
                          : <>Session terminée</>}
                    </span>
                    <span className="text-lg font-black text-teal-700">
                      {g.net.toFixed(2)}€
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {h}h {String(m).padStart(2, '0')}min travaillées
                  </p>
                  {prevuLabel && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⏱️ Prévu depuis {prevuLabel}
                    </p>
                  )}
                  {g.shiftTermine && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Temps au-delà à déclarer via "Changer" en fin de session
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Pas encore pointé aujourd'hui</p>
        )}
      </div>

      {salaireMoisCaisse && (
        <>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Salaire du mois en cours</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Heures</p>
              <p className="text-lg font-bold text-[#1B2A4A] mt-1">{salaireMoisCaisse.totalHeures.toFixed(1)}h</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Salaire brut</p>
              <p className="text-lg font-bold text-[#1B2A4A] mt-1">{salaireMoisCaisse.salaireBrut.toFixed(2)}€</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Pénalités retard</p>
              <p className={`text-lg font-bold mt-1 ${salaireMoisCaisse.penalitesRetard > 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                {salaireMoisCaisse.penalitesRetard > 0 ? '-' : ''}{salaireMoisCaisse.penalitesRetard.toFixed(2)}€
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Absences</p>
              <p className={`text-lg font-bold mt-1 ${salaireMoisCaisse.absencesCount > 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                {salaireMoisCaisse.absencesCount} jour{salaireMoisCaisse.absencesCount !== 1 ? 's' : ''}
              </p>
              {salaireMoisCaisse.penalitesAbsence > 0 && (
                <p className="text-xs text-red-600 font-bold">-{salaireMoisCaisse.penalitesAbsence}€</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">Commissions</p>
              <p className="text-lg font-bold text-green-600 mt-1">+{salaireMoisCaisse.commissionsTotal.toFixed(2)}€</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-md flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0d9488 100%)' }}>
            <p className="text-xs uppercase opacity-70 font-bold">Total net (ce mois)</p>
            <p className={`text-3xl font-black ${salaireMoisCaisse.salaireNet < 0 ? 'text-red-300' : 'text-white'}`}>
              {salaireMoisCaisse.salaireNet.toFixed(2)}€
            </p>
          </div>

          {salaireSemaineCaisse && (
            <div className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Cette semaine</p>
                  <p className="text-xl font-black text-[#1B2A4A] mt-1">
                    {salaireSemaineCaisse.totalHeures.toFixed(1)}h
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Salaire net</p>
                  <p className="text-xl font-black text-green-600 mt-1">
                    {salaireSemaineCaisse.salaireNet.toFixed(2)}€
                  </p>
                </div>
              </div>
              {joursTravaillesSemaine.length > 0 && (() => {
                const maxM = Math.max(...joursTravaillesSemaine.map((j) => j.montant), 1)
                const moyenneMontant = joursTravaillesSemaine.reduce((s, j) => s + j.montant, 0) / 7
                return (
                  <div className="relative">
                    <div className="flex items-end gap-1.5 h-20">
                      {joursTravaillesSemaine.map((d) => {
                        const pct = (d.montant / maxM) * 100
                        return (
                          <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end h-full">
                              <div
                                className="w-full rounded-t-md bg-gradient-to-t from-[#1B2A4A] to-[#00B4CC] transition-all"
                                style={{ height: `${Math.max(2, pct)}%` }}
                                title={`${d.montant.toFixed(2)}€`}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">
                              {d.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 pointer-events-none"
                      style={{ bottom: `${Math.min(100, (moyenneMontant / maxM) * 100)}%` }}
                    >
                      <span className="absolute -top-4 right-0 text-[9px] font-bold text-amber-600 bg-white px-1 rounded">
                        moy. {moyenneMontant.toFixed(0)}€
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
  const [showMovementMenu, setShowMovementMenu] = useState(false)
  const [discountMenuItemId, setDiscountMenuItemId] = useState(null)
  const [showGlobalDiscount, setShowGlobalDiscount] = useState(false)
  const [globalDiscountValue, setGlobalDiscountValue] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedCartItemId, setSelectedCartItemId] = useState(null)

  const barcodeRef = useRef(null)

  const COLORS = [
    { value: 'blue', label: 'Bleu', bg: '#dbeafe', text: '#1e40af' },
    { value: 'green', label: 'Vert', bg: '#f0fdf4', text: '#166534' },
    { value: 'yellow', label: 'Jaune', bg: '#fef9c3', text: '#854d0e' },
    { value: 'purple', label: 'Violet', bg: '#f3e8ff', text: '#6b21a8' },
    { value: 'red', label: 'Rouge', bg: '#fee2e2', text: '#991b1b' },
    { value: 'orange', label: 'Orange', bg: '#fff7ed', text: '#9a3412' },
    { value: 'gray', label: 'Gris', bg: '#f3f4f6', text: '#374151' },
  ]

  const getColor = (color) =>
    COLORS.find(c => c.value === color) || COLORS[0]

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )
    if (user.magasin_id) setMagasin(user.magasin_id)
    else if (MAGASINS_LIST.length > 0) setMagasin(MAGASINS_LIST[0].id)
    fetchMagasinsAvecHistorique()
    fetchLibellesTreso()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Charge la session caisse depuis localStorage à chaque changement de magasin
  useEffect(() => {
    if (!magasin) return
    const key = `sebphone_caisse_session_${magasin}`
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        const today = new Date().toISOString().slice(0, 10)
        if (parsed.dateStr === today) {
          setCaisseSession(parsed)
          return
        }
      } catch { /* ignore */ }
    }
    setCaisseSession(null)
  }, [magasin])

  const handleUnlock = (staffRecord, pointageId, arrivalTimeISO) => {
    const session = {
      staffId: staffRecord.id,
      staffName: staffRecord.name,
      pointageId,
      dateStr: new Date().toISOString().slice(0, 10),
      arrivalDisplay: arrivalTimeISO
        ? new Date(arrivalTimeISO).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' }),
    }
    localStorage.setItem(`sebphone_caisse_session_${magasin}`,
      JSON.stringify(session))
    setCaisseSession(session)
  }

  const handleChangeUser = async () => {
    if (!caisseSession) return

    const { data: todaySchedule } = await supabase
      .from('staff_schedule_dates')
      .select('heure_fin')
      .eq('staff_id', caisseSession.staffId)
      .eq('date', new Date().toISOString().slice(0, 10))
      .maybeSingle()

    let heuresSupData = null
    if (todaySchedule?.heure_fin) {
      const now = new Date()
      const [fh, fm] = todaySchedule.heure_fin.split(':').map(Number)
      const finPrevue = new Date(now.getFullYear(), now.getMonth(), now.getDate(), fh, fm, 0)
      const depassementMin = (now - finPrevue) / 60000
      if (depassementMin > 15) {
        const h = Math.floor(depassementMin / 60)
        const m = Math.round(depassementMin % 60)
        const confirmDeclare = window.confirm(
          `Tu termines ${h}h${String(m).padStart(2, '0')} après l'heure prévue (${todaySchedule.heure_fin}).\n\nDéclarer ce temps en heures supplémentaires (en attente de validation par le gérant) ?`
        )
        if (confirmDeclare) {
          const motif = window.prompt('Motif (optionnel) :') || null
          heuresSupData = {
            staff_id: caisseSession.staffId,
            date: new Date().toISOString().slice(0, 10),
            pointage_id: caisseSession.pointageId,
            heure_fin_prevue: todaySchedule.heure_fin,
            heure_depart_reelle: now.toISOString(),
            duree_heures: Math.round((depassementMin / 60) * 100) / 100,
            motif,
            statut: 'en_attente',
          }
        }
      }
    }

    if (!window.confirm('Terminer votre session sur ce poste ?')) return

    await supabase.from('staff_pointages')
      .update({ heure_depart: new Date().toISOString() })
      .eq('id', caisseSession.pointageId)

    if (heuresSupData) {
      await supabase.from('staff_heures_sup').insert(heuresSupData)
    }

    localStorage.removeItem(`sebphone_caisse_session_${magasin}`)
    setCaisseSession(null)
  }

  // ─── Paramètres caisse : fetchers & handlers ───
  const fetchStaffCaisse = async () => {
    setLoadingStaffCaisse(true)
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
    setStaffListCaisse(data || [])
    setLoadingStaffCaisse(false)
  }

  const openStaffDetailCaisse = async (staff) => {
    setSelectedStaffCaisse(staff)
    setEditPinCaisse(staff.pin_code || '')
    setEditWageCaisse(staff.hourly_wage ?? '')
    setLoadingDetailCaisse(true)

    const today = new Date().toISOString().slice(0, 10)
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    const dateStart = firstOfMonth.toISOString().slice(0, 10)
    const { weekStart, weekEnd } = getWeekBounds()

    const [pointRes, salaire, salaireSem, pointagesSemRes, schedulesSemRes] = await Promise.all([
      supabase.from('staff_pointages').select('*').eq('staff_id', staff.id).eq('date', today).maybeSingle(),
      calcSalairePeriode(supabase, staff.id, staff.hourly_wage || 0, dateStart, today),
      calcSalairePeriode(supabase, staff.id, staff.hourly_wage || 0, weekStart, weekEnd),
      supabase.from('staff_pointages').select('date,heure_arrivee,heure_depart')
        .eq('staff_id', staff.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('staff_schedule_dates').select('date,repos,heure_debut,heure_fin')
        .eq('staff_id', staff.id).gte('date', weekStart).lte('date', weekEnd),
    ])

    // Barres 7 jours (Lun -> Dim) — MÊME logique que calcSalairePeriode :
    // shift complet si terminé (via isShiftFinished), sinon heures live
    // depuis heure_arrivee (si pointage existe et pas encore fini)
    const wage = Number(staff.hourly_wage || 0)
    const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const monday = new Date(weekStart)
    const dayHours = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dStr = d.toISOString().slice(0, 10)
      const p = (pointagesSemRes.data || []).find((x) => x.date === dStr)
      const sch = (schedulesSemRes.data || []).find((x) => x.date === dStr)
      let hours = 0
      if (sch && !sch.repos && p) {
        const finished = isShiftFinished(dStr, sch.heure_fin, p.heure_depart)
        if (finished) {
          hours = calcDureeHeures(sch.heure_debut, sch.heure_fin)
        } else if (p.heure_arrivee) {
          hours = (new Date() - new Date(p.heure_arrivee)) / 3600000
        }
      }
      hours = Math.max(0, hours)
      dayHours.push({ dateStr: dStr, label: dayLabels[i], heures: hours, montant: hours * wage })
    }

    setPointageAujourdhui(pointRes.data || null)
    setSalaireMoisCaisse(salaire)
    setSalaireSemaineCaisse(salaireSem)
    setJoursTravaillesSemaine(dayHours)
    setLoadingDetailCaisse(false)
  }

  const handleSavePinWageCaisse = async () => {
    if (!selectedStaffCaisse) return
    if (editPinCaisse) {
      if (!/^\d{4}$/.test(editPinCaisse)) {
        alert('Le code PIN doit contenir exactement 4 chiffres')
        return
      }
      const { data: dup } = await supabase
        .from('staff')
        .select('id')
        .eq('pin_code', editPinCaisse)
        .neq('id', selectedStaffCaisse.id)
      if (dup && dup.length > 0) {
        alert('Ce code PIN est déjà utilisé par un autre employé')
        return
      }
    }
    setSavingStaffCaisse(true)
    const { error } = await supabase.from('staff').update({
      pin_code: editPinCaisse || null,
      hourly_wage: Number(editWageCaisse) || 0,
    }).eq('id', selectedStaffCaisse.id)
    setSavingStaffCaisse(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_pin_wage_update', `PIN/salaire mis à jour pour ${selectedStaffCaisse.name}`)
    alert('✅ Enregistré')
    fetchStaffCaisse()
  }


  const fetchMyPointageData = async () => {
    if (!caisseSession?.staffId) return
    setLoadingMyPointage(true)
    const { data: record } = await supabase
      .from('staff').select('*').eq('id', caisseSession.staffId).maybeSingle()
    if (record) {
      setMyStaffRecord(record)
      await openStaffDetailCaisse(record)
    }
    setLoadingMyPointage(false)
  }

  const handleSendReplacementRequest = async () => {
    if (!replacementForm.date) { alert('Date requise'); return }
    if (!myStaffRecord) return
    setSendingReplacement(true)
    try {
      const { data: adminStaff } = await supabase
        .from('staff').select('telephone').eq('is_admin', true).limit(1).maybeSingle()
      if (!adminStaff?.telephone) {
        alert('Aucun numéro admin configuré — contacte ton responsable directement')
        return
      }
      const dateFormatee = new Date(replacementForm.date)
        .toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })
      const horaireTexte = replacementForm.repos
        ? 'Jour de repos souhaité'
        : `Horaire souhaité : ${replacementForm.heure_debut} - ${replacementForm.heure_fin}`
      const message = `Demande de remplacement — ${myStaffRecord.name}\n\nDate : ${dateFormatee}\n${horaireTexte}${replacementForm.note ? '\n\nNote : ' + replacementForm.note : ''}`

      const digits = String(adminStaff.telephone).replace(/\D/g, '')
      const intl = digits.startsWith('0') ? '32' + digits.slice(1)
        : digits.startsWith('32') ? digits
        : '32' + digits
      window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank')
      logActivity('staff_replacement_request',
        `Demande de remplacement envoyée par ${myStaffRecord.name} pour le ${dateFormatee}`)
      setShowReplacementForm(false)
      setReplacementForm({ date: '', repos: false, heure_debut: '10:00', heure_fin: '20:00', note: '' })
      alert('📱 WhatsApp ouvert avec ta demande')
    } finally {
      setSendingReplacement(false)
    }
  }

  // Magasins physiques concernés par la caisse
  const MAGASINS_CAISSE = MAGASINS_LIST.filter((m) =>
    ['anderlecht', 'molenbeek', 'rue-neuve', 'louise'].includes(m.id))

  // Formulaire dépense uniquement : magasins ayant déjà clôturé au moins une fois
  const MAGASINS_CAISSE_DEPENSE = MAGASINS_CAISSE.filter(
    (m) => magasinsAvecHistorique.includes(m.id)
  )

  // ─── Trésorerie ───
  const fetchMouvements = async () => {
    setLoadingTreso(true)
    const { data } = await supabase.from('tresorerie_mouvements')
      .select('*').order('created_at', { ascending: false }).limit(5000)
    setMouvements(data || [])
    setLoadingTreso(false)
  }

  const fetchFournisseursListTreso = async () => {
    const { data } = await supabase.from('fournisseurs')
      .select('id, nom').order('nom', { ascending: true })
    setFournisseursListTreso(data || [])
  }

  // Libellés de dépense prédéfinis
  const fetchLibellesTreso = async () => {
    const { data } = await supabase
      .from('depense_libelles')
      .select('*')
      .order('label')
    setLibellesListTreso(data || [])
  }

  // Clôtures disponibles pour le magasin choisi dans le formulaire dépense
  const fetchClosuresForDepense = async (magasinId) => {
    if (!magasinId) { setClosuresListTreso([]); return }
    setLoadingClosuresTreso(true)
    const { data } = await supabase
      .from('cash_closures')
      .select('id, closure_date, ca_total, staff_name')
      .eq('magasin_id', magasinId)
      .order('closure_date', { ascending: false })
      .limit(60)
    setClosuresListTreso(data || [])
    setLoadingClosuresTreso(false)
  }

  // Magasins ayant déjà au moins une clôture enregistrée
  // ─── Tâches récurrentes ───
  const JOURS_SEMAINE = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
  const jourAujourdhui = () => JOURS_SEMAINE[new Date().getDay()]

  const fetchTachesDuJour = async () => {
    if (!magasin) return
    const today = jourAujourdhui()
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
    const { data: taches } = await supabase
      .from('taches_recurrentes')
      .select('*')
      .eq('active', true)
      .contains('jours_semaine', [today])
    const applicable = (taches || []).filter((t) =>
      !t.magasins || t.magasins.length === 0 || t.magasins.includes(magasin)
    )
    if (applicable.length === 0) { setTachesDuJour([]); return }
    const { data: completions } = await supabase
      .from('taches_recurrentes_completions')
      .select('tache_id')
      .eq('date_tache', todayStr)
      .eq('magasin_id', magasin)
    const completedIds = new Set((completions || []).map((c) => c.tache_id))
    setTachesDuJour(applicable.filter((t) => !completedIds.has(t.id)))
  }

  const handleCompleteTache = async (tacheId) => {
    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
    const { error } = await supabase.from('taches_recurrentes_completions').insert({
      tache_id: tacheId,
      date_tache: todayStr,
      magasin_id: magasin,
      completed_by: currentSebUser?.name || 'Staff',
    })
    if (error) { alert('Erreur : ' + error.message); return }
    fetchTachesDuJour()
  }

  const fetchAllTaches = async () => {
    const { data } = await supabase.from('taches_recurrentes').select('*').order('created_at', { ascending: false })
    setTachesAdminList(data || [])
  }

  const handleCreateTache = async () => {
    if (!tacheRecurrenteForm.titre.trim() || tacheRecurrenteForm.jours_semaine.length === 0) {
      alert('Titre et au moins un jour sont obligatoires')
      return
    }
    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const { error } = await supabase.from('taches_recurrentes').insert({
      titre: tacheRecurrenteForm.titre.trim(),
      description: tacheRecurrenteForm.description.trim() || null,
      jours_semaine: tacheRecurrenteForm.jours_semaine,
      magasins: tacheRecurrenteForm.magasins.length > 0 ? tacheRecurrenteForm.magasins : null,
      intervalle_rappel_min: tacheRecurrenteForm.intervalle_rappel_min || 15,
      created_by: currentSebUser?.name || 'Admin',
    })
    if (error) { alert('Erreur : ' + error.message); return }
    setTacheRecurrenteForm({ titre: '', description: '', jours_semaine: [], magasins: [], intervalle_rappel_min: 15 })
    fetchAllTaches()
    fetchTachesDuJour()
  }

  const handleToggleTacheActive = async (tache) => {
    await supabase.from('taches_recurrentes').update({ active: !tache.active }).eq('id', tache.id)
    fetchAllTaches()
    fetchTachesDuJour()
  }

  const handleDeleteTacheRecurrente = async (id) => {
    if (!confirm('Supprimer cette tâche définitivement ?')) return
    await supabase.from('taches_recurrentes').delete().eq('id', id)
    fetchAllTaches()
    fetchTachesDuJour()
  }

  const fetchMagasinsAvecHistorique = async () => {
    const { data } = await supabase
      .from('cash_closures')
      .select('magasin_id')
    const uniques = [...new Set((data || []).map(r => r.magasin_id))]
    setMagasinsAvecHistorique(uniques)
  }

  // Mouvements filtrés par la combinaison de magasins active
  const filteredMouvements = useMemo(() => (
    mouvements.filter((m) => !m.magasin_id || selectedMagasinsCombo.has(m.magasin_id))
  ), [mouvements, selectedMagasinsCombo])

  // Variante sourcée sur mouvementsMois (bornée au mois affiché) — utilisée pour le calendrier
  const filteredMouvementsMois = useMemo(
    () => mouvementsMois.filter(m => !m.magasin_id || selectedMagasinsCombo.has(m.magasin_id)),
    [mouvementsMois, selectedMagasinsCombo]
  )

  const filteredReparationsHub = useMemo(() => {
    const q = searchReparationsHub.trim().toLowerCase()
    if (!q) return reparationsHubData
    return reparationsHubData.filter((r) => {
      const target = [r.client_nom, r.imei, r.appareil, r.bon_number, r.client_number]
        .filter(Boolean).join(' ').toLowerCase()
      return target.includes(q)
    })
  }, [reparationsHubData, searchReparationsHub])

  const totalGlobalTreso = useMemo(() => (
    filteredMouvements.reduce((s, m) =>
      s + (m.type === 'entree' ? Number(m.amount) : -Number(m.amount)), 0)
  ), [filteredMouvements])

  const totauxParMagasin = useMemo(() => (
    MAGASINS_CAISSE.reduce((acc, mag) => {
      acc[mag.id] = filteredMouvements
        .filter((m) => m.magasin_id === mag.id)
        .reduce((s, m) => s + (m.type === 'entree' ? Number(m.amount) : -Number(m.amount)), 0)
      return acc
    }, {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [filteredMouvements])

  const totauxParMethode = useMemo(() => {
    const acc = { cash: 0, bancontact: 0, virement: 0 }
    filteredMouvements.forEach((m) => {
      const pm = m.payment_method || 'cash'
      acc[pm] = (acc[pm] || 0) + (m.type === 'entree' ? Number(m.amount) : -Number(m.amount))
    })
    return acc
  }, [filteredMouvements])

  const totauxParDetenteurEtMagasin = useMemo(() => {
    const acc = {}
    filteredMouvements.forEach((m) => {
      const key = m.holder || 'Non précisé'
      const delta = m.type === 'entree' ? Number(m.amount) : -Number(m.amount)
      acc[key] = { total: (acc[key]?.total || 0) + delta }
    })
    return acc
  }, [filteredMouvements])

  const computeHolderLabel = (form) => {
    if (form.holderType === 'zinou') return 'Zinou'
    if (form.holderType === 'david') return 'David'
    if (form.holderType === 'moha') return 'Moha'
    if (form.holderType === 'magasin') {
      const nom = MAGASINS_CAISSE.find((m) => m.id === form.holderDetailMagasin)?.nom || form.holderDetailMagasin
      return `Magasin — ${nom}`
    }
    return `Autre — ${form.holderDetailAutre || '?'}`
  }

  const parseHolderIntoFields = (holderStr) => {
    if (!holderStr) return { holderType: 'zinou', holderDetailMagasin: '', holderDetailAutre: '' }
    if (holderStr.startsWith('Magasin — ')) {
      const nom = holderStr.slice('Magasin — '.length)
      const mag = MAGASINS_CAISSE.find((m) => m.nom === nom)
      return { holderType: 'magasin', holderDetailMagasin: mag?.id || '', holderDetailAutre: '' }
    }
    if (holderStr.startsWith('Autre — ')) {
      return { holderType: 'autre', holderDetailMagasin: '', holderDetailAutre: holderStr.slice('Autre — '.length) }
    }
    const low = holderStr.toLowerCase()
    if (['zinou', 'david', 'moha'].includes(low)) {
      return { holderType: low, holderDetailMagasin: '', holderDetailAutre: '' }
    }
    return { holderType: 'autre', holderDetailMagasin: '', holderDetailAutre: holderStr }
  }

  const handleSaveDepense = async () => {
    const amt = Number(depenseForm.montant)
    if (!amt || amt <= 0) { alert('Montant invalide'); return }
    if (!depenseForm.magasin_id) { alert('Sélectionne un magasin'); return }
    if (!depenseForm.closure_id) { alert('Sélectionne une clôture de caisse'); return }
    if (!depenseForm.target_date) { alert('Indique la date de la dépense'); return }
    if (!depenseForm.libelle_id) { alert('Sélectionne ou ajoute un libellé'); return }
    if (!depenseForm.holderType) { alert('Sélectionne un détenteur'); return }
    if (depenseForm.categorie === 'fournisseur' && !depenseForm.fournisseur_id) {
      alert('Sélectionne un fournisseur')
      return
    }
    if (depenseForm.categorie === 'autre' && !depenseForm.categorieAutre.trim()) {
      alert('Précise la catégorie')
      return
    }
    if (depenseForm.holderType === 'magasin' && !depenseForm.holderDetailMagasin) {
      alert('Sélectionne le magasin détenteur')
      return
    }
    if (depenseForm.holderType === 'autre' && !depenseForm.holderDetailAutre.trim()) {
      alert('Précise qui détient la dépense')
      return
    }
    if (depenseForm.libelle_id === '__custom__' && !depenseForm.description.trim()) {
      alert('Indique le libellé')
      return
    }
    setSavingDepense(true)
    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const fallbackCreatedBy = currentSebUser?.name || 'Staff'
    const madeByFinal = depenseForm.made_by === '__autre__'
      ? (depenseForm.made_by_autre.trim() || fallbackCreatedBy)
      : (depenseForm.made_by || fallbackCreatedBy)
    const sourceFinal = depenseForm.categorie === 'autre'
      ? (depenseForm.categorieAutre.trim() || 'autre')
      : depenseForm.categorie
    let finalDescription = depenseForm.description
    if (depenseForm.libelle_id === '__custom__') {
      const trimmed = depenseForm.description.trim()
      const { data: newLib } = await supabase
        .from('depense_libelles')
        .upsert({ label: trimmed }, { onConflict: 'label' })
        .select()
        .single()
      finalDescription = newLib?.label || trimmed
      fetchLibellesTreso()
    }
    const { error } = await supabase.from('tresorerie_mouvements').insert({
      type: 'sortie',
      source: sourceFinal,
      magasin_id: depenseForm.magasin_id || null,
      amount: amt,
      reference_id: depenseForm.fournisseur_id || null,
      description: finalDescription || null,
      created_by: madeByFinal,
      holder: computeHolderLabel(depenseForm),
      payment_method: depenseForm.payment_method,
      closure_id: depenseForm.closure_id,
      target_date: depenseForm.target_date,
    })
    setSavingDepense(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('tresorerie_depense',
      `Dépense enregistrée — ${amt}€ (${sourceFinal}) par ${madeByFinal}`)
    setDepenseForm({ magasin_id: '', montant: '', categorie: 'fournisseur',
      fournisseur_id: '', description: '',
      categorieAutre: '',
      holderType: '', holderDetailMagasin: '', holderDetailAutre: '',
      payment_method: 'cash',
      made_by: '', made_by_autre: '',
      target_date: '',
      closure_id: '', libelle_id: '' })
    setShowDepenseForm(false)
    setPrefillTargetDate('')
    setDepenseMagasinJourFilter(null)
    fetchMouvements()
  }

  const handleSaveDescription = async (id) => {
    const trimmed = editingDescValue.trim()
    await supabase.from('tresorerie_mouvements')
      .update({ description: trimmed || null })
      .eq('id', id)
    setEditingDescId(null)
    fetchMouvements()
  }

  // Fetch clôtures du mois affiché (pour le calendrier unifié)
  const fetchCloturesMois = async (offset = calMonthOffsetTreso) => {
    const now = new Date()
    const dispDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const first = new Date(dispDate.getFullYear(), dispDate.getMonth(), 1)
    const last = new Date(dispDate.getFullYear(), dispDate.getMonth() + 1, 0, 23, 59, 59)
    const { data } = await supabase.from('cash_closures')
      .select('*')
      .gte('period_end', first.toISOString())
      .lte('period_end', last.toISOString())
    setCloturesMois(data || [])
  }

  // Fetch mouvements du mois affiché (borné, pour badges calendrier + popup jour)
  const fetchMouvementsMois = async (offset = calMonthOffsetTreso) => {
    const now = new Date()
    const dispDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const first = new Date(dispDate.getFullYear(), dispDate.getMonth(), 1)
    const last = new Date(dispDate.getFullYear(), dispDate.getMonth() + 1, 0, 23, 59, 59)
    const firstStr = first.toISOString().slice(0, 10)
    const lastStr = last.toISOString().slice(0, 10)
    const { data } = await supabase.from('tresorerie_mouvements')
      .select('*')
      .or(`and(target_date.gte.${firstStr},target_date.lte.${lastStr}),and(target_date.is.null,created_at.gte.${first.toISOString()},created_at.lte.${last.toISOString()})`)
    setMouvementsMois(data || [])
  }

  // Assigner la caisse d'une clôture à un employé (met à jour les 3 lignes cash/banco/virement)
  const handleAssignCaisseHolder = async (closure, newHolder) => {
    if (!newHolder) return
    const { error } = await supabase.from('tresorerie_mouvements')
      .update({ holder: newHolder })
      .eq('reference_id', closure.id)
    if (error) { alert('Erreur : ' + error.message); return }
    const dateLabel = new Date(closure.period_end).toLocaleDateString('fr-BE')
    const magNom = (MAGASINS_LIST.find((m) => m.id === closure.magasin_id)?.nom || closure.magasin_id || '—')
      .replace('Seb Telecom — ', '')
    logActivity('tresorerie_holder_update',
      `Caisse du ${dateLabel} (${magNom}) assignée à ${newHolder}`)
    fetchMouvements()
  }

  const openEditHolder = (mvt) => {
    const parsed = parseHolderIntoFields(mvt.holder)
    setEditingHolderMouvement(mvt)
    setEditHolderType(parsed.holderType)
    setEditHolderDetailMagasin(parsed.holderDetailMagasin)
    setEditHolderDetailAutre(parsed.holderDetailAutre)
  }

  const handleSaveHolder = async () => {
    if (!editingHolderMouvement) return
    setSavingHolder(true)
    const newHolder = computeHolderLabel({
      holderType: editHolderType,
      holderDetailMagasin: editHolderDetailMagasin,
      holderDetailAutre: editHolderDetailAutre,
    })
    const { error } = await supabase.from('tresorerie_mouvements')
      .update({ holder: newHolder }).eq('id', editingHolderMouvement.id)
    setSavingHolder(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('tresorerie_holder_update', `Détenteur modifié — ${newHolder}`)
    setEditingHolderMouvement(null)
    fetchMouvements()
  }

  // ─── Commissions (règles) ───
  const fetchCommissionRules = async () => {
    setLoadingRules(true)
    const { data } = await supabase.from('commission_rules')
      .select('*').order('category_name', { ascending: true })
    setCommissionRules(data || [])
    setLoadingRules(false)
  }

  const fetchCategoriesDistinct = async () => {
    const { data } = await supabase.from('shop_categories')
      .select('name').order('name', { ascending: true })
    const seen = new Set()
    const uniques = []
    ;(data || []).forEach((r) => {
      if (r.name && !seen.has(r.name)) { seen.add(r.name); uniques.push(r.name) }
    })
    setCategoriesDistinct(uniques)
  }

  const resetRuleForm = () => {
    setRuleForm({ category_name: '', sous_categorie: '', rate: '', active: true })
    setEditingRule(null)
    setShowRuleForm(false)
  }

  const openEditRule = (rule) => {
    setEditingRule(rule)
    setRuleForm({
      category_name: rule.category_name || '',
      sous_categorie: rule.sous_categorie || '',
      rate: String(rule.rate ?? ''),
      active: rule.active !== false,
    })
    setShowRuleForm(true)
  }

  const handleSaveRule = async () => {
    if (!ruleForm.category_name) { alert('Catégorie requise'); return }
    const rateNum = Number(ruleForm.rate)
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      alert('Taux invalide (0 à 100)'); return
    }
    setSavingRule(true)
    const payload = {
      category_name: ruleForm.category_name,
      sous_categorie: ruleForm.sous_categorie || null,
      rate: rateNum,
      active: !!ruleForm.active,
    }
    let error
    if (editingRule) {
      const { error: e } = await supabase.from('commission_rules')
        .update(payload).eq('id', editingRule.id)
      error = e
    } else {
      const { error: e } = await supabase.from('commission_rules').insert(payload)
      error = e
    }
    setSavingRule(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity(
      editingRule ? 'commission_rule_update' : 'commission_rule_create',
      `Règle commission ${payload.category_name}${payload.sous_categorie ? ' / ' + payload.sous_categorie : ''} — ${payload.rate}%`
    )
    resetRuleForm()
    fetchCommissionRules()
  }

  const handleToggleRuleActive = async (rule) => {
    const { error } = await supabase.from('commission_rules')
      .update({ active: !rule.active }).eq('id', rule.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('commission_rule_update',
      `Règle ${rule.category_name}${rule.sous_categorie ? ' / ' + rule.sous_categorie : ''} ${!rule.active ? 'activée' : 'désactivée'}`)
    fetchCommissionRules()
  }

  // ─── Prix réparations ───
  const fetchTypePannePrix = async () => {
    setLoadingTypePannePrix(true)
    const { data } = await supabase.from('type_panne_prix')
      .select('*').order('type_panne', { ascending: true })
    setTypePannePrixList(data || [])
    setLoadingTypePannePrix(false)
  }

  const openEditTypePanne = (row) => {
    setEditingTypePanne(row)
    setTpForm({
      prix_defaut: String(row.prix_defaut ?? ''),
      prix_min: String(row.prix_min ?? ''),
      prix_max: String(row.prix_max ?? ''),
    })
  }

  const handleSaveTypePanne = async () => {
    if (!editingTypePanne) return
    setSavingTypePanne(true)
    const { error } = await supabase.from('type_panne_prix').update({
      prix_defaut: Number(tpForm.prix_defaut) || 0,
      prix_min: Number(tpForm.prix_min) || 0,
      prix_max: Number(tpForm.prix_max) || 0,
    }).eq('id', editingTypePanne.id)
    setSavingTypePanne(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('type_panne_prix_update', `Prix mis à jour pour ${editingTypePanne.type_panne}`)
    setEditingTypePanne(null)
    fetchTypePannePrix()
  }

  // ─── Délais réparation ───
  const fetchDelaiTypes = async () => {
    setLoadingDelaiTypes(true)
    const { data } = await supabase.from('delai_types')
      .select('*').order('ordre', { ascending: true })
    setDelaiTypesList(data || [])
    setLoadingDelaiTypes(false)
  }

  const resetDelaiForm = () => {
    setDelaiForm({ label: '', delai_texte: '', ordre: 0 })
    setEditingDelai(null)
    setShowDelaiForm(false)
  }

  const openEditDelai = (row) => {
    setEditingDelai(row)
    setDelaiForm({
      label: row.label || '',
      delai_texte: row.delai_texte || '',
      ordre: row.ordre ?? 0,
    })
    setShowDelaiForm(true)
  }

  const handleSaveDelai = async () => {
    if (!delaiForm.label.trim() || !delaiForm.delai_texte.trim()) {
      alert('Label et délai requis'); return
    }
    setSavingDelai(true)
    const payload = {
      label: delaiForm.label.trim(),
      delai_texte: delaiForm.delai_texte.trim(),
      ordre: Number(delaiForm.ordre) || 0,
    }
    let error
    if (editingDelai) {
      const { error: e } = await supabase.from('delai_types')
        .update(payload).eq('id', editingDelai.id)
      error = e
    } else {
      const { error: e } = await supabase.from('delai_types').insert(payload)
      error = e
    }
    setSavingDelai(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity(
      editingDelai ? 'delai_type_update' : 'delai_type_create',
      `Type de délai — ${payload.label} : ${payload.delai_texte}`
    )
    resetDelaiForm()
    fetchDelaiTypes()
  }

  const handleDeleteDelai = async (row) => {
    if (!window.confirm(`Supprimer le type "${row.label}" ?`)) return
    const { error } = await supabase.from('delai_types').delete().eq('id', row.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('delai_type_delete', `Type de délai supprimé — ${row.label}`)
    fetchDelaiTypes()
  }

  // ─── Tâches de clôture caisse ───
  const fetchClotureTaches = async () => {
    const { data } = await supabase.from('cloture_taches')
      .select('*').eq('active', true).order('ordre')
    setClotureTachesList(data || [])
  }

  const resetTacheForm = () => {
    setTacheForm({ label: '', ordre: 0 })
    setEditingTache(null)
    setShowTacheForm(false)
  }

  const openEditTache = (row) => {
    setEditingTache(row)
    setTacheForm({
      label: row.label || '',
      ordre: row.ordre ?? 0,
    })
    setShowTacheForm(true)
  }

  const handleSaveTache = async () => {
    if (!tacheForm.label.trim()) {
      alert('Label requis'); return
    }
    setSavingTache(true)
    const payload = {
      label: tacheForm.label.trim(),
      ordre: Number(tacheForm.ordre) || 0,
    }
    let error
    if (editingTache) {
      const { error: e } = await supabase.from('cloture_taches')
        .update(payload).eq('id', editingTache.id)
      error = e
    } else {
      const { error: e } = await supabase.from('cloture_taches').insert(payload)
      error = e
    }
    setSavingTache(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity(
      editingTache ? 'cloture_tache_update' : 'cloture_tache_create',
      `Tâche clôture — ${payload.label}`
    )
    resetTacheForm()
    fetchClotureTaches()
  }

  const handleDeleteTache = async (row) => {
    if (!window.confirm(`Supprimer la tâche "${row.label}" ?`)) return
    const { error } = await supabase.from('cloture_taches').delete().eq('id', row.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('cloture_tache_delete', `Tâche clôture supprimée — ${row.label}`)
    fetchClotureTaches()
  }

  // ─── Catalogue écrans par modèle ───
  const fetchEcranCatalog = async () => {
    setLoadingEcranCatalog(true)
    const { data } = await supabase.from('reparation_ecrans')
      .select('*')
      .order('gamme', { ascending: true })
      .order('modele', { ascending: true })
    setEcranCatalogList(data || [])
    setLoadingEcranCatalog(false)
  }

  const openEditEcran = (row) => {
    setEditingEcran(row)
    setEcranForm({
      prix_min: String(row.prix_min ?? ''),
      prix_defaut: String(row.prix_defaut ?? ''),
      prix_max: String(row.prix_max ?? ''),
      cout_achat: String(row.cout_achat ?? ''),
      disponible: row.disponible !== false,
      notes: row.notes || '',
    })
  }

  const handleSaveEcran = async () => {
    if (!editingEcran) return
    setSavingEcran(true)
    const { error } = await supabase.from('reparation_ecrans').update({
      prix_min: Number(ecranForm.prix_min) || 0,
      prix_defaut: Number(ecranForm.prix_defaut) || 0,
      prix_max: Number(ecranForm.prix_max) || 0,
      cout_achat: Number(ecranForm.cout_achat) || 0,
      disponible: ecranForm.disponible,
      notes: ecranForm.notes || null,
    }).eq('id', editingEcran.id)
    setSavingEcran(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('ecran_prix_update',
      `Prix mis à jour — ${editingEcran.modele} (${editingEcran.qualite})`)
    setEditingEcran(null)
    fetchEcranCatalog()
  }

  const resetNewEcranForm = () => {
    setNewEcranForm({
      marque: '', marqueMode: 'existing',
      gamme: '', modele: '', modele_code: '',
      qualite: 'compatible',
      cout_achat: '', prix_min: '', prix_defaut: '', prix_max: '',
      disponible: true, notes: '',
    })
  }

  const handleCreateEcran = async () => {
    const marque = newEcranForm.marque.trim()
    const gamme = newEcranForm.gamme.trim()
    const modele = newEcranForm.modele.trim()
    if (!marque || !gamme || !modele) {
      alert('Marque, gamme et modèle sont obligatoires')
      return
    }
    if (!['compatible', 'original_equivalent', 'original'].includes(newEcranForm.qualite)) {
      alert('Qualité invalide')
      return
    }
    setSavingNewEcran(true)
    const { error } = await supabase.from('reparation_ecrans').insert({
      marque,
      gamme,
      modele,
      modele_code: newEcranForm.modele_code.trim() || null,
      qualite: newEcranForm.qualite,
      disponible: newEcranForm.disponible,
      cout_achat: Number(newEcranForm.cout_achat) || 0,
      prix_min: Number(newEcranForm.prix_min) || 0,
      prix_defaut: Number(newEcranForm.prix_defaut) || 0,
      prix_max: Number(newEcranForm.prix_max) || 0,
      notes: newEcranForm.notes.trim() || null,
    })
    setSavingNewEcran(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('ecran_create',
      `Nouveau modèle — ${marque} ${modele} (${newEcranForm.qualite})`)
    resetNewEcranForm()
    setShowNewEcranForm(false)
    fetchEcranCatalog()
  }

  const ecranMarquesDistinct = useMemo(
    () => [...new Set(ecranCatalogList.map((e) => e.marque).filter(Boolean))].sort(),
    [ecranCatalogList]
  )

  const ecranGammesDistinct = useMemo(() => {
    if (!newEcranForm.marque) return []
    return [...new Set(
      ecranCatalogList
        .filter((e) => e.marque === newEcranForm.marque)
        .map((e) => e.gamme)
        .filter(Boolean)
    )].sort()
  }, [ecranCatalogList, newEcranForm.marque])

  const ecranCatalogFiltered = useMemo(() => (
    ecranCatalogList.filter((row) => {
      if (ecranMarqueFilter !== 'all' && row.marque !== ecranMarqueFilter) return false
      const q = ecranSearch.trim().toLowerCase()
      if (!q) return true
      return (row.modele || '').toLowerCase().includes(q)
        || (row.modele_code || '').toLowerCase().includes(q)
    })
  ), [ecranCatalogList, ecranMarqueFilter, ecranSearch])

  const ecranGroupedByGamme = useMemo(() => {
    const groups = {}
    ecranCatalogFiltered.forEach((row) => {
      const g = row.gamme || '—'
      if (!groups[g]) groups[g] = []
      groups[g].push(row)
    })
    return groups
  }, [ecranCatalogFiltered])

  // ─── Recherche de ticket ───
  const handleSearchTickets = async () => {
    const q = (searchQuery || '').trim()
    if (!q && !searchDateStart && !searchDateEnd) {
      alert('Tape un critère de recherche')
      return
    }
    setLoadingSearch(true)

    // 1) Requête principale sur shop_sales (magasin courant + dates éventuelles)
    let query = supabase.from('shop_sales').select('*').eq('magasin_id', magasin)
    if (searchDateStart) query = query.gte('created_at', searchDateStart + 'T00:00:00')
    if (searchDateEnd) query = query.lte('created_at', searchDateEnd + 'T23:59:59')
    const { data: baseRows } = await query.order('created_at', { ascending: false }).limit(500)
    let candidates = baseRows || []

    // 2) Si texte : filtre côté client sur staff_name / total / id / reference
    if (q) {
      const low = q.toLowerCase()
      const byBase = candidates.filter((s) =>
        (s.staff_name || '').toLowerCase().includes(low) ||
        String(s.total_amount ?? '').includes(q) ||
        String(s.id || '').toLowerCase().includes(low) ||
        (s.reference || '').toLowerCase().includes(low)
      )
      // 3) Recherche par nom d'article via shop_sale_items
      const { data: itemsHits } = await supabase.from('shop_sale_items')
        .select('sale_id').ilike('item_name', `%${q}%`)
      const hitIds = new Set((itemsHits || []).map((r) => r.sale_id))
      const byItems = candidates.filter((s) => hitIds.has(s.id))
      // Union dédoublonnée par id
      const seen = new Set()
      candidates = [...byBase, ...byItems].filter((s) => {
        if (seen.has(s.id)) return false
        seen.add(s.id); return true
      })
    }

    // 4) Attache les items via un fetch groupé
    const saleIds = candidates.map((s) => s.id)
    let items = []
    if (saleIds.length > 0) {
      const { data } = await supabase.from('shop_sale_items').select('*').in('sale_id', saleIds)
      items = data || []
    }
    const withItems = candidates.map((s) => ({
      ...s, items: items.filter((it) => it.sale_id === s.id),
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100)

    setSearchResults(withItems)
    setLoadingSearch(false)
  }

  const openTicketDetail = async (t) => {
    setSelectedTicket(t)
    setTicketRefunds([])
    const { data } = await supabase.from('shop_sales')
      .select('*').eq('reference', t.id).eq('sale_type', 'remboursement')
      .order('created_at', { ascending: false })
    setTicketRefunds(data || [])
  }

  const openEditTicket = async () => {
    if (!selectedTicket) return
    // Avertir si vente incluse dans une clôture
    const { data: matchingClosures } = await supabase.from('cash_closures')
      .select('id, period_end')
      .eq('magasin_id', selectedTicket.magasin_id)
      .lte('period_start', selectedTicket.created_at)
      .gte('period_end', selectedTicket.created_at)
    if (matchingClosures && matchingClosures.length > 0) {
      const cloDate = new Date(matchingClosures[0].period_end).toLocaleDateString('fr-BE')
      const ok = window.confirm(
        `⚠️ Cette vente fait partie d'une clôture déjà effectuée le ${cloDate}. ` +
        `La modifier rendra le ticket Z de ce jour incohérent avec la réalité. Continuer quand même ?`
      )
      if (!ok) return
    }
    setEditTicketForm((selectedTicket.items || []).map((it) => ({
      id: it.id,
      item_id: it.item_id,
      item_name: it.item_name,
      quantity: it.quantity,
      unit_price: String(it.unit_price ?? ''),
    })))
    const pm = selectedTicket.payment_method === 'mixed' ? 'cash' : (selectedTicket.payment_method || 'cash')
    setEditPaymentMethod(pm)
    setShowEditTicket(true)
  }

  const handleSaveEditTicket = async () => {
    if (!selectedTicket) return
    setSavingEditTicket(true)
    const newTotal = editTicketForm.reduce((s, l) =>
      s + (Number(l.unit_price) || 0) * Number(l.quantity || 0), 0)
    const round2 = (n) => Math.round(n * 100) / 100
    const total2 = round2(newTotal)
    const pm = editPaymentMethod

    const { error: saleErr } = await supabase.from('shop_sales').update({
      total_amount: total2,
      payment_method: pm,
      cash_amount: pm === 'cash' ? total2 : 0,
      bancontact_amount: pm === 'bancontact' ? total2 : 0,
      virement_amount: pm === 'virement' ? total2 : 0,
    }).eq('id', selectedTicket.id)
    if (saleErr) { alert('Erreur : ' + saleErr.message); setSavingEditTicket(false); return }

    for (const line of editTicketForm) {
      const up = Number(line.unit_price) || 0
      const tp = round2(up * Number(line.quantity || 0))
      await supabase.from('shop_sale_items').update({
        unit_price: up, total_price: tp,
      }).eq('id', line.id)
    }

    // Recalcul commissions liées
    const { data: existingComms } = await supabase.from('staff_commissions')
      .select('*').eq('sale_id', selectedTicket.id)
    for (const comm of existingComms || []) {
      const editedItem = editTicketForm.find((it) => it.item_name === comm.item_name)
      if (!editedItem) continue
      const newBase = Number(editedItem.unit_price) * Number(editedItem.quantity)
      const newCommission = round2(newBase * (comm.rate / 100))
      await supabase.from('staff_commissions').update({
        base_amount: newBase, commission_amount: newCommission,
      }).eq('id', comm.id)
    }

    const oldTotal = Number(selectedTicket.total_amount || 0)
    logActivity('shop_sale_edit',
      `Vente modifiée — ${oldTotal.toFixed(2)}€ → ${total2.toFixed(2)}€ (${selectedTicket.id})${(existingComms || []).length > 0 ? ' + commissions recalculées' : ''}`)
    setSavingEditTicket(false)
    setShowEditTicket(false)
    setSelectedTicket(null)
    alert('✅ Vente modifiée')
    handleSearchTickets()
  }

  const openRefundForm = () => {
    if (!selectedTicket) return
    setRefundForm((selectedTicket.items || []).map((it) => ({
      id: it.id,
      item_id: it.item_id,
      item_name: it.item_name,
      unit_price: Number(it.unit_price || 0),
      quantity: Number(it.quantity || 0),
      qteRembourse: Number(it.quantity || 0),
      tva_rate: it.tva_rate ?? 21,
    })))
    setRefundPaymentMethod(selectedTicket.payment_method === 'mixed'
      ? 'cash' : (selectedTicket.payment_method || 'cash'))
    setRefundReason('')
    setShowRefundForm(true)
  }

  const handleSaveRefund = async () => {
    if (!selectedTicket) return
    const linesToRefund = refundForm.filter((l) => Number(l.qteRembourse) > 0)
    if (linesToRefund.length === 0) {
      alert('Sélectionne au moins un article à rembourser'); return
    }
    setSavingRefund(true)
    const round2 = (n) => Math.round(n * 100) / 100
    const montantRemboursement = -round2(linesToRefund.reduce((s, l) =>
      s + Number(l.unit_price) * Number(l.qteRembourse), 0))

    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const staffNameNow = currentSebUser?.name || 'Staff'
    const staffIdNow = currentSebUser?.role === 'employe' ? currentSebUser?.id : null

    const { data: refundSale, error: refundErr } = await supabase.from('shop_sales').insert({
      magasin_id: selectedTicket.magasin_id,
      staff_id: staffIdNow,
      staff_name: staffNameNow,
      total_amount: montantRemboursement,
      payment_method: refundPaymentMethod,
      cash_amount: refundPaymentMethod === 'cash' ? montantRemboursement : 0,
      bancontact_amount: refundPaymentMethod === 'bancontact' ? montantRemboursement : 0,
      virement_amount: refundPaymentMethod === 'virement' ? montantRemboursement : 0,
      change_amount: 0, change_confirmed: true, global_discount: 0,
      sale_type: 'remboursement',
      reference: selectedTicket.id,
    }).select().single()

    if (refundErr) { alert('Erreur : ' + refundErr.message); setSavingRefund(false); return }

    const refundItems = linesToRefund.map((l) => ({
      sale_id: refundSale.id,
      item_id: l.item_id,
      item_name: l.item_name,
      quantity: Number(l.qteRembourse),
      unit_price: Number(l.unit_price),
      total_price: -round2(Number(l.unit_price) * Number(l.qteRembourse)),
      discount_type: null, discount_value: 0,
      tva_rate: l.tva_rate ?? 21,
    }))
    await supabase.from('shop_sale_items').insert(refundItems)

    // Déduction commission d'origine (vendeur original)
    if (selectedTicket.staff_id) {
      const itemIds = linesToRefund.map((l) => l.item_id)
      const { data: itemDetailsRaw } = await supabase.from('produits_stock_magasin')
        .select('id, produits_catalogue(sous_categorie, shop_categories(name))')
        .in('id', itemIds.filter(Boolean))
      const itemDetails = (itemDetailsRaw || []).map((d) => ({
        id: d.id,
        sous_categorie: d.produits_catalogue?.sous_categorie,
        shop_categories: d.produits_catalogue?.shop_categories,
      }))
      const { data: rules } = await supabase.from('commission_rules')
        .select('*').eq('active', true)
      const findRule = (catName, sousCat) => {
        if (!rules || !catName) return null
        const specific = rules.find((r) =>
          r.category_name === catName && r.sous_categorie && r.sous_categorie === sousCat)
        if (specific) return specific
        return rules.find((r) => r.category_name === catName && !r.sous_categorie) || null
      }
      const refundCommRows = linesToRefund.map((l) => {
        const item = itemDetails?.find((it) => it.id === l.item_id)
        const catName = item?.shop_categories?.name
        const sousCat = item?.sous_categorie
        const rule = findRule(catName, sousCat)
        if (!rule) return null
        const base = -(Number(l.unit_price) * Number(l.qteRembourse))
        return {
          staff_id: selectedTicket.staff_id,
          sale_id: refundSale.id,
          item_name: `Remboursement — ${l.item_name}`,
          category: catName,
          base_amount: base,
          rate: rule.rate,
          commission_amount: round2(base * (rule.rate / 100)),
        }
      }).filter(Boolean)
      if (refundCommRows.length > 0) {
        await supabase.from('staff_commissions').insert(refundCommRows)
      }
    }

    logActivity('shop_sale_refund',
      `Remboursement de ${(-montantRemboursement).toFixed(2)}€ sur la vente ${selectedTicket.id}${refundReason ? ' — ' + refundReason : ''}`)
    setSavingRefund(false)
    setShowRefundForm(false)
    setSelectedTicket(null)
    alert('✅ Remboursement enregistré')
    handleSearchTickets()
  }

  // ─── Devis par email ───
  const handleSendTicketEmail = async () => {
    if (!ticketEmailInput.trim() || !/\S+@\S+\.\S+/.test(ticketEmailInput)) {
      alert('Email invalide'); return
    }
    if (!lastSale) { alert('Aucun ticket à envoyer'); return }
    setSendingTicketEmail(true)
    try {
      const itemsHtml = (lastSale.items || []).map((c) => {
        return `<tr><td>${c.quantity}× ${c.item_name}</td><td style="text-align:right">${lineTotal(c).toFixed(2)}€</td></tr>`
      }).join('')
      const emailjs = (await import('@emailjs/browser')).default
      const magasinLabel = MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin
      await emailjs.send('service_nn74puq', 'template_ticket', {
        to_email: ticketEmailInput.trim(),
        to_name: 'Client',
        items_html: itemsHtml,
        total: (lastSale.total_amount || 0).toFixed(2) + '€',
        magasin_nom: magasinLabel,
        date_vente: new Date(lastSale.created_at || Date.now()).toLocaleDateString('fr-BE'),
      }, 'rqbaYNMIGNP6IQB9O')
      logActivity('ticket_email_sent', `Ticket envoyé par email à ${ticketEmailInput.trim()}`)
      setShowEmailTicketForm(false)
      setTicketEmailInput('')
      alert('Ticket envoyé ✅')
    } catch (e) {
      console.error('Erreur EmailJS complète :', e)
      alert('Erreur envoi : ' + (e?.text || e?.message || JSON.stringify(e) || 'inconnue'))
    }
    setSendingTicketEmail(false)
  }

  const handleSendDevis = async () => {
    const email = (devisEmail || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Email invalide'); return
    }
    if (cart.length === 0) { alert('Panier vide'); return }
    setSendingDevis(true)
    try {
      const itemsHtml = cart.map((c) => {
        const lt = lineTotal(c)
        return `<tr><td>${c.quantity}× ${c.item_name}</td><td style="text-align:right">${lt.toFixed(2)}€</td></tr>`
      }).join('')
      const html = `<table style="width:100%;border-collapse:collapse">${itemsHtml}</table>`

      const emailjs = (await import('@emailjs/browser')).default
      const magasinLabel = MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin
      const delaiChoisi = delaiTypesList.find((d) => d.id === devisDelaiId)
      const delaiTexteFinal = delaiChoisi ? `${delaiChoisi.label} : ${delaiChoisi.delai_texte}` : ''
      await emailjs.send('service_nn74puq', 'template_devis', {
        to_email: email,
        to_name: (devisClientName || '').trim() || 'Client',
        items_html: html,
        total: cartTotal.toFixed(2) + '€',
        magasin_nom: magasinLabel,
        delai_texte: delaiTexteFinal,
      }, 'rqbaYNMIGNP6IQB9O')

      logActivity('devis_sent', `Devis envoyé à ${email} — ${cartTotal.toFixed(2)}€${delaiTexteFinal ? ' — ' + delaiTexteFinal : ''}`)
      setCart([])
      setPaymentSplits([])
      setCurrentPaymentAmount('')
      setGlobalDiscountValue('')
      setModeDevis(false)
      setShowDevisForm(false)
      setDevisEmail('')
      setDevisClientName('')
      setDevisDelaiId('')
      alert('📧 Devis envoyé')
    } catch (err) {
      alert('Erreur envoi : ' + (err?.message || 'inconnue'))
    } finally {
      setSendingDevis(false)
    }
  }

  // Fetch délais au montage (pour le sélecteur devis)
  useEffect(() => { fetchDelaiTypes() }, [])
  useEffect(() => { fetchClotureTaches() }, [])

  // Catalogue écrans chargé au mount (nécessaire pour la recherche caisse)
  useEffect(() => { fetchEcranCatalog() }, [])

  // Fetch catalogue écrans à la première activation de l'onglet
  useEffect(() => {
    if (sectionPrixDelais === 'ecrans' && ecranCatalogList.length === 0) {
      fetchEcranCatalog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionPrixDelais])

  // Refetch clôtures + mouvements du mois quand on navigue dans le calendrier
  useEffect(() => {
    if (posScreen !== 'tresorerie') return
    fetchCloturesMois(calMonthOffsetTreso)
    fetchMouvementsMois(calMonthOffsetTreso)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonthOffsetTreso, posScreen])

  // Redirect si l'utilisateur atteint parametres sans les droits
  useEffect(() => {
    if (posScreen === 'parametres' && !canAccessParamsCaisse) {
      setPosScreen('accueil')
    }
    if (posScreen === 'parametres' && staffListCaisse.length === 0) {
      fetchStaffCaisse()
    }
    if (posScreen === 'pointage' && caisseSession?.staffId) {
      fetchMyPointageData()
      if (trueIsAdmin) {
        fetchCommissionRules()
        fetchCategoriesDistinct()
      }
    }
    if (posScreen === 'caisse' && magasin) {
      fetchPendingRepairs()
    }
    if (posScreen === 'tresorerie') {
      if (!trueIsAdmin && !canSeeTresorerie) {
        setPosScreen('accueil')
      } else {
        fetchMouvements()
        if (fournisseursListTreso.length === 0) fetchFournisseursListTreso()
        if (staffListCaisse.length === 0) fetchStaffCaisse()
        fetchCloturesMois(0)
        fetchMouvementsMois(0)
      }
    }
    if (posScreen === 'reparations-hub') {
      fetchReparationsHubData()
      if (trueIsAdmin) {
        fetchTypePannePrix()
        fetchDelaiTypes()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posScreen, canAccessParamsCaisse, trueIsAdmin, canSeeTresorerie])

  useEffect(() => {
    if (magasin) {
      fetchCategories().then(() => ensurePosCategories())
      fetchItems()
      fetchCaisseToday()
      fetchFournisseursList()
      fetchLastClosure().then((closure) => {
        fetchMovementsSince(closure?.period_end || '1970-01-01T00:00:00Z')
      })
      fetchTodaysClosure()
    }
  }, [magasin])

  useEffect(() => {
    if (magasin) fetchTachesDuJour()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magasin])

  useEffect(() => {
    if (tachesDuJour.length === 0) return
    setShowTacheReminder(true)
    const minInterval = Math.min(...tachesDuJour.map((t) => t.intervalle_rappel_min || 15))
    const timer = setInterval(() => setShowTacheReminder(true), minInterval * 60 * 1000)
    return () => clearInterval(timer)
  }, [tachesDuJour])

  const ensurePosCategories = async () => {
    const { data: existing } = await supabase
      .from('shop_categories')
      .select('name')
      .eq('magasin_id', magasin)
    const existingNames = (existing || []).map((c) => c.name)
    const missing = POS_CATEGORIES.filter((n) => !existingNames.includes(n))
    if (missing.length > 0) {
      await supabase.from('shop_categories').insert(
        missing.map((name) => ({ name, color: 'gray', magasin_id: magasin }))
      )
      fetchCategories()
    }
  }

  const fetchLastClosure = async () => {
    const { data } = await supabase
      .from('cash_closures')
      .select('*')
      .eq('magasin_id', magasin)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastClosure(data || null)
    return data
  }

  const fetchTodaysClosure = async () => {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Brussels' })
    const { data, error } = await supabase
      .from('cash_closures')
      .select('*')
      .eq('magasin_id', magasin)
      .eq('closure_date', todayStr)
      .maybeSingle()
    if (error) console.error('fetchTodaysClosure error:', error)
    setTodaysClosure(data || null)
    return data
  }

  const fetchMovementsSince = async (sinceDate) => {
    const { data } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('magasin_id', magasin)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: true })
    setMovements(data || [])
    return data || []
  }

  const fetchCaisseToday = async () => {
    if (!magasin) return
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('shop_sales')
      .select('*')
      .eq('magasin_id', magasin)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false })
    const rows = data || []
    setSalesToday(rows)
    const totals = rows.reduce((acc, s) => {
      acc.total += Number(s.total_amount) || 0
      acc.cash += Number(s.cash_amount) || 0
      acc.bancontact += Number(s.bancontact_amount) || 0
      acc.virement += Number(s.virement_amount) || 0
      return acc
    }, { cash: 0, bancontact: 0, virement: 0, total: 0 })
    setCaisseTotals(totals)
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('shop_categories')
      .select('*')
      .eq('magasin_id', magasin)
      .order('name')
    setCategories(data || [])
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('produits_stock_magasin')
      .select(`
        *,
        produits_catalogue (
          name, reference, category_id, sous_categorie, image_url,
          fournisseur_id, description, tva_rate,
          shop_categories (name, color),
          fournisseurs (nom)
        )
      `)
      .eq('magasin_id', magasin)

    const flattened = (data || []).map((row) => ({
      id: row.id,
      produit_id: row.produit_id,
      magasin_id: row.magasin_id,
      quantity: row.quantity,
      quantity_alert: row.quantity_alert,
      purchase_price: row.purchase_price,
      sale_price: row.sale_price,
      price_min: row.price_min,
      price_max: row.price_max,
      barcode: row.barcode,
      sans_stock: row.sans_stock,
      name: row.produits_catalogue?.name,
      reference: row.produits_catalogue?.reference,
      category_id: row.produits_catalogue?.category_id,
      sous_categorie: row.produits_catalogue?.sous_categorie,
      image_url: row.produits_catalogue?.image_url,
      fournisseur_id: row.produits_catalogue?.fournisseur_id,
      description: row.produits_catalogue?.description,
      tva_rate: row.produits_catalogue?.tva_rate,
      shop_categories: row.produits_catalogue?.shop_categories,
      fournisseurs: row.produits_catalogue?.fournisseurs,
    })).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    setItems(flattened)
    setLoading(false)
  }

  // ─── Hub Réparations (posScreen === 'reparations-hub') ───
  const fetchReparationsHubData = async () => {
    setLoadingReparationsHub(true)
    const { data } = await supabase
      .from('repairs')
      .select('*')
      .eq('magasin_id', magasin)
      .order('created_at', { ascending: false })
      .limit(500)
    setReparationsHubData(data || [])
    setLoadingReparationsHub(false)
  }

  const handleCreateNewRepairFromHub = async () => {
    if (!newRepairFromHubForm.nom.trim()) { alert('Nom du client obligatoire'); return }
    setSavingNewRepairFromHub(true)
    const currentSebUser = JSON.parse(localStorage.getItem('sebphone_user') || '{}')
    const { count: repairCount } = await supabase
      .from('repairs').select('*', { count: 'exact', head: true }).eq('magasin_id', magasin)
    const { count: clientCount } = await supabase
      .from('clients').select('*', { count: 'exact', head: true }).eq('magasin_id', magasin)
    const bonNumber = 'BON-' + String((repairCount || 0) + 1).padStart(4, '0')
    const clientNumber = 'CL-' + String((clientCount || 0) + 1).padStart(4, '0')
    const { error } = await supabase.from('repairs').insert({
      bon_number: bonNumber,
      client_nom: newRepairFromHubForm.nom.trim(),
      client_number: clientNumber,
      magasin_id: magasin,
      date: new Date().toISOString().slice(0, 10),
      appareil: newRepairFromHubForm.appareil || null,
      imei: newRepairFromHubForm.imei || null,
      type_panne: newRepairFromHubForm.type_panne || null,
      prix: newRepairFromHubForm.prix ? Number(newRepairFromHubForm.prix) : null,
      devis: false,
      tel: newRepairFromHubForm.tel || null,
      email: newRepairFromHubForm.email || null,
      status: 'en_attente',
      montant_paye: 0,
      staff_name: currentSebUser?.name || 'Staff',
    })
    setSavingNewRepairFromHub(false)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('repair_create_from_hub', `Nouvelle réparation ${bonNumber} — ${newRepairFromHubForm.nom.trim()}`)
    setNewRepairFromHubForm({ nom: '', appareil: '', imei: '', type_panne: '', prix: '', tel: '', email: '' })
    setShowNewRepairFromHub(false)
    fetchReparationsHubData()
  }

  // ─── Réparations en attente (à ajouter au panier caisse) ───
  const fetchPendingRepairs = async () => {
    setLoadingPendingRepairs(true)
    const { data } = await supabase
      .from('repairs')
      .select('*')
      .eq('magasin_id', magasin)
      .neq('status', 'abandonne')
      .order('created_at', { ascending: false })
    const withBalance = (data || []).filter((r) =>
      (Number(r.prix) || 0) - (Number(r.montant_paye) || 0) > 0.01
    )
    setPendingRepairs(withBalance)
    setLoadingPendingRepairs(false)
  }

  const addRepairToCart = (repair) => {
    if (repairsInCart.find((r) => r.repair_id === repair.id)) return
    const solde = (Number(repair.prix) || 0) - (Number(repair.montant_paye) || 0)
    setRepairsInCart((prev) => [...prev, {
      repair_id: repair.id,
      bon_number: repair.bon_number,
      client_nom: repair.client_nom,
      unit_price: solde,
      quantity: 1,
    }])
    setPendingRepairs((prev) => prev.filter((r) => r.id !== repair.id))
  }

  const removeRepairFromCart = (repairId) => {
    const removed = repairsInCart.find((r) => r.repair_id === repairId)
    setRepairsInCart((prev) => prev.filter((r) => r.repair_id !== repairId))
    if (removed) fetchPendingRepairs()
  }

  const openNewRepairForm = (ecranRow) => {
    setNewRepairEcran(ecranRow)
    setNewRepairClientData({ nom: '', tel: '', email: '', imei: '' })
    setShowNewRepairForm(true)
    setCartSearch('')
  }

  const confirmAddNewRepairToCart = () => {
    if (!newRepairClientData.nom.trim()) {
      alert('Le nom du client est obligatoire')
      return
    }
    const qualiteLabel =
      newRepairEcran.qualite === 'compatible' ? 'Compatible'
      : newRepairEcran.qualite === 'original_equivalent' ? 'Qualité originale'
      : '100% Original'
    setNewRepairsInCart((prev) => [...prev, {
      key: `${newRepairEcran.id}-${Date.now()}`,
      ecran_id: newRepairEcran.id,
      modele: newRepairEcran.modele,
      qualite: newRepairEcran.qualite,
      qualiteLabel,
      unit_price: Number(newRepairEcran.prix_defaut) || 0,
      clientNom: newRepairClientData.nom.trim(),
      tel: newRepairClientData.tel.trim() || null,
      email: newRepairClientData.email.trim() || null,
      imei: newRepairClientData.imei.trim() || null,
    }])
    setShowNewRepairForm(false)
    setNewRepairEcran(null)
  }

  const removeNewRepairFromCart = (key) => {
    setNewRepairsInCart((prev) => prev.filter((r) => r.key !== key))
  }

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.reference?.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode?.includes(search)
    const matchCat = !filterCategory ||
      item.category_id === filterCategory
    return matchSearch && matchCat
  })

  const lowStockItems = items.filter(
    i => i.quantity <= i.quantity_alert
  )

  // Stats par catégorie
  const stats = {
    total: items.length,
    lowStock: lowStockItems.length,
    categories: categories.length,
    valeur: items.reduce(
      (s, i) => s + (i.quantity * (i.purchase_price || 0)), 0
    ),
  }

  const openItemModal = (item = null) => {
    setEditItem(item)
    setItemForm(item ? {
      name: item.name || '',
      reference: item.reference || '',
      barcode: item.barcode || '',
      category_id: item.category_id || '',
      sous_categorie: item.sous_categorie || '',
      quantity: item.quantity || 0,
      quantity_alert: item.quantity_alert || 3,
      purchase_price: item.purchase_price || 0,
      sale_price: item.sale_price || 0,
      price_min: item.price_min || 0,
      price_max: item.price_max || 0,
      description: item.description || '',
      image_url: item.image_url || '',
      fournisseur_id: item.fournisseur_id || '',
      sans_stock: !!item.sans_stock,
      tva_rate: item.tva_rate ?? 21,
    } : {
      name: '', reference: '', barcode: '',
      category_id: categories[0]?.id || '', sous_categorie: '',
      quantity: 0, quantity_alert: 3,
      purchase_price: 0, sale_price: 0,
      price_min: 0, price_max: 0,
      description: '',
      image_url: '', fournisseur_id: '',
      sans_stock: false,
      tva_rate: 21,
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.name) {
      alert('Nom obligatoire'); return
    }
    const finalBarcode = itemForm.barcode?.trim() || generateBarcode()
    const categoryName = itemForm.sous_categorie?.trim()
      || categories.find(c => c.id === itemForm.category_id)?.name
      || ''

    const catalogueParts = {
      name: itemForm.name,
      reference: itemForm.reference || null,
      category_id: itemForm.category_id || null,
      sous_categorie: categoryName,
      image_url: itemForm.image_url || null,
      fournisseur_id: itemForm.fournisseur_id || null,
      description: itemForm.description || null,
      tva_rate: Number(itemForm.tva_rate) || 21,
    }

    const stockParts = {
      quantity: itemForm.sans_stock ? 0 : (itemForm.quantity || 0),
      quantity_alert: itemForm.sans_stock ? 0 : (itemForm.quantity_alert || 0),
      purchase_price: itemForm.purchase_price || null,
      sale_price: itemForm.sale_price || 0,
      price_min: itemForm.price_min || 0,
      price_max: itemForm.price_max || 0,
      barcode: finalBarcode,
      sans_stock: itemForm.sans_stock,
    }

    if (editItem) {
      const { error: catErr } = await supabase.from('produits_catalogue')
        .update(catalogueParts).eq('id', editItem.produit_id)
      if (catErr) { alert('Erreur catalogue : ' + catErr.message); return }

      const { error: stockErr } = await supabase.from('produits_stock_magasin')
        .update(stockParts).eq('id', editItem.id)
      if (stockErr) { alert('Erreur stock : ' + stockErr.message); return }
    } else {
      const { data: newProduit, error: catErr } = await supabase
        .from('produits_catalogue').insert(catalogueParts).select().single()
      if (catErr) { alert('Erreur catalogue : ' + catErr.message); return }

      const { error: stockErr } = await supabase.from('produits_stock_magasin')
        .insert({ ...stockParts, produit_id: newProduit.id, magasin_id: magasin })
      if (stockErr) { alert('Erreur stock : ' + stockErr.message); return }
    }

    setShowItemModal(false)
    fetchItems()
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Supprimer cet article de ce magasin ?')) return
    await supabase.from('produits_stock_magasin').delete().eq('id', id)
    fetchItems()
  }

  const openCatModal = (cat = null) => {
    setEditCat(cat)
    setCatForm(cat ? {
      name: cat.name, color: cat.color
    } : { name: '', color: 'blue' })
    setShowCatModal(true)
  }

  const handleSaveCat = async () => {
    if (!catForm.name) {
      alert('Nom obligatoire'); return
    }
    const payload = { ...catForm, color: 'gray', magasin_id: magasin }
    if (editCat) {
      await supabase.from('shop_categories')
        .update(payload).eq('id', editCat.id)
    } else {
      await supabase.from('shop_categories').insert(payload)
    }
    setShowCatModal(false)
    fetchCategories()
    fetchItems()
  }

  const handleDeleteCat = async (id) => {
    if (!window.confirm(
      'Supprimer cette catégorie ? Les articles ne seront pas supprimés.'
    )) return
    await supabase.from('shop_categories').delete().eq('id', id)
    fetchCategories()
  }

  // Scan code-barres : quand l'utilisateur tape dans search
  // et que la valeur ressemble à un code-barres (>8 chiffres)
  // → cherche automatiquement
  const handleSearch = (val) => {
    setSearch(val)
  }

  const cartSearchArticles = cartSearch.length >= 2
    ? items.filter(i =>
        i.name?.toLowerCase().includes(cartSearch.toLowerCase()) ||
        i.reference?.toLowerCase().includes(cartSearch.toLowerCase()) ||
        i.barcode?.includes(cartSearch)
      ).slice(0, 5).map(i => ({ ...i, _kind: 'article' }))
    : []

  const cartSearchEcrans = cartSearch.length >= 2
    ? ecranCatalogList.filter(e =>
        e.disponible !== false && (
          e.modele?.toLowerCase().includes(cartSearch.toLowerCase()) ||
          e.gamme?.toLowerCase().includes(cartSearch.toLowerCase()) ||
          e.marque?.toLowerCase().includes(cartSearch.toLowerCase())
        )
      ).slice(0, 6).map(e => ({ ...e, _kind: 'ecran' }))
    : []

  const cartSearchResults = [...cartSearchArticles, ...cartSearchEcrans]

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id)
      if (existing) {
        return prev.map(c => c.item_id === item.id
          ? { ...c, quantity: c.quantity + 1 }
          : c)
      }
      return [...prev, {
        item_id: item.id,
        item_name: item.name,
        quantity: 1,
        unit_price: item.sale_price || 0,
        discount: 0,
        discountType: null,
      }]
    })
    setCartSearch('')
  }

  const applyItemDiscount = (itemId, type, value) => {
    setCart(prev => prev.map(c => {
      if (c.item_id !== itemId) return c
      if (type === 'article_offert') {
        return { ...c, discountType: 'article_offert', discount: c.unit_price * c.quantity }
      }
      return { ...c, discountType: type, discount: Number(value) || 0 }
    }))
    setDiscountMenuItemId(null)
  }

  const removeItemDiscount = (itemId) => {
    setCart(prev => prev.map(c =>
      c.item_id === itemId ? { ...c, discountType: null, discount: 0 } : c
    ))
    setDiscountMenuItemId(null)
  }

  const lineTotal = (c) => {
    const base = c.unit_price * c.quantity
    if (c.discountType === 'article_offert') return 0
    if (c.discountType === 'remise_pct') return base * (1 - (c.discount / 100))
    if (c.discountType === 'remise_montant' || c.discountType === 'rabais')
      return Math.max(0, base - c.discount)
    return base
  }

  const updateCartQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.item_id !== itemId) return c
      const newQty = Math.max(1, Math.min(99, c.quantity + delta))
      return { ...c, quantity: newQty }
    }))
  }

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId))
  }

  const updateCartPrice = (itemId, newPrice) => {
    setCart(prev => prev.map(c =>
      c.item_id === itemId
        ? { ...c, unit_price: Number(newPrice) || 0 }
        : c
    ))
  }

  const cartArticlesSubtotal = cart.reduce((sum, c) => sum + lineTotal(c), 0)
  const repairsSubtotal = repairsInCart.reduce((sum, r) => sum + Number(r.unit_price || 0), 0)
  const newRepairsSubtotal = newRepairsInCart.reduce((sum, r) => sum + Number(r.unit_price || 0), 0)
  const cartSubtotal = cartArticlesSubtotal + repairsSubtotal + newRepairsSubtotal
  const globalDiscountAmount = globalDiscountValue
    ? cartArticlesSubtotal * (Number(globalDiscountValue) / 100)
    : 0
  const cartTotal = Math.max(0, cartSubtotal - globalDiscountAmount)

  const amountPaidSoFar = paymentSplits.reduce((s, p) => s + p.amount, 0)
  const remainingToPay = Math.max(0, cartTotal - amountPaidSoFar)
  const changeToGive = Math.max(0, amountPaidSoFar - cartTotal)
  const isFullyPaid = amountPaidSoFar >= cartTotal && cartTotal > 0

  const addPaymentSplit = () => {
    const amt = Number(currentPaymentAmount)
    if (!amt || amt <= 0) {
      alert('Montant invalide')
      return
    }
    setPaymentSplits(prev => [...prev, {
      method: currentPaymentMethod,
      amount: amt,
    }])
    setCurrentPaymentAmount('')
  }

  const removePaymentSplit = (idx) => {
    setPaymentSplits(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCheckout = async () => {
    if ((cart.length === 0 && repairsInCart.length === 0 && newRepairsInCart.length === 0) || !isFullyPaid) return
    setCheckoutLoading(true)

    const currentSebUser = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )
    const staffName = currentSebUser?.name || 'Staff'
    const staffId = currentSebUser?.role === 'employe'
      ? currentSebUser?.id
      : null

    const cashRaw = paymentSplits
      .filter(p => p.method === 'cash')
      .reduce((s, p) => s + p.amount, 0)
    const bancontactAmount = paymentSplits
      .filter(p => p.method === 'bancontact')
      .reduce((s, p) => s + p.amount, 0)
    const virementAmount = paymentSplits
      .filter(p => p.method === 'virement')
      .reduce((s, p) => s + p.amount, 0)

    const currentChange = changeToGive
    const cashNet = Math.max(0, cashRaw - currentChange)

    const { count: ticketNumber } = await supabase
      .from('shop_sales')
      .select('*', { count: 'exact', head: true })
      .eq('magasin_id', magasin)

    const { data: sale, error: saleErr } = await supabase
      .from('shop_sales')
      .insert({
        magasin_id: magasin,
        staff_id: staffId,
        staff_name: staffName,
        total_amount: cartTotal,
        payment_method: paymentSplits.length > 1 ? 'mixed' : paymentSplits[0]?.method || 'cash',
        cash_amount: cashNet,
        bancontact_amount: bancontactAmount,
        virement_amount: virementAmount,
        change_amount: currentChange,
        change_confirmed: currentChange > 0 ? false : true,
        global_discount: globalDiscountAmount,
      })
      .select()
      .single()

    if (saleErr) {
      alert('Erreur : ' + saleErr.message)
      setCheckoutLoading(false)
      return
    }

    const { data: itemDetailsRaw } = await supabase
      .from('produits_stock_magasin')
      .select('id, produits_catalogue(sous_categorie, tva_rate, shop_categories(name))')
      .in('id', cart.map((c) => c.item_id).filter(Boolean))

    const itemDetails = (itemDetailsRaw || []).map((d) => ({
      id: d.id,
      sous_categorie: d.produits_catalogue?.sous_categorie,
      tva_rate: d.produits_catalogue?.tva_rate,
      shop_categories: d.produits_catalogue?.shop_categories,
    }))

    const saleItems = cart.map((c) => {
      const detail = itemDetails?.find((d) => d.id === c.item_id)
      return {
        sale_id: sale.id,
        item_id: c.item_id,
        item_name: c.item_name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        total_price: lineTotal(c),
        discount_type: c.discountType || null,
        discount_value: c.discount || 0,
        tva_rate: detail?.tva_rate ?? 21,
      }
    })

    const repairSaleItems = repairsInCart.map((r) => ({
      sale_id: sale.id,
      item_id: null,
      item_name: `Réparation ${r.bon_number} — ${r.client_nom}`,
      quantity: 1,
      unit_price: r.unit_price,
      total_price: r.unit_price,
      discount_type: null,
      discount_value: 0,
      tva_rate: 21,
      line_type: 'reparation',
      repair_id: r.repair_id,
    }))

    await supabase.from('shop_sale_items').insert([...saleItems, ...repairSaleItems])

    // Mise à jour du montant_paye de chaque réparation encaissée
    for (const r of repairsInCart) {
      const { data: rep } = await supabase.from('repairs')
        .select('montant_paye').eq('id', r.repair_id).single()
      const nouveauMontant = (Number(rep?.montant_paye) || 0) + r.unit_price
      await supabase.from('repairs')
        .update({ montant_paye: nouveauMontant })
        .eq('id', r.repair_id)
      await logActivity('repair_payment_completed',
        `Solde réparation encaissé — ${r.bon_number} (${r.unit_price.toFixed(2)}€)`)
    }

    // Création automatique des nouvelles réparations depuis le catalogue écrans
    let createdRepairInfos = []
    if (newRepairsInCart.length > 0) {
      const { count: initialRepairCount } = await supabase
        .from('repairs').select('*', { count: 'exact', head: true }).eq('magasin_id', magasin)
      const { count: initialClientCount } = await supabase
        .from('clients').select('*', { count: 'exact', head: true }).eq('magasin_id', magasin)

      let repairCounter = initialRepairCount || 0
      let clientCounter = initialClientCount || 0
      const todayStr = new Date().toISOString().slice(0, 10)
      const newRepairSaleItems = []

      for (const r of newRepairsInCart) {
        repairCounter += 1
        clientCounter += 1
        const bonNumber = 'BON-' + String(repairCounter).padStart(4, '0')
        const clientNumber = 'CL-' + String(clientCounter).padStart(4, '0')

        const { data: newRepair, error: repairErr } = await supabase.from('repairs').insert({
          bon_number: bonNumber,
          client_nom: r.clientNom,
          client_number: clientNumber,
          magasin_id: magasin,
          date: todayStr,
          appareil: r.modele,
          imei: r.imei,
          type_panne: 'Écran cassé',
          ecran_modele: r.modele,
          ecran_qualite: r.qualite,
          prix: r.unit_price,
          montant_paye: r.unit_price,
          devis: false,
          tel: r.tel,
          email: r.email,
          status: 'termine',
          date_recuperation: todayStr,
        }).select().single()

        if (!repairErr && newRepair) {
          createdRepairInfos.push({
            bonNumber: newRepair.bon_number,
            clientNom: newRepair.client_nom,
            appareil: newRepair.appareil,
            imei: newRepair.imei,
            typePanne: `Écran cassé — ${r.qualiteLabel}`,
          })
          newRepairSaleItems.push({
            sale_id: sale.id,
            item_id: null,
            item_name: `Réparation écran — ${r.modele} (${r.qualiteLabel})`,
            quantity: 1,
            unit_price: r.unit_price,
            total_price: r.unit_price,
            discount_type: null,
            discount_value: 0,
            tva_rate: 21,
            line_type: 'reparation',
            repair_id: newRepair.id,
          })
          await logActivity('repair_created_from_caisse',
            `Réparation créée depuis la caisse — ${r.modele} (${r.qualiteLabel}) pour ${r.clientNom}`)
        }
      }

      if (newRepairSaleItems.length > 0) {
        await supabase.from('shop_sale_items').insert(newRepairSaleItems)
      }
    }

    if (staffId) {
      const { data: rules } = await supabase
        .from('commission_rules')
        .select('*')
        .eq('active', true)

      const findRule = (catName, sousCat) => {
        if (!rules || !catName) return null
        // priorité à une règle qui cible précisément la sous-catégorie
        const specific = rules.find((r) =>
          r.category_name === catName && r.sous_categorie && r.sous_categorie === sousCat)
        if (specific) return specific
        // sinon règle générale sur toute la catégorie (sous_categorie null)
        return rules.find((r) => r.category_name === catName && !r.sous_categorie) || null
      }

      const commissionRows = cart
        .map((c) => {
          const item = itemDetails?.find((it) => it.id === c.item_id)
          const catName = item?.shop_categories?.name
          const sousCat = item?.sous_categorie
          const rule = findRule(catName, sousCat)
          if (!rule) return null
          const base = lineTotal(c)
          return {
            staff_id: staffId,
            sale_id: sale.id,
            item_name: c.item_name,
            category: catName,
            base_amount: base,
            rate: rule.rate,
            commission_amount: Math.round(base * (rule.rate / 100) * 100) / 100,
          }
        })
        .filter(Boolean)

      if (commissionRows.length > 0) {
        await supabase.from('staff_commissions').insert(commissionRows)
      }
    }

    const saleWithTicket = {
      ...sale,
      items: [
        ...cart,
        ...repairsInCart.map((r) => ({
          item_id: null,
          item_name: `Réparation ${r.bon_number} — ${r.client_nom}`,
          quantity: 1,
          unit_price: r.unit_price,
          discount: 0,
          discountType: null,
        })),
        ...newRepairsInCart.map((r) => ({
          item_id: null,
          item_name: `Réparation écran — ${r.modele} (${r.qualiteLabel})`,
          quantity: 1,
          unit_price: r.unit_price,
          discount: 0,
          discountType: null,
        })),
      ],
      ticketNumber: (ticketNumber || 0) + 1,
      changeToGive: currentChange,
      paymentsUsed: paymentSplits.map((p) => ({ type: p.method, amount: p.amount })),
      staffName: staffName,
      repairInfoList: createdRepairInfos,
    }

    setCart([])
    setRepairsInCart([])
    setNewRepairsInCart([])
    setPaymentSplits([])
    setCurrentPaymentAmount('')
    setGlobalDiscountValue('')
    fetchItems()
    fetchCaisseToday()
    fetchPendingRepairs()
    setCheckoutLoading(false)

    if (currentChange > 0) {
      setPendingSaleData(saleWithTicket)
      setShowChangeConfirm(true)
    } else {
      setLastSale(saleWithTicket)
      setShowTicket(true)
    }
  }

  const confirmChangeGiven = async () => {
    if (pendingSaleData) {
      await supabase
        .from('shop_sales')
        .update({ change_confirmed: true })
        .eq('id', pendingSaleData.id)
    }
    setShowChangeConfirm(false)
    setLastSale(pendingSaleData)
    setShowTicket(true)
    setPendingSaleData(null)
  }

  const handlePrintDailyRecap = () => {
    const today = new Date().toLocaleDateString('fr-BE')
    const magasinLabel = MAGASINS_LIST.find(m => m.id === magasin)?.nom || magasin
    const recapWindow = window.open('', '_blank')
    recapWindow.document.write(`
      <html>
      <head><title>Récapitulatif caisse ${today}</title>
      <style>
        body { font-family: monospace; padding: 20px; max-width: 400px; }
        h2 { text-align: center; }
        .line { display: flex; justify-content: space-between;
                padding: 4px 0; border-bottom: 1px dashed #ccc; }
        .total { font-weight: bold; font-size: 18px; margin-top: 12px; }
      </style>
      </head>
      <body>
        <h2>SebPhone — Récapitulatif du ${today}</h2>
        <p>Magasin : ${magasinLabel}</p>
        <div class="line"><span>Cash</span><span>${(caisseTotals?.cash || 0).toFixed(2)}€</span></div>
        <div class="line"><span>Bancontact</span><span>${(caisseTotals?.bancontact || 0).toFixed(2)}€</span></div>
        <div class="line"><span>Virement</span><span>${(caisseTotals?.virement || 0).toFixed(2)}€</span></div>
        <div class="line total"><span>TOTAL</span><span>${(caisseTotals?.total || 0).toFixed(2)}€</span></div>
        <p style="margin-top:20px; font-size:12px;">
          ${salesToday?.length || 0} vente(s) aujourd'hui
        </p>
      </body>
      </html>
    `)
    recapWindow.document.close()
    recapWindow.print()
  }

  const handleAddMovement = async () => {
    if (!movementAmount || Number(movementAmount) <= 0) {
      alert('Montant invalide')
      return
    }
    if (!movementReason.trim()) {
      alert('Indique une raison')
      return
    }
    const staffName = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )?.nom || 'Staff'

    await supabase.from('cash_movements').insert({
      magasin_id: magasin,
      type: movementType,
      amount: Number(movementAmount),
      reason: movementReason.trim(),
      payment_method: movementPayment,
      staff_name: staffName,
    })

    setShowMovementModal(false)
    setMovementAmount('')
    setMovementReason('')
    setMovementType('depot')
    fetchMovementsSince(lastClosure?.period_end || '1970-01-01T00:00:00Z')
  }

  const openClosureModal = async () => {
    const periodStart = lastClosure?.period_end || '1970-01-01T00:00:00Z'
    const periodEnd = new Date().toISOString()

    const { data: sales } = await supabase
      .from('shop_sales')
      .select('*, shop_sale_items(*, shop_items(category_id, shop_categories(name)))')
      .eq('magasin_id', magasin)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const salesList = sales || []
    const caTotal = salesList.reduce((s, v) => s + Number(v.total_amount || 0), 0)
    const ticketCount = salesList.length
    const ticketMoyen = ticketCount > 0 ? caTotal / ticketCount : 0

    const cashTotal = salesList.reduce((s, v) => s + Number(v.cash_amount || 0), 0)
    const bancontactTotal = salesList.reduce((s, v) => s + Number(v.bancontact_amount || 0), 0)
    const virementTotal = salesList.reduce((s, v) => s + Number(v.virement_amount || 0), 0)

    const categoryTotals = {}
    salesList.forEach((sale) => {
      (sale.shop_sale_items || []).forEach((item) => {
        const catName = item.shop_items?.shop_categories?.name || 'Autre'
        categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(item.total_price || 0)
      })
    })

    // Ventes normales (avec items détaillés, y compris remboursements négatifs)
    const parTaux = {}
    salesList.forEach((sale) => {
      (sale.shop_sale_items || []).forEach((item) => {
        const rate = Number(item.tva_rate ?? 21)
        parTaux[rate] = (parTaux[rate] || 0) + Number(item.total_price || 0)
      })
    })

    // Acomptes / autres ventes sans items détaillés (fallback 21%)
    const salesSansItems = salesList.filter((s) => !s.shop_sale_items || s.shop_sale_items.length === 0)
    const totalSansItems = salesSansItems.reduce((s, v) => s + Number(v.total_amount || 0), 0)
    if (totalSansItems !== 0) {
      parTaux[21] = (parTaux[21] || 0) + totalSansItems
    }

    const movs = await fetchMovementsSince(periodStart)
    const depotsTotal = movs
      .filter((m) => m.type === 'depot')
      .reduce((s, m) => s + Number(m.amount), 0)
    const retraitsTotal = movs
      .filter((m) => m.type === 'retrait')
      .reduce((s, m) => s + Number(m.amount), 0)

    const totalCaisseCash = cashTotal + depotsTotal - retraitsTotal
    const totalCompte = bancontactTotal + virementTotal

    const codes = ['A', 'B', 'C', 'D', 'E']
    const tvaRows = Object.entries(parTaux)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([rate, total], idx) => {
        const rateNum = Number(rate)
        const base = rateNum > 0 ? total / (1 + rateNum / 100) : total
        const tva = total - base
        return { code: codes[idx] || '?', rate: rateNum, base, tva, total }
      })

    const tvaBase21 = tvaRows.reduce((s, r) => s + r.base, 0)
    const tvaMontant21 = tvaRows.reduce((s, r) => s + r.tva, 0)

    const reglementsArr = [
      ...(bancontactTotal > 0 ? [{ method: 'BANCONTACT', montant: bancontactTotal }] : []),
      ...(cashTotal > 0 ? [{ method: 'CASH', montant: cashTotal }] : []),
      ...(virementTotal > 0 ? [{ method: 'VIREMENT', montant: virementTotal }] : []),
    ]

    const categoriesArr = Object.entries(categoryTotals).map(([name, montant]) => ({
      name: name.toUpperCase(),
      montant,
      count: 1,
    }))

    const retraitsArr = movs
      .filter((m) => m.type === 'retrait')
      .map((m) => ({
        note: m.reason?.toUpperCase() || '',
        montant: m.amount,
        method: (m.payment_method || 'cash').toUpperCase(),
      }))

    setClosureData({
      periodStart, periodEnd, caTotal, ticketCount, ticketMoyen,
      cashTotal, bancontactTotal, virementTotal, categoryTotals,
      tvaBase21, tvaMontant21, movements: movs,
      depotsTotal, retraitsTotal, totalCaisseCash, totalCompte,
      tvaRows, reglementsArr, categoriesArr, retraitsArr,
    })
    setPrelevementAmount('')
    setCheckedTaches({})
    fetchClotureTaches()
    setShowClosureModal(true)
  }

  const confirmClosure = async () => {
    if (!closureData) return
    setClosureLoading(true)
    const currentSebUser = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )
    const staffName = currentSebUser?.name || 'Staff'
    const prelevementFinal = Number(prelevementAmount) || 0

    const { data: newClosure, error: closureErr } = await supabase
      .from('cash_closures')
      .insert({
        magasin_id: magasin,
        period_start: closureData.periodStart,
        period_end: closureData.periodEnd,
        ca_total: closureData.caTotal,
        ticket_count: closureData.ticketCount,
        cash_total: closureData.cashTotal,
        bancontact_total: closureData.bancontactTotal,
        virement_total: closureData.virementTotal,
        depots_total: closureData.depotsTotal,
        retraits_total: closureData.retraitsTotal,
        prelevement: prelevementFinal,
        staff_name: staffName,
        detail_snapshot: {
          ticketMoyen: closureData.ticketMoyen,
          tvaBase21: closureData.tvaBase21,
          tvaMontant21: closureData.tvaMontant21,
          totalCaisseCash: closureData.totalCaisseCash,
          totalCompte: closureData.totalCompte,
          tvaRows: closureData.tvaRows,
          reglementsArr: closureData.reglementsArr,
          categoriesArr: closureData.categoriesArr,
          retraitsArr: closureData.retraitsArr,
        },
      })
      .select()
      .single()

    if (closureErr) {
      if (closureErr.code === '23505') {
        alert('Caisse déjà clôturée aujourd\'hui pour ce magasin. Une seule clôture par jour est autorisée.')
        await fetchTodaysClosure()
      } else {
        alert('Erreur : ' + closureErr.message)
      }
      setClosureLoading(false)
      return
    }

    const magasinLabel = MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin
    const holderDefaut = `Magasin — ${magasinLabel}`
    const dateLabel = new Date(closureData.periodEnd).toLocaleDateString('fr-BE')
    const treasoRows = []
    if (prelevementFinal > 0) {
      treasoRows.push({
        type: 'entree', source: 'cloture', payment_method: 'cash',
        magasin_id: magasin, holder: holderDefaut, amount: prelevementFinal,
        reference_id: newClosure.id,
        description: `Clôture caisse (cash) — ${dateLabel}`,
        created_by: staffName,
      })
    }
    if (closureData.bancontactTotal > 0) {
      treasoRows.push({
        type: 'entree', source: 'cloture', payment_method: 'bancontact',
        magasin_id: magasin, holder: holderDefaut, amount: closureData.bancontactTotal,
        reference_id: newClosure.id,
        description: `Clôture caisse (bancontact) — ${dateLabel}`,
        created_by: staffName,
      })
    }
    if (closureData.virementTotal > 0) {
      treasoRows.push({
        type: 'entree', source: 'cloture', payment_method: 'virement',
        magasin_id: magasin, holder: holderDefaut, amount: closureData.virementTotal,
        reference_id: newClosure.id,
        description: `Clôture caisse (virement) — ${dateLabel}`,
        created_by: staffName,
      })
    }
    if (treasoRows.length === 0) {
      treasoRows.push({
        type: 'entree', source: 'cloture', payment_method: 'cash',
        magasin_id: magasin, holder: holderDefaut, amount: 0,
        reference_id: newClosure.id,
        description: `Clôture caisse (aucun encaissement) — ${dateLabel}`,
        created_by: staffName,
      })
    }
    if (treasoRows.length > 0) {
      await supabase.from('tresorerie_mouvements').insert(treasoRows)
    }

    setShowClosureModal(false)
    setClosureData(null)
    setClosureLoading(false)
    fetchLastClosure()
    fetchTodaysClosure()
    fetchCaisseToday()
    fetchMagasinsAvecHistorique()
  }

  const printViaAgent = async (ticketData, fallbackPrint) => {
    try {
      const res = await fetch('http://localhost:4000/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })
      if (!res.ok) throw new Error('Échec impression agent')
    } catch (err) {
      console.warn('Agent d\'impression indisponible, repli navigateur:', err)
      if (fallbackPrint) fallbackPrint()
      else window.print()
    }
  }

  const printClosureViaAgent = async (data, fallbackPrint) => {
    try {
      const res = await fetch('http://localhost:4000/print-closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Échec impression agent')
    } catch (err) {
      console.warn('Agent d\'impression indisponible, repli navigateur:', err)
      if (fallbackPrint) fallbackPrint()
      else window.print()
    }
  }

  const handlePrintClosure = () => {
    if (!closureData) return
    if (canClotureLimitee && !isAdmin) {
      alert('Clôture limitée : impression du ticket désactivée pour votre profil. La clôture a bien été enregistrée en base.')
      return
    }
    printClosureViaAgent({
      reportNumber: (lastClosure ? 1 : 0) + 1,
      companyName: 'SLT GROUP (SRL)',
      tva: 'BE1028.764.677',
      caisse: magasin,
      dateTime: new Date(closureData.periodEnd).toLocaleString('fr-BE'),
      periodStart: new Date(closureData.periodStart).toLocaleString('fr-BE'),
      periodEnd: new Date(closureData.periodEnd).toLocaleString('fr-BE'),
      ventes: { montant: closureData.caTotal, count: closureData.ticketCount },
      retours: { montant: 0, count: 0 },
      caTotal: closureData.caTotal,
      tvaRows: closureData.tvaRows,
      reglements: closureData.reglementsArr,
      categories: closureData.categoriesArr,
      retraits: closureData.retraitsArr,
      totalCashEnCaisse: closureData.totalCaisseCash,
      totalCompte: Number(prelevementAmount) || closureData.totalCaisseCash,
    }, () => window.print())
  }

  const sep = (char = '-') => (
    <div style={{
      margin: '4px 0', color: '#9CA3AF', width: '100%',
      overflow: 'hidden', whiteSpace: 'nowrap', letterSpacing: 0,
    }}>
      {char.repeat(60)}
    </div>
  )

  if (!isAdmin && !hasPermission) {
    return (
      <div className="p-8 text-center text-gray-400">
        Accès non autorisé
      </div>
    )
  }

  return (
    <div className={
      posScreen === 'caisse'
        ? 'p-2 max-w-none mx-auto relative bg-[#EDF0F4] -m-4 lg:-m-6 p-4'
        : posScreen === 'gestion'
          ? 'p-2 max-w-none mx-auto relative'
          : 'p-4 md:p-8 max-w-7xl mx-auto relative'
    }>

      {!caisseSession && magasin && (
        <div className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40 flex items-center justify-center p-4">
          <CaissePinLock
            magasin={magasin}
            magasinLabel={MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin}
            onUnlock={handleUnlock}
          />
        </div>
      )}

      {tachesDuJour.length > 0 && (
        <div className="sticky top-0 z-40 -mx-2 md:-mx-8 mb-4 bg-red-600 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-lg flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">
              ⚠️ {tachesDuJour.length} tâche{tachesDuJour.length > 1 ? 's' : ''} à faire aujourd'hui :
            </span>
            <span className="text-sm opacity-90">
              {tachesDuJour.map((t) => t.titre).join(', ')}
            </span>
          </div>
          <button onClick={() => setShowTacheReminder(true)}
            className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
            Voir / Cocher
          </button>
        </div>
      )}


      {/* Header (accueil uniquement) */}
      {posScreen === 'accueil' && (
        <div className="flex items-center justify-between mb-6
                        flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap items-center">
            {isAdmin && (
              <select value={magasin}
                onChange={e => setMagasin(e.target.value)}
                className="px-3 py-2 border border-gray-200
                           rounded-xl text-sm">
                {MAGASINS_LIST.filter(m => !m.virtuel).map(m => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            )}
            {isAdmin && (
              <button onClick={() => { setShowTachesAdmin(true); fetchAllTaches() }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-[#1B2A4A]">
                ⚙️ Tâches récurrentes
              </button>
            )}
            {/* MASQUÉ TEMPORAIREMENT - Nom magasin en lecture seule pour non-admins */}
            {false && !isAdmin && (
              <span className="px-3 py-2 text-sm text-gray-500 font-medium">
                {MAGASINS_LIST.find(m => m.id === magasin)?.nom || magasin}
              </span>
            )}
            {/* MASQUÉ TEMPORAIREMENT - bouton Ajouter un article (déplacé dans la vue Catégorie) */}
            {false && (
              <button onClick={() => openItemModal()}
                className="flex items-center gap-2 bg-[#1B2A4A]
                           text-white px-4 py-2 rounded-xl
                           text-sm font-bold hover:bg-[#00B4CC]">
                <Plus size={16}/> Ajouter un article
              </button>
            )}
            {/* Horloge live + badge session + bouton changer d'utilisateur */}
            <span className="text-sm text-gray-500 font-mono">{clockNow}</span>
            {caisseSession && (
              <>
                <span className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs font-bold text-[#00B4CC]">
                  👤 {(caisseSession.staffName || '').split(' ')[0]}
                  <span className="text-gray-500 font-normal">· {caisseSession.arrivalDisplay}</span>
                </span>
                <button onClick={handleChangeUser}
                  title="Changer d'utilisateur"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-red-300 hover:text-red-500">
                  <LogOut size={14} /> Changer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          // MASQUÉ TEMPORAIREMENT - Total articles
          false && { label: 'Total articles', value: stats.total },
          // MASQUÉ TEMPORAIREMENT - Catégories
          false && { label: 'Catégories', value: stats.categories },
          // MASQUÉ TEMPORAIREMENT - Stock bas
          false && {
            label: 'Stock bas',
            value: stats.lowStock,
            warn: stats.lowStock > 0
          },
          // MASQUÉ TEMPORAIREMENT - Valeur stock
          false && {
            label: 'Valeur stock',
            value: `${Math.round(stats.valeur)}€`
          },
        ].filter(Boolean).map(s => (
          <div key={s.label}
            className={`rounded-2xl p-4 text-center
              ${s.warn
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-gray-50'}`}>
            <p className={`text-xs uppercase font-bold mb-1
              ${s.warn ? 'text-amber-700' : 'text-gray-500'}`}>
              {s.label}
            </p>
            <p className={`text-2xl font-bold
              ${s.warn ? 'text-amber-700' : 'text-[#1B2A4A]'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* MASQUÉ TEMPORAIREMENT - Alertes stock bas */}
      {false && lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200
                        rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600"/>
            <p className="font-bold text-amber-800 text-sm">
              Articles en stock bas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => (
              <span key={item.id}
                className="text-xs bg-amber-100 text-amber-800
                           px-2 py-1 rounded-lg">
                {item.name} ({item.quantity} restants)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ÉCRAN ACCUEIL */}
      {posScreen === 'accueil' && (
        <CaisseAccueil
          magasin={magasin}
          magasinLabel={MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin}
          caTotal={caisseTotals?.total || 0}
          ticketCount={salesToday?.length || 0}
          lastClosure={lastClosure}
          onOpenCaisse={() => setPosScreen('caisse')}
          onOpenGestion={() => { setPosScreen('gestion'); setActiveTab('stock') }}
          onOpenParametresCaisse={() => { setPosScreen('parametres'); fetchStaffCaisse() }}
          onOpenPointage={() => setPosScreen('pointage')}
          onOpenTresorerie={() => { setPosScreen('tresorerie'); fetchMouvements(); fetchFournisseursListTreso() }}
          onOpenReparationsHub={() => { setPosScreen('reparations-hub'); setSectionPrixDelais('recherche'); fetchReparationsHubData() }}
          onEditRefundFacture={(sale) => {
            setSelectedTicket(sale)
            setPosScreen('recherche-ticket')
          }}
          showParametresCaisseTile={canAccessParamsCaisse}
          showTresorerieTile={trueIsAdmin || canSeeTresorerie}
          showBenefice={trueIsAdmin}
          onAcompteRecorded={fetchCaisseToday}
        />
      )}

      {/* Tabs — visible uniquement dans l'écran Gestion */}
      {posScreen === 'gestion' && (
        <>
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
              <Boxes size={22} /> Gestion de stock
            </h1>
            <p className="text-sm text-gray-500 mt-1">Catégories & inventaire</p>
          </div>
          <div className="flex gap-2 mb-4">
            {[
              { key: 'stock', label: 'Stock' },
              { key: 'categories', label: 'Catégories' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold
                            transition-all
                  ${activeTab === tab.key
                    ? 'bg-[#1B2A4A] text-white'
                    : 'bg-white border border-gray-200 text-gray-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bouton retour pour Caisse */}
      {posScreen === 'caisse' && (
        <button onClick={() => setPosScreen('accueil')}
          className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-1.5">
          ← Retour à l'accueil
        </button>
      )}

      {/* ÉCRAN CLÔTURE */}
      {posScreen === 'cloture' && (
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">
              Résumé de la journée
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>💵 Cash</span><span>{caisseTotals.cash.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>💳 Bancontact</span><span>{caisseTotals.bancontact.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>🏦 Virement</span><span>{caisseTotals.virement.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold text-[#1B2A4A] border-t border-gray-200 pt-2 mt-2">
                <span>Total ({salesToday.length} vente{salesToday.length > 1 ? 's' : ''})</span>
                <span>{caisseTotals.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handlePrintDailyRecap}
              className="py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#1B2A4A]">
              Imprimer récap du jour
            </button>
            {todaysClosure ? (
              <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm mb-1">
                  🔒 Caisse déjà clôturée aujourd'hui
                </p>
                <p className="text-[#1B2A4A] font-bold">
                  Par {todaysClosure.staff_name || 'Admin'} à{' '}
                  {new Date(todaysClosure.period_end).toLocaleTimeString('fr-BE')}
                </p>
                <p className="text-[#00B4CC] font-bold text-lg mt-1">
                  CA {Number(todaysClosure.ca_total).toFixed(2)}€
                </p>
              </div>
            ) : !canCloseNow ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-amber-700 text-sm font-bold">
                  🕖 Clôture disponible à partir de 19h00
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Repasse après 19h pour clôturer la caisse.
                </p>
              </div>
            ) : (
              <button onClick={openClosureModal}
                className="py-3 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:opacity-90">
                Clôturer la caisse
              </button>
            )}
          </div>
          {lastClosure && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Dernière clôture : {new Date(lastClosure.period_end).toLocaleString('fr-BE')}
            </p>
          )}
        </div>
      )}

      {/* ÉCRAN PARAMÈTRES CAISSE */}
      {posScreen === 'parametres' && canAccessParamsCaisse && (
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#1B2A4A]">Paramètres caisse</h1>
            <p className="text-sm text-gray-500 mt-1">PIN, horaires et salaires</p>
          </div>

          <div className="flex gap-4">
            {/* Colonne gauche : liste employés */}
            <div className="w-[300px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              {loadingStaffCaisse ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : staffListCaisse.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Aucun employé actif</p>
              ) : (
                staffListCaisse.map((s) => {
                  const initials = s.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
                  const isSel = selectedStaffCaisse?.id === s.id
                  const magNom = MAGASINS_LIST.find((m) => m.id === s.magasin_id)?.nom || s.magasin_id
                  return (
                    <button key={s.id}
                      onClick={() => openStaffDetailCaisse(s)}
                      className={`w-full text-left p-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                        isSel ? 'bg-cyan-50 border-2 border-[#00B4CC]' : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}>
                      <div className="w-9 h-9 rounded-lg bg-[#1B2A4A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#1B2A4A] text-sm truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{magNom}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Colonne droite : détail employé */}
            <div className="flex-1 min-w-0">
              {!selectedStaffCaisse ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                  <Settings size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sélectionnez un employé pour configurer son PIN, ses horaires et son salaire</p>
                </div>
              ) : loadingDetailCaisse ? (
                <div className="flex items-center justify-center h-60">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">

                  {/* a) Identifiants */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <h3 className="font-bold text-[#1B2A4A] mb-3">Identifiants</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                          Code PIN (pointeuse)
                        </label>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                          value={editPinCaisse}
                          onChange={(e) => setEditPinCaisse(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono tracking-widest" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                          Salaire horaire (€)
                        </label>
                        <input type="number" step="0.5" min="0"
                          value={editWageCaisse}
                          onChange={(e) => setEditWageCaisse(e.target.value)}
                          placeholder="10"
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <button onClick={handleSavePinWageCaisse}
                      disabled={savingStaffCaisse}
                      className="mt-3 flex items-center gap-2 bg-[#00B4CC] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-600 disabled:opacity-50">
                      <Save size={14} /> {savingStaffCaisse ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>

                  {/* c) Aujourd'hui & ce mois */}
                  {renderPointageAndSalaire()}

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ÉCRAN POINTAGE PERSONNEL (vue employé) */}
      {posScreen === 'pointage' && (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
              <UserCheck size={22} /> Mon pointage
            </h1>
            {myStaffRecord && (
              <p className="text-sm text-gray-500 mt-1">
                Bonjour {(myStaffRecord.name || '').split(' ')[0]} 👋
              </p>
            )}
          </div>

          {loadingMyPointage ? (
            <div className="flex items-center justify-center h-60">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !myStaffRecord ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <p className="text-sm">Impossible de charger ta fiche. Reconnecte-toi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderPointageAndSalaire()}

              {/* Mon planning (lecture seule) */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Mon planning
                </h3>
                <StaffScheduleCalendar
                  staffId={myStaffRecord.id}
                  staffName={myStaffRecord.name}
                  staffPhone={myStaffRecord.telephone}
                  hourlyWage={myStaffRecord.hourly_wage || 0}
                  isAdmin={false}
                  readOnly={true}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#1B2A4A] flex items-center gap-2">
                    <Calendar size={16} /> Mes disponibilités
                  </h3>
                  <button onClick={() => setShowProposeDispo((v) => !v)}
                    className="text-xs font-bold text-[#00B4CC] hover:text-[#1B2A4A]">
                    {showProposeDispo ? 'Annuler' : '+ Proposer'}
                  </button>
                </div>

                {showProposeDispo && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => setDispoForm((f) => ({ ...f, type: 'hebdo' }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${dispoForm.type === 'hebdo' ? 'bg-[#1B2A4A] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        Toutes les semaines
                      </button>
                      <button onClick={() => setDispoForm((f) => ({ ...f, type: 'date' }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${dispoForm.type === 'date' ? 'bg-[#1B2A4A] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                        Une date précise
                      </button>
                    </div>

                    {dispoForm.type === 'hebdo' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map((j) => (
                          <button key={j} onClick={() => setDispoForm((f) => ({ ...f, jour_semaine: j }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${dispoForm.jour_semaine === j ? 'bg-[#00B4CC] text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                            {j.slice(0,3)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input type="date" value={dispoForm.date}
                        onChange={(e) => setDispoForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    )}

                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={dispoForm.repos}
                        onChange={(e) => setDispoForm((f) => ({ ...f, repos: e.target.checked }))} />
                      Repos (pas disponible)
                    </label>

                    {!dispoForm.repos && (
                      <div className="flex gap-2">
                        <input type="time" value={dispoForm.heure_debut}
                          onChange={(e) => setDispoForm((f) => ({ ...f, heure_debut: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        <input type="time" value={dispoForm.heure_fin}
                          onChange={(e) => setDispoForm((f) => ({ ...f, heure_fin: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    )}

                    <input type="text" placeholder="Note (optionnel)" value={dispoForm.motif}
                      onChange={(e) => setDispoForm((f) => ({ ...f, motif: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />

                    <button onClick={handleProposeDispo} disabled={savingDispo}
                      className="w-full py-2 bg-[#00B4CC] text-white rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                      {savingDispo ? 'Envoi...' : 'Envoyer la proposition'}
                    </button>
                  </div>
                )}

                {myDispoList.length > 0 && (
                  <div className="space-y-1.5">
                    {myDispoList.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-600">
                          {d.type === 'hebdo' ? `Tous les ${d.jour_semaine}` : new Date(d.date).toLocaleDateString('fr-BE')}
                          {' — '}{d.repos ? 'Repos' : `${d.heure_debut}-${d.heure_fin}`}
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          d.statut === 'accepte' ? 'bg-green-100 text-green-700'
                          : d.statut === 'refuse' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {d.statut === 'accepte' ? 'Acceptée' : d.statut === 'refuse' ? 'Refusée' : 'En attente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Heures supplémentaires */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                  <Clock size={16} /> Heures supplémentaires
                </h3>

                {myPendingHeuresSup.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {myPendingHeuresSup.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#1B2A4A]">
                            {new Date(h.date).toLocaleDateString('fr-BE')} — {h.duree_heures}h
                          </p>
                          {h.motif && <p className="text-[10px] text-gray-400 mt-0.5">{h.motif}</p>}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          h.statut === 'accepte' ? 'bg-emerald-100 text-emerald-700'
                          : h.statut === 'refuse' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>
                          {h.statut === 'accepte' ? 'Acceptée' : h.statut === 'refuse' ? 'Refusée' : 'En attente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!showDeclareHS ? (
                  <button onClick={() => setShowDeclareHS(true)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:border-[#00B4CC] hover:text-[#00B4CC]">
                    + Déclarer une heure sup
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Date</label>
                        <input type="date" value={declareHSForm.date}
                          onChange={(e) => setDeclareHSForm((f) => ({ ...f, date: e.target.value }))}
                          max={new Date().toISOString().slice(0, 10)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Durée (h)</label>
                        <input type="number" step="0.25" min="0" max="12" placeholder="ex: 2"
                          value={declareHSForm.duree_heures}
                          onChange={(e) => setDeclareHSForm((f) => ({ ...f, duree_heures: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Motif (optionnel)</label>
                      <input type="text" placeholder="ex: fermeture caisse tardive"
                        value={declareHSForm.motif}
                        onChange={(e) => setDeclareHSForm((f) => ({ ...f, motif: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleDeclareHeureSup} disabled={savingDeclareHS}
                        className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                        {savingDeclareHS ? 'Envoi...' : 'Envoyer la demande'}
                      </button>
                      <button onClick={() => setShowDeclareHS(false)}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Demander un remplacement */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                  <Send size={16} /> Demander un remplacement
                </h3>
                {!showReplacementForm ? (
                  <button onClick={() => setShowReplacementForm(true)}
                    className="bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                    + Nouvelle demande
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date concernée</label>
                      <input type="date" value={replacementForm.date}
                        onChange={(e) => setReplacementForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="rep-repos" checked={replacementForm.repos}
                        onChange={(e) => setReplacementForm((f) => ({ ...f, repos: e.target.checked }))}
                        className="w-4 h-4 accent-[#00B4CC]" />
                      <label htmlFor="rep-repos" className="text-sm text-gray-700">Jour de repos souhaité</label>
                    </div>
                    {!replacementForm.repos && (
                      <div className="flex items-center gap-2">
                        <input type="time" value={replacementForm.heure_debut}
                          onChange={(e) => setReplacementForm((f) => ({ ...f, heure_debut: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        <span className="text-gray-400">→</span>
                        <input type="time" value={replacementForm.heure_fin}
                          onChange={(e) => setReplacementForm((f) => ({ ...f, heure_fin: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Note (optionnel)</label>
                      <textarea rows={2} value={replacementForm.note}
                        onChange={(e) => setReplacementForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Raison, contrainte particulière..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSendReplacementRequest}
                        disabled={sendingReplacement}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                        <Send size={14} /> {sendingReplacement ? 'Envoi...' : '📱 Envoyer la demande (WhatsApp)'}
                      </button>
                      <button onClick={() => { setShowReplacementForm(false); setReplacementForm({ date: '', repos: false, heure_debut: '10:00', heure_fin: '20:00', note: '' }) }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-gray-400">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {trueIsAdmin && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                    <Settings size={16} /> Commissions (configuration admin)
                  </h3>

                  {/* Formulaire (inline) ou bouton d'ouverture */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    {!showRuleForm ? (
                      <button onClick={() => { setEditingRule(null); setRuleForm({ category_name: '', sous_categorie: '', rate: '', active: true }); setShowRuleForm(true) }}
                        className="bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                        + Nouvelle règle
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-bold text-[#1B2A4A] text-sm">
                          {editingRule ? 'Modifier la règle' : 'Nouvelle règle'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Catégorie</label>
                            <select value={ruleForm.category_name}
                              onChange={(e) => setRuleForm((f) => ({ ...f, category_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                              <option value="">— Choisir —</option>
                              {categoriesDistinct.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Sous-catégorie</label>
                            <input type="text" value={ruleForm.sous_categorie}
                              onChange={(e) => setRuleForm((f) => ({ ...f, sous_categorie: e.target.value }))}
                              placeholder="laisser vide = toute la catégorie"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Taux (%)</label>
                            <input type="number" min="0" max="100" step="0.5" value={ruleForm.rate}
                              onChange={(e) => setRuleForm((f) => ({ ...f, rate: e.target.value }))}
                              placeholder="10"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={ruleForm.active}
                            onChange={(e) => setRuleForm((f) => ({ ...f, active: e.target.checked }))}
                            className="w-4 h-4 accent-[#00B4CC]" />
                          <span className="text-sm text-gray-700">Règle active</span>
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleSaveRule} disabled={savingRule}
                            className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                            {savingRule ? 'Enregistrement...' : editingRule ? 'Sauvegarder' : 'Créer'}
                          </button>
                          <button onClick={resetRuleForm}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-gray-400">
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Liste des règles */}
                  {loadingRules ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : commissionRules.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-6">
                      Aucune règle de commission — cliquez sur "+ Nouvelle règle" pour commencer.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {commissionRules.map((rule) => (
                        <div key={rule.id}
                          className={`bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3 ${rule.active ? '' : 'opacity-60'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#1B2A4A] text-sm">
                              {rule.category_name}
                              {rule.sous_categorie && (
                                <span className="text-gray-500 font-normal"> ({rule.sous_categorie})</span>
                              )}
                            </p>
                            {!rule.active && (
                              <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Inactive</p>
                            )}
                          </div>
                          <p className="text-xl font-black text-[#00B4CC] flex-shrink-0">
                            {rule.rate}%
                          </p>
                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={!!rule.active}
                              onChange={() => handleToggleRuleActive(rule)}
                              className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[#00B4CC]
                                            after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                            after:bg-white after:rounded-full after:h-5 after:w-5
                                            after:transition-all peer-checked:after:translate-x-5"></div>
                          </label>
                          <button onClick={() => openEditRule(rule)}
                            className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-white rounded-lg flex-shrink-0">
                            <Pencil size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ÉCRAN TRÉSORERIE (admin uniquement) — fusionné Vue + Clôtures */}
      {posScreen === 'tresorerie' && (trueIsAdmin || canSeeTresorerie) && (
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
              <PiggyBank size={22} /> Chiffres d'affaires
            </h1>
          </div>

          {/* Coffre central (cliquable — modal Qui détient quoi) */}
          <button onClick={() => setShowCoffreModal(true)}
            className="w-full text-left rounded-2xl p-6 text-white shadow-md flex items-center justify-between mb-4 hover:shadow-lg transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0d9488 100%)' }}>
            <div>
              <p className="text-xs uppercase opacity-70 font-bold">Coffre central</p>
              <p className="text-[10px] opacity-60 mt-0.5">Cliquer pour voir qui détient quoi</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase opacity-70 font-bold">Total</p>
              <p className={`text-4xl font-black ${totalGlobalTreso < 0 ? 'text-red-300' : 'text-white'}`}>
                {totalGlobalTreso.toFixed(2)}€
              </p>
            </div>
          </button>

              {/* Totaux par moyen de paiement */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {[
                  { key: 'cash', label: '💵 Cash' },
                  { key: 'bancontact', label: '💳 Bancontact' },
                  { key: 'virement', label: '🏦 Virement' },
                ].map((pm) => {
                  const val = totauxParMethode[pm.key] || 0
                  return (
                    <div key={pm.key} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">{pm.label}</p>
                      <p className={`text-xl font-black mt-1 ${val < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                        {val.toFixed(2)}€
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Sélecteur de magasins à combiner */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Magasins pris en compte</p>
                <div className="flex flex-wrap gap-2">
                  {MAGASINS_CAISSE.map((mag) => {
                    const on = selectedMagasinsCombo.has(mag.id)
                    return (
                      <button key={mag.id}
                        onClick={() => setSelectedMagasinsCombo((prev) => {
                          const next = new Set(prev)
                          if (next.has(mag.id)) next.delete(mag.id)
                          else next.add(mag.id)
                          return next
                        })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                          ${on
                            ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#00B4CC]'}`}>
                        {on ? '✓ ' : ''}{mag.nom.replace('Seb Telecom — ', '')}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {selectedMagasinsCombo.size} magasin{selectedMagasinsCombo.size > 1 ? 's' : ''} sélectionné{selectedMagasinsCombo.size > 1 ? 's' : ''}
                </p>
              </div>

              {/* Formulaire dépense */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                {!showDepenseForm ? (
                  <button onClick={() => {
                      if (staffListCaisse.length === 0) fetchStaffCaisse()
                      if (prefillTargetDate) {
                        setDepenseForm((f) => ({ ...f, target_date: prefillTargetDate }))
                      }
                      setDepenseMagasinJourFilter(null)
                      setShowDepenseForm(true)
                    }}
                    className="bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                    + Nouvelle dépense
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1B2A4A]">Nouvelle dépense</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Magasin</label>
                        <select value={depenseForm.magasin_id}
                          onChange={(e) => {
                            const val = e.target.value
                            setDepenseForm((f) => ({ ...f, magasin_id: val, closure_id: '', target_date: '' }))
                            fetchClosuresForDepense(val)
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                          <option value="">— Choisir —</option>
                          {MAGASINS_CAISSE_DEPENSE
                            .filter(m => depenseMagasinJourFilter === null || depenseMagasinJourFilter.includes(m.id))
                            .map((m) => (
                              <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
                        </select>
                        {MAGASINS_CAISSE_DEPENSE.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Aucun magasin n'a encore de caisse clôturée —
                            impossible d'ajouter une dépense tant qu'aucune
                            clôture n'a eu lieu.
                          </p>
                        )}
                        {depenseMagasinJourFilter !== null && depenseMagasinJourFilter.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Aucun magasin n'a de caisse clôturée à cette date.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                          Clôture de caisse *
                        </label>
                        <select
                          value={depenseForm.closure_id}
                          disabled={!depenseForm.magasin_id}
                          onChange={(e) => {
                            const val = e.target.value
                            const closure = closuresListTreso.find((c) => c.id === val)
                            setDepenseForm((f) => ({
                              ...f,
                              closure_id: val,
                              target_date: closure ? closure.closure_date : f.target_date,
                            }))
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400">
                          <option value="">
                            {!depenseForm.magasin_id ? '— Choisis un magasin d\'abord —' : '— Choisir —'}
                          </option>
                          {closuresListTreso.map((c) => (
                            <option key={c.id} value={c.id}>
                              {new Date(c.closure_date).toLocaleDateString('fr-BE')} — {Number(c.ca_total).toFixed(2)}€ ({c.staff_name || 'Admin'})
                            </option>
                          ))}
                        </select>
                        {depenseForm.magasin_id && closuresListTreso.length === 0 && !loadingClosuresTreso && (
                          <p className="text-xs text-amber-600 mt-1">
                            Aucune clôture trouvée pour ce magasin.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Catégorie</label>
                        <select value={depenseForm.categorie}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, categorie: e.target.value, fournisseur_id: e.target.value === 'fournisseur' ? f.fournisseur_id : '', categorieAutre: e.target.value === 'autre' ? f.categorieAutre : '' }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                          <option value="fournisseur">Fournisseur</option>
                          <option value="rachat_client">Rachat client</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>
                      {depenseForm.categorie === 'autre' && (
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Précise la catégorie</label>
                          <input type="text" value={depenseForm.categorieAutre}
                            onChange={(e) => setDepenseForm((f) => ({ ...f, categorieAutre: e.target.value }))}
                            placeholder="ex: frais de déplacement, réparation matériel..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        </div>
                      )}
                      {depenseForm.categorie === 'fournisseur' && (
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fournisseur</label>
                          <select value={depenseForm.fournisseur_id}
                            onChange={(e) => setDepenseForm((f) => ({ ...f, fournisseur_id: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                            <option value="">— Choisir —</option>
                            {fournisseursListTreso.map((f) => (
                              <option key={f.id} value={f.id}>{f.nom}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Détenteur</label>
                        <select value={depenseForm.holderType}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, holderType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                          <option value="">— Choisir —</option>
                          <option value="zinou">Zinou</option>
                          <option value="david">David</option>
                          <option value="moha">Moha</option>
                          <option value="magasin">Un magasin</option>
                          <option value="autre">Autre</option>
                        </select>
                      </div>
                      {depenseForm.holderType === 'magasin' && (
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Magasin détenteur</label>
                          <select value={depenseForm.holderDetailMagasin}
                            onChange={(e) => setDepenseForm((f) => ({ ...f, holderDetailMagasin: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                            <option value="">— Choisir —</option>
                            {MAGASINS_CAISSE_DEPENSE.map((m) => (
                              <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {depenseForm.holderType === 'autre' && (
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Précise</label>
                          <input type="text" value={depenseForm.holderDetailAutre}
                            onChange={(e) => setDepenseForm((f) => ({ ...f, holderDetailAutre: e.target.value }))}
                            placeholder="précise..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Moyen de paiement</label>
                        <select value={depenseForm.payment_method}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, payment_method: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                          <option value="cash">💵 Cash</option>
                          <option value="bancontact">💳 Bancontact</option>
                          <option value="virement">🏦 Virement</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Montant (€)</label>
                        <input type="number" step="0.01" min="0" value={depenseForm.montant}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, montant: e.target.value }))}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fait par</label>
                        <select value={depenseForm.made_by}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, made_by: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                          <option value="">— Utilisateur connecté —</option>
                          {staffListCaisse.map((s) => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                          <option value="__autre__">Autre…</option>
                        </select>
                      </div>
                      {depenseForm.made_by === '__autre__' && (
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Précise le nom</label>
                          <input type="text" value={depenseForm.made_by_autre}
                            onChange={(e) => setDepenseForm((f) => ({ ...f, made_by_autre: e.target.value }))}
                            placeholder="Nom de la personne"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Date de la dépense *</label>
                        <input type="date" value={depenseForm.target_date}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, target_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                        <p className="text-[10px] text-gray-400 mt-1">
                          La dépense apparaîtra sur cette date dans le calendrier.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        Libellé de la dépense *
                      </label>
                      <select
                        value={depenseForm.libelle_id}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '__custom__') {
                            setDepenseForm((f) => ({ ...f, libelle_id: '__custom__', description: '' }))
                          } else {
                            const lib = libellesListTreso.find((l) => l.id === val)
                            setDepenseForm((f) => ({ ...f, libelle_id: val, description: lib?.label || '' }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="">— Choisir —</option>
                        {libellesListTreso.map((l) => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                        <option value="__custom__">+ Ajouter un nouveau libellé</option>
                      </select>
                      {depenseForm.libelle_id === '__custom__' && (
                        <input type="text" autoFocus value={depenseForm.description}
                          onChange={(e) => setDepenseForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="ex: Frais de déplacement, réparation matériel..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mt-2" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveDepense} disabled={savingDepense}
                        className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                        {savingDepense ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button onClick={() => { setShowDepenseForm(false); setPrefillTargetDate(''); setDepenseMagasinJourFilter(null); setDepenseForm({ magasin_id: '', montant: '', categorie: 'fournisseur', fournisseur_id: '', description: '', categorieAutre: '', holderType: '', holderDetailMagasin: '', holderDetailAutre: '', payment_method: 'cash', made_by: '', made_by_autre: '', target_date: '', closure_id: '', libelle_id: '' }) }}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-gray-400">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Liste des dépenses récentes (20 dernières, sorties uniquement) */}
              {(() => {
                const depenses = filteredMouvements
                  .filter((m) => m.type === 'sortie')
                  .sort((a, b) => {
                    const da = new Date(a.target_date || a.created_at).getTime()
                    const db = new Date(b.target_date || b.created_at).getTime()
                    return db - da
                  })
                  .slice(0, 20)
                return (
                  <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
                      Dépenses récentes {depenses.length > 0 && `(${depenses.length})`}
                    </h3>
                    {depenses.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Aucune dépense</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="text-left px-2 py-2 font-bold text-gray-500 text-[10px] uppercase whitespace-nowrap">Date</th>
                              <th className="text-left px-2 py-2 font-bold text-gray-500 text-[10px] uppercase">Fait par</th>
                              <th className="text-left px-2 py-2 font-bold text-gray-500 text-[10px] uppercase">Magasin</th>
                              <th className="text-left px-2 py-2 font-bold text-gray-500 text-[10px] uppercase">Méthode</th>
                              <th className="text-right px-2 py-2 font-bold text-gray-500 text-[10px] uppercase">Montant</th>
                              <th className="text-left px-2 py-2 font-bold text-gray-500 text-[10px] uppercase">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {depenses.map((m) => {
                              const dt = new Date(m.target_date || m.created_at)
                              const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
                              const magNom = m.magasin_id
                                ? (MAGASINS_LIST.find((x) => x.id === m.magasin_id)?.nom || m.magasin_id).replace('Seb Telecom — ', '')
                                : 'Central'
                              const pmIcon = m.payment_method === 'bancontact' ? '💳' : m.payment_method === 'virement' ? '🏦' : '💵'
                              return (
                                <tr key={m.id} className="border-b border-gray-50">
                                  <td className="px-2 py-1.5 font-mono text-gray-600 whitespace-nowrap">{dateStr}</td>
                                  <td className="px-2 py-1.5 text-gray-700 truncate max-w-[100px]" title={m.created_by || ''}>{m.created_by || '—'}</td>
                                  <td className="px-2 py-1.5 text-gray-600">{magNom}</td>
                                  <td className="px-2 py-1.5 text-gray-600">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                      {pmIcon}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-bold text-red-700 whitespace-nowrap">
                                    -{Number(m.amount || 0).toFixed(2)}€
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-600 max-w-[180px]">
                                    {editingDescId === m.id ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editingDescValue}
                                        onChange={(e) => setEditingDescValue(e.target.value)}
                                        onBlur={() => {
                                          if (cancelDescRef.current) {
                                            cancelDescRef.current = false
                                            setEditingDescId(null)
                                            return
                                          }
                                          handleSaveDescription(m.id)
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.target.blur()
                                          }
                                          if (e.key === 'Escape') {
                                            cancelDescRef.current = true
                                            e.target.blur()
                                          }
                                        }}
                                        className="w-full px-1.5 py-0.5 border border-[#00B4CC] rounded text-xs outline-none"
                                      />
                                    ) : (
                                      <span
                                        onClick={() => { setEditingDescId(m.id); setEditingDescValue(m.description || '') }}
                                        className="cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 truncate block"
                                        title={m.description ? `${m.description} (cliquer pour modifier)` : 'Cliquer pour ajouter une description'}>
                                        {m.description || <span className="text-gray-300 italic">+ Ajouter</span>}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Calendrier des mouvements (vue unique) */}
              {loadingTreso ? (
                <div className="flex items-center justify-center h-40 mb-4">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (() => {
                const nowDt = new Date()
                const dispDate = new Date(nowDt.getFullYear(), nowDt.getMonth() + calMonthOffsetTreso, 1)
                const yearM = dispDate.getFullYear()
                const monthM = dispDate.getMonth()
                const firstM = new Date(yearM, monthM, 1)
                const lastM = new Date(yearM, monthM + 1, 0)
                const daysInMonthM = lastM.getDate()
                const firstDowM = (firstM.getDay() + 6) % 7
                const monthLabelM = dispDate.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })

                const cellsM = []
                for (let i = 0; i < firstDowM; i++) cellsM.push(null)
                for (let d = 1; d <= daysInMonthM; d++) cellsM.push(new Date(yearM, monthM, d))
                const dowLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

                const jourStrM = (d) =>
                  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

                // Dépenses du jour : target_date si présent, sinon created_at
                const depensesDuJour = (dateStr) => filteredMouvementsMois.filter((m) => {
                  if (m.type !== 'sortie') return false
                  const eff = m.target_date || m.created_at
                  return jourStrM(new Date(eff)) === dateStr
                })

                // Clôtures du jour filtrées par combo magasins
                const cloturesDuJour = (dateStr) => cloturesMois.filter((c) => {
                  if (!selectedMagasinsCombo.has(c.magasin_id)) return false
                  return jourStrM(new Date(c.period_end)) === dateStr
                })

                return (
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setCalMonthOffsetTreso((o) => o - 1)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-bold text-[#1B2A4A] capitalize min-w-[140px] text-center">
                          {monthLabelM}
                        </span>
                        <button onClick={() => setCalMonthOffsetTreso((o) => o + 1)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {dowLabels.map((d) => (
                        <div key={d} className="text-center text-[10px] font-bold uppercase text-gray-400 py-1">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {cellsM.map((date, idx) => {
                        if (!date) return <div key={`empty-m-${idx}`} />
                        const dStr = jourStrM(date)
                        const cloJour = cloturesDuJour(dStr)
                        const depJour = depensesDuJour(dStr)
                        const caTotalJour = cloJour.reduce((s, c) => s + Number(c.ca_total || 0), 0)
                        const totalDepJour = depJour.reduce((s, m) => s + Number(m.amount || 0), 0)
                        const magPresents = [...new Set(cloJour.map((c) => c.magasin_id))]
                        const has = cloJour.length > 0 || depJour.length > 0
                        return (
                          <button key={dStr}
                            onClick={has ? () => setSelectedJourMouvements(dStr) : undefined}
                            disabled={!has}
                            className={`aspect-square min-h-[92px] p-1.5 rounded-lg border-2 text-left transition-all overflow-hidden
                              ${has
                                ? 'border-gray-100 bg-white hover:border-[#1B2A4A] cursor-pointer'
                                : 'border-transparent bg-gray-50 opacity-60 cursor-default'}`}>
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-bold text-[#1B2A4A]">{date.getDate()}</span>
                              <div className="flex gap-0.5 flex-wrap justify-end max-w-[24px]">
                                {magPresents.slice(0, 4).map((mid) => (
                                  <span key={mid} className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: MAG_COLORS_CAL[mid] || '#94a3b8' }} />
                                ))}
                              </div>
                            </div>
                            {totalDepJour > 0 ? (
                              <>
                                {caTotalJour > 0 && (
                                  <p className="text-sm font-bold text-[#1B2A4A] mt-0.5 leading-tight flex items-center gap-1"
                                    title={`Caisse totale : ${caTotalJour.toFixed(2)}€`}>
                                    <span className="text-[9px] font-bold text-gray-400 border border-gray-300 rounded-full px-1.5 leading-tight">CA</span>
                                    {caTotalJour.toFixed(0)}€
                                  </p>
                                )}
                                <p className="mt-0.5 text-xs font-bold text-red-600 leading-tight flex items-center gap-1"
                                  title={`Dépenses : -${totalDepJour.toFixed(2)}€`}>
                                  <span className="text-[9px] font-bold text-red-500 border border-red-300 rounded-full px-1.5 leading-tight">Dép</span>
                                  -{totalDepJour.toFixed(0)}€
                                </p>
                                {(() => {
                                  const net = caTotalJour - totalDepJour
                                  return (
                                    <p className={`mt-0.5 text-lg font-black leading-tight flex items-center gap-1 ${net < 0 ? 'text-red-600' : 'text-green-600'}`}
                                      title={`Total net : ${net.toFixed(2)}€`}>
                                      <span className={`text-[9px] font-bold border rounded-full px-1.5 leading-tight ${net < 0 ? 'text-red-500 border-red-400' : 'text-green-600 border-green-500'}`}>Net</span>
                                      {net.toFixed(0)}€
                                    </p>
                                  )
                                })()}
                              </>
                            ) : (
                              caTotalJour > 0 && (
                                <p className="mt-0.5 text-lg font-black text-green-600 leading-tight flex items-center gap-1"
                                  title={`Caisse totale : ${caTotalJour.toFixed(2)}€`}>
                                  <span className="text-[9px] font-bold text-green-600 border border-green-500 rounded-full px-1.5 leading-tight">CA</span>
                                  {caTotalJour.toFixed(0)}€
                                </p>
                              )
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

        </div>
      )}

      {/* ÉCRAN RECHERCHE TICKET (tous utilisateurs) */}
      {posScreen === 'recherche-ticket' && (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => { setPosScreen('accueil'); setSelectedTicket(null) }}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
              <Search size={22} /> Rechercher un ticket
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Toutes les ventes de {MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Recherche</label>
                <input type="text" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchTickets() }}
                  placeholder="Article, vendeur, montant, id..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Du</label>
                <input type="date" value={searchDateStart}
                  onChange={(e) => setSearchDateStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Au</label>
                <input type="date" value={searchDateEnd}
                  onChange={(e) => setSearchDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
            </div>
            <button onClick={handleSearchTickets} disabled={loadingSearch}
              className="mt-3 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC] disabled:opacity-50">
              {loadingSearch ? 'Recherche...' : '🔍 Rechercher'}
            </button>
          </div>

          {loadingSearch ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Aucun résultat — lance une recherche pour afficher des tickets
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((t) => {
                const dt = new Date(t.created_at)
                const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
                const isRefund = t.sale_type === 'remboursement'
                const isAcompte = t.sale_type && t.sale_type !== 'vente' && t.sale_type !== 'remboursement'
                const badgeCls = isRefund ? 'bg-red-100 text-red-700'
                  : isAcompte ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
                const badgeLbl = isRefund ? 'Remboursement' : isAcompte ? 'Acompte' : 'Vente'
                return (
                  <button key={t.id}
                    onClick={() => openTicketDetail(t)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs text-gray-500">{dateStr}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{badgeLbl}</span>
                        <span className="text-xs text-gray-600">{t.staff_name || '—'}</span>
                        <span className="text-[10px] text-gray-400">{t.payment_method || 'cash'}</span>
                      </div>
                      <span className={`text-lg font-black ${Number(t.total_amount) < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                        {Number(t.total_amount || 0).toFixed(2)}€
                      </span>
                    </div>
                    {(t.items || []).length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1 truncate">
                        {(t.items || []).map((i) => `${i.quantity}× ${i.item_name}`).join(', ')}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DÉTAIL TICKET */}
      {selectedTicket && !showEditTicket && !showRefundForm && (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A]">Ticket</h3>
              <button onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={20} />
              </button>
            </div>
            <ReceiptTicket
              ticketNumber={searchResults.findIndex((s) => s.id === selectedTicket.id) + 1}
              vendeur={selectedTicket.staff_name || 'Admin'}
              dateTime={new Date(selectedTicket.created_at)}
              items={(selectedTicket.items || []).map((si) => ({
                qte: si.quantity, name: si.item_name, tot: Number(si.total_price),
              }))}
              payments={[
                ...(Number(selectedTicket.cash_amount) !== 0 ? [{ type: 'cash', amount: Number(selectedTicket.cash_amount) }] : []),
                ...(Number(selectedTicket.bancontact_amount) !== 0 ? [{ type: 'bancontact', amount: Number(selectedTicket.bancontact_amount) }] : []),
                ...(Number(selectedTicket.virement_amount) !== 0 ? [{ type: 'virement', amount: Number(selectedTicket.virement_amount) }] : []),
              ]}
              changeAmount={Number(selectedTicket.change_amount) || 0}
              tvaRate={21} paperWidth="80mm"
            />
            {ticketRefunds.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Remboursements liés</p>
                <div className="space-y-1">
                  {ticketRefunds.map((r) => (
                    <div key={r.id} className="bg-red-50 rounded-lg p-2 text-xs flex justify-between">
                      <span>{new Date(r.created_at).toLocaleString('fr-BE')}</span>
                      <span className="font-bold text-red-700">{Number(r.total_amount).toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 border-t border-gray-100 pt-3">
              {canModifyPrices ? (
                <div className="flex gap-2">
                  <button onClick={openEditTicket}
                    className="flex-1 bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                    ✏️ Modifier
                  </button>
                  <button onClick={openRefundForm}
                    className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-amber-600">
                    ↩️ Rembourser
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center italic">
                  Vous n'avez pas le droit de modifier ou rembourser une vente
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER TICKET */}
      {showEditTicket && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A]">Modifier la vente</h3>
              <button onClick={() => setShowEditTicket(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 mb-3">
              {editTicketForm.map((line, idx) => (
                <div key={line.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-[#1B2A4A] text-sm truncate" title={line.item_name}>
                    {line.quantity}× {line.item_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Prix unit.</label>
                    <input type="number" step="0.01" value={line.unit_price}
                      onChange={(e) => setEditTicketForm((f) => f.map((l, i) =>
                        i === idx ? { ...l, unit_price: e.target.value } : l))}
                      className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm" />
                    <span className="text-xs text-gray-500">€</span>
                    <span className="ml-auto text-sm font-bold text-[#00B4CC]">
                      = {(Number(line.unit_price || 0) * Number(line.quantity || 0)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Méthode de paiement</label>
              <select value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="cash">💵 Cash</option>
                <option value="bancontact">💳 Bancontact</option>
                <option value="virement">🏦 Virement</option>
              </select>
            </div>
            <div className="flex justify-between font-bold text-lg mb-3">
              <span>Total</span>
              <span className="text-[#00B4CC]">
                {editTicketForm.reduce((s, l) => s + (Number(l.unit_price) || 0) * Number(l.quantity || 0), 0).toFixed(2)}€
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEditTicket} disabled={savingEditTicket}
                className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                {savingEditTicket ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowEditTicket(false)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REMBOURSER TICKET */}
      {showRefundForm && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A]">Rembourser la vente</h3>
              <button onClick={() => setShowRefundForm(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 mb-3">
              {refundForm.map((line, idx) => (
                <div key={line.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold text-[#1B2A4A] text-sm truncate" title={line.item_name}>
                    {line.item_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Qté à rembourser</label>
                    <input type="number" min="0" max={line.quantity} step="1"
                      value={line.qteRembourse}
                      onChange={(e) => setRefundForm((f) => f.map((l, i) =>
                        i === idx ? { ...l, qteRembourse: Math.max(0, Math.min(line.quantity, Number(e.target.value) || 0)) } : l))}
                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right" />
                    <span className="text-xs text-gray-500">/ {line.quantity}</span>
                    <span className="ml-auto text-sm font-bold text-red-600">
                      -{(Number(line.unit_price) * Number(line.qteRembourse || 0)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Méthode de remboursement</label>
              <select value={refundPaymentMethod}
                onChange={(e) => setRefundPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="cash">💵 Cash</option>
                <option value="bancontact">💳 Bancontact</option>
                <option value="virement">🏦 Virement</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Raison (optionnel)</label>
              <textarea rows={2} value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Article défectueux, geste commercial..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" />
            </div>
            <div className="flex justify-between font-bold text-lg mb-3">
              <span>Total remboursé</span>
              <span className="text-red-600">
                -{refundForm.reduce((s, l) => s + Number(l.unit_price) * Number(l.qteRembourse || 0), 0).toFixed(2)}€
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveRefund} disabled={savingRefund}
                className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                {savingRefund ? 'Enregistrement...' : '↩️ Rembourser'}
              </button>
              <button onClick={() => setShowRefundForm(false)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEVIS (email + nom client) */}
      {showDevisForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A]">📧 Envoyer le devis</h3>
              <button onClick={() => setShowDevisForm(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Email client *</label>
                <input type="email" value={devisEmail}
                  onChange={(e) => setDevisEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nom client (optionnel)</label>
                <input type="text" value={devisClientName}
                  onChange={(e) => setDevisClientName(e.target.value)}
                  placeholder="M. Dupont"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Délai estimé (optionnel)</label>
                <select value={devisDelaiId}
                  onChange={(e) => setDevisDelaiId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="">Aucun délai précisé</option>
                  {delaiTypesList.map((d) => (
                    <option key={d.id} value={d.id}>{d.label} — {d.delai_texte}</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs">
                <p className="text-gray-500 mb-1">Total du devis :</p>
                <p className="font-black text-lg text-[#00B4CC]">{cartTotal.toFixed(2)}€</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {cart.length} article{cart.length > 1 ? 's' : ''} — aucun impact sur CA/stock/commissions
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSendDevis} disabled={sendingDevis}
                  className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                  {sendingDevis ? 'Envoi...' : '📧 Envoyer'}
                </button>
                <button onClick={() => setShowDevisForm(false)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL JOUR (popup calendrier Chiffres d'affaires) */}
      {selectedJourMouvements && (() => {
        const jourStrM = (d) =>
          `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const jourClotures = cloturesMois.filter((c) =>
          selectedMagasinsCombo.has(c.magasin_id) &&
          jourStrM(new Date(c.period_end)) === selectedJourMouvements
        )
        const jourDepenses = filteredMouvements.filter((m) => {
          if (m.type !== 'sortie') return false
          const eff = m.target_date || m.created_at
          return jourStrM(new Date(eff)) === selectedJourMouvements
        })
        const totalDepJour = jourDepenses.reduce((s, m) => s + Number(m.amount || 0), 0)
        const caJour = jourClotures.reduce((s, c) => s + Number(c.ca_total || 0), 0)
        const netJour = caJour - totalDepJour

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-[#1B2A4A] text-lg capitalize">
                    {new Date(selectedJourMouvements).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    {caJour > 0 && <span className="text-[#00B4CC] font-bold text-xs">CA {caJour.toFixed(2)}€</span>}
                    {totalDepJour > 0 && <span className="text-red-600 font-bold text-xs">Dépenses -{totalDepJour.toFixed(2)}€</span>}
                    {(caJour > 0 || totalDepJour > 0) && (
                      <span className={`font-black text-xl ${netJour < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Net {netJour.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedJourMouvements(null)}
                  className="text-gray-400 hover:text-[#1B2A4A]">
                  <X size={20} />
                </button>
              </div>

              {jourClotures.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Clôtures</h4>
                  <div className="space-y-2">
                    {jourClotures.map((c) => {
                      const magNom = (MAGASINS_LIST.find((m) => m.id === c.magasin_id)?.nom || c.magasin_id || '—')
                        .replace('Seb Telecom — ', '')
                      const currentHolderFromMvts = (() => {
                        const linked = mouvements.find((m) => m.reference_id === c.id)
                        return linked?.holder || `Magasin — ${MAGASINS_LIST.find((m) => m.id === c.magasin_id)?.nom || c.magasin_id}`
                      })()
                      const selectedNewHolder = assignHolderForClosure[c.id] ?? ''
                      return (
                        <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                          <p className="font-bold text-[#1B2A4A] mb-2">{magNom}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase">💵 Cash</p>
                              <p className="font-bold text-[#1B2A4A]">{Number(c.cash_total || 0).toFixed(2)}€</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase">💳 Bancontact</p>
                              <p className="font-bold text-[#1B2A4A]">{Number(c.bancontact_total || 0).toFixed(2)}€</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase">🏦 Virement</p>
                              <p className="font-bold text-[#1B2A4A]">{Number(c.virement_total || 0).toFixed(2)}€</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 mb-2">
                            Clôturé par : <span className="font-bold text-gray-700">{c.staff_name || '—'}</span>
                          </p>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Caisse détenue par</label>
                            <span className="text-[10px] text-gray-600 truncate flex-1" title={currentHolderFromMvts}>
                              {currentHolderFromMvts}
                            </span>
                          </div>
                          <div className="flex gap-2 mb-2">
                            <select value={selectedNewHolder}
                              onChange={(e) => setAssignHolderForClosure((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white">
                              <option value="">— Choisir —</option>
                              <option value={`Magasin — ${MAGASINS_LIST.find((m) => m.id === c.magasin_id)?.nom || c.magasin_id}`}>
                                Magasin — {magNom}
                              </option>
                              {staffListCaisse.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                            <button onClick={() => handleAssignCaisseHolder(c, selectedNewHolder)}
                              disabled={!selectedNewHolder}
                              className="px-3 py-1.5 bg-[#00B4CC] text-white rounded-lg text-xs font-bold hover:bg-[#1B2A4A] disabled:opacity-40">
                              Assigner
                            </button>
                          </div>
                          <button onClick={() => { setTicketToShow(c); setShowTicketModal(true) }}
                            className="w-full bg-[#1B2A4A] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00B4CC]">
                            🧾 Voir le ticket de clôture
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Dépenses du jour</h4>
                  <button onClick={() => {
                      const idsDuJour = jourClotures.map(c => c.magasin_id)
                      setDepenseMagasinJourFilter(idsDuJour)
                      setPrefillTargetDate(selectedJourMouvements)
                      const magPre = idsDuJour.length === 1 ? idsDuJour[0] : ''
                      setDepenseForm((f) => ({
                        ...f,
                        target_date: selectedJourMouvements,
                        magasin_id: magPre,
                        closure_id: '',
                      }))
                      if (magPre) fetchClosuresForDepense(magPre)
                      if (staffListCaisse.length === 0) fetchStaffCaisse()
                      setShowDepenseForm(true)
                      setSelectedJourMouvements(null)
                    }}
                    className="text-xs font-bold text-[#00B4CC] hover:text-[#1B2A4A]">
                    + Ajouter une dépense sur ce jour
                  </button>
                </div>
                {jourDepenses.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">Aucune dépense ce jour</p>
                ) : (
                  <div className="space-y-1.5">
                    {jourDepenses.map((m) => {
                      const pmIcon = m.payment_method === 'bancontact' ? '💳' : m.payment_method === 'virement' ? '🏦' : '💵'
                      return (
                        <div key={m.id} className="bg-red-50 rounded-lg px-2 py-1.5 flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="text-gray-500">{pmIcon}</span>
                          <span className="text-gray-700 truncate max-w-[110px]" title={m.created_by || ''}>
                            {m.created_by || 'Non précisé'}
                          </span>
                          <span className="font-bold text-red-700">
                            -{Number(m.amount || 0).toFixed(2)}€
                          </span>
                          {m.description && (
                            <span className="w-full text-[10px] text-gray-500 italic truncate -mt-0.5" title={m.description}>
                              {m.description}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button onClick={() => setSelectedJourMouvements(null)}
                className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Fermer
              </button>
            </div>
          </div>
        )
      })()}

      {/* MODAL COFFRE — Qui détient quoi */}
      {showCoffreModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-[#1B2A4A] text-lg">Qui détient quoi</h3>
                <p className="text-[10px] uppercase text-gray-400 font-bold mt-1">Total</p>
                <p className={`text-xl font-black ${totalGlobalTreso < 0 ? 'text-red-600' : 'text-[#00B4CC]'}`}>
                  {totalGlobalTreso.toFixed(2)}€
                </p>
              </div>
              <button onClick={() => setShowCoffreModal(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* COLONNE MAGASINS */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Magasins</p>
                <div className="space-y-2">
                  {MAGASINS_CAISSE.map((mag) => {
                    const val = totauxParMagasin[mag.id] || 0
                    const magColor = MAG_COLORS_CAL[mag.id] || '#94a3b8'
                    return (
                      <button key={mag.id}
                        onClick={() => setSelectedMagasinDetail(mag.id)}
                        className="w-full text-left bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-all border-l-4"
                        style={{ borderLeftColor: magColor }}>
                        <p className="text-xs font-bold text-gray-600 uppercase truncate flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: magColor }} />
                          {mag.nom.replace('Seb Telecom — ', '')}
                        </p>
                        <p className={`text-2xl font-black mt-1 ${val < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                          {val.toFixed(2)}€
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* COLONNE DÉTENTEURS */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Détenteurs</p>
                {Object.keys(totauxParDetenteurEtMagasin).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">Aucun détenteur enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(totauxParDetenteurEtMagasin).map(([key, info]) => (
                      <button key={key}
                        onClick={() => { setSelectedDetenteur(key); setDetenteurMagasinFilter('all'); setShowCoffreModal(false) }}
                        className="w-full text-left bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-all">
                        <p className="text-[10px] font-bold text-gray-500 uppercase truncate" title={key}>
                          {key}
                        </p>
                        <p className={`text-xl font-black mt-1 ${info.total < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                          {info.total.toFixed(2)}€
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
            <button onClick={() => setShowCoffreModal(false)}
              className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODAL DÉTAIL MAGASIN (qui détient l'argent de ce magasin) */}
      {selectedMagasinDetail && (() => {
        const mag = MAGASINS_CAISSE.find((m) => m.id === selectedMagasinDetail)
        const totalMagasin = totauxParMagasin[selectedMagasinDetail] || 0
        const holdersForMagasin = {}
        filteredMouvements
          .filter((m) => m.magasin_id === selectedMagasinDetail)
          .forEach((m) => {
            const key = m.holder || 'Non précisé'
            const delta = m.type === 'entree' ? Number(m.amount) : -Number(m.amount)
            holdersForMagasin[key] = (holdersForMagasin[key] || 0) + delta
          })
        const magColor = MAG_COLORS_CAL[selectedMagasinDetail] || '#94a3b8'
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#1B2A4A] text-lg flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: magColor }} />
                    {mag?.nom?.replace('Seb Telecom — ', '') || selectedMagasinDetail}
                  </h3>
                  <p className="text-[10px] uppercase text-gray-400 font-bold mt-1">Argent dans le magasin</p>
                  <p className={`text-xl font-black ${totalMagasin < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                    {totalMagasin.toFixed(2)}€
                  </p>
                </div>
                <button onClick={() => setSelectedMagasinDetail(null)}
                  className="text-gray-400 hover:text-[#1B2A4A]">
                  <X size={20} />
                </button>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Détenu par</p>
              {Object.keys(holdersForMagasin).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Aucun mouvement pour ce magasin</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(holdersForMagasin).map(([holder, amt]) => (
                    <div key={holder} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-600 uppercase truncate">{holder}</p>
                      <p className={`text-lg font-black ${amt < 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                        {amt.toFixed(2)}€
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setSelectedMagasinDetail(null)}
                className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Fermer
              </button>
            </div>
          </div>
        )
      })()}

      {/* MODAL DÉTAIL DÉTENTEUR (liste des mouvements du détenteur) */}
      {selectedDetenteur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-5">
            {(() => {
              const mvtsDet = mouvements
                .filter((m) => (m.holder || 'Non précisé') === selectedDetenteur)
                .filter((m) => detenteurMagasinFilter === 'all' || m.magasin_id === detenteurMagasinFilter)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              const total = mvtsDet.reduce((s, m) =>
                s + (m.type === 'entree' ? Number(m.amount) : -Number(m.amount)), 0)
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[#1B2A4A] text-lg">{selectedDetenteur}</h3>
                      <p className={`text-xl font-black mt-0.5 ${total < 0 ? 'text-red-600' : 'text-[#00B4CC]'}`}>
                        {total.toFixed(2)}€
                      </p>
                    </div>
                    <button onClick={() => setSelectedDetenteur(null)}
                      className="text-gray-400 hover:text-[#1B2A4A]">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Filtrer par magasin</label>
                    <select value={detenteurMagasinFilter}
                      onChange={(e) => setDetenteurMagasinFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                      <option value="all">Tous les magasins</option>
                      {MAGASINS_CAISSE.map((m) => (
                        <option key={m.id} value={m.id}>{m.nom}</option>
                      ))}
                    </select>
                  </div>
                  {mvtsDet.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">Aucun mouvement</p>
                  ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {mvtsDet.filter((m) => !(m.type === 'sortie' && m.closure_id)).map((m) => {
                        const dt = new Date(m.created_at)
                        const dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
                        const magNom = m.magasin_id
                          ? (MAGASINS_LIST.find((x) => x.id === m.magasin_id)?.nom || m.magasin_id).replace('Seb Telecom — ', '')
                          : 'Central'
                        const isEntree = m.type === 'entree'
                        const signe = isEntree ? '+' : '-'
                        const pmIcon = m.payment_method === 'bancontact' ? '💳' : m.payment_method === 'virement' ? '🏦' : '💵'

                        const depensesLiees = (m.source === 'cloture' && m.reference_id)
                          ? mouvements.filter((x) => x.type === 'sortie' && x.closure_id === m.reference_id)
                          : []
                        const totalDepLiee = depensesLiees.reduce((s, x) => s + Number(x.amount || 0), 0)
                        const netLiee = Number(m.amount || 0) - totalDepLiee

                        return (
                          <div key={m.id} className="bg-gray-50 rounded-lg p-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono text-gray-500">{dateStr}</span>
                            <span className="text-gray-700">{magNom}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEntree
                              ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {isEntree ? 'Entrée' : 'Sortie'}
                            </span>
                            <span className="text-gray-500">{pmIcon}</span>
                            <span className={`font-bold ml-auto ${isEntree ? 'text-green-700' : 'text-red-700'}`}>
                              {signe}{Number(m.amount || 0).toFixed(2)}€
                            </span>
                            {(m.description || m.source) && (
                              <span className="w-full text-[10px] text-gray-500 italic truncate" title={m.description || m.source}>
                                {m.description || m.source}
                              </span>
                            )}
                            {totalDepLiee > 0 && (
                              <>
                                <span className="w-full text-xs font-bold text-red-600 flex items-center gap-1">
                                  <span className="text-[9px] font-normal opacity-70">Dép</span>
                                  <span>-{totalDepLiee.toFixed(2)}€</span>
                                  {depensesLiees.some((d) => d.description) && (
                                    <span className="text-[10px] font-normal italic text-gray-500 truncate">
                                      — {depensesLiees.map((d) => d.description).filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </span>
                                <span className={`w-full text-sm font-black ${netLiee < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  <span className={`text-[9px] font-normal mr-0.5 ${netLiee < 0 ? 'text-red-400' : 'text-green-500'}`}>Net</span>
                                  {netLiee.toFixed(2)}€
                                </span>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <button onClick={() => setSelectedDetenteur(null)}
                    className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                    Fermer
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* MODAL ÉDITION DÉTENTEUR */}
      {editingHolderMouvement && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2A4A]">Modifier le détenteur</h3>
              <button onClick={() => setEditingHolderMouvement(null)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Détenteur</label>
                <select value={editHolderType}
                  onChange={(e) => setEditHolderType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="zinou">Zinou</option>
                  <option value="david">David</option>
                  <option value="moha">Moha</option>
                  <option value="magasin">Un magasin</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {editHolderType === 'magasin' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Magasin</label>
                  <select value={editHolderDetailMagasin}
                    onChange={(e) => setEditHolderDetailMagasin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="">— Choisir —</option>
                    {MAGASINS_CAISSE.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              {editHolderType === 'autre' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Précise</label>
                  <input type="text" value={editHolderDetailAutre}
                    onChange={(e) => setEditHolderDetailAutre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveHolder} disabled={savingHolder}
                  className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                  {savingHolder ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button onClick={() => setEditingHolderMouvement(null)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÉCRAN COMMISSIONS (admin uniquement) */}

      {/* ÉCRAN RÉPARATIONS HUB */}
      {posScreen === 'reparations-hub' && (
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setPosScreen('accueil')}
            className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
            ← Retour à l'accueil
          </button>
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
                <Wrench size={22} /> Réparations
              </h1>
              <p className="text-sm text-gray-500 mt-1">Recherche, planning et gestion des réparations</p>
            </div>
            <button onClick={() => { setNewRepairFromHubForm({ nom: '', appareil: '', imei: '', type_panne: '', prix: '', tel: '', email: '' }); setShowNewRepairFromHub(true) }}
              className="flex items-center gap-1.5 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
              <Plus size={16} /> Nouvelle réparation
            </button>
          </div>

          {/* Toggle Recherche / Calendrier / (admin) Prix / Délais / Écrans / Tâches */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'recherche', label: '🔍 Recherche' },
              { key: 'calendrier', label: '📅 Calendrier' },
              ...(trueIsAdmin ? [
                { key: 'prix', label: '💰 Prix' },
                { key: 'delais', label: '⏱️ Délais' },
                { key: 'ecrans', label: '📱 Écrans par modèle' },
                { key: 'taches', label: '✅ Tâches clôture' },
              ] : []),
            ].map((s) => (
              <button key={s.key}
                onClick={() => setSectionPrixDelais(s.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                  ${sectionPrixDelais === s.key
                    ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#00B4CC]'}`}>
                {s.label}
              </button>
            ))}
          </div>

          {sectionPrixDelais === 'recherche' && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" value={searchReparationsHub}
                  onChange={(e) => setSearchReparationsHub(e.target.value)}
                  placeholder="Nom, IMEI, modèle, n° bon..."
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm"/>
              </div>
              {loadingReparationsHub ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredReparationsHub.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                  Aucune réparation trouvée.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReparationsHub.map((r) => {
                    const statutColor = r.status === 'termine' ? 'bg-emerald-100 text-emerald-700'
                      : r.status === 'abandonne' ? 'bg-gray-100 text-gray-500'
                      : 'bg-amber-100 text-amber-700'
                    const statutLabel = r.status === 'termine' ? 'Terminé'
                      : r.status === 'abandonne' ? 'Abandonné'
                      : 'En attente'
                    return (
                      <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-gray-500">{r.bon_number}</span>
                            <p className="font-bold text-[#1B2A4A] text-sm">{r.client_nom}</p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statutColor}`}>
                              {statutLabel}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                            {r.appareil && <span>📱 {r.appareil}</span>}
                            {r.imei && <span className="font-mono">IMEI {r.imei}</span>}
                            {r.type_panne && <span>{r.type_panne}</span>}
                            {r.date && <span>{new Date(r.date).toLocaleDateString('fr-BE')}</span>}
                            {r.staff_name && <span className="text-[#00B4CC] font-bold">👤 {r.staff_name}</span>}
                          </div>
                        </div>
                        {r.prix != null && (
                          <p className="text-lg font-black text-[#1B2A4A] flex-shrink-0">
                            {Number(r.prix).toFixed(2)}€
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {sectionPrixDelais === 'calendrier' && (() => {
            const now = new Date()
            const dispDate = new Date(now.getFullYear(), now.getMonth() + calHubMonthOffset, 1)
            const yearM = dispDate.getFullYear()
            const monthM = dispDate.getMonth()
            const monthLabelM = dispDate.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })
            const daysInMonthM = new Date(yearM, monthM + 1, 0).getDate()
            const firstDayOfMonthM = new Date(yearM, monthM, 1).getDay()
            const firstDowM = firstDayOfMonthM === 0 ? 6 : firstDayOfMonthM - 1
            const cellsM = []
            for (let i = 0; i < firstDowM; i++) cellsM.push(null)
            for (let d = 1; d <= daysInMonthM; d++) cellsM.push(new Date(yearM, monthM, d))
            const dowLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
            const jourStrM = (d) =>
              `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const reparationsDuJour = (dateStr) => reparationsHubData.filter((r) => {
              const eff = r.date || (r.created_at ? r.created_at.slice(0, 10) : null)
              return eff === dateStr
            })
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCalHubMonthOffset((o) => o - 1)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-[#1B2A4A] capitalize min-w-[140px] text-center">
                      {monthLabelM}
                    </span>
                    <button onClick={() => setCalHubMonthOffset((o) => o + 1)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dowLabels.map((d) => (
                    <div key={d} className="text-[10px] font-bold text-gray-400 uppercase text-center py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cellsM.map((d, i) => {
                    if (!d) return <div key={i} />
                    const dStr = jourStrM(d)
                    const reps = reparationsDuJour(dStr)
                    return (
                      <button key={i}
                        onClick={() => reps.length > 0 && setSelectedJourReparations(dStr)}
                        disabled={reps.length === 0}
                        className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-all border
                          ${reps.length > 0
                            ? 'bg-amber-50 border-amber-200 text-[#1B2A4A] font-bold hover:bg-amber-100 cursor-pointer'
                            : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <span>{d.getDate()}</span>
                        {reps.length > 0 && (
                          <span className="text-[9px] text-amber-700 font-bold mt-0.5">
                            {reps.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {sectionPrixDelais === 'prix' && trueIsAdmin && (
            loadingTypePannePrix ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : typePannePrixList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                Aucun type de panne configuré en base
              </div>
            ) : (
              <div className="space-y-2">
                {typePannePrixList.map((row) => {
                  const isEditing = editingTypePanne?.id === row.id
                  return (
                    <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#1B2A4A]">{row.type_panne}</p>
                        </div>
                        {!isEditing && (
                          <>
                            <div className="flex gap-4 text-xs">
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 uppercase">Défaut</p>
                                <p className="font-bold text-[#00B4CC]">{Number(row.prix_defaut || 0).toFixed(2)}€</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 uppercase">Min</p>
                                <p className="font-bold text-gray-600">{Number(row.prix_min || 0).toFixed(2)}€</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-500 uppercase">Max</p>
                                <p className="font-bold text-gray-600">{Number(row.prix_max || 0).toFixed(2)}€</p>
                              </div>
                            </div>
                            <button onClick={() => openEditTypePanne(row)}
                              className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-50 rounded-lg">
                              <Pencil size={14} />
                            </button>
                          </>
                        )}
                      </div>
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Défaut (€)</label>
                              <input type="number" step="0.5" min="0" value={tpForm.prix_defaut}
                                onChange={(e) => setTpForm((f) => ({ ...f, prix_defaut: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Min (€)</label>
                              <input type="number" step="0.5" min="0" value={tpForm.prix_min}
                                onChange={(e) => setTpForm((f) => ({ ...f, prix_min: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Max (€)</label>
                              <input type="number" step="0.5" min="0" value={tpForm.prix_max}
                                onChange={(e) => setTpForm((f) => ({ ...f, prix_max: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSaveTypePanne} disabled={savingTypePanne}
                              className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                              {savingTypePanne ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button onClick={() => setEditingTypePanne(null)}
                              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {sectionPrixDelais === 'delais' && trueIsAdmin && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                {!showDelaiForm ? (
                  <button onClick={() => { setEditingDelai(null); setDelaiForm({ label: '', delai_texte: '', ordre: 0 }); setShowDelaiForm(true) }}
                    className="bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                    + Nouveau type de délai
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1B2A4A]">
                      {editingDelai ? 'Modifier le délai' : 'Nouveau type de délai'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Label</label>
                        <input type="text" value={delaiForm.label}
                          onChange={(e) => setDelaiForm((f) => ({ ...f, label: e.target.value }))}
                          placeholder="ex: Standard, Express, Sur commande..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ordre</label>
                        <input type="number" step="1" value={delaiForm.ordre}
                          onChange={(e) => setDelaiForm((f) => ({ ...f, ordre: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Délai (texte)</label>
                      <input type="text" value={delaiForm.delai_texte}
                        onChange={(e) => setDelaiForm((f) => ({ ...f, delai_texte: e.target.value }))}
                        placeholder="ex: 24-48h, 3 à 5 jours ouvrables..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveDelai} disabled={savingDelai}
                        className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                        {savingDelai ? 'Enregistrement...' : editingDelai ? 'Sauvegarder' : 'Créer'}
                      </button>
                      <button onClick={resetDelaiForm}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingDelaiTypes ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : delaiTypesList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                  Aucun type de délai — cliquez sur "+ Nouveau type de délai" pour commencer.
                </div>
              ) : (
                <div className="space-y-2">
                  {delaiTypesList.map((row) => (
                    <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1B2A4A]">{row.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{row.delai_texte}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Ordre {row.ordre ?? 0}</span>
                      <button onClick={() => openEditDelai(row)}
                        className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-50 rounded-lg">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteDelai(row)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {sectionPrixDelais === 'ecrans' && trueIsAdmin && (
            <>
              {/* Barre filtres */}
              <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
                <select value={ecranMarqueFilter}
                  onChange={(e) => setEcranMarqueFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white md:w-48">
                  <option value="all">Toutes les marques</option>
                  {ecranMarquesDistinct.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input type="text" value={ecranSearch}
                  onChange={(e) => setEcranSearch(e.target.value)}
                  placeholder="Rechercher un modèle..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap md:ml-2">
                  {ecranCatalogFiltered.length} résultat{ecranCatalogFiltered.length > 1 ? 's' : ''}
                </span>
              </div>

              {!showNewEcranForm ? (
                <button onClick={() => setShowNewEcranForm(true)}
                  className="mb-4 flex items-center gap-1.5 bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                  <Plus size={16}/> Nouveau modèle
                </button>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 space-y-3">
                  <h3 className="font-bold text-[#1B2A4A]">Nouveau modèle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Marque</label>
                      <select value={newEcranForm.marqueMode === 'custom' ? '__autre__' : newEcranForm.marque}
                        onChange={(e) => {
                          if (e.target.value === '__autre__') {
                            setNewEcranForm((f) => ({ ...f, marque: '', marqueMode: 'custom' }))
                          } else {
                            setNewEcranForm((f) => ({ ...f, marque: e.target.value, marqueMode: 'existing', gamme: '' }))
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="">— Choisir —</option>
                        {ecranMarquesDistinct.map((m) => <option key={m} value={m}>{m}</option>)}
                        <option value="__autre__">+ Autre marque…</option>
                      </select>
                      {newEcranForm.marqueMode === 'custom' && (
                        <input type="text" value={newEcranForm.marque}
                          onChange={(e) => setNewEcranForm((f) => ({ ...f, marque: e.target.value }))}
                          placeholder="Nom de la marque"
                          className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Gamme</label>
                      <input type="text" value={newEcranForm.gamme}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, gamme: e.target.value }))}
                        placeholder="ex: iPhone 11"
                        list="gammes-existantes"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      <datalist id="gammes-existantes">
                        {ecranGammesDistinct.map((g) => <option key={g} value={g} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Modèle précis</label>
                      <input type="text" value={newEcranForm.modele}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, modele: e.target.value }))}
                        placeholder="ex: iPhone 11 Pro"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Code modèle (optionnel)</label>
                      <input type="text" value={newEcranForm.modele_code}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, modele_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Qualité</label>
                      <select value={newEcranForm.qualite}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, qualite: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="compatible">Compatible</option>
                        <option value="original_equivalent">Qualité originale</option>
                        <option value="original">100% Original</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-gray-600 pb-2">
                        <input type="checkbox" checked={newEcranForm.disponible}
                          onChange={(e) => setNewEcranForm((f) => ({ ...f, disponible: e.target.checked }))}
                          className="w-4 h-4 accent-[#00B4CC]" />
                        Disponible à la vente
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Achat (€)</label>
                      <input type="number" step="0.5" min="0" value={newEcranForm.cout_achat}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, cout_achat: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Min (€)</label>
                      <input type="number" step="0.5" min="0" value={newEcranForm.prix_min}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, prix_min: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Défaut (€)</label>
                      <input type="number" step="0.5" min="0" value={newEcranForm.prix_defaut}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, prix_defaut: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Max (€)</label>
                      <input type="number" step="0.5" min="0" value={newEcranForm.prix_max}
                        onChange={(e) => setNewEcranForm((f) => ({ ...f, prix_max: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateEcran} disabled={savingNewEcran}
                      className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                      {savingNewEcran ? 'Création...' : 'Créer le modèle'}
                    </button>
                    <button onClick={() => { resetNewEcranForm(); setShowNewEcranForm(false) }}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {loadingEcranCatalog ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ecranCatalogFiltered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                  Aucun écran trouvé.
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(ecranGroupedByGamme).map(([gamme, rows]) => (
                    <div key={gamme}>
                      <p className="text-xs font-bold uppercase text-gray-400 mb-2">{gamme}</p>
                      <div className="space-y-2">
                        {rows.map((row) => {
                          const isEditing = editingEcran?.id === row.id
                          const qualiteLabel = row.qualite === 'compatible' ? 'Compatible'
                            : row.qualite === 'original_equivalent' ? 'Qualité originale'
                            : '100% Original'
                          return (
                            <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-[#1B2A4A]">{row.modele}</p>
                                  {row.modele_code && (
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{row.modele_code}</p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
                                      {qualiteLabel}
                                    </span>
                                    {!row.disponible && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                        Non disponible
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!isEditing && (
                                  <>
                                    <div className="flex gap-4 text-xs">
                                      <div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase">Défaut</p>
                                        <p className="font-bold text-[#00B4CC]">{Number(row.prix_defaut || 0).toFixed(2)}€</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase">Min</p>
                                        <p className="font-bold text-gray-600">{Number(row.prix_min || 0).toFixed(2)}€</p>
                                      </div>
                                      <div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase">Max</p>
                                        <p className="font-bold text-gray-600">{Number(row.prix_max || 0).toFixed(2)}€</p>
                                      </div>
                                    </div>
                                    <button onClick={() => openEditEcran(row)}
                                      className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-50 rounded-lg">
                                      <Pencil size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                              {isEditing && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Achat (€)</label>
                                      <input type="number" step="0.5" min="0" value={ecranForm.cout_achat}
                                        onChange={(e) => setEcranForm((f) => ({ ...f, cout_achat: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Défaut (€)</label>
                                      <input type="number" step="0.5" min="0" value={ecranForm.prix_defaut}
                                        onChange={(e) => setEcranForm((f) => ({ ...f, prix_defaut: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Min (€)</label>
                                      <input type="number" step="0.5" min="0" value={ecranForm.prix_min}
                                        onChange={(e) => setEcranForm((f) => ({ ...f, prix_min: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Max (€)</label>
                                      <input type="number" step="0.5" min="0" value={ecranForm.prix_max}
                                        onChange={(e) => setEcranForm((f) => ({ ...f, prix_max: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                                    </div>
                                  </div>
                                  <label className="flex items-center gap-2 text-xs text-gray-600">
                                    <input type="checkbox" checked={ecranForm.disponible}
                                      onChange={(e) => setEcranForm((f) => ({ ...f, disponible: e.target.checked }))}
                                      className="w-4 h-4 accent-[#00B4CC]" />
                                    Disponible à la vente
                                  </label>
                                  <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Notes</label>
                                    <textarea rows={2} value={ecranForm.notes}
                                      onChange={(e) => setEcranForm((f) => ({ ...f, notes: e.target.value }))}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={handleSaveEcran} disabled={savingEcran}
                                      className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                                      {savingEcran ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                    <button onClick={() => setEditingEcran(null)}
                                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {sectionPrixDelais === 'taches' && trueIsAdmin && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
                {!showTacheForm ? (
                  <button onClick={() => { setEditingTache(null); setTacheForm({ label: '', ordre: 0 }); setShowTacheForm(true) }}
                    className="bg-[#1B2A4A] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                    + Nouvelle tâche
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-bold text-[#1B2A4A]">
                      {editingTache ? 'Modifier la tâche' : 'Nouvelle tâche'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Label</label>
                        <input type="text" value={tacheForm.label}
                          onChange={(e) => setTacheForm((f) => ({ ...f, label: e.target.value }))}
                          placeholder="ex: Vérifier le tiroir-caisse, éteindre les écrans..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Ordre</label>
                        <input type="number" step="1" value={tacheForm.ordre}
                          onChange={(e) => setTacheForm((f) => ({ ...f, ordre: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveTache} disabled={savingTache}
                        className="flex-1 bg-[#00B4CC] text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                        {savingTache ? 'Enregistrement...' : editingTache ? 'Sauvegarder' : 'Créer'}
                      </button>
                      <button onClick={resetTacheForm}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {clotureTachesList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
                  Aucune tâche — cliquez sur "+ Nouvelle tâche" pour commencer.
                </div>
              ) : (
                <div className="space-y-2">
                  {clotureTachesList.map((row) => (
                    <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1B2A4A]">{row.label}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Ordre {row.ordre ?? 0}</span>
                      <button onClick={() => openEditTache(row)}
                        className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-50 rounded-lg">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteTache(row)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL VOIR LE TICKET (Z financier reconstruit depuis snapshot) */}
      {showTicketModal && ticketToShow && (() => {
        const idx = cloturesMois
          .filter((c) => c.magasin_id === ticketToShow.magasin_id)
          .sort((a, b) => new Date(a.period_end) - new Date(b.period_end))
          .findIndex((c) => c.id === ticketToShow.id)
        const reportNum = idx >= 0 ? idx + 1 : 1
        return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A]">Ticket de clôture</h3>
              <button onClick={() => { setShowTicketModal(false); setTicketToShow(null) }}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <ZFinancierReport
                reportNumber={reportNum}
                caisse={1}
                dateTime={new Date(ticketToShow.period_end)}
                periodStart={new Date(ticketToShow.period_start)}
                periodEnd={new Date(ticketToShow.period_end)}
                ventes={{ montant: ticketToShow.ca_total, count: ticketToShow.ticket_count }}
                retours={{ montant: 0, count: 0 }}
                tvaRows={ticketToShow.detail_snapshot?.tvaRows || []}
                reglements={ticketToShow.detail_snapshot?.reglementsArr || []}
                ventesFacturees={{ factures: 0, notesCredit: 0 }}
                remisesSurVentes={{ montant: 0, count: 0 }}
                categories={ticketToShow.detail_snapshot?.categoriesArr || []}
                proformats={{ bonsLivraison: 0, commandesClient: 0 }}
                retraits={ticketToShow.detail_snapshot?.retraitsArr || []}
                totalCashEnCaisse={ticketToShow.detail_snapshot?.totalCaisseCash || 0}
                totalCompte={ticketToShow.detail_snapshot?.totalCompte || 0}
              />
              {!ticketToShow.detail_snapshot && (
                <p className="text-xs text-amber-600 text-center mt-3 bg-amber-50 rounded-lg p-2">
                  ⚠️ Cette clôture date d'avant la sauvegarde du détail complet —
                  seuls les totaux globaux sont fiables ici, le détail par
                  catégorie n'est pas disponible pour ce ticket.
                </p>
              )}
            </div>
          </div>
        </div>
        )
      })()}

      {/* TAB CAISSE — layout POS 3 colonnes */}
      {posScreen === 'caisse' && (
        <div className="grid grid-cols-[140px_1fr_340px] gap-4 h-[calc(100vh-118px)]">

          {/* COLONNE GAUCHE — Catégories + Réparations en attente */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-y-auto p-2 flex flex-col">
            <button onClick={() => setSelectedPosCategory('Tout')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all border
                ${selectedPosCategory === 'Tout'
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}>
              Tout
            </button>
            {POS_CATEGORIES.map((catName) => (
              <button key={catName}
                onClick={() => setSelectedPosCategory(catName)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all border
                  ${selectedPosCategory === catName
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}>
                {catName}
              </button>
            ))}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 px-1">
                🔧 En attente ({pendingRepairs.length})
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {loadingPendingRepairs ? (
                  <div className="flex justify-center py-3">
                    <div className="w-4 h-4 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : pendingRepairs.length === 0 ? (
                  <p className="text-[9px] text-gray-300 px-1">Aucune</p>
                ) : (
                  pendingRepairs.map((r) => {
                    const solde = (Number(r.prix) || 0) - (Number(r.montant_paye) || 0)
                    return (
                      <button key={r.id} onClick={() => addRepairToCart(r)}
                        className="w-full text-left bg-amber-50 hover:bg-amber-100 rounded-lg p-1.5 transition-all">
                        <p className="text-[9px] font-bold text-[#1B2A4A] truncate">{r.client_nom}</p>
                        <p className="text-[9px] text-amber-700 font-bold">{solde.toFixed(2)}€</p>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* COLONNE CENTRE — Grille articles */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-y-auto p-4">
            <div className="relative mb-3 flex items-center gap-2">
              <button onClick={() => setShowMovementMenu(!showMovementMenu)}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-[#1B2A4A]">
                <Menu size={18} className="text-gray-500"/>
              </button>
              <button onClick={() => {
                  setPosScreen('recherche-ticket')
                  setSearchResults([])
                  setSearchQuery('')
                  setSearchDateStart('')
                  setSearchDateEnd('')
                }}
                title="Rechercher un ticket — par nom du client, montant, date ou numéro de ticket"
                className="h-9 px-3 rounded-xl border-2 border-cyan-200 bg-cyan-50 flex items-center gap-1.5 hover:border-[#00B4CC] hover:bg-cyan-100 transition-all">
                <Receipt size={16} className="text-[#00B4CC]"/>
                <span className="text-xs font-bold text-[#00B4CC] whitespace-nowrap">Rechercher un ticket</span>
              </button>
              {showMovementMenu && (
                <div className="absolute top-11 left-0 bg-white rounded-2xl border border-gray-100 shadow-lg p-2 w-48 z-20">
                  <button onClick={() => {
                      setMovementType('depot')
                      setShowMovementModal(true)
                      setShowMovementMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                    <Lock size={16} className="text-gray-400"/> Dépôt
                  </button>
                  <button onClick={() => {
                      setMovementType('retrait')
                      setShowMovementModal(true)
                      setShowMovementMenu(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                    <Unlock size={16} className="text-gray-400"/> Retrait de caisse
                  </button>
                </div>
              )}
            </div>

            <div className="relative mb-4">
              <Search size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={cartSearch}
                onChange={(e) => setCartSearch(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm"/>
            </div>

            {cartSearch.length >= 2 ? (
              cartSearchResults.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Aucun résultat pour "{cartSearch}"
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {cartSearchResults.map((result) => {
                    if (result._kind === 'article') {
                      return (
                        <button key={`art-${result.id}`}
                          onClick={() => addToCart(result)}
                          className="text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-all border border-transparent hover:border-[#1B2A4A]">
                          <p className="font-bold text-xs text-[#1B2A4A] mb-1 line-clamp-2">
                            {result.name}
                          </p>
                          <p className="text-sm font-bold text-[#00B4CC]">
                            {result.sale_price}€
                          </p>
                        </button>
                      )
                    }
                    const qualiteLabel = result.qualite === 'compatible' ? 'Compatible'
                      : result.qualite === 'original_equivalent' ? 'Qualité originale'
                      : '100% Original'
                    return (
                      <button key={`ecr-${result.id}`}
                        onClick={() => openNewRepairForm(result)}
                        className="text-left bg-purple-50 hover:bg-purple-100 rounded-xl p-3 transition-all border border-purple-100 hover:border-purple-300">
                        <p className="text-[10px] font-bold text-purple-600 uppercase mb-0.5">🔧 Réparation</p>
                        <p className="font-bold text-xs text-[#1B2A4A] line-clamp-2">
                          {result.modele}
                        </p>
                        <p className="text-[10px] text-purple-700 font-bold mb-1">{qualiteLabel}</p>
                        <p className="text-sm font-bold text-purple-700">
                          {Number(result.prix_defaut || 0).toFixed(2)}€
                        </p>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (() => {
              const posFiltered = items.filter((item) => {
                if (selectedPosCategory === 'Tout') return true
                const cat = categories.find((c) => c.name === selectedPosCategory)
                return cat && item.category_id === cat.id
              })
              return posFiltered.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Aucun article dans cette catégorie
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {posFiltered.map((item) => (
                    <button key={item.id}
                      onClick={() => addToCart(item)}
                      className="text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition-all border border-transparent hover:border-[#1B2A4A]">
                      <p className="font-bold text-xs text-[#1B2A4A] mb-1 line-clamp-2">
                        {item.name}
                      </p>
                      <p className="text-sm font-bold text-[#00B4CC]">
                        {item.sale_price}€
                      </p>
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* COLONNE DROITE — Ticket / Panier */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="font-bold text-[#1B2A4A]">
                {modeDevis ? 'Devis' : 'Ticket'} ({cart.length + repairsInCart.length + newRepairsInCart.length})
              </h3>
              <label className="relative inline-flex items-center cursor-pointer" title="Basculer en mode Devis (aucun impact CA/stock/commissions)">
                <input type="checkbox" checked={modeDevis}
                  onChange={(e) => setModeDevis(e.target.checked)}
                  className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-amber-500
                                after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                after:bg-white after:rounded-full after:h-4 after:w-4
                                after:transition-all peer-checked:after:translate-x-4"></div>
                <span className="ml-2 text-[10px] font-bold text-gray-600 uppercase">Devis</span>
              </label>
            </div>

            {cart.length === 0 && repairsInCart.length === 0 && newRepairsInCart.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm flex-1">
                Sélectionnez des articles
              </p>
            ) : (
              <>
                <div className="space-y-2 mb-4 flex-1 overflow-y-auto">
                  {repairsInCart.map((r) => (
                    <div key={r.repair_id} className="flex items-center justify-between gap-2 bg-amber-50 rounded-xl p-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1B2A4A] truncate">
                          🔧 {r.bon_number} — {r.client_nom}
                        </p>
                        <p className="text-[10px] text-gray-500">Solde réparation</p>
                      </div>
                      <span className="text-sm font-bold text-[#1B2A4A]">{r.unit_price.toFixed(2)}€</span>
                      <button onClick={() => removeRepairFromCart(r.repair_id)}
                        className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {newRepairsInCart.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-2 bg-purple-50 rounded-xl p-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1B2A4A] truncate">
                          🔧 Nouvelle — {r.modele} ({r.qualiteLabel})
                        </p>
                        <p className="text-[10px] text-gray-500">{r.clientNom}</p>
                      </div>
                      <span className="text-sm font-bold text-[#1B2A4A]">{r.unit_price.toFixed(2)}€</span>
                      <button onClick={() => removeNewRepairFromCart(r.key)}
                        className="text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {cart.map((c) => (
                    <div key={c.item_id}
                      onClick={() => setSelectedCartItemId(c.item_id)}
                      className={`bg-gray-50 rounded-xl p-2 cursor-pointer border-2 transition-all
                        ${selectedCartItemId === c.item_id
                          ? 'border-[#00B4CC]'
                          : 'border-transparent'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-[#1B2A4A] flex-1 line-clamp-1">
                          {c.item_name}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(c.item_id) }}
                          className="text-red-400 hover:text-red-600 ml-2">
                          <X size={13}/>
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateCartQty(c.item_id, -1) }}
                            className="w-5 h-5 rounded bg-white border border-gray-200 text-xs">−</button>
                          <span className="w-5 text-center text-xs font-bold">
                            {c.quantity}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateCartQty(c.item_id, 1) }}
                            className="w-5 h-5 rounded bg-white border border-gray-200 text-xs">+</button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" value={c.unit_price}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateCartPrice(c.item_id, e.target.value)}
                            disabled={!canModifyPrices}
                            title={!canModifyPrices ? "Vous n'avez pas le droit de modifier les prix" : undefined}
                            className={`w-16 px-1.5 py-1 border border-gray-200 rounded-lg text-xs text-right font-bold ${!canModifyPrices ? 'opacity-50 cursor-not-allowed' : ''}`}/>
                          <span className="text-xs text-gray-400">€</span>
                        </div>
                      </div>
                      {(c.discountType || c.quantity > 1) && (
                        <p className="text-right text-xs mt-1.5">
                          {c.discountType ? (
                            <>
                              <span className="line-through text-gray-400 mr-1">
                                {(c.unit_price * c.quantity).toFixed(2)}€
                              </span>
                              <span className="font-bold text-amber-600">
                                {lineTotal(c).toFixed(2)}€
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400">
                              = {lineTotal(c).toFixed(2)}€
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 mb-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-[#00B4CC]">
                      {cartTotal.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="relative">
                    <button
                      disabled={!canModifyPrices}
                      title={!canModifyPrices ? "Vous n'avez pas le droit de modifier les remises" : undefined}
                      onClick={() => {
                        if (!selectedCartItemId) {
                          alert('Sélectionne un article dans le panier d\'abord')
                          return
                        }
                        setDiscountMenuItemId(
                          discountMenuItemId === selectedCartItemId
                            ? null
                            : selectedCartItemId
                        )
                      }}
                      className={`${!canModifyPrices ? 'opacity-50 cursor-not-allowed ' : ''}w-full py-2.5 rounded-xl text-sm font-bold border-2
                        ${selectedCartItemId && cart.find(c => c.item_id === selectedCartItemId)?.discountType
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-white text-gray-600 border-gray-200'}`}>
                      % Remise
                    </button>

                    {discountMenuItemId && discountMenuItemId === selectedCartItemId && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl border border-gray-100 shadow-lg p-1.5 w-full z-30">
                        <button onClick={() => {
                            const pct = prompt('Remise en % :')
                            if (pct) applyItemDiscount(selectedCartItemId, 'remise_pct', pct)
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                          Remise article
                        </button>
                        <button onClick={() => {
                            setShowGlobalDiscount(true)
                            setDiscountMenuItemId(null)
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                          Remise globale
                        </button>
                        <button onClick={() => applyItemDiscount(selectedCartItemId, 'article_offert', 0)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                          Article offert
                        </button>
                        <button onClick={() => {
                            const amt = prompt('Rabais en € :')
                            if (amt) applyItemDiscount(selectedCartItemId, 'rabais', amt)
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                          Rabais (€)
                        </button>
                        {cart.find(c => c.item_id === selectedCartItemId)?.discountType && (
                          <button onClick={() => removeItemDiscount(selectedCartItemId)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 mt-1 border-t border-gray-100">
                            Retirer la remise
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button onClick={() => {
                      if (cart.length === 0 && repairsInCart.length === 0 && newRepairsInCart.length === 0) { alert('Panier vide'); return }
                      if (modeDevis) setShowDevisForm(true)
                      else setShowPaymentModal(true)
                    }}
                    disabled={cart.length === 0 && repairsInCart.length === 0 && newRepairsInCart.length === 0}
                    className={`py-2.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 ${
                      modeDevis
                        ? 'bg-amber-500 hover:bg-amber-600'
                        : 'bg-[#00B4CC] hover:bg-[#1B2A4A]'
                    }`}>
                    {modeDevis ? '📧 Envoyer le devis' : 'Ticket →'}
                  </button>
                </div>

                {/* Ancien bouton Ticket masqué (remplacé par la rangée à 2 colonnes) */}
                {false && (
                  <button onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-[#00B4CC] text-white rounded-xl font-bold hover:bg-[#1B2A4A] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Ticket →
                  </button>
                )}
              </>
            )}

            <button onClick={handlePrintDailyRecap}
              className="w-full mt-2 py-2 border border-gray-200 rounded-xl text-xs text-gray-500 hover:border-[#1B2A4A]">
              Imprimer récap du jour
            </button>
            {todaysClosure ? (
              <div className="w-full mt-2 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-center">
                <p className="text-gray-500 text-xs">
                  🔒 Déjà clôturé aujourd'hui — {Number(todaysClosure.ca_total).toFixed(2)}€
                </p>
              </div>
            ) : !canCloseNow ? (
              <div className="w-full mt-2 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <p className="text-amber-700 text-sm font-bold">
                  🕖 Clôture disponible à partir de 19h00
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Repasse après 19h pour clôturer la caisse.
                </p>
              </div>
            ) : (
              <button onClick={openClosureModal}
                className="w-full mt-2 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-xs font-bold hover:opacity-90">
                Clôturer la caisse
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB STOCK */}
      {posScreen === 'gestion' && activeTab === 'stock' && (
        <>
          <div className="grid grid-cols-[180px_1fr] gap-4">

            {/* COLONNE GAUCHE — Catégories */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-y-auto p-2 flex flex-col"
                 style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <button onClick={() => setFilterCategory(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all border
                  ${!filterCategory
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}>
                Tout
              </button>
              {categories.map(cat => (
                <button key={cat.id}
                  onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all border
                    ${filterCategory === cat.id
                      ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* COLONNE DROITE — Recherche + bouton Ajouter + Tableau */}
            <div className="min-w-0">

              <div className="flex gap-2 mb-4 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="text" value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Nom, référence ou scan code-barres..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                </div>
                <button
                  onClick={() => {
                    openItemModal()
                    if (filterCategory) {
                      setItemForm((f) => ({ ...f, category_id: filterCategory }))
                    }
                  }}
                  className="flex items-center gap-1.5 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC] flex-shrink-0">
                  <Plus size={16}/> Ajouter un article
                </button>
              </div>

              {/* Tableau */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Image</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Article</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Catégorie</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Fournisseur</th>
                      {trueIsAdmin && (
                        <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Achat</th>
                      )}
                      <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Vente</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Min / Max</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">Stock</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={trueIsAdmin ? 9 : 8} className="text-center py-8 text-gray-400">
                          Chargement...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={trueIsAdmin ? 9 : 8} className="text-center py-8 text-gray-400">
                          Aucun article trouvé
                        </td>
                      </tr>
                    ) : filtered.map(item => {
                      const cat = item.shop_categories
                      const isLow = item.quantity_alert > 0 && item.quantity <= item.quantity_alert
                      return (
                        <tr key={item.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package size={16} className="text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#1B2A4A] text-sm">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.reference && `Réf: ${item.reference}`}
                              {item.reference && item.barcode && ' · '}
                              {item.barcode && `CB: ${item.barcode}`}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {cat && (
                              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                                {cat.name}
                              </span>
                            )}
                            {item.sous_categorie && (
                              <p className="text-[10px] text-gray-400 mt-1">{item.sous_categorie}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {item.fournisseurs?.nom || '—'}
                          </td>
                          {trueIsAdmin && (
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">
                              {item.purchase_price}€
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-bold text-[#1B2A4A]">
                            {item.sale_price}€
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-400">
                            {item.price_min}€ / {item.price_max}€
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.sans_stock ? (
                              <span className="text-gray-400 text-sm">—</span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                                ${isLow
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'}`}>
                                {isLow && <AlertTriangle size={11} />}
                                {item.quantity ?? 0}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => openItemModal(item)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600">
                                <Pencil size={14}/>
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600">
                                <Trash2 size={14}/>
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
          </div>
        </>
      )}

      {/* TAB CATEGORIES */}
      {posScreen === 'gestion' && activeTab === 'categories' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => openCatModal()}
              className="flex items-center gap-2 bg-[#1B2A4A]
                         text-white px-4 py-2 rounded-xl
                         text-sm font-bold hover:bg-[#00B4CC]">
              <Plus size={16}/> Nouvelle catégorie
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              Aucune catégorie — créez-en une pour organiser
              votre stock
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => {
                const count = items.filter(
                  i => i.category_id === cat.id
                ).length
                const isSelected = selectedCategoryView?.id === cat.id
                return (
                  <div key={cat.id}
                    onClick={() => setSelectedCategoryView(cat)}
                    className={`bg-white rounded-2xl border
                               p-4 flex items-center
                               justify-between cursor-pointer
                               transition-all
                               ${isSelected
                                 ? 'border-[#1B2A4A] shadow-md'
                                 : 'border-gray-100 hover:border-[#00B4CC]'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl flex
                                       items-center justify-center
                                       text-sm font-bold
                                       bg-gray-100 text-gray-600">
                        <Tag size={14}/>
                      </span>
                      <div>
                        <p className="font-bold text-[#1B2A4A] text-sm">
                          {cat.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {count} article{count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openCatModal(cat)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg
                                   text-blue-400 hover:text-blue-600">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => handleDeleteCat(cat.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg
                                   text-red-400 hover:text-red-600">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedCategoryView && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1B2A4A]">
                  Articles — {selectedCategoryView.name}
                </h3>
                <button onClick={() => setSelectedCategoryView(null)}
                  className="text-gray-400 hover:text-[#1B2A4A]">
                  ✕
                </button>
              </div>
              <button
                onClick={() => {
                  openItemModal()
                  setItemForm((f) => ({ ...f, category_id: selectedCategoryView.id }))
                }}
                className="mb-3 flex items-center gap-1.5 bg-[#1B2A4A] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#00B4CC]">
                <Plus size={14}/> Ajouter un article
              </button>
              {items.filter(i => i.category_id === selectedCategoryView.id).length === 0 ? (
                <p className="text-center text-gray-400 py-4 text-sm">
                  Aucun article dans cette catégorie
                </p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items
                    .filter(i => i.category_id === selectedCategoryView.id)
                    .map(item => (
                      <div key={item.id}
                        className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-bold text-sm text-[#1B2A4A]">
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-[#00B4CC]">
                          {item.sale_price}€
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL ARTICLE */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50
                        flex items-center justify-center p-4
                        overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl
                          w-full max-w-lg my-8
                          max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b
                            border-gray-100 p-4 flex items-center
                            justify-between">
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                {editItem ? 'Modifier' : 'Ajouter'} un article
              </h2>
              <button onClick={() => setShowItemModal(false)}>
                <X size={20} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-6 space-y-4">

              {/* Zone upload image */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Image
                </label>
                <div className="flex items-center gap-3">
                  {itemForm.image_url ? (
                    <img src={itemForm.image_url} alt=""
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={28} className="text-gray-400" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files[0])}
                      disabled={uploadingImage} />
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#00B4CC] transition-all">
                      <Upload size={14} />
                      {uploadingImage ? 'Envoi...' : (itemForm.image_url ? 'Remplacer l\'image' : 'Choisir une image')}
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500
                                 uppercase mb-1 block">
                  Nom *
                </label>
                <input value={itemForm.name}
                  onChange={e => setItemForm(f => ({
                    ...f, name: e.target.value
                  }))}
                  placeholder="Ex: Écran iPhone 13 Pro"
                  className="w-full px-3 py-2 border border-gray-200
                             rounded-xl text-sm"/>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Code-barres
                </label>
                <div className="flex gap-2">
                  <input value={itemForm.barcode}
                    onChange={e => setItemForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="Généré automatiquement si vide"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"/>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Laisse vide pour générer un code-barres automatiquement,
                  ou saisis le tien.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500
                                 uppercase mb-1 block">
                  Catégorie
                </label>
                <select value={itemForm.category_id}
                  onChange={e => setItemForm(f => ({
                    ...f, category_id: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-200
                             rounded-xl text-sm">
                  <option value="">Sans catégorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* MASQUÉ TEMPORAIREMENT - Quantité + Alerte stock bas */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-800">Article sans stock (prix libre)</p>
                  <p className="text-xs text-amber-600">ex: acompte, service, réparation — pas de suivi de quantité</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={itemForm.sans_stock}
                    onChange={(e) => setItemForm((f) => ({ ...f, sans_stock: e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-500
                                  after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                  after:bg-white after:rounded-full after:h-5 after:w-5
                                  after:transition-all peer-checked:after:translate-x-5"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Quantité minimum
                </label>
                <input type="number" value={itemForm.quantity_alert}
                  onChange={e => setItemForm(f => ({ ...f, quantity_alert: Number(e.target.value) }))}
                  placeholder="3"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
                <p className="text-[10px] text-gray-400 mt-1">
                  Seuil en dessous duquel une alerte de stock bas s'affiche.
                </p>
              </div>

              <div className={`grid ${trueIsAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                {trueIsAdmin && (
                  <div>
                    <label className="text-xs font-bold text-gray-500
                                     uppercase mb-1 block">
                      Prix d'achat (€)
                    </label>
                    <input type="number" value={itemForm.purchase_price}
                      onChange={e => setItemForm(f => ({
                        ...f, purchase_price: Number(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-200
                                 rounded-xl text-sm"/>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500
                                   uppercase mb-1 block">
                    Prix de vente (€)
                  </label>
                  <input type="number" value={itemForm.sale_price}
                    onChange={e => setItemForm(f => ({
                      ...f, sale_price: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-200
                               rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500
                                   uppercase mb-1 block">
                    Taux de TVA
                  </label>
                  <select value={itemForm.tva_rate}
                    onChange={(e) => setItemForm((f) => ({ ...f, tva_rate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value={21}>21% (standard)</option>
                    <option value={12}>12%</option>
                    <option value={6}>6%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500
                                   uppercase mb-1 block">
                    Prix minimum (€)
                  </label>
                  <input type="number" value={itemForm.price_min}
                    onChange={e => setItemForm(f => ({
                      ...f, price_min: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-200
                               rounded-xl text-sm"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500
                                   uppercase mb-1 block">
                    Prix maximum (€)
                  </label>
                  <input type="number" value={itemForm.price_max}
                    onChange={e => setItemForm(f => ({
                      ...f, price_max: Number(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-200
                               rounded-xl text-sm"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Fournisseur
                </label>
                <select value={itemForm.fournisseur_id}
                  onChange={e => setItemForm(f => ({ ...f, fournisseur_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="">Aucun</option>
                  {fournisseursList.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500
                                 uppercase mb-1 block">
                  Description (optionnel)
                </label>
                <textarea rows={2} value={itemForm.description}
                  onChange={e => setItemForm(f => ({
                    ...f, description: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-200
                             rounded-xl text-sm resize-none"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2.5 border border-gray-200
                             rounded-xl text-gray-600 text-sm">
                  Annuler
                </button>
                <button onClick={handleSaveItem}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white
                             rounded-xl text-sm font-bold
                             hover:bg-[#00B4CC]">
                  {editItem ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIE */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50
                        flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl
                          w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                {editCat ? 'Modifier' : 'Nouvelle'} catégorie
              </h2>
              <button onClick={() => setShowCatModal(false)}>
                <X size={20} className="text-gray-400"/>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500
                                 uppercase mb-1 block">
                  Nom *
                </label>
                <input value={catForm.name}
                  onChange={e => setCatForm(f => ({
                    ...f, name: e.target.value
                  }))}
                  placeholder="Ex: Écrans, Batteries, Accessoires..."
                  className="w-full px-3 py-2 border border-gray-200
                             rounded-xl text-sm"/>
              </div>
              {/* MASQUÉ TEMPORAIREMENT - Sélecteur couleur catégorie */}
              {false && (
                <div>
                  <label className="text-xs font-bold text-gray-500
                                   uppercase mb-1 block">
                    Couleur
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c.value}
                        onClick={() => setCatForm(f => ({
                          ...f, color: c.value
                        }))}
                        style={{ background: c.bg, color: c.text }}
                        className={`px-3 py-1.5 rounded-xl text-xs
                                    font-bold border-2 transition-all
                          ${catForm.color === c.value
                            ? 'border-gray-800'
                            : 'border-transparent'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCatModal(false)}
                  className="flex-1 py-2.5 border border-gray-200
                             rounded-xl text-gray-600 text-sm">
                  Annuler
                </button>
                <button onClick={handleSaveCat}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white
                             rounded-xl text-sm font-bold
                             hover:bg-[#00B4CC]">
                  {editCat ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOUVEMENT (dépôt / retrait) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-[#1B2A4A] mb-4">
              {movementType === 'depot' ? 'Dépôt de caisse' : 'Retrait de caisse'}
            </h3>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setMovementType('depot')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2
                  ${movementType === 'depot'
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white text-gray-600 border-gray-200'}`}>
                Dépôt
              </button>
              <button onClick={() => setMovementType('retrait')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2
                  ${movementType === 'retrait'
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white text-gray-600 border-gray-200'}`}>
                Retrait
              </button>
            </div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Montant</label>
            <input type="number" value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3"/>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Raison</label>
            <input type="text" value={movementReason}
              onChange={(e) => setMovementReason(e.target.value)}
              placeholder="Ex: Fond de caisse, Achat fournitures..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3"/>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Moyen</label>
            <select value={movementPayment}
              onChange={(e) => setMovementPayment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4">
              <option value="cash">Cash</option>
              <option value="bancontact">Bancontact</option>
              <option value="virement">Virement</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowMovementModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={handleAddMovement}
                className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CLOTURE Z */}
      {showClosureModal && closureData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl my-8 p-4">
            {closureData.ticketCount >= 900 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-3">
                <p className="text-sm font-bold text-amber-800">
                  ⚠️ Volume élevé : {closureData.ticketCount} ventes détectées
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Au-delà de 1000 ventes sur une même période, certaines
                  pourraient ne pas être comptabilisées dans cette clôture
                  (limite technique de la base de données). Si le magasin n'a
                  pas clôturé depuis longtemps, vérifie attentivement les
                  montants avant de confirmer, ou contacte le support si un
                  doute existe.
                </p>
              </div>
            )}
            <ZFinancierReport
              reportNumber={(lastClosure ? 1 : 0) + 1}
              caisse={magasin}
              dateTime={new Date(closureData.periodEnd)}
              periodStart={new Date(closureData.periodStart)}
              periodEnd={new Date(closureData.periodEnd)}
              ventes={{ montant: closureData.caTotal, count: closureData.ticketCount }}
              retours={{ montant: 0, count: 0 }}
              tvaRows={closureData.tvaRows}
              reglements={closureData.reglementsArr}
              ventesFacturees={{ factures: 0, notesCredit: 0 }}
              remisesSurVentes={{ montant: 0, count: 0 }}
              categories={closureData.categoriesArr}
              proformats={{ bonsLivraison: 0, commandesClient: 0 }}
              retraits={closureData.retraitsArr}
              totalCashEnCaisse={closureData.totalCaisseCash}
              totalCompte={Number(prelevementAmount) || closureData.totalCaisseCash}
              paperWidth="80mm"
            />

            <div className="mt-3">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Montant compté en caisse
              </label>
              <input type="number" value={prelevementAmount}
                onChange={(e) => setPrelevementAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3"/>
            </div>

            {clotureTachesList.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  Avant de clôturer
                </p>
                <div className="space-y-1.5">
                  {clotureTachesList.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={!!checkedTaches[t.id]}
                        onChange={(e) => setCheckedTaches((prev) => ({ ...prev, [t.id]: e.target.checked }))}
                        className="w-4 h-4 accent-[#00B4CC]" />
                      {t.label}
                    </label>
                  ))}
                </div>
                {clotureTachesList.some((t) => !checkedTaches[t.id]) && (
                  <p className="text-[11px] text-amber-600 font-bold mt-2">
                    ⚠️ Toutes les tâches ne sont pas cochées
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowClosureModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={handlePrintClosure}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Imprimer
              </button>
              <button onClick={confirmClosure}
                disabled={closureLoading}
                className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {closureLoading ? '...' : 'Clôturer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2A4A]">Paiement</h3>
              <button onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={18}/>
              </button>
            </div>

            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 mb-1">Reste à payer</p>
              <button onClick={() => setCurrentPaymentAmount(String(remainingToPay))}
                className="text-3xl font-bold text-[#00B4CC] hover:opacity-70 transition-opacity">
                {remainingToPay.toFixed(2)}€
              </button>
            </div>

            {paymentSplits.length > 0 && (
              <div className="space-y-1 mb-3">
                {paymentSplits.map((p, idx) => (
                  <div key={idx}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5 text-xs">
                    <span>
                      {p.method === 'cash' ? 'Cash' :
                       p.method === 'bancontact' ? 'Bancontact' : 'Virement'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{p.amount.toFixed(2)}€</span>
                      <button onClick={() => removePaymentSplit(idx)}
                        className="text-red-400 hover:text-red-600">
                        <X size={13}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {changeToGive > 0 && (
              <div className="bg-amber-50 text-amber-700 rounded-lg px-3 py-2 text-sm font-bold mb-3 text-center">
                À rendre : {changeToGive.toFixed(2)}€
              </div>
            )}

            {!isFullyPaid && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bancontact', label: 'Bancontact' },
                    { value: 'virement', label: 'Virement' },
                  ].map((m) => (
                    <button key={m.value}
                      onClick={() => setCurrentPaymentMethod(m.value)}
                      className={`py-2 rounded-xl text-xs font-bold border-2
                        ${currentPaymentMethod === m.value
                          ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                          : 'bg-white text-gray-600 border-gray-200'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>

                <input type="number" value={currentPaymentAmount}
                  onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-lg font-bold text-center mb-2"/>

                <div className="mb-4">
                  {cart.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {[...new Set(cart.map((c) => lineTotal(c)))]
                        .filter((v) => v > 0)
                        .map((val) => (
                          <button key={val}
                            onClick={() => setCurrentPaymentAmount(String(val))}
                            className="px-3 py-1.5 border border-[#00B4CC] rounded-xl text-xs font-bold text-[#00B4CC] hover:bg-[#00B4CC] hover:text-white">
                            {val.toFixed(2)}€
                          </button>
                        ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 50].map((amt) => (
                      <button key={amt}
                        onClick={() => setCurrentPaymentAmount(
                          String((Number(currentPaymentAmount) || 0) + amt)
                        )}
                        className="py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-[#1B2A4A]">
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={addPaymentSplit}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 mb-2">
                  Enregistrer
                </button>
              </>
            )}

            {isFullyPaid && (
              <button onClick={async () => {
                  await handleCheckout()
                  setShowPaymentModal(false)
                }}
                disabled={checkoutLoading}
                className="w-full py-3 bg-[#00B4CC] text-white rounded-xl font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                {checkoutLoading ? 'Encaissement...' : 'Confirmer et imprimer'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL REMISE GLOBALE */}
      {showGlobalDiscount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5">
            <h3 className="font-bold text-[#1B2A4A] mb-3">
              Remise globale (%)
            </h3>
            <input type="number" value={globalDiscountValue}
              onChange={(e) => setGlobalDiscountValue(e.target.value)}
              placeholder="10"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4"/>
            <div className="flex gap-2">
              <button onClick={() => {
                  setGlobalDiscountValue('')
                  setShowGlobalDiscount(false)
                }}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Annuler
              </button>
              <button onClick={() => setShowGlobalDiscount(false)}
                className="flex-1 py-2 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold">
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION MONNAIE À RENDRE */}
      {showChangeConfirm && pendingSaleData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-amber-600 font-bold text-lg">€</span>
            </div>
            <p className="font-bold text-[#1B2A4A] text-lg mb-1">
              {Number(pendingSaleData.changeToGive || 0).toFixed(2)}€ à rendre
            </p>
            <p className="text-xs text-gray-500 mb-5">
              Confirme que le client a bien reçu sa monnaie
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmChangeGiven}
                className="w-full py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold">
                OK — monnaie rendue
              </button>
              <button onClick={confirmChangeGiven}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-bold">
                Bon d'achat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TICKET après encaissement — format professionnel */}
      {showTicket && lastSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl my-8 p-4">
            <ReceiptTicket
              ticketNumber={lastSale.ticketNumber}
              vendeur={lastSale.staffName || 'Admin'}
              dateTime={new Date(lastSale.created_at || Date.now())}
              items={lastSale.items.map((c) => ({
                qte: c.quantity,
                name: c.item_name,
                tot: lineTotal(c),
              }))}
              payments={lastSale.paymentsUsed || []}
              changeAmount={lastSale.changeToGive || 0}
              tvaRate={21}
              paperWidth="80mm"
              repairInfoList={lastSale.repairInfoList || []}
              onPrint={() => printViaAgent({
                companyName: 'SLT GROUP (SRL)',
                tva: 'BE 1028.764.677',
                caisseNom: magasin,
                dateTime: (() => {
                  const d = new Date(lastSale.created_at || Date.now())
                  const pad = (n) => String(n).padStart(2, '0')
                  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
                })(),
                ticketNumber: lastSale.ticketNumber,
                barcode: (() => {
                  const base = '200' + String(lastSale.ticketNumber).padStart(9, '0')
                  let sum = 0
                  for (let i = 0; i < 12; i++) {
                    const digit = parseInt(base[i], 10)
                    sum += (i % 2 === 0) ? digit : digit * 3
                  }
                  const checkDigit = (10 - (sum % 10)) % 10
                  return base + String(checkDigit)
                })(),
                items: lastSale.items.map((c) => ({
                  name: c.item_name,
                  qty: c.quantity,
                  total: lineTotal(c),
                })),
                reglements: (lastSale.paymentsUsed || []).map((p) => ({
                  mode: p.type === 'cash' ? 'Cash' : p.type === 'bancontact' ? 'Bancontact' : 'Virement',
                  montant: p.amount,
                })),
                tvaRate: 21,
              }, () => window.print())}
            />
            {!showEmailTicketForm ? (
              <button onClick={() => setShowEmailTicketForm(true)}
                className="w-full mt-2 py-2.5 border border-[#00B4CC] text-[#00B4CC] rounded-xl text-sm font-bold hover:bg-cyan-50">
                ✉️ Envoyer par email
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input type="email" value={ticketEmailInput}
                  onChange={(e) => setTicketEmailInput(e.target.value)}
                  placeholder="email@client.com"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <button onClick={handleSendTicketEmail} disabled={sendingTicketEmail}
                  className="px-4 py-2 bg-[#00B4CC] text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {sendingTicketEmail ? '...' : 'Envoyer'}
                </button>
              </div>
            )}
            <button onClick={() => setShowTicket(false)}
              className="w-full mt-2 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOUVELLE RÉPARATION (depuis clic écran catalogue en caisse) */}
      {showNewRepairForm && newRepairEcran && (() => {
        const qualiteLabel = newRepairEcran.qualite === 'compatible' ? 'Compatible'
          : newRepairEcran.qualite === 'original_equivalent' ? 'Qualité originale'
          : '100% Original'
        return (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#1B2A4A] text-lg">
                    Réparation — {newRepairEcran.modele}
                  </h3>
                  <p className="text-xs text-purple-700 font-bold mt-0.5">
                    {qualiteLabel} · {Number(newRepairEcran.prix_defaut || 0).toFixed(2)}€
                  </p>
                </div>
                <button onClick={() => { setShowNewRepairForm(false); setNewRepairEcran(null) }}
                  className="text-gray-400 hover:text-[#1B2A4A]">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                    Nom du client *
                  </label>
                  <input type="text" autoFocus value={newRepairClientData.nom}
                    onChange={(e) => setNewRepairClientData((f) => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom et prénom"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                    Téléphone
                  </label>
                  <input type="tel" value={newRepairClientData.tel}
                    onChange={(e) => setNewRepairClientData((f) => ({ ...f, tel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                    Email
                  </label>
                  <input type="email" value={newRepairClientData.email}
                    onChange={(e) => setNewRepairClientData((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                    IMEI / N° série
                  </label>
                  <input type="text" value={newRepairClientData.imei}
                    onChange={(e) => setNewRepairClientData((f) => ({ ...f, imei: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowNewRepairForm(false); setNewRepairEcran(null) }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-bold">
                  Annuler
                </button>
                <button onClick={confirmAddNewRepairToCart}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-purple-700">
                  Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL NOUVELLE RÉPARATION (depuis le hub) */}
      {showNewRepairFromHub && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 my-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1B2A4A] text-lg">Nouvelle réparation</h3>
              <button onClick={() => setShowNewRepairFromHub(false)}
                className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Nom du client *</label>
                <input type="text" autoFocus value={newRepairFromHubForm.nom}
                  onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Nom et prénom"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Appareil</label>
                  <input type="text" value={newRepairFromHubForm.appareil}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, appareil: e.target.value }))}
                    placeholder="ex: iPhone 13"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">IMEI</label>
                  <input type="text" value={newRepairFromHubForm.imei}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, imei: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Type de panne</label>
                  <input type="text" value={newRepairFromHubForm.type_panne}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, type_panne: e.target.value }))}
                    placeholder="ex: Écran cassé"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Prix (€)</label>
                  <input type="number" step="0.01" min="0" value={newRepairFromHubForm.prix}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, prix: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Téléphone</label>
                  <input type="tel" value={newRepairFromHubForm.tel}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, tel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Email</label>
                  <input type="email" value={newRepairFromHubForm.email}
                    onChange={(e) => setNewRepairFromHubForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                Pour enregistrer un acompte, prend le paiement via la caisse (panier "Réparations en attente").
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNewRepairFromHub(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-bold">
                Annuler
              </button>
              <button onClick={handleCreateNewRepairFromHub} disabled={savingNewRepairFromHub}
                className="flex-1 py-2.5 bg-[#00B4CC] text-white rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                {savingNewRepairFromHub ? 'Création...' : 'Créer la réparation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DÉTAIL JOUR — réparations du jour cliqué dans le calendrier hub */}
      {selectedJourReparations && (() => {
        const reps = reparationsHubData.filter((r) => {
          const eff = r.date || (r.created_at ? r.created_at.slice(0, 10) : null)
          return eff === selectedJourReparations
        })
        return (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1B2A4A] text-lg capitalize">
                  {new Date(selectedJourReparations).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedJourReparations(null)}
                  className="text-gray-400 hover:text-[#1B2A4A]">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {reps.length} réparation{reps.length > 1 ? 's' : ''} ce jour
              </p>
              <div className="space-y-2">
                {reps.map((r) => (
                  <div key={r.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-gray-500">{r.bon_number}</span>
                      <p className="font-bold text-[#1B2A4A] text-sm">{r.client_nom}</p>
                    </div>
                    {r.appareil && <p className="text-xs text-gray-600">📱 {r.appareil}</p>}
                    {r.type_panne && <p className="text-xs text-gray-500">{r.type_panne}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">
                      Traité par : <span className="font-bold text-[#00B4CC]">{r.staff_name || 'Non renseigné'}</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase mt-1">
                      Statut : {r.status === 'termine' ? 'Terminé' : r.status === 'abandonne' ? 'Abandonné' : 'En attente'}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={() => setSelectedJourReparations(null)}
                className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Fermer
              </button>
            </div>
          </div>
        )
      })()}

      {/* POPUP RAPPEL TÂCHES DU JOUR (tâches récurrentes) */}
      {showTacheReminder && tachesDuJour.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-[95] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-bold text-[#1B2A4A] text-lg mb-1">🧹 Tâches du jour</h3>
            <p className="text-xs text-gray-500 mb-4">À faire avant la fin de journée</p>
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {tachesDuJour.map((t) => (
                <div key={t.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-[#1B2A4A]">{t.titre}</p>
                    {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                  </div>
                  <button onClick={() => handleCompleteTache(t.id)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                    ✓ Fait
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowTacheReminder(false)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer (rappel dans {Math.min(...tachesDuJour.map((t) => t.intervalle_rappel_min || 15))} min)
            </button>
          </div>
        </div>
      )}

      {/* MODAL ADMIN — TÂCHES RÉCURRENTES */}
      {showTachesAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2A4A] text-lg">Tâches récurrentes</h3>
              <button onClick={() => setShowTachesAdmin(false)} className="text-gray-400 hover:text-[#1B2A4A]">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase">Nouvelle tâche</p>
              <input type="text" value={tacheRecurrenteForm.titre}
                onChange={(e) => setTacheRecurrenteForm((f) => ({ ...f, titre: e.target.value }))}
                placeholder="Ex: Nettoyer le magasin"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              <textarea rows={2} value={tacheRecurrenteForm.description}
                onChange={(e) => setTacheRecurrenteForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Détail (optionnel)"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Jours concernés</p>
                <div className="flex flex-wrap gap-1.5">
                  {['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map((j) => (
                    <button key={j} type="button"
                      onClick={() => setTacheRecurrenteForm((f) => ({
                        ...f,
                        jours_semaine: f.jours_semaine.includes(j)
                          ? f.jours_semaine.filter((x) => x !== j)
                          : [...f.jours_semaine, j],
                      }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                        tacheRecurrenteForm.jours_semaine.includes(j)
                          ? 'bg-[#1B2A4A] text-white' : 'bg-white border border-gray-200 text-gray-500'
                      }`}>
                      {j.slice(0,3)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Magasins (vide = tous)</p>
                <div className="flex flex-wrap gap-1.5">
                  {MAGASINS_CAISSE.map((m) => (
                    <button key={m.id} type="button"
                      onClick={() => setTacheRecurrenteForm((f) => ({
                        ...f,
                        magasins: f.magasins.includes(m.id)
                          ? f.magasins.filter((x) => x !== m.id)
                          : [...f.magasins, m.id],
                      }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        tacheRecurrenteForm.magasins.includes(m.id)
                          ? 'bg-[#1B2A4A] text-white' : 'bg-white border border-gray-200 text-gray-500'
                      }`}>
                      {m.nom.replace('Seb Telecom — ', '')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Rappel toutes les</p>
                <input type="number" min="1" value={tacheRecurrenteForm.intervalle_rappel_min}
                  onChange={(e) => setTacheRecurrenteForm((f) => ({ ...f, intervalle_rappel_min: Number(e.target.value) }))}
                  className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm" />
                <p className="text-[10px] text-gray-500">minutes</p>
              </div>
              <button onClick={handleCreateTache}
                className="w-full py-2 bg-[#00B4CC] text-white rounded-xl text-sm font-bold hover:bg-[#1B2A4A]">
                + Créer la tâche
              </button>
            </div>

            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tâches existantes</p>
            {tachesAdminList.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Aucune tâche créée</p>
            ) : (
              <div className="space-y-2">
                {tachesAdminList.map((t) => (
                  <div key={t.id} className={`rounded-xl p-3 border ${t.active ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-[#1B2A4A]">{t.titre}</p>
                        <p className="text-[10px] text-gray-500 capitalize">
                          {t.jours_semaine.join(', ')} · {t.magasins?.length ? t.magasins.join(', ') : 'Tous les magasins'} · toutes les {t.intervalle_rappel_min} min
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleToggleTacheActive(t)}
                          className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200 text-gray-600">
                          {t.active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button onClick={() => handleDeleteTacheRecurrente(t.id)}
                          className="text-xs font-bold px-2 py-1 rounded-lg border border-red-200 text-red-600">
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowTachesAdmin(false)}
              className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
