import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { MAGASINS_ADMIN as MAGASINS_LIST, MAGASINS } from '../../utils/magasins'
import { sha256 } from 'js-sha256'
import { Plus, X, Pencil, Trash2, Shield, Store, CheckCircle, History, BarChart2 } from 'lucide-react'
import { ALL_PERMISSIONS, useIsAdmin, usePermission } from '../../hooks/usePermissions'
import { logActivity } from '../../lib/logActivity'
import { calcSalairePeriode } from '../../lib/calcSalaire'
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
      { key: 'stock_magasin', label: 'Stock magasin' },
      { key: 'rappel_ticket', label: 'Rappel ticket' },
      { key: 'modifier_prix_remises', label: 'Modifier prix et remises' },
      { key: 'cloture_limitee', label: 'Clôture caisse limitée (ticket non imprimé)' },
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
      { key: 'ajouter_clients', label: 'Ajouter un client' },
      { key: 'modifier_clients', label: 'Modifier un client' },
      { key: 'supprimer_clients', label: 'Supprimer un client' },
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
      { key: 'voir_tresorerie', label: 'Chiffres d\'affaires / Trésorerie' },
    ],
  },
  {
    label: 'Administration',
    icon: '⚙️',
    perms: [
      { key: 'registre_achats', label: "Registre d'achats" },
      { key: 'voir_suivi_staff', label: 'Voir le suivi des employés (ventes/fautes/commissions)' },
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

function EmployeeModal({ employee, onClose, onSaved, currentUserIsAdmin = false }) {
  const isEdit = !!employee
  const [firstName, setFirstName] = useState(isEdit ? (employee.name?.split(' ')[0] || '') : '')
  const [lastName,  setLastName]  = useState(isEdit ? (employee.name?.split(' ').slice(1).join(' ') || '') : '')
  const [password,  setPassword]  = useState('')
  const [magasin,   setMagasin]   = useState(isEdit ? employee.magasin_id : (MAGASINS_LIST[0]?.id || ''))
  const [pinCode,   setPinCode]   = useState(isEdit ? (employee.pin_code || '') : '')
  const [hourlyWage, setHourlyWage] = useState(isEdit ? (employee.hourly_wage ?? '') : '')
  const [telephone, setTelephone] = useState(isEdit ? (employee.telephone || '') : '')
  const [perms,     setPerms]     = useState(isEdit ? { ...DEFAULT_PERMS, ...employee.permissions } : { ...DEFAULT_PERMS })
  const [isAdminAccount, setIsAdminAccount] = useState(isEdit ? !!employee.is_admin : false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  const email = (firstName && lastName) ? generateEmail(firstName, lastName) : ''

  const handleSave = async () => {
    if (!firstName || !lastName) { setError('Prénom et nom requis'); return }
    if (!isEdit && password.length < 8) { setError('Mot de passe min. 8 caractères'); return }

    if (pinCode) {
      if (!/^\d{4}$/.test(pinCode)) {
        alert('Le code PIN doit contenir exactement 4 chiffres')
        return
      }
      let checkQ = supabase
        .from('staff')
        .select('id')
        .eq('pin_code', pinCode)
      if (isEdit) checkQ = checkQ.neq('id', employee.id)
      const { data: pinDup } = await checkQ
      if (pinDup && pinDup.length > 0) {
        alert('Ce code PIN est déjà utilisé par un autre employé')
        return
      }
    }

    setSaving(true)
    setError(null)

    const data = {
      name:       `${firstName} ${lastName}`.trim(),
      email,
      magasin_id: magasin,
      pin_code:   pinCode || null,
      hourly_wage: Number(hourlyWage) || 0,
      telephone:  telephone || null,
      permissions: perms,
      is_admin:   isAdminAccount,
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
    if (isEdit) {
      logActivity('employee_update', `Modification employé ${data.name} (${data.email})`)
    } else {
      logActivity('employee_create', `Création employé ${data.name} (${data.email})`)
    }
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
            <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">Téléphone (WhatsApp)</label>
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="0470 12 34 56"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">
                Code PIN (pointeuse)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] font-mono tracking-widest"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1B2A4A] block mb-1">
                Salaire horaire (€)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]"
              />
            </div>
          </div>

          {currentUserIsAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-800">Compte administrateur</p>
                <p className="text-xs text-amber-600">Accès complet à tout SebPhone, comme un admin classique</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isAdminAccount}
                  onChange={(e) => setIsAdminAccount(e.target.checked)}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-amber-500
                                after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                after:bg-white after:rounded-full after:h-5 after:w-5
                                after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>
          )}

          {isAdminAccount && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ Les droits individuels ci-dessous n'auront plus d'effet — ce compte aura automatiquement accès à tout.
            </p>
          )}

          <div className={isAdminAccount ? 'opacity-40 pointer-events-none' : ''}>
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

  // Historique
  const [logs, setLogs]                       = useState([])
  const [loadingLogs, setLoadingLogs]         = useState(false)
  const [filterUser, setFilterUser]           = useState('all')
  const [filterAction, setFilterAction]       = useState('all')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd]     = useState('')

  const fetchLogs = async () => {
    setLoadingLogs(true)
    let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (filterUser !== 'all')   q = q.eq('user_name', filterUser)
    if (filterAction !== 'all') q = q.eq('action_type', filterAction)
    if (filterDateStart)        q = q.gte('created_at', new Date(filterDateStart).toISOString())
    if (filterDateEnd) {
      const end = new Date(filterDateEnd)
      end.setHours(23, 59, 59, 999)
      q = q.lte('created_at', end.toISOString())
    }
    const { data } = await q
    setLogs(data || [])
    setLoadingLogs(false)
  }

  useEffect(() => {
    if (tab === 'historique') fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterUser, filterAction, filterDateStart, filterDateEnd])

  const resetLogFilters = () => {
    setFilterUser('all')
    setFilterAction('all')
    setFilterDateStart('')
    setFilterDateEnd('')
  }

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Supprimer cette entrée d\'historique ?')) return
    const { error } = await supabase.from('activity_log').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  const handleClearAllLogs = async () => {
    if (!window.confirm('Vider tout l\'historique ? Action irréversible, continuer ?')) return
    const { error } = await supabase.from('activity_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) { alert('Erreur : ' + error.message); return }
    fetchLogs()
  }

  const logActionBadge = (type) => {
    if (type?.includes('_delete'))    return 'bg-red-100 text-red-700'
    if (type?.startsWith('vente'))    return 'bg-green-100 text-green-700'
    if (type?.startsWith('employee')) return 'bg-blue-100 text-blue-700'
    if (type?.startsWith('client'))   return 'bg-purple-100 text-purple-700'
    if (type?.startsWith('stock'))    return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-600'
  }

  // Suivi employés
  const canSeeSuivi = usePermission('voir_suivi_staff')
  const canManageStaff = usePermission('gerer_utilisateurs')
  const showSuiviTab = isAdmin || canSeeSuivi || canManageStaff

  const [suiviData, setSuiviData]             = useState([])
  const [loadingSuivi, setLoadingSuivi]       = useState(false)
  const [showStaffDetail, setShowStaffDetail] = useState(null)
  const [staffDetailData, setStaffDetailData] = useState(null)
  const [loadingDetail, setLoadingDetail]     = useState(false)
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [incidentForm, setIncidentForm]       = useState({
    type: 'Erreur de caisse',
    gravite: 'mineure',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const fetchSuiviData = async () => {
    setLoadingSuivi(true)
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

    const activeStaff = staff.filter((s) => s.active)
    const dateStartMois = startOfMonth.toISOString().slice(0, 10)
    const dateEndMois = new Date().toISOString().slice(0, 10)

    const rows = await Promise.all(activeStaff.map(async (emp) => {
      const [jour, mois, comms, fautes, salaireMois] = await Promise.all([
        supabase.from('shop_sales')
          .select('total_amount')
          .eq('staff_id', emp.id)
          .gte('created_at', startOfDay.toISOString()),
        supabase.from('shop_sales')
          .select('total_amount')
          .eq('staff_id', emp.id)
          .gte('created_at', startOfMonth.toISOString()),
        supabase.from('staff_commissions')
          .select('commission_amount')
          .eq('staff_id', emp.id),
        supabase.from('staff_incidents')
          .select('id', { count: 'exact', head: true })
          .eq('staff_id', emp.id),
        calcSalairePeriode(supabase, emp.id, emp.hourly_wage || 0, dateStartMois, dateEndMois),
      ])
      const sumJour = (jour.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0)
      const sumMois = (mois.data || []).reduce((s, r) => s + Number(r.total_amount || 0), 0)
      const sumComms = (comms.data || []).reduce((s, r) => s + Number(r.commission_amount || 0), 0)
      return {
        emp,
        ventesJour:  { count: (jour.data || []).length, sum: sumJour },
        ventesMois:  { count: (mois.data || []).length, sum: sumMois },
        commissions: sumComms,
        commissionsMois: salaireMois.commissionsTotal,
        fautes:      fautes.count || 0,
        salaireNetMois: salaireMois.salaireNet,
      }
    }))
    setSuiviData(rows)
    setLoadingSuivi(false)
  }

  useEffect(() => {
    if (tab === 'suivi' && staff.length > 0) fetchSuiviData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, staff])

  const openStaffDetail = async (empId) => {
    setShowStaffDetail(empId)
    setLoadingDetail(true)
    setShowIncidentForm(false)
    const [ventes, incidents, commissions] = await Promise.all([
      supabase.from('shop_sales')
        .select('id, created_at, total_amount, payment_method')
        .eq('staff_id', empId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('staff_incidents')
        .select('*')
        .eq('staff_id', empId)
        .order('date', { ascending: false }),
      supabase.from('staff_commissions')
        .select('*')
        .eq('staff_id', empId)
        .order('created_at', { ascending: false }),
    ])
    setStaffDetailData({
      ventes: ventes.data || [],
      incidents: incidents.data || [],
      commissions: commissions.data || [],
    })
    setLoadingDetail(false)
  }

  const closeStaffDetail = () => {
    setShowStaffDetail(null)
    setStaffDetailData(null)
    setShowIncidentForm(false)
  }

  const currentDetailEmp = staff.find((s) => s.id === showStaffDetail)

  const handleAddIncident = async () => {
    if (!incidentForm.description.trim()) { alert('Description requise'); return }
    if (!showStaffDetail) return
    const raw = localStorage.getItem('sebphone_user')
    const currentUser = raw ? JSON.parse(raw) : {}
    const { error } = await supabase.from('staff_incidents').insert({
      staff_id: showStaffDetail,
      type: incidentForm.type,
      gravite: incidentForm.gravite,
      description: incidentForm.description.trim(),
      date: incidentForm.date,
      created_by: currentUser.name || 'Admin',
    })
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_incident_create', `Faute enregistrée pour ${currentDetailEmp?.name || '?'} — ${incidentForm.type}`)
    setShowIncidentForm(false)
    setIncidentForm({
      type: 'Erreur de caisse',
      gravite: 'mineure',
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
    openStaffDetail(showStaffDetail)
    fetchSuiviData()
  }

  const handleDeleteIncident = async (incidentId) => {
    if (!window.confirm('Supprimer cette faute ?')) return
    const { error } = await supabase.from('staff_incidents').delete().eq('id', incidentId)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('staff_incident_delete', `Faute supprimée pour ${currentDetailEmp?.name || '?'}`)
    openStaffDetail(showStaffDetail)
    fetchSuiviData()
  }

  const graviteBadge = (g) =>
    g === 'grave'  ? 'bg-red-100 text-red-700'   :
    g === 'moyenne' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'

  // Paie — section 4 du modal détail
  const [periodePreset, setPeriodePreset] = useState('mois')
  const [periodeStart, setPeriodeStart]   = useState('')
  const [periodeEnd, setPeriodeEnd]       = useState('')
  const [paieData, setPaieData]           = useState(null)
  const [loadingPaie, setLoadingPaie]     = useState(false)

  const computePresetDates = (preset) => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    if (preset === 'jour') return { start: todayStr, end: todayStr }
    if (preset === 'semaine') {
      const dow = today.getDay() // 0=dim
      const diff = dow === 0 ? -6 : 1 - dow // recule au lundi
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      return { start: monday.toISOString().slice(0, 10), end: todayStr }
    }
    if (preset === 'mois') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: first.toISOString().slice(0, 10), end: todayStr }
    }
    return { start: periodeStart, end: periodeEnd }
  }

  const runPaie = async () => {
    if (!showStaffDetail || !currentDetailEmp) return
    const { start, end } = computePresetDates(periodePreset)
    if (!start || !end) return
    setPeriodeStart(start)
    setPeriodeEnd(end)
    setLoadingPaie(true)
    const result = await calcSalairePeriode(
      supabase, showStaffDetail, currentDetailEmp.hourly_wage || 0, start, end
    )
    setPaieData(result)
    setLoadingPaie(false)
  }

  useEffect(() => {
    if (showStaffDetail && currentDetailEmp && periodePreset !== 'custom') {
      runPaie()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStaffDetail, periodePreset])

  useEffect(() => {
    if (!showStaffDetail) {
      setPaieData(null)
      setPeriodePreset('mois')
      setPeriodeStart('')
      setPeriodeEnd('')
    }
  }, [showStaffDetail])

  // Horaires (planning hebdo)

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
    const target = staff.find((s) => s.id === id)
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('employee_delete', `Suppression employé ${target?.name || id}`)
    fetchStaff()
  }

  const handleToggleActive = async (employee) => {
    const nextActive = !employee.active
    const { error } = await supabase.from('staff').update({ active: nextActive }).eq('id', employee.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('employee_toggle_active', `${employee.name} passé ${nextActive ? 'actif' : 'inactif'}`)
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
        {[
          { key: 'utilisateurs', label: 'Utilisateurs' },
          { key: 'general',      label: 'Général' },
          { key: 'historique',   label: 'Historique', icon: History },
          ...(showSuiviTab ? [{ key: 'suivi', label: 'Suivi', icon: BarChart2 }] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              tab === t.key ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-gray-500 hover:text-[#1B2A4A]'
            }`}
          >
            {t.icon && <t.icon size={14} />}
            {t.label}
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
                        {emp.is_admin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Admin
                          </span>
                        )}
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

      {tab === 'historique' && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              {logs.length} action{logs.length !== 1 ? 's' : ''} enregistrée{logs.length !== 1 ? 's' : ''}
            </p>
            {isAdmin && (
              <button onClick={handleClearAllLogs}
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-100">
                <Trash2 size={14} />
                Vider tout l'historique
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Utilisateur
                </label>
                <select value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="all">Tous</option>
                  {[...new Set(logs.map((l) => l.user_name).filter(Boolean))].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Type d'action
                </label>
                <select value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="all">Tous</option>
                  {[...new Set(logs.map((l) => l.action_type).filter(Boolean))].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Du</label>
                <input type="date" value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Au</label>
                <input type="date" value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="flex items-end">
                <button onClick={resetLogFilters}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-[#1B2A4A]">
                  ✕ Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {loadingLogs ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune action enregistrée pour l'instant.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Date / Heure</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Utilisateur</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Magasin</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Action</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Détail</th>
                    {isAdmin && <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">—</th>}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const d = new Date(log.created_at)
                    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                    const magNom = log.magasin_id
                      ? (MAGASINS[log.magasin_id]?.nom?.replace('Seb Telecom — ', '') || log.magasin_id)
                      : '—'
                    return (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-500 whitespace-nowrap">{dateStr}</td>
                        <td className="px-4 py-2.5">
                          <p className="text-sm font-medium text-[#1B2A4A]">{log.user_name || '—'}</p>
                          {log.user_email && <p className="text-xs text-gray-400">{log.user_email}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{magNom}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${logActionBadge(log.action_type)}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">{log.detail || '—'}</td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'suivi' && showSuiviTab && (
        <>
          {loadingSuivi ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : suiviData.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun employé actif</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Employé</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Magasin</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Ventes jour</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Ventes mois</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Commissions (mois / total)</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Salaire net (ce mois)</th>
                    <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">Fautes</th>
                    <th className="text-center px-4 py-3 font-bold text-gray-500 text-xs uppercase">—</th>
                  </tr>
                </thead>
                <tbody>
                  {suiviData.map((row, idx) => {
                    const initials = row.emp.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '??'
                    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length]
                    const magNom = MAGASINS[row.emp.magasin_id]?.nom?.replace('Seb Telecom — ', '') || row.emp.magasin_id
                    return (
                      <tr key={row.emp.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1B2A4A] text-sm">{row.emp.name}</p>
                              <p className="text-xs text-gray-400">{row.emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{magNom}</td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-bold text-[#1B2A4A]">{row.ventesJour.count} vente{row.ventesJour.count > 1 ? 's' : ''}</p>
                          <p className="text-gray-500">{row.ventesJour.sum.toFixed(2)}€</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-bold text-[#1B2A4A]">{row.ventesMois.count} vente{row.ventesMois.count > 1 ? 's' : ''}</p>
                          <p className="text-gray-500">{row.ventesMois.sum.toFixed(2)}€</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-bold text-[#00B4CC]">
                            {row.commissionsMois.toFixed(2)}€ <span className="text-[9px] text-gray-400 font-normal">ce mois</span>
                          </p>
                          <p className="text-gray-500 mt-0.5">
                            {row.commissions.toFixed(2)}€ <span className="text-[9px]">total</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-bold ${row.salaireNetMois >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {row.salaireNetMois.toFixed(2)}€
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.fautes > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {row.fautes}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => openStaffDetail(row.emp.id)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#1B2A4A] text-white hover:bg-[#00B4CC]">
                            Détail
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showStaffDetail && currentDetailEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-[#1B2A4A] text-lg">Suivi — {currentDetailEmp.name}</h3>
                <p className="text-xs text-gray-500">{currentDetailEmp.email}</p>
              </div>
              <button onClick={closeStaffDetail}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {loadingDetail || !staffDetailData ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-5 space-y-6">

                {/* a) Ventes récentes */}
                <div>
                  <h4 className="font-bold text-[#1B2A4A] mb-3">Ventes récentes</h4>
                  {staffDetailData.ventes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune vente</p>
                  ) : (
                    <div className="bg-gray-50 rounded-xl overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-bold text-gray-500 text-xs uppercase">Date</th>
                            <th className="text-right px-3 py-2 font-bold text-gray-500 text-xs uppercase">Montant</th>
                            <th className="text-left px-3 py-2 font-bold text-gray-500 text-xs uppercase">Paiement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffDetailData.ventes.map((v) => (
                            <tr key={v.id} className="border-b border-gray-100">
                              <td className="px-3 py-2 text-xs text-gray-600 font-mono whitespace-nowrap">
                                {new Date(v.created_at).toLocaleString('fr-BE')}
                              </td>
                              <td className="px-3 py-2 text-sm font-bold text-[#1B2A4A] text-right">
                                {Number(v.total_amount).toFixed(2)}€
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">{v.payment_method}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* b) Fautes / erreurs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[#1B2A4A]">Fautes / erreurs</h4>
                    {(isAdmin || canManageStaff) && !showIncidentForm && (
                      <button onClick={() => setShowIncidentForm(true)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-[#1B2A4A] text-white px-3 py-1.5 rounded-lg hover:bg-[#00B4CC]">
                        <Plus size={12} /> Ajouter
                      </button>
                    )}
                  </div>

                  {showIncidentForm && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                          <select value={incidentForm.type}
                            onChange={(e) => setIncidentForm((f) => ({ ...f, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                            {['Erreur de caisse','Retard','Litige client','Non-respect procédure','Autre'].map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Gravité</label>
                          <div className="flex gap-1">
                            {['mineure','moyenne','grave'].map((g) => (
                              <button key={g}
                                onClick={() => setIncidentForm((f) => ({ ...f, gravite: g }))}
                                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 capitalize
                                  ${incidentForm.gravite === g
                                    ? `${graviteBadge(g)} border-current`
                                    : 'bg-white text-gray-500 border-gray-200'}`}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
                        <textarea value={incidentForm.description}
                          onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
                          placeholder="Détails de la faute..." />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                        <input type="date" value={incidentForm.date}
                          onChange={(e) => setIncidentForm((f) => ({ ...f, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowIncidentForm(false)}
                          className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 text-sm">
                          Annuler
                        </button>
                        <button onClick={handleAddIncident}
                          className="flex-1 py-2 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  )}

                  {staffDetailData.incidents.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune faute enregistrée</p>
                  ) : (
                    <div className="space-y-2">
                      {staffDetailData.incidents.map((inc) => (
                        <div key={inc.id} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${graviteBadge(inc.gravite)}`}>
                            {inc.gravite}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#1B2A4A]">{inc.type}</p>
                              <span className="text-xs text-gray-400">
                                {new Date(inc.date).toLocaleDateString('fr-BE')}
                              </span>
                              {inc.created_by && (
                                <span className="text-[10px] text-gray-400">par {inc.created_by}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{inc.description}</p>
                          </div>
                          {isAdmin && (
                            <button onClick={() => handleDeleteIncident(inc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* c) Commissions */}
                <div>
                  <h4 className="font-bold text-[#1B2A4A] mb-3">Commissions</h4>
                  {staffDetailData.commissions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune commission</p>
                  ) : (
                    <div className="bg-gray-50 rounded-xl overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-bold text-gray-500 text-xs uppercase">Date</th>
                            <th className="text-left px-3 py-2 font-bold text-gray-500 text-xs uppercase">Article</th>
                            <th className="text-right px-3 py-2 font-bold text-gray-500 text-xs uppercase">Vente</th>
                            <th className="text-right px-3 py-2 font-bold text-gray-500 text-xs uppercase">Commission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {staffDetailData.commissions.map((c) => (
                            <tr key={c.id} className="border-b border-gray-100">
                              <td className="px-3 py-2 text-xs text-gray-600 font-mono whitespace-nowrap">
                                {new Date(c.created_at).toLocaleDateString('fr-BE')}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-700">
                                <p>{c.item_name}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {c.category || '—'} · {Number(c.rate ?? 0)}%
                                </p>
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-500 text-right">
                                {Number(c.base_amount).toFixed(2)}€
                              </td>
                              <td className="px-3 py-2 text-sm font-bold text-[#00B4CC] text-right">
                                {Number(c.commission_amount).toFixed(2)}€
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-white">
                            <td colSpan={3} className="px-3 py-2 text-xs font-bold text-right">Total :</td>
                            <td className="px-3 py-2 text-sm font-bold text-[#00B4CC] text-right">
                              {staffDetailData.commissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0).toFixed(2)}€
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* d) Paie */}
                <div>
                  <h4 className="font-bold text-[#1B2A4A] mb-3">Paie</h4>

                  <div className="flex gap-2 mb-3 flex-wrap">
                    {[
                      { key: 'jour', label: 'Aujourd\'hui' },
                      { key: 'semaine', label: 'Cette semaine' },
                      { key: 'mois', label: 'Ce mois' },
                      { key: 'custom', label: 'Personnalisé' },
                    ].map((p) => (
                      <button key={p.key}
                        onClick={() => setPeriodePreset(p.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                          ${periodePreset === p.key
                            ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B2A4A]'}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {periodePreset === 'custom' && (
                    <div className="flex gap-2 items-end mb-3 flex-wrap">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Du</label>
                        <input type="date" value={periodeStart}
                          onChange={(e) => setPeriodeStart(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Au</label>
                        <input type="date" value={periodeEnd}
                          onChange={(e) => setPeriodeEnd(e.target.value)}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <button onClick={runPaie}
                        disabled={!periodeStart || !periodeEnd || loadingPaie}
                        className="px-4 py-2 bg-[#00B4CC] text-white rounded-xl text-sm font-bold hover:bg-[#1B2A4A] disabled:opacity-50">
                        Calculer
                      </button>
                    </div>
                  )}

                  {loadingPaie ? (
                    <div className="flex items-center justify-center h-24">
                      <div className="w-6 h-6 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : paieData ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Heures travaillées</p>
                          <p className="text-lg font-bold text-[#1B2A4A] mt-1">
                            {paieData.totalHeures.toFixed(1)}h
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Salaire brut</p>
                          <p className="text-lg font-bold text-[#1B2A4A] mt-1">
                            {paieData.salaireBrut.toFixed(2)}€
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Pénalités retard</p>
                          <p className={`text-lg font-bold mt-1 ${paieData.penalitesRetard > 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                            {paieData.penalitesRetard > 0 ? '-' : ''}{paieData.penalitesRetard.toFixed(2)}€
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Absences</p>
                          <p className={`text-lg font-bold mt-1 ${paieData.absencesCount > 0 ? 'text-red-600' : 'text-[#1B2A4A]'}`}>
                            {paieData.absencesCount} jour{paieData.absencesCount !== 1 ? 's' : ''}
                          </p>
                          {paieData.penalitesAbsence > 0 && (
                            <p className="text-xs text-red-600 font-bold">-{paieData.penalitesAbsence}€</p>
                          )}
                          {paieData.absencesCount > 0 && (
                            <p className="text-[9px] text-gray-400 mt-1 leading-tight">
                              {paieData.absencesDates.map((d) => new Date(d).toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit' })).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">Commissions</p>
                          <p className="text-lg font-bold text-green-600 mt-1">
                            +{paieData.commissionsTotal.toFixed(2)}€
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl p-5 text-white shadow-md flex items-center justify-between"
                        style={{ background: `linear-gradient(135deg, #1B2A4A 0%, #0d9488 100%)` }}>
                        <div>
                          <p className="text-xs uppercase opacity-70 font-bold">Total net</p>
                          <p className="text-xs opacity-70">
                            {periodeStart && periodeEnd
                              ? `${new Date(periodeStart).toLocaleDateString('fr-BE')} → ${new Date(periodeEnd).toLocaleDateString('fr-BE')}`
                              : ''}
                          </p>
                        </div>
                        <p className={`text-3xl font-black ${paieData.salaireNet < 0 ? 'text-red-300' : 'text-white'}`}>
                          {paieData.salaireNet.toFixed(2)}€
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Sélectionne une période pour calculer</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
          currentUserIsAdmin={isAdmin}
        />
      )}
    </div>
  )
}
