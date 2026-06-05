import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { MAGASINS_ADMIN as MAGASINS_LIST, MAGASINS } from '../../utils/magasins'
import { sha256 } from 'js-sha256'
import { Plus, X, Pencil, Trash2, Shield, Store, CheckCircle } from 'lucide-react'
import { ALL_PERMISSIONS, useIsAdmin, usePermission } from '../../hooks/usePermissions'
import { IPHONE_ON_DEMAND } from '../../data/iphoneOnDemand'
import { IPHONE_DATABASE } from '../../data/iphoneDatabase'
import { PHONES_DATABASE } from '../../data/phonesDatabase'
import { MODELS_BY_CATEGORIE } from '../../data/catalogConstants'

const SALT = 'sebphone_salt_2026'

const generateEmail = (firstName, lastName) => {
  const clean = (str) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z.]/g, '')
  return `${clean(firstName)}.${clean(lastName)}@sebphone.be`
}

const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    icon: '📊',
    perms: [
      { key: 'voir_dashboard', label: 'Voir le dashboard' },
    ],
  },
  {
    label: 'Stock',
    icon: '📱',
    perms: [
      { key: 'voir_stock', label: 'Voir le stock' },
      { key: 'ajouter_stock', label: 'Ajouter un téléphone' },
      { key: 'modifier_stock', label: 'Modifier un téléphone' },
      { key: 'supprimer_stock', label: 'Supprimer un téléphone' },
      { key: 'offre_semaine', label: "Gérer l'offre de la semaine" },
      { key: 'stock_reconditionnement', label: 'Accès reconditionnement' },
    ],
  },
  {
    label: 'Commandes',
    icon: '🛍️',
    perms: [
      { key: 'voir_commandes', label: 'Voir les commandes' },
      { key: 'modifier_commandes', label: 'Modifier une commande' },
      { key: 'encaisser', label: 'Encaisser une commande' },
      { key: 'changer_modele', label: 'Changer le modèle' },
      { key: 'supprimer_commande', label: 'Supprimer une commande' },
      { key: 'verifier_code', label: 'Vérifier un code client' },
    ],
  },
  {
    label: 'Ventes',
    icon: '💶',
    perms: [
      { key: 'ajouter_vente_directe', label: 'Ajouter une vente directe' },
    ],
  },
  {
    label: 'Clients & Marketing',
    icon: '👥',
    perms: [
      { key: 'voir_clients', label: 'Voir les clients' },
      { key: 'voir_clients_interesses', label: 'Clients intéressés' },
      { key: 'codes_promo', label: 'Gérer les codes promo' },
    ],
  },
  {
    label: 'Finance',
    icon: '💰',
    perms: [
      { key: 'voir_comptabilite', label: 'Voir la comptabilité' },
      { key: 'ajouter_paiements', label: 'Ajouter un paiement' },
    ],
  },
  {
    label: 'Administration',
    icon: '⚙️',
    perms: [
      { key: 'registre_achats', label: "Registre d'achats" },
      { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs' },
    ],
  },
]

const DEFAULT_PERMS = Object.fromEntries(
  ALL_PERMISSIONS.map((p) => [p, false])
)

const IPHONE_CHRONO_ORDER = [
  ...IPHONE_DATABASE.map((i) => i.model),
  ...IPHONE_ON_DEMAND.map((i) => i.model),
]

const getModelOrder = (categorie, brand) => {
  if (categorie === 'telephone') {
    if (brand === 'Apple' || !brand) return IPHONE_CHRONO_ORDER
    return (PHONES_DATABASE[brand] || []).map((p) => p.model)
  }
  return Object.values(MODELS_BY_CATEGORIE[categorie] || {}).flat()
}

const detectBrand = (name) => {
  if (!name) return ''
  const n = name.toLowerCase()
  if (n.includes('iphone') || n.includes('ipad') ||
      n.includes('macbook') || n.includes('airpods') ||
      n.includes('apple watch')) return 'Apple'
  if (n.includes('samsung')) return 'Samsung'
  if (n.includes('xiaomi')) return 'Xiaomi'
  if (n.includes('huawei')) return 'Huawei'
  if (n.includes('oneplus')) return 'OnePlus'
  if (n.includes('google') || n.includes('pixel')) return 'Google'
  if (n.includes('microsoft') || n.includes('surface')) return 'Microsoft'
  if (n.includes('garmin')) return 'Garmin'
  if (n.includes('sony')) return 'Sony'
  if (n.includes('bose')) return 'Bose'
  if (n.includes('jbl')) return 'JBL'
  if (n.includes('dell')) return 'Dell'
  if (n.includes('hp ') || n.startsWith('hp')) return 'HP'
  if (n.includes('lenovo')) return 'Lenovo'
  return ''
}

const BRANDS_BY_CATEGORIE = {
  telephone:  ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google'],
  tablette:   ['Apple', 'Samsung', 'Microsoft'],
  montre:     ['Apple', 'Samsung', 'Garmin'],
  ecouteur:   ['Apple', 'Samsung', 'Sony', 'Bose', 'JBL'],
  ordinateur: ['Apple', 'Dell', 'HP', 'Lenovo', 'Microsoft'],
  accessoire: ['Apple', 'Samsung', 'Autre'],
}

const CATEGORIE_LABELS = {
  telephone:  'Téléphones',
  tablette:   'Tablettes',
  montre:     'Montres',
  ecouteur:   'Écouteurs',
  ordinateur: 'Ordinateurs',
  accessoire: 'Accessoires',
}

const AVATAR_COLORS = [
  'bg-[#00B4CC]', 'bg-[#1B2A4A]', 'bg-emerald-500',
  'bg-purple-500', 'bg-orange-500', 'bg-rose-500',
]

function ModelLimitRow({ model, limit, filterType, onSave }) {
  const [minClient, setMinClient] = useState(limit?.price_min ?? '')
  const [maxClient, setMaxClient] = useState(limit?.price_max ?? '')
  const [minPro, setMinPro] = useState(limit?.price_min_pro ?? '')
  const [maxPro, setMaxPro] = useState(limit?.price_max_pro ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await onSave(model.name, model.categorie, minClient, maxClient, minPro, maxPro)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl flex-wrap">
      <div className="flex-1 min-w-32">
        <p className="text-sm font-medium text-[#1B2A4A]">{model.name}</p>
        <p className="text-xs text-gray-400">{model.categorie}</p>
      </div>
      {filterType === 'client' ? (
        <>
          <input
            type="number"
            value={minClient}
            onChange={(e) => setMinClient(e.target.value)}
            placeholder="Min client €"
            className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
          <input
            type="number"
            value={maxClient}
            onChange={(e) => setMaxClient(e.target.value)}
            placeholder="Max client €"
            className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </>
      ) : (
        <>
          <input
            type="number"
            value={minPro}
            onChange={(e) => setMinPro(e.target.value)}
            placeholder="Min pro €"
            className="w-28 px-2 py-1.5 border border-blue-200 rounded-lg text-sm"
          />
          <input
            type="number"
            value={maxPro}
            onChange={(e) => setMaxPro(e.target.value)}
            placeholder="Max pro €"
            className="w-28 px-2 py-1.5 border border-blue-200 rounded-lg text-sm"
          />
        </>
      )}
      <button
        onClick={handleSave}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          saved ? 'bg-green-100 text-green-700' : 'bg-[#1B2A4A] text-white hover:bg-[#00B4CC]'
        }`}
      >
        {saved ? '✓ Enregistré' : 'Enregistrer'}
      </button>
      {saved && (
        <span className="text-xs text-green-600 font-medium">✓ Sauvegardé en base</span>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${
        checked ? 'bg-[#00B4CC]' : 'bg-gray-200'
      }`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
        checked ? 'left-5' : 'left-0.5'
      }`} />
    </button>
  )
}

function EmployeeModal({ employee, onClose, onSaved }) {
  const isEdit = !!employee
  const [firstName, setFirstName] = useState(isEdit ? (employee.name?.split(' ')[0] || '') : '')
  const [lastName,  setLastName]  = useState(isEdit ? (employee.name?.split(' ').slice(1).join(' ') || '') : '')
  const [password,  setPassword]  = useState('')
  const [magasin,   setMagasin]   = useState(isEdit ? employee.magasin_id : (MAGASINS_LIST[0]?.id || ''))
  const [perms,     setPerms]     = useState(isEdit ? { ...DEFAULT_PERMS, ...employee.permissions } : { ...DEFAULT_PERMS })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  const email = (firstName && lastName) ? generateEmail(firstName, lastName) : ''

  const handleSave = async () => {
    if (!firstName || !lastName) { setError('Prénom et nom requis'); return }
    if (!isEdit && password.length < 8) { setError('Mot de passe min. 8 caractères'); return }
    setSaving(true)
    setError(null)

    const data = {
      name:       `${firstName} ${lastName}`.trim(),
      email,
      magasin_id: magasin,
      permissions: perms,
      active:     true,
    }
    if (!isEdit || password) {
      data.password_hash = sha256(password + SALT)
    }

    let err
    if (isEdit) {
      const { error: e } = await supabase.from('staff').update(data).eq('id', employee.id)
      err = e
    } else {
      const { error: e } = await supabase
        .from('staff')
        .insert([data])
        .select()

      err = e
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-[#1B2A4A]">
            {isEdit ? 'Modifier l\'employé' : 'Créer un employé'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">Prénom</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                placeholder="Mohamed"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">Nom</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
                placeholder="Diallo"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">Email généré</label>
            <input
              value={email}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">
              {isEdit ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe (min. 8 car.)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">Magasin assigné</label>
            <select
              value={magasin}
              onChange={(e) => setMagasin(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] bg-white"
            >
              {MAGASINS_LIST.map((m) => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1B2A4A] block mb-3">Droits d'accès</label>
            <div className="flex flex-col gap-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-[#1B2A4A] uppercase tracking-wide mb-2">{group.label}</p>
                  <div className="flex flex-col gap-2">
                    {group.perms.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#333]">{label}</span>
                        <Toggle
                          checked={!!perms[key]}
                          onChange={(v) => setPerms((p) => ({ ...p, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#1B2A4A] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#243660] transition-all disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Sauvegarder' : 'Créer l\'employé'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Parametres() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const canManageUsers = usePermission('gerer_utilisateurs')

  useEffect(() => {
    if (!isAdmin && !canManageUsers) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAdmin, canManageUsers])

  const [tab, setTab]             = useState('utilisateurs')
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)

  const [globalMin, setGlobalMin]   = useState(0)
  const [globalMax, setGlobalMax]   = useState(5000)
  const [globalMinPro, setGlobalMinPro] = useState(0)
  const [globalMaxPro, setGlobalMaxPro] = useState(5000)
  const [modelLimits, setModelLimits] = useState([])
  const [allModels, setAllModels]   = useState([])
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [searchModel, setSearchModel] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('tous')
  const [filterType, setFilterType] = useState('client')
  const [selectedCategorie, setSelectedCategorie] = useState(null)
  const [selectedBrand, setSelectedBrand]         = useState(null)

  const [bestSellers, setBestSellers] = useState([])
  const [showBSModal, setShowBSModal] = useState(false)
  const [bsSearch, setBsSearch]       = useState('')
  const [bsResults, setBsResults]     = useState([])

  const fetchBestSellers = async () => {
    const { data: config } = await supabase
      .from('best_sellers_config')
      .select(`
        id, phone_id, position,
        phones (
          id, name, model, color, storage,
          price, status, visible_on_site
        )
      `)
      .order('position', { ascending: true })
    setBestSellers((config || []).filter(
      (bs) => bs.phones && bs.phones.status === 'disponible'
    ))
  }

  const addBestSeller = async (phone) => {
    const nextPos = bestSellers.length + 1
    await supabase.from('best_sellers_config').insert({
      phone_id: phone.id,
      position: nextPos,
    })
    setShowBSModal(false)
    setBsSearch('')
    setBsResults([])
    fetchBestSellers()
  }

  const removeBestSeller = async (configId) => {
    await supabase.from('best_sellers_config').delete().eq('id', configId)
    fetchBestSellers()
  }

  const moveBestSeller = async (configId, direction) => {
    const currentIdx = bestSellers.findIndex((bs) => bs.id === configId)
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1

    if (swapIdx < 0 || swapIdx >= bestSellers.length) return

    const current = bestSellers[currentIdx]
    const swap    = bestSellers[swapIdx]

    await supabase.from('best_sellers_config')
      .update({ position: swap.position })
      .eq('id', current.id)

    await supabase.from('best_sellers_config')
      .update({ position: current.position })
      .eq('id', swap.id)

    fetchBestSellers()
  }

  const searchPhones = async (q) => {
    if (!q || q.length < 2) { setBsResults([]); return }
    const { data } = await supabase
      .from('phones')
      .select('id, name, model, color, storage, price')
      .eq('status', 'disponible')
      .or('visible_on_site.eq.true,visible_on_site.is.null')
      .ilike('name', `%${q}%`)
      .limit(10)
    setBsResults(data || [])
  }

  useEffect(() => { fetchBestSellers() }, [])

  useEffect(() => {
    const fetchPriceSettings = async () => {
      const { data: settings } = await supabase
        .from('price_settings').select('*').eq('id', 1).single()
      if (settings) {
        setGlobalMin(settings.global_min)
        setGlobalMax(settings.global_max)
        setGlobalMinPro(settings.global_min_pro || 0)
        setGlobalMaxPro(settings.global_max_pro || 5000)
      }

      const { data: limits } = await supabase
        .from('model_price_limits').select('*')
      setModelLimits(limits || [])

      const applePhones = [
        ...IPHONE_DATABASE.map((i) => ({ name: i.model, categorie: 'telephone' })),
        ...IPHONE_ON_DEMAND.map((i) => ({ name: i.model, categorie: 'telephone' })),
      ]

      const otherPhones = Object.entries(PHONES_DATABASE).flatMap(
        ([, models]) => models.map((m) => ({ name: m.model, categorie: 'telephone' }))
      )

      const otherCategories = Object.entries(MODELS_BY_CATEGORIE)
        .flatMap(([categorie, brands]) =>
          Object.values(brands).flat().map((model) => ({ name: model, categorie }))
        )

      const { data: phonesFromDB } = await supabase
        .from('phones')
        .select('name, model, categorie')
        .neq('status', 'vendu')

      const dbModels = (phonesFromDB || []).map((p) => ({
        name: (p.name || p.model || '').replace(/^Apple\s+/i, '').trim(),
        categorie: p.categorie || 'telephone',
      })).filter((m) => m.name)

      const allModelsRaw = [
        ...applePhones,
        ...otherPhones,
        ...otherCategories,
        ...dbModels,
      ]

      const uniqueModels = [...new Map(
        allModelsRaw.map((m) => [m.name, m])
      ).values()]
        .filter((m) => m.name)
        .sort((a, b) => {
          if (a.categorie !== b.categorie)
            return (a.categorie || '').localeCompare(b.categorie || '')

          const brandA = detectBrand(a.name)
          const orderList = getModelOrder(a.categorie, brandA)

          const idxA = orderList.indexOf(a.name)
          const idxB = orderList.indexOf(b.name)

          if (idxA !== -1 && idxB !== -1) return idxA - idxB
          if (idxA !== -1) return -1
          if (idxB !== -1) return 1
          return (a.name || '').localeCompare(b.name || '')
        })
      setAllModels(uniqueModels)
    }
    fetchPriceSettings()
  }, [])

  const saveGlobalLimits = async () => {
    setSavingGlobal(true)
    await supabase.from('price_settings')
      .update({
        global_min: parseFloat(globalMin) || 0,
        global_max: parseFloat(globalMax) || 5000,
        global_min_pro: parseFloat(globalMinPro) || 0,
        global_max_pro: parseFloat(globalMaxPro) || 5000,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    setSavingGlobal(false)
    alert('✅ Limites globales enregistrées')
  }

  const saveModelLimit = async (modelName, categorie, minClient, maxClient, minPro, maxPro) => {
    const toNum = (v) => (v !== '' && v != null ? parseFloat(v) : null)
    const existing = modelLimits.find((l) => l.model_name === modelName)
    const payload = {
      price_min:     toNum(minClient),
      price_max:     toNum(maxClient),
      price_min_pro: toNum(minPro),
      price_max_pro: toNum(maxPro),
      updated_at:    new Date().toISOString(),
    }
    if (existing) {
      await supabase.from('model_price_limits')
        .update(payload)
        .eq('model_name', modelName)
    } else {
      await supabase.from('model_price_limits')
        .insert({ model_name: modelName, categorie, ...payload })
    }
    const { data } = await supabase.from('model_price_limits').select('*')
    setModelLimits(data || [])
  }

  const fetchStaff = async () => {
    setLoading(true)
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false })
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employé ?')) return
    await supabase.from('staff').delete().eq('id', id)
    fetchStaff()
  }

  const handleToggleActive = async (employee) => {
    await supabase.from('staff').update({ active: !employee.active }).eq('id', employee.id)
    fetchStaff()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des accès et de la configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {['utilisateurs', 'general'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer capitalize ${
              tab === t ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-gray-500 hover:text-[#1B2A4A]'
            }`}
          >
            {t === 'utilisateurs' ? 'Utilisateurs' : 'Général'}
          </button>
        ))}
      </div>

      {tab === 'utilisateurs' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{staff.length} employé{staff.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => { setEditEmployee(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-[#00B4CC] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all"
            >
              <Plus size={15} />
              Créer un employé
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Shield size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun employé créé</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {staff.map((emp, idx) => {
                const initials = emp.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                const activePerms = Object.entries(emp.permissions || {}).filter(([, v]) => v).length
                const magNom = MAGASINS[emp.magasin_id]?.nom?.replace('Seb Telecom — ', '') || emp.magasin_id

                return (
                  <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#1B2A4A] text-sm">{emp.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {emp.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{emp.email}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-[#00B4CC]">
                          <Store size={11} />
                          {magNom}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <CheckCircle size={11} />
                          {activePerms} droits actifs
                        </span>
                        {emp.last_login && (
                          <span className="text-xs text-gray-400">
                            Dernière connexion : {new Date(emp.last_login).toLocaleDateString('fr-BE')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          emp.active
                            ? 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {emp.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => { setEditEmployee(emp); setShowModal(true) }}
                        className="p-2 text-gray-400 hover:text-[#1B2A4A] hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'general' && (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1B2A4A] mb-1">💰 Limites de prix</h2>
          <p className="text-sm text-gray-500 mb-4">
            Définissez les prix minimum et maximum autorisés.
            Un appareil ne pourra jamais être vendu en dehors de ces limites,
            même avec une remise.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">
              Limites globales (tous appareils)
            </p>

            <div className="flex gap-2 mb-4">
              {['client', 'pro'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === type
                      ? 'bg-[#1B2A4A] text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {type === 'client' ? '👤 Client particulier' : '🏢 Revendeur Pro'}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              {filterType === 'client' ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prix minimum client (€)</label>
                    <input
                      type="number"
                      value={globalMin}
                      onChange={(e) => setGlobalMin(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prix maximum client (€)</label>
                    <input
                      type="number"
                      value={globalMax}
                      onChange={(e) => setGlobalMax(e.target.value)}
                      className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prix minimum pro (€)</label>
                    <input
                      type="number"
                      value={globalMinPro}
                      onChange={(e) => setGlobalMinPro(e.target.value)}
                      className="w-32 px-3 py-2 border border-blue-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Prix maximum pro (€)</label>
                    <input
                      type="number"
                      value={globalMaxPro}
                      onChange={(e) => setGlobalMaxPro(e.target.value)}
                      className="w-32 px-3 py-2 border border-blue-200 rounded-xl text-sm"
                    />
                  </div>
                </>
              )}
              <button
                onClick={saveGlobalLimits}
                disabled={savingGlobal}
                className="px-4 py-2 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-[#00B4CC] transition-all disabled:opacity-50"
              >
                {savingGlobal ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">
              Limites par modèle (remplace les limites globales)
            </p>
            <input
              type="text"
              value={searchModel}
              onChange={(e) => setSearchModel(e.target.value)}
              placeholder="Rechercher un modèle..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3"
            />

            <div className="flex gap-2 flex-wrap mb-4 items-center">
              {['client', 'pro'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === type
                      ? 'bg-[#1B2A4A] text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {type === 'client' ? '👤 Client' : '🏢 Pro'}
                </button>
              ))}
            </div>

            {!selectedCategorie && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(CATEGORIE_LABELS).map(([cat, label]) => {
                  const count = allModels.filter((m) => m.categorie === cat).length
                  return (
                    <button key={cat}
                      onClick={() => {
                        setSelectedCategorie(cat)
                        setSelectedBrand(null)
                      }}
                      className="bg-white border-2 border-gray-100 rounded-2xl p-4 text-left hover:border-[#00B4CC] hover:shadow-md transition-all">
                      <p className="font-bold text-[#1B2A4A]">{label}</p>
                      <p className="text-xs text-gray-400 mt-1">{count} modèles</p>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedCategorie && !selectedBrand && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setSelectedCategorie(null)}
                    className="text-sm text-[#00B4CC] hover:underline">
                    ← Catégories
                  </button>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm font-bold text-[#1B2A4A]">
                    {CATEGORIE_LABELS[selectedCategorie]}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(BRANDS_BY_CATEGORIE[selectedCategorie] || []).map((brand) => {
                    const count = allModels.filter((m) =>
                      m.categorie === selectedCategorie &&
                      detectBrand(m.name) === brand
                    ).length
                    if (count === 0) return null
                    return (
                      <button key={brand}
                        onClick={() => setSelectedBrand(brand)}
                        className="bg-white border-2 border-gray-100 rounded-2xl p-4 text-left hover:border-[#00B4CC] hover:shadow-md transition-all">
                        <p className="font-bold text-[#1B2A4A]">{brand}</p>
                        <p className="text-xs text-gray-400 mt-1">{count} modèles</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedCategorie && selectedBrand && (
              <div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button onClick={() => setSelectedCategorie(null)}
                    className="text-sm text-[#00B4CC] hover:underline">
                    ← Catégories
                  </button>
                  <span className="text-gray-400">/</span>
                  <button onClick={() => setSelectedBrand(null)}
                    className="text-sm text-[#00B4CC] hover:underline">
                    {CATEGORIE_LABELS[selectedCategorie]}
                  </button>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm font-bold text-[#1B2A4A]">
                    {selectedBrand}
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {allModels
                    .filter((m) =>
                      m.categorie === selectedCategorie &&
                      detectBrand(m.name) === selectedBrand &&
                      (!searchModel || m.name?.toLowerCase().includes(searchModel.toLowerCase()))
                    )
                    .map((m) => {
                      const limit = modelLimits.find((l) => l.model_name === m.name)
                      return (
                        <ModelLimitRow
                          key={m.name}
                          model={m}
                          limit={limit}
                          filterType={filterType}
                          onSave={saveModelLimit}
                        />
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                Best Sellers
              </h2>
              <p className="text-xs text-gray-500">
                Choisissez les téléphones affichés en home page (max 8). Si vide → sélection auto par prix.
              </p>
            </div>
            {bestSellers.length < 8 && (
              <button onClick={() => setShowBSModal(true)}
                className="flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                <Plus size={16} /> Ajouter
              </button>
            )}
          </div>

          {bestSellers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              Aucun best seller configuré — sélection automatique active
            </p>
          ) : (
            <div className="space-y-2">
              {bestSellers.map((bs, idx) => (
                <div key={bs.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#1B2A4A] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1B2A4A]">
                        {bs.phones?.name || bs.phones?.model}
                      </p>
                      <p className="text-xs text-gray-500">
                        {bs.phones?.color} · {bs.phones?.storage} · {bs.phones?.price}€
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1 mr-2">
                      <button onClick={() => moveBestSeller(bs.id, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-[#1B2A4A] disabled:opacity-20 text-sm px-1">
                        ↑
                      </button>
                      <button onClick={() => moveBestSeller(bs.id, 'down')}
                        disabled={idx === bestSellers.length - 1}
                        className="text-gray-400 hover:text-[#1B2A4A] disabled:opacity-20 text-sm px-1">
                        ↓
                      </button>
                    </div>
                    <button onClick={() => removeBestSeller(bs.id)}
                      className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )}

      {showBSModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B2A4A]">
                Ajouter un best seller
              </h3>
              <button onClick={() => {
                setShowBSModal(false)
                setBsSearch('')
                setBsResults([])
              }}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Rechercher un téléphone..."
              value={bsSearch}
              onChange={(e) => {
                setBsSearch(e.target.value)
                searchPhones(e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-3 focus:border-[#00B4CC] outline-none"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bsResults.map((phone) => (
                <button key={phone.id}
                  onClick={() => addBestSeller(phone)}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-xl text-sm transition-all">
                  <p className="font-bold text-[#1B2A4A]">
                    {phone.name || phone.model}
                  </p>
                  <p className="text-xs text-gray-500">
                    {phone.color} · {phone.storage} · {phone.price}€
                  </p>
                </button>
              ))}
              {bsSearch.length >= 2 && bsResults.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">
                  Aucun téléphone trouvé
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <EmployeeModal
          employee={editEmployee}
          onClose={() => setShowModal(false)}
          onSaved={fetchStaff}
        />
      )}
    </div>
  )
}
