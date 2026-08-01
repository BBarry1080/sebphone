import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Pencil, Trash2, Search,
         AlertTriangle, Package, Tag,
         Menu, Lock, Unlock } from 'lucide-react'
import { MAGASINS_ADMIN as MAGASINS_LIST } from '../../utils/magasins'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'

const POS_CATEGORIES = [
  'Coque', 'Vitre de protection', 'Audio', 'Chargeur',
  'Carte mémoire', 'Ordinateur', 'Tablette', 'PlayStation',
  'Écran', 'Caméra', 'Batterie', 'Vitre arrière',
  'Autre téléphone', 'Écran Samsung',
]

export default function StockMagasin() {
  const isAdmin = useIsAdmin()
  const hasPermission = usePermission('stock_magasin')

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
    category_id: '', quantity: 0,
    quantity_alert: 3,
    purchase_price: 0, sale_price: 0,
    price_min: 0, price_max: 0,
    description: '',
  })

  // Form catégorie
  const [catForm, setCatForm] = useState({
    name: '', color: 'blue',
  })

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
  const [posScreen, setPosScreen] = useState('accueil') // accueil | caisse | gestion | cloture
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

  useEffect(() => {
    if (magasin) {
      fetchCategories().then(() => ensurePosCategories())
      fetchItems()
      fetchCaisseToday()
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
      .select('*, shop_categories(name, color)')
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
      quantity: item.quantity || 0,
      quantity_alert: item.quantity_alert || 3,
      purchase_price: item.purchase_price || 0,
      sale_price: item.sale_price || 0,
      price_min: item.price_min || 0,
      price_max: item.price_max || 0,
      description: item.description || '',
    } : {
      name: '', reference: '', barcode: '',
      category_id: categories[0]?.id || '',
      quantity: 0, quantity_alert: 3,
      purchase_price: 0, sale_price: 0,
      price_min: 0, price_max: 0,
      description: '',
    })
    setShowItemModal(true)
  }

  const handleSaveItem = async () => {
    if (!itemForm.name) {
      alert('Nom obligatoire'); return
    }
    const payload = {
      ...itemForm,
      quantity:       itemForm.quantity || 0,
      purchase_price: itemForm.purchase_price || null,
      quantity_alert: itemForm.quantity_alert || 0,
      barcode:        itemForm.barcode || null,
      reference:      itemForm.reference || null,
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

    const staffName = JSON.parse(
      localStorage.getItem('sebphone_user') || '{}'
    )?.nom || 'Staff'

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

    const saleWithTicket = {
      ...sale,
      items: cart,
      ticketNumber: (ticketNumber || 0) + 1,
      changeToGive: currentChange,
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

    setClosureData({
      periodStart, periodEnd, caTotal, ticketCount, ticketMoyen,
      cashTotal, bancontactTotal, virementTotal, categoryTotals,
      tvaBase21, tvaMontant21, movements: movs,
      depotsTotal, retraitsTotal, totalCaisseCash, totalCompte,
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

  const handlePrintClosure = () => window.print()

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
      ? 'p-2 max-w-none mx-auto'
      : 'p-4 md:p-8 max-w-7xl mx-auto'}>

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
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">CA du jour</p>
                <p className="text-xl font-bold text-[#1B2A4A]">
                  {(caisseTotals?.total || 0).toFixed(2)}€
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Tickets créés</p>
                <p className="text-xl font-bold text-[#1B2A4A]">
                  {salesToday?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <button onClick={() => setPosScreen('caisse')}
              className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:border-[#1B2A4A] transition-all">
              <p className="font-bold text-[#1B2A4A] text-sm">Vente caisse</p>
            </button>
            <button onClick={() => { setPosScreen('gestion'); setActiveTab('stock') }}
              className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:border-[#1B2A4A] transition-all">
              <p className="font-bold text-[#1B2A4A] text-sm">Gestion</p>
            </button>
            <button onClick={() => setPosScreen('cloture')}
              className="bg-white rounded-2xl border border-gray-100 p-5 text-center hover:border-[#1B2A4A] transition-all">
              <p className="font-bold text-[#1B2A4A] text-sm">Clôture</p>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Dernière clôture</p>
            {lastClosure ? (
              <p className="font-bold text-[#1B2A4A] text-sm">
                {new Date(lastClosure.period_end).toLocaleString('fr-BE')}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Aucune clôture pour l'instant</p>
            )}
          </div>
        </div>
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

      {/* TAB CAISSE — layout POS 3 colonnes */}
      {posScreen === 'caisse' && (
        <div className="grid grid-cols-[140px_1fr_340px] gap-4 h-[calc(100vh-100px)]">

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
                            className="w-16 px-1.5 py-1 border border-gray-200 rounded-lg text-xs text-right font-bold"/>
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
                      className={`w-full py-2.5 rounded-xl text-sm font-bold border-2
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
          <div className="bg-white rounded-2xl border border-gray-100
                          overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Article
                  </th>
                  <th className="text-left px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Catégorie
                  </th>
                  {/* MASQUÉ TEMPORAIREMENT - Qté */}
                  {false && (
                    <th className="text-center px-4 py-3 font-bold
                                   text-gray-500 text-xs uppercase">
                      Qté
                    </th>
                  )}
                  <th className="text-right px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Achat
                  </th>
                  <th className="text-right px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Vente
                  </th>
                  <th className="text-right px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Min / Max
                  </th>
                  <th className="text-center px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}
                        className="text-center py-8 text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}
                        className="text-center py-8 text-gray-400">
                      Aucun article trouvé
                    </td>
                  </tr>
                ) : filtered.map(item => {
                  const cat = item.shop_categories
                  return (
                    <tr key={item.id}
                      className="border-b border-gray-50
                        hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#1B2A4A] text-sm">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.reference && `Réf: ${item.reference}`}
                          {item.reference && item.barcode && ' · '}
                          {item.barcode && `CB: ${item.barcode}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {cat && (
                          <span className="text-xs font-bold px-2 py-1
                                          rounded-lg bg-gray-100 text-gray-600">
                            {cat.name}
                          </span>
                        )}
                      </td>
                      {/* MASQUÉ TEMPORAIREMENT - Qté cellule */}
                      {false && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center
                                          justify-center gap-1">
                            {item.quantity <= item.quantity_alert && (
                              <AlertTriangle size={12}
                                className="text-amber-500"/>
                            )}
                            <span className={`font-bold
                              ${item.quantity <= item.quantity_alert
                                ? 'text-amber-600'
                                : 'text-[#1B2A4A]'}`}>
                              {item.quantity}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right
                                     text-gray-500 text-xs">
                        {item.purchase_price}€
                      </td>
                      <td className="px-4 py-3 text-right
                                     font-bold text-[#1B2A4A]">
                        {item.sale_price}€
                      </td>
                      <td className="px-4 py-3 text-right
                                     text-xs text-gray-400">
                        {item.price_min}€ / {item.price_max}€
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => openItemModal(item)}
                            className="p-1.5 hover:bg-blue-50
                                       rounded-lg text-blue-400
                                       hover:text-blue-600">
                            <Pencil size={14}/>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 hover:bg-red-50
                                       rounded-lg text-red-400
                                       hover:text-red-600">
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

              {/* MASQUÉ TEMPORAIREMENT - Quantité + Alerte stock bas */}
              {false && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500
                                     uppercase mb-1 block">
                      Quantité
                    </label>
                    <input type="number" value={itemForm.quantity}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-4 font-mono text-[11px] leading-relaxed">

              <div className="text-center mb-1">
                <p className="font-bold text-[13px]">SLT GROUP (SRL)</p>
              </div>
              <div className="flex justify-between">
                <span>TVA: BE 1028.764.677</span>
                <span>Caisse n°: {magasin}</span>
              </div>
              <div>Date: {new Date(closureData.periodEnd).toLocaleString('fr-BE')}</div>

              {sep('-')}

              <div>PERIODE:</div>
              <div>
                {new Date(closureData.periodStart).toLocaleString('fr-BE')} {'>'} {new Date(closureData.periodEnd).toLocaleString('fr-BE')}
              </div>

              {sep('*')}
              <div>TICKETS DE CAISSE:</div>
              {sep('*')}

              <div className="flex justify-between">
                <span>Ventes:</span><span>{closureData.caTotal.toFixed(2)}€</span>
                <span>{closureData.ticketCount}#</span>
              </div>
              <div className="flex justify-between">
                <span>Retour:</span><span>0,00€</span><span>0#</span>
              </div>

              {sep('-')}

              <div>CA TOTAL:</div>
              <div className="flex justify-between font-bold">
                <span>{closureData.caTotal.toFixed(2)}€</span>
                <span>Ticket moyen: {closureData.ticketMoyen.toFixed(2)}€</span>
              </div>

              {sep('-')}

              <div>TVA:</div>
              <div className="flex justify-between text-gray-500">
                <span></span><span>Base:</span><span>Total:</span>
              </div>
              <div className="flex justify-between">
                <span>A 21%:</span>
                <span>{closureData.tvaBase21.toFixed(2)}€</span>
                <span>{closureData.caTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>D 0%:</span><span>0,00€</span><span>0,00€</span>
              </div>

              {sep('-')}

              <div>REGLEMENTS:</div>
              <div className="flex justify-between">
                <span>Cash:</span><span>{closureData.cashTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Bancontact:</span><span>{closureData.bancontactTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Virement:</span><span>{closureData.virementTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span><span>{closureData.caTotal.toFixed(2)}€</span>
              </div>

              {sep('-')}

              <div>VENTES PAR CATEGORIE:</div>
              {Object.entries(closureData.categoryTotals).map(([cat, total]) => (
                <div key={cat} className="flex justify-between">
                  <span>{cat}:</span><span>{total.toFixed(2)}€</span>
                </div>
              ))}

              {sep('-')}

              <div>PROFORMATS:</div>
              <div className="flex justify-between">
                <span>Bons de livraison:</span><span>0</span>
              </div>
              <div className="flex justify-between">
                <span>Commandes client:</span><span>0</span>
              </div>

              {sep('-')}

              <div>DEPOTS / RETRAITS DE CAISSE:</div>
              {closureData.movements.length === 0 ? (
                <p className="text-gray-400">Aucun mouvement</p>
              ) : closureData.movements.map((m) => (
                <div key={m.id} className="mt-1">
                  <div className="flex justify-between">
                    <span>
                      {new Date(m.created_at).toLocaleTimeString('fr-BE')} {m.type === 'depot' ? 'Depot' : 'Retrait de caisse'}:
                    </span>
                    <span>{m.type === 'depot' ? '+' : '-'}{Number(m.amount).toFixed(2)}€</span>
                  </div>
                  <p className="text-gray-500">{m.reason} — {m.payment_method}</p>
                </div>
              ))}

              {sep('-')}

              <div>RESUME:</div>
              <div className="flex justify-between font-bold">
                <span>CA total:</span><span>{closureData.caTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Total en caisse (cash):</span>
                <span>{closureData.totalCaisseCash.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span>Total en compte:</span>
                <span>{closureData.totalCompte.toFixed(2)}€</span>
              </div>

              {sep('-')}

              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block mt-2">
                Prélèvement en clôture
              </label>
              <input type="number" value={prelevementAmount}
                onChange={(e) => setPrelevementAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-2"/>
            </div>

            <div className="flex gap-3 p-4 pt-0">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-4 font-mono text-[11px] leading-relaxed">

              <div className="text-center mb-1">
                <p className="font-bold text-[13px]">SLT GROUP (SRL)</p>
              </div>
              <div className="flex justify-between">
                <span>TVA: BE 1028.764.677</span>
                <span>Caisse n°: {magasin}</span>
              </div>
              <div>Date: {new Date(lastSale.created_at || Date.now()).toLocaleString('fr-BE')}</div>
              <div>Ticket n°: {String(lastSale.ticketNumber).padStart(7, '0')}</div>

              {sep('-')}

              {lastSale.items.map(c => (
                <div key={c.item_id} className="flex justify-between">
                  <span>{c.item_name} x{c.quantity}</span>
                  <span>{(c.unit_price * c.quantity).toFixed(2)}€</span>
                </div>
              ))}

              {sep('-')}

              <div className="flex justify-between font-bold text-[13px]">
                <span>TOTAL:</span>
                <span>{Number(lastSale.total_amount).toFixed(2)}€</span>
              </div>

              {sep('-')}

              <div>TVA:</div>
              <div className="flex justify-between text-gray-500">
                <span></span><span>Base:</span><span>Total:</span>
              </div>
              <div className="flex justify-between">
                <span>A 21%:</span>
                <span>{(Number(lastSale.total_amount) / 1.21).toFixed(2)}€</span>
                <span>{Number(lastSale.total_amount).toFixed(2)}€</span>
              </div>

              {sep('-')}

              <div className="flex justify-between">
                <span>Reglement: {
                  lastSale.payment_method === 'cash' ? 'Cash' :
                  lastSale.payment_method === 'bancontact' ? 'Bancontact' : 'Virement'
                }</span>
                <span>{Number(lastSale.total_amount).toFixed(2)}€</span>
              </div>

              {sep('-')}

              <div className="text-center text-gray-500">Merci de votre visite</div>
            </div>

            <div className="flex gap-3 p-4 pt-0">
              <button onClick={() => setShowTicket(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                Fermer
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold">
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
