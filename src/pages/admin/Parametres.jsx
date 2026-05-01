import { useState, useEffect } from 'react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { MAGASINS_LIST, MAGASINS } from '../../utils/magasins'
import { sha256 } from 'js-sha256'
import { Plus, X, Pencil, Trash2, Shield, Store, CheckCircle } from 'lucide-react'

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
    label: 'Stock',
    perms: [
      { key: 'voir_stock',        label: 'Voir le stock' },
      { key: 'ajouter_stock',     label: 'Ajouter des téléphones' },
      { key: 'modifier_stock',    label: 'Modifier les téléphones' },
      { key: 'supprimer_stock',   label: 'Supprimer des téléphones' },
      { key: 'offre_semaine',     label: "Définir l'offre de la semaine" },
    ],
  },
  {
    label: 'Commandes',
    perms: [
      { key: 'voir_commandes',     label: 'Voir les commandes' },
      { key: 'modifier_commandes', label: 'Modifier les commandes' },
      { key: 'encaisser',          label: 'Encaisser une commande' },
      { key: 'verifier_code',      label: 'Vérifier un code client' },
    ],
  },
  {
    label: 'Clients & Marketing',
    perms: [
      { key: 'voir_clients',  label: 'Voir les clients' },
      { key: 'codes_promo',   label: 'Gérer les codes promo' },
    ],
  },
  {
    label: 'Finance',
    perms: [
      { key: 'voir_comptabilite', label: 'Voir la comptabilité' },
    ],
  },
  {
    label: 'Administration',
    perms: [
      { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs' },
    ],
  },
]

const DEFAULT_PERMS = {
  voir_stock: true, ajouter_stock: false, modifier_stock: false,
  supprimer_stock: false, offre_semaine: false,
  voir_commandes: false, modifier_commandes: false, encaisser: false,
  verifier_code: false, voir_clients: false, codes_promo: false,
  voir_comptabilite: false, gerer_utilisateurs: false,
}

const AVATAR_COLORS = [
  'bg-[#00B4CC]', 'bg-[#1B2A4A]', 'bg-emerald-500',
  'bg-purple-500', 'bg-orange-500', 'bg-rose-500',
]

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
      const { error: e } = await supabase.from('staff').insert([data])
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
  const [tab, setTab]             = useState('utilisateurs')
  const [staff, setStaff]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)

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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400">
          <p className="text-sm">Paramètres généraux — à venir</p>
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
