import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Pencil, Trash2, Search,
         AlertTriangle, Package, Tag,
         Menu, Lock, Unlock, LogOut,
         Settings, Clock, Save, UserCheck, Send, Calendar,
         Image as ImageIcon, Upload } from 'lucide-react'
import { MAGASINS_ADMIN as MAGASINS_LIST } from '../../utils/magasins'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'
import ReceiptTicket from '../../components/admin/ReceiptTicket'
import ZFinancierReport from '../../components/admin/ZFinancierReport'
import CaisseAccueil from '../../components/admin/CaisseAccueil'
import CaissePinLock from '../../components/admin/CaissePinLock'
import StaffScheduleCalendar from '../../components/admin/StaffScheduleCalendar'
import { calcSalairePeriode, getWeekBounds } from '../../lib/calcSalaire'
import { logActivity } from '../../lib/logActivity'

const POS_CATEGORIES = [
  'Coque', 'Vitre de protection', 'Audio', 'Chargeur',
  'Carte mémoire', 'Ordinateur', 'Tablette', 'PlayStation',
  'Écran', 'Caméra', 'Batterie', 'Vitre arrière',
  'Autre téléphone', 'Écran Samsung',
]

export default function StockMagasin() {
  const isAdmin = useIsAdmin()
  const hasPermission = usePermission('stock_magasin')
  const canManageStaff = usePermission('gerer_utilisateurs')
  const canAccessParamsCaisse = isAdmin || canManageStaff
  const canModifyPrices  = isAdmin || usePermission('modifier_prix_remises')
  const canRappelTicket  = isAdmin || usePermission('rappel_ticket')
  const canOpenDrawer    = isAdmin || usePermission('ouvrir_tiroir_sans_vente')
  const canClotureLimitee = usePermission('cloture_limitee')

  const [magasin, setMagasin] = useState('')
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
  const [paymentSplits, setPaymentSplits] = useState([])
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('cash')
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('')
  const [showChangeConfirm, setShowChangeConfirm] = useState(false)
  const [pendingSaleData, setPendingSaleData] = useState(null)
  const [showTicket, setShowTicket] = useState(false)
  const [lastSale, setLastSale] = useState(null)
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
  const [showClosureModal, setShowClosureModal] = useState(false)
  const [closureData, setClosureData] = useState(null)
  const [closureLoading, setClosureLoading] = useState(false)
  const [prelevementAmount, setPrelevementAmount] = useState('')
  const [selectedCategoryView, setSelectedCategoryView] = useState(null)
  const [selectedPosCategory, setSelectedPosCategory] = useState('Tout')
  const [posScreen, setPosScreen] = useState('accueil') // accueil | caisse | gestion | cloture | parametres | pointage

  // Écran Pointage personnel (vue employé)
  const [myStaffRecord, setMyStaffRecord] = useState(null)
  const [loadingMyPointage, setLoadingMyPointage] = useState(false)
  const [showReplacementForm, setShowReplacementForm] = useState(false)
  const [replacementForm, setReplacementForm] = useState({
    date: '', repos: false, heure_debut: '10:00', heure_fin: '20:00', note: '',
  })
  const [sendingReplacement, setSendingReplacement] = useState(false)

  // Verrou PIN caisse
  const [caisseSession, setCaisseSession] = useState(null)

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

  const calcGainDirect = () => {
    if (!pointageAujourdhui || !pointageAujourdhui.heure_arrivee) return null
    const wage = Number(selectedStaffCaisse?.hourly_wage || 0)
    const arr = new Date(pointageAujourdhui.heure_arrivee)
    const end = pointageAujourdhui.heure_depart ? new Date(pointageAujourdhui.heure_depart) : new Date()
    const heures = Math.max(0, (end - arr) / 3600000)
    const brut = heures * wage
    const net = brut - Number(pointageAujourdhui.penalite_retard || 0)
    return { heures, net, enCours: !pointageAujourdhui.heure_depart }
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
              return (
                <div className="mt-3 rounded-xl p-3 border border-cyan-100"
                  style={{ background: 'linear-gradient(135deg, #ecfeff 0%, #ccfbf1 100%)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-[#1B2A4A] flex items-center gap-1">
                      {g.enCours
                        ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> En direct</>
                        : <>Session terminée</>}
                    </span>
                    <span className="text-lg font-black text-teal-700">
                      {g.net.toFixed(2)}€
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {h}h {String(m).padStart(2, '0')}min travaillées
                  </p>
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
                const maxH = Math.max(1, ...joursTravaillesSemaine.map((d) => d.hours))
                const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
                return (
                  <div className="flex items-end justify-between gap-1.5 h-24">
                    {joursTravaillesSemaine.map((d, i) => {
                      const pct = (d.hours / maxH) * 100
                      return (
                        <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex items-end h-full">
                            <div
                              className="w-full rounded-t-md bg-gradient-to-t from-[#1B2A4A] to-[#00B4CC] transition-all"
                              style={{ height: `${Math.max(2, pct)}%` }}
                              title={`${d.hours.toFixed(1)}h`}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-gray-500 uppercase">
                            {dayLabels[i]}
                          </span>
                        </div>
                      )
                    })}
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
    if (!window.confirm('Terminer votre session sur ce poste ?')) return
    await supabase.from('staff_pointages')
      .update({ heure_depart: new Date().toISOString() })
      .eq('id', caisseSession.pointageId)
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

    const [pointRes, salaire, salaireSem, pointagesSemRes] = await Promise.all([
      supabase.from('staff_pointages').select('*').eq('staff_id', staff.id).eq('date', today).maybeSingle(),
      calcSalairePeriode(supabase, staff.id, staff.hourly_wage || 0, dateStart, today),
      calcSalairePeriode(supabase, staff.id, staff.hourly_wage || 0, weekStart, weekEnd),
      supabase.from('staff_pointages').select('date,heure_arrivee,heure_depart')
        .eq('staff_id', staff.id).gte('date', weekStart).lte('date', weekEnd),
    ])

    // Barres 7 jours (Lun -> Dim) avec heures travaillées
    const monday = new Date(weekStart)
    const dayHours = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dStr = d.toISOString().slice(0, 10)
      const p = (pointagesSemRes.data || []).find((x) => x.date === dStr)
      let hours = 0
      if (p?.heure_arrivee && p?.heure_depart) {
        hours = (new Date(p.heure_depart) - new Date(p.heure_arrivee)) / 3600000
      } else if (p?.heure_arrivee && dStr === today) {
        hours = (new Date() - new Date(p.heure_arrivee)) / 3600000
      }
      dayHours.push({ dateStr: dStr, hours: Math.max(0, hours) })
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posScreen, canAccessParamsCaisse])

  useEffect(() => {
    if (magasin) {
      fetchCategories().then(() => ensurePosCategories())
      fetchItems()
      fetchCaisseToday()
      fetchFournisseursList()
      fetchLastClosure().then((closure) => {
        fetchMovementsSince(closure?.period_end || '1970-01-01T00:00:00Z')
      })
    }
  }, [magasin])

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
      .from('shop_items')
      .select('*, shop_categories(name, color), fournisseurs(nom)')
      .eq('magasin_id', magasin)
      .order('name')
    setItems(data || [])
    setLoading(false)
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
    } : {
      name: '', reference: '', barcode: '',
      category_id: categories[0]?.id || '', sous_categorie: '',
      quantity: 0, quantity_alert: 3,
      purchase_price: 0, sale_price: 0,
      price_min: 0, price_max: 0,
      description: '',
      image_url: '', fournisseur_id: '',
      sans_stock: false,
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.name) {
      alert('Nom obligatoire'); return
    }
    const payload = {
      ...itemForm,
      quantity:       itemForm.sans_stock ? 0 : (itemForm.quantity || 0),
      purchase_price: itemForm.purchase_price || null,
      quantity_alert: itemForm.sans_stock ? 0 : (itemForm.quantity_alert || 0),
      barcode:        itemForm.barcode || null,
      reference:      itemForm.reference || null,
      sous_categorie: itemForm.sous_categorie || null,
      image_url:      itemForm.image_url || null,
      fournisseur_id: itemForm.fournisseur_id || null,
      sans_stock:     itemForm.sans_stock,
      magasin_id: magasin,
      updated_at: new Date().toISOString(),
    }
    if (editItem) {
      await supabase.from('shop_items')
        .update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('shop_items').insert(payload)
    }
    setShowItemModal(false)
    fetchItems()
  }

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Supprimer cet article ?')) return
    await supabase.from('shop_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
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

  const cartSearchResults = cartSearch.length >= 2
    ? items.filter(i =>
        i.name?.toLowerCase().includes(cartSearch.toLowerCase()) ||
        i.reference?.toLowerCase().includes(cartSearch.toLowerCase()) ||
        i.barcode?.includes(cartSearch)
      ).slice(0, 8)
    : []

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

  const cartSubtotal = cart.reduce((sum, c) => sum + lineTotal(c), 0)
  const globalDiscountAmount = globalDiscountValue
    ? cartSubtotal * (Number(globalDiscountValue) / 100)
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
    if (cart.length === 0 || !isFullyPaid) return
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

    const saleItems = cart.map(c => ({
      sale_id: sale.id,
      item_id: c.item_id,
      item_name: c.item_name,
      quantity: c.quantity,
      unit_price: c.unit_price,
      total_price: lineTotal(c),
      discount_type: c.discountType || null,
      discount_value: c.discount || 0,
    }))

    await supabase.from('shop_sale_items').insert(saleItems)

    if (staffId) {
      const { data: itemCats } = await supabase
        .from('shop_items')
        .select('id, shop_categories(name)')
        .in('id', cart.map((c) => c.item_id))

      const commissionRows = cart
        .map((c) => {
          const cat = itemCats?.find((ic) => ic.id === c.item_id)
          const catName = cat?.shop_categories?.name
          if (catName !== 'Vitre de protection') return null
          const base = lineTotal(c)
          return {
            staff_id: staffId,
            sale_id: sale.id,
            item_name: c.item_name,
            category: catName,
            base_amount: base,
            rate: 20,
            commission_amount: Math.round(base * 0.20 * 100) / 100,
          }
        })
        .filter(Boolean)

      if (commissionRows.length > 0) {
        await supabase.from('staff_commissions').insert(commissionRows)
      }
    }

    const saleWithTicket = {
      ...sale,
      items: cart,
      ticketNumber: (ticketNumber || 0) + 1,
      changeToGive: currentChange,
      paymentsUsed: paymentSplits.map((p) => ({ type: p.method, amount: p.amount })),
      staffName: staffName,
    }

    setCart([])
    setPaymentSplits([])
    setCurrentPaymentAmount('')
    setGlobalDiscountValue('')
    fetchItems()
    fetchCaisseToday()
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

    const tvaBase21 = caTotal / 1.21
    const tvaMontant21 = caTotal - tvaBase21

    const movs = await fetchMovementsSince(periodStart)
    const depotsTotal = movs
      .filter((m) => m.type === 'depot')
      .reduce((s, m) => s + Number(m.amount), 0)
    const retraitsTotal = movs
      .filter((m) => m.type === 'retrait')
      .reduce((s, m) => s + Number(m.amount), 0)

    const totalCaisseCash = cashTotal + depotsTotal - retraitsTotal
    const totalCompte = bancontactTotal + virementTotal

    const tvaRows = [
      {
        code: 'A', rate: 21,
        base: tvaBase21,
        tva: caTotal - tvaBase21,
        total: caTotal,
      },
    ]

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
    setShowClosureModal(true)
  }

  const confirmClosure = async () => {
    if (!closureData) return
    setClosureLoading(true)
    const staffName = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )?.nom || 'Staff'

    await supabase.from('cash_closures').insert({
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
      prelevement: Number(prelevementAmount) || 0,
      staff_name: staffName,
    })

    setShowClosureModal(false)
    setClosureData(null)
    setClosureLoading(false)
    fetchLastClosure()
    fetchCaisseToday()
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
    <div className={(posScreen === 'caisse' || posScreen === 'gestion')
      ? 'p-2 max-w-none mx-auto relative'
      : 'p-4 md:p-8 max-w-7xl mx-auto relative'}>

      {!caisseSession && magasin && (
        <div className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40 flex items-center justify-center p-4">
          <CaissePinLock
            magasin={magasin}
            magasinLabel={MAGASINS_LIST.find((m) => m.id === magasin)?.nom || magasin}
            onUnlock={handleUnlock}
          />
        </div>
      )}


      {/* Header */}
      <div className="flex items-center justify-between mb-6
                      flex-wrap gap-3">
        {/* MASQUÉ TEMPORAIREMENT - Titre + sous-titre */}
        {false && (
          <div>
            <h1 className="text-2xl font-bold text-[#1B2A4A]">
              Stock magasin
            </h1>
            <p className="text-sm text-gray-500">
              Gérez l'inventaire de votre boutique
            </p>
          </div>
        )}
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
          showParametresCaisseTile={canAccessParamsCaisse}
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
          className="text-xs text-gray-400 hover:text-[#1B2A4A] mb-3">
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
            <button onClick={openClosureModal}
              className="py-3 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:opacity-90">
              Clôturer la caisse
            </button>
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
            </div>
          )}
        </div>
      )}

      {/* Mini bandeau session caisse plein écran */}
      {posScreen === 'caisse' && caisseSession && (
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-gray-500 font-mono">{clockNow}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2 px-2.5 py-1 bg-cyan-50 border border-cyan-200 rounded-lg font-bold text-[#00B4CC]">
              👤 {(caisseSession.staffName || '').split(' ')[0]}
              <span className="text-gray-500 font-normal">· {caisseSession.arrivalDisplay}</span>
            </span>
            {canRappelTicket && lastSale && (
              <button onClick={() => setShowTicket(true)}
                title="Rappel du dernier ticket"
                className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg font-bold text-gray-600 hover:border-[#00B4CC] hover:text-[#00B4CC]">
                🧾 Rappel ticket
              </button>
            )}
            {canOpenDrawer && (
              <button onClick={async () => {
                  if (!window.confirm('Ouvrir le tiroir-caisse sans vente ?')) return
                  await logActivity('tiroir_ouvert', 'Ouverture du tiroir sans vente')
                  alert('✅ Action enregistrée')
                }}
                title="Ouvrir le tiroir sans vente"
                className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg font-bold text-gray-600 hover:border-[#1B2A4A]">
                🗄️ Ouvrir le tiroir
              </button>
            )}
            <button onClick={handleChangeUser}
              title="Changer d'utilisateur"
              className="flex items-center gap-1 px-2.5 py-1 border border-gray-200 rounded-lg font-bold text-gray-600 hover:border-red-300 hover:text-red-500">
              <LogOut size={12} /> Changer
            </button>
          </div>
        </div>
      )}

      {/* TAB CAISSE — layout POS 3 colonnes */}
      {posScreen === 'caisse' && (
        <div className="grid grid-cols-[140px_1fr_340px] gap-4 h-[calc(100vh-130px)]">

          {/* COLONNE GAUCHE — Catégories */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-y-auto p-2">
            <button onClick={() => setSelectedPosCategory('Tout')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all
                ${selectedPosCategory === 'Tout'
                  ? 'bg-[#1B2A4A] text-white'
                  : 'text-gray-600 hover:bg-gray-50'}`}>
              Tout
            </button>
            {POS_CATEGORIES.map((catName) => (
              <button key={catName}
                onClick={() => setSelectedPosCategory(catName)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all
                  ${selectedPosCategory === catName
                    ? 'bg-[#1B2A4A] text-white'
                    : 'text-gray-600 hover:bg-gray-50'}`}>
                {catName}
              </button>
            ))}
          </div>

          {/* COLONNE CENTRE — Grille articles */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-y-auto p-4">
            <div className="relative mb-3">
              <button onClick={() => setShowMovementMenu(!showMovementMenu)}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:border-[#1B2A4A]">
                <Menu size={18} className="text-gray-500"/>
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

            {(() => {
              const posFiltered = items.filter((item) => {
                if (cartSearch.length >= 2) {
                  return item.name?.toLowerCase().includes(cartSearch.toLowerCase()) ||
                         item.reference?.toLowerCase().includes(cartSearch.toLowerCase())
                }
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
          <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-y-auto flex flex-col">
            <h3 className="font-bold text-[#1B2A4A] mb-3">
              Ticket ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm flex-1">
                Sélectionnez des articles
              </p>
            ) : (
              <>
                <div className="space-y-2 mb-4 flex-1 overflow-y-auto">
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

                  <button onClick={() => setShowPaymentModal(true)}
                    disabled={cart.length === 0}
                    className="py-2.5 bg-[#00B4CC] text-white rounded-xl font-bold hover:bg-[#1B2A4A] transition-all disabled:opacity-50">
                    Ticket →
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
            <button onClick={openClosureModal}
              className="w-full mt-2 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-xs font-bold hover:opacity-90">
              Clôturer la caisse
            </button>
          </div>
        </div>
      )}

      {/* TAB STOCK */}
      {posScreen === 'gestion' && activeTab === 'stock' && (
        <>
          {/* Filtres */}
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2
                           text-gray-400"/>
              <input type="text" value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Nom, référence ou scan code-barres..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200
                           rounded-xl text-sm"/>
            </div>
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-3 py-2 rounded-xl text-xs font-bold
                ${!filterCategory
                  ? 'bg-[#1B2A4A] text-white'
                  : 'bg-white border border-gray-200'}`}>
              Tout
            </button>
            {categories.map(cat => (
              <button key={cat.id}
                onClick={() => setFilterCategory(
                  filterCategory === cat.id ? null : cat.id
                )}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all
                  ${filterCategory === cat.id
                    ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#1B2A4A]'}`}>
                {cat.name}
              </button>
            ))}
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
                  <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Achat</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Vente</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-500 text-xs uppercase">Min / Max</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">Stock</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
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
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {item.purchase_price}€
                      </td>
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

              {/* MASQUÉ TEMPORAIREMENT - Référence + Code-barres */}
              {false && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500
                                     uppercase mb-1 block">
                      Référence
                    </label>
                    <input value={itemForm.reference}
                      onChange={e => setItemForm(f => ({
                        ...f, reference: e.target.value
                      }))}
                      placeholder="EC-IP13P"
                      className="w-full px-3 py-2 border border-gray-200
                                 rounded-xl text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500
                                     uppercase mb-1 block">
                      Code-barres
                    </label>
                    <input value={itemForm.barcode}
                      onChange={e => setItemForm(f => ({
                        ...f, barcode: e.target.value
                      }))}
                      placeholder="8712345678901"
                      className="w-full px-3 py-2 border border-gray-200
                                 rounded-xl text-sm font-mono"/>
                  </div>
                </div>
              )}

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

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Sous-catégorie
                </label>
                <input value={itemForm.sous_categorie}
                  onChange={e => setItemForm(f => ({ ...f, sous_categorie: e.target.value }))}
                  placeholder="ex: iPhone 13"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"/>
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

              {false && (
                <div className={`grid grid-cols-2 gap-3 ${itemForm.sans_stock ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div>
                    <label className="text-xs font-bold text-gray-500
                                     uppercase mb-1 block">
                      Quantité
                    </label>
                    <input type="number" value={itemForm.quantity}
                      disabled={itemForm.sans_stock}
                      onChange={e => setItemForm(f => ({
                        ...f, quantity: Number(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-200
                                 rounded-xl text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-600
                                     uppercase mb-1 block">
                      Alerte stock bas (qté)
                    </label>
                    <input type="number" value={itemForm.quantity_alert}
                      disabled={itemForm.sans_stock}
                      onChange={e => setItemForm(f => ({
                        ...f, quantity_alert: Number(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-amber-200
                                 rounded-xl text-sm"/>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* MASQUÉ TEMPORAIREMENT - Prix d'achat */}
                {false && (
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
              onPrint={() => printViaAgent({
                companyName: 'SLT GROUP (SRL)',
                tva: 'BE 1028.764.677',
                caisseNom: magasin,
                dateTime: new Date(lastSale.created_at || Date.now()).toLocaleString('fr-BE'),
                ticketNumber: lastSale.ticketNumber,
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
            <button onClick={() => setShowTicket(false)}
              className="w-full mt-2 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
