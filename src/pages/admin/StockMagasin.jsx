import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, X, Pencil, Trash2, Search,
         AlertTriangle, Package, Tag } from 'lucide-react'
import { MAGASINS_ADMIN as MAGASINS_LIST } from '../../utils/magasins'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'

export default function StockMagasin() {
  const isAdmin = useIsAdmin()
  const hasPermission = usePermission('stock_magasin')

  const [magasin, setMagasin] = useState('')
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState(null)
  const [activeTab, setActiveTab] = useState('stock') // stock | categories

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
      fetchCategories()
      fetchItems()
    }
  }, [magasin])

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
    const payload = { ...catForm, magasin_id: magasin }
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

  if (!isAdmin && !hasPermission) {
    return (
      <div className="p-8 text-center text-gray-400">
        Accès non autorisé
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6
                      flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">
            Stock magasin
          </h1>
          <p className="text-sm text-gray-500">
            Gérez l'inventaire de votre boutique
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <button onClick={() => openItemModal()}
            className="flex items-center gap-2 bg-[#1B2A4A]
                       text-white px-4 py-2 rounded-xl
                       text-sm font-bold hover:bg-[#00B4CC]">
            <Plus size={16}/> Ajouter un article
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total articles', value: stats.total },
          { label: 'Catégories', value: stats.categories },
          {
            label: 'Stock bas',
            value: stats.lowStock,
            warn: stats.lowStock > 0
          },
          {
            label: 'Valeur stock',
            value: `${Math.round(stats.valeur)}€`
          },
        ].map(s => (
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

      {/* Alertes stock bas */}
      {lowStockItems.length > 0 && (
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

      {/* Tabs */}
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

      {/* TAB STOCK */}
      {activeTab === 'stock' && (
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
            {categories.map(cat => {
              const c = getColor(cat.color)
              return (
                <button key={cat.id}
                  onClick={() => setFilterCategory(
                    filterCategory === cat.id ? null : cat.id
                  )}
                  style={filterCategory === cat.id ? {
                    background: c.bg, color: c.text,
                    borderColor: c.text,
                  } : {}}
                  className="px-3 py-2 rounded-xl text-xs font-bold
                             border border-gray-200 bg-white">
                  {cat.name}
                </button>
              )
            })}
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
                  <th className="text-center px-4 py-3 font-bold
                                 text-gray-500 text-xs uppercase">
                    Qté
                  </th>
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
                    <td colSpan={7}
                        className="text-center py-8 text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}
                        className="text-center py-8 text-gray-400">
                      Aucun article trouvé
                    </td>
                  </tr>
                ) : filtered.map(item => {
                  const isLow = item.quantity <= item.quantity_alert
                  const cat = item.shop_categories
                  const c = cat ? getColor(cat.color) : null
                  return (
                    <tr key={item.id}
                      className={`border-b border-gray-50
                        hover:bg-gray-50 transition-colors
                        ${isLow ? 'bg-amber-50/30' : ''}`}>
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
                        {cat && c && (
                          <span className="text-xs font-bold px-2 py-1
                                          rounded-lg"
                            style={{ background: c.bg, color: c.text }}>
                            {cat.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center
                                        justify-center gap-1">
                          {isLow && (
                            <AlertTriangle size={12}
                              className="text-amber-500"/>
                          )}
                          <span className={`font-bold
                            ${isLow
                              ? 'text-amber-600'
                              : 'text-[#1B2A4A]'}`}>
                            {item.quantity}
                          </span>
                        </div>
                      </td>
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
      {activeTab === 'categories' && (
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
                const c = getColor(cat.color)
                const count = items.filter(
                  i => i.category_id === cat.id
                ).length
                return (
                  <div key={cat.id}
                    className="bg-white rounded-2xl border
                               border-gray-100 p-4 flex items-center
                               justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl flex
                                       items-center justify-center
                                       text-sm font-bold"
                        style={{
                          background: c.bg, color: c.text
                        }}>
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
                    <div className="flex gap-1">
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

              <div className="grid grid-cols-2 gap-3">
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
    </div>
  )
}
