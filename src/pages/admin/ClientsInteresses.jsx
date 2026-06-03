import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Bell, Check, X } from 'lucide-react'
import { MAGASINS } from '../../utils/magasins'

const CATEGORIES = [
  { value: 'telephone', label: 'Téléphone' },
  { value: 'tablette', label: 'Tablette' },
  { value: 'montre', label: 'Montre connectée' },
  { value: 'ecouteur', label: 'Écouteurs / AirPods' },
  { value: 'ordinateur', label: 'Ordinateur' },
  { value: 'accessoire', label: 'Accessoire' },
]

const MODELS = {
  telephone: [
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17',
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPhone SE (2022)', 'iPhone SE (2020)',
    'iPhone 8 Plus', 'iPhone 8',
    'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24',
    'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23',
    'Samsung Galaxy A55', 'Samsung Galaxy A35', 'Samsung Galaxy Z Fold 6',
    'Samsung Galaxy Z Flip 6',
  ],
  tablette: [
    'iPad Air 13" M4', 'iPad Air 11" M4', 'iPad Air 13" M3', 'iPad Air 11" M3',
    'iPad Pro 13" M4', 'iPad Pro 11" M4', 'iPad 11e génération', 'iPad 10e génération',
    'iPad mini 7', 'iPad mini 6',
    'Samsung Galaxy Tab S11 Ultra', 'Samsung Galaxy Tab S11',
    'Samsung Galaxy Tab S10 Ultra', 'Samsung Galaxy Tab S10+',
  ],
  montre: [
    'Apple Watch Ultra 3', 'Apple Watch Series 11', 'Apple Watch SE 3',
    'Apple Watch Ultra 2', 'Apple Watch Series 10', 'Apple Watch Series 9',
    'Samsung Galaxy Watch Ultra 2025', 'Samsung Galaxy Watch 8 Classic',
    'Samsung Galaxy Watch 8',
  ],
  ecouteur: [
    'AirPods Pro 3', 'AirPods Pro 2', 'AirPods 4 (ANC)', 'AirPods 4',
    'AirPods Max 2', 'AirPods Max', 'AirPods 3',
    'Samsung Galaxy Buds 3 Pro', 'Samsung Galaxy Buds 3',
    'Sony WH-1000XM6', 'Sony WH-1000XM5', 'Sony WF-1000XM5',
  ],
  ordinateur: [
    'MacBook Air M4', 'MacBook Air M3', 'MacBook Pro M4', 'MacBook Pro M3',
    'Dell XPS', 'HP Spectre', 'Lenovo ThinkPad',
  ],
  accessoire: ['Chargeur', 'Coque', 'Câble', 'Adaptateur', 'Verre trempé'],
}

const STORAGES = ['64Go', '128Go', '256Go', '512Go', '1To', '2To']
const REMINDER_DAYS = 10

export default function ClientsInteresses() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [matches, setMatches] = useState({})
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    categorie: 'telephone', model: '', storage: '', color: '',
    grade: '', max_budget: '', notes: '',
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data } = await supabase
      .from('interested_clients')
      .select('*')
      .eq('status', 'en_attente')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)

    if (data) {
      checkMatchesAndReminders(data)
    }
  }

  const checkMatchesAndReminders = async (clientList) => {
    const matchMap = {}
    for (const client of clientList) {
      let query = supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .eq('categorie', client.categorie)
        .ilike('model', `%${client.model}%`)
      if (client.storage) query = query.eq('storage', client.storage)

      const { data: available } = await query
      if (available && available.length > 0) {
        matchMap[client.id] = available

        if (!client.notified_at) {
          await sendAvailableEmail(client, available[0])
          await supabase.from('interested_clients')
            .update({
              notified_at: new Date().toISOString(),
              matched_phone_id: available[0].id,
            })
            .eq('id', client.id)
        }
      }

      if (client.notified_at) {
        const lastReminder = client.last_reminder_at
          ? new Date(client.last_reminder_at)
          : new Date(client.notified_at)
        const daysSince = (Date.now() - lastReminder.getTime())
          / (1000 * 60 * 60 * 24)
        if (daysSince >= REMINDER_DAYS && matchMap[client.id]) {
          await sendReminderEmail(client, matchMap[client.id][0])
          await supabase.from('interested_clients')
            .update({ last_reminder_at: new Date().toISOString() })
            .eq('id', client.id)
        }
      }
    }
    setMatches(matchMap)
  }

  const sendAvailableEmail = async (client, phone) => {
    try {
      const emailjs = (await import('@emailjs/browser')).default
      const magasinNom = phone.magasins?.[0]
        ? (MAGASINS[phone.magasins[0]]?.nom || 'SebPhone')
        : 'SebPhone'
      await emailjs.send('service_nn74puq', 'template_interested', {
        to_email: client.customer_email,
        to_name: client.customer_name,
        phone_name: phone.name || phone.model,
        phone_color: phone.color || '—',
        phone_storage: phone.storage || '—',
        phone_price: `${phone.price}€`,
        magasin_nom: magasinNom,
        reservation_url: `https://sebphone.be/reservation/${phone.id}`,
        email_type: 'disponible',
      }, 'rqbaYNMIGNP6IQB9O')
    } catch (e) { console.warn('Email dispo non envoyé', e) }
  }

  const sendReminderEmail = async (client, phone) => {
    try {
      const emailjs = (await import('@emailjs/browser')).default
      const magasinNom = phone.magasins?.[0]
        ? (MAGASINS[phone.magasins[0]]?.nom || 'SebPhone')
        : 'SebPhone'
      await emailjs.send('service_nn74puq', 'template_interested', {
        to_email: client.customer_email,
        to_name: client.customer_name,
        phone_name: phone.name || phone.model,
        phone_color: phone.color || '—',
        phone_storage: phone.storage || '—',
        phone_price: `${phone.price}€`,
        magasin_nom: magasinNom,
        reservation_url: `https://sebphone.be/reservation/${phone.id}`,
        email_type: 'rappel',
      }, 'rqbaYNMIGNP6IQB9O')
    } catch (e) { console.warn('Email rappel non envoyé', e) }
  }

  const handleManualReminder = async (client) => {
    const match = matches[client.id]
    if (!match || match.length === 0) {
      alert('Aucun appareil correspondant en stock actuellement.')
      return
    }
    await sendReminderEmail(client, match[0])
    await supabase.from('interested_clients')
      .update({ last_reminder_at: new Date().toISOString() })
      .eq('id', client.id)
    alert(`✅ Rappel envoyé à ${client.customer_name}`)
    fetchClients()
  }

  const handleAdd = async () => {
    if (!form.customer_name || !form.customer_email || !form.model) {
      alert('Nom, email et modèle obligatoires')
      return
    }
    const { error } = await supabase.from('interested_clients').insert({
      ...form,
      max_budget: form.max_budget ? parseFloat(form.max_budget) : null,
    })
    if (error) { alert('Erreur : ' + error.message); return }
    setShowAdd(false)
    setForm({
      customer_name: '', customer_email: '', customer_phone: '',
      categorie: 'telephone', model: '', storage: '', color: '',
      grade: '', max_budget: '', notes: '',
    })
    fetchClients()
  }

  const markAsResolved = async (id) => {
    await supabase.from('interested_clients')
      .update({ status: 'resolu' }).eq('id', id)
    fetchClients()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return
    await supabase.from('interested_clients').delete().eq('id', id)
    fetchClients()
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">
            Clients intéressés
          </h1>
          <p className="text-sm text-gray-500">
            Liste d'attente — notification auto dès qu'un appareil arrive
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#00B4CC] transition-all">
          <Plus size={16} /> Ajouter un client
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Chargement...</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Aucun client en attente
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const hasMatch = matches[client.id]?.length > 0
            return (
              <div key={client.id}
                className={`bg-white rounded-2xl border-2 p-4 ${
                  hasMatch ? 'border-green-300' : 'border-gray-100'
                }`}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-[#1B2A4A]">
                        {client.customer_name}
                      </p>
                      {hasMatch && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-100 text-green-700">
                          ✓ Disponible en stock
                        </span>
                      )}
                      {client.notified_at && (
                        <span className="text-xs text-gray-400">
                          Notifié le {new Date(client.notified_at).toLocaleDateString('fr-BE')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {client.customer_email} · {client.customer_phone}
                    </p>
                    <p className="text-sm font-medium text-[#1B2A4A] mt-1">
                      📱 {client.model}
                      {client.storage && ` · ${client.storage}`}
                      {client.color && ` · ${client.color}`}
                      {client.grade && ` · ${client.grade}`}
                    </p>
                    {client.max_budget && (
                      <p className="text-xs text-gray-500">
                        Budget max : {client.max_budget}€
                      </p>
                    )}
                    {client.notes && (
                      <p className="text-xs text-gray-400 italic mt-1">
                        {client.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleManualReminder(client)}
                      disabled={!hasMatch}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 disabled:opacity-40 transition-all">
                      <Bell size={14} /> Rappel
                    </button>
                    <button onClick={() => markAsResolved(client.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-xl text-xs font-bold hover:bg-green-200">
                      <Check size={14} /> Résolu
                    </button>
                    <button onClick={() => handleDelete(client.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 rounded-xl text-xs hover:bg-red-50">
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h2 className="font-bold text-[#1B2A4A] text-lg">
                Ajouter un client intéressé
              </h2>
              <button onClick={() => setShowAdd(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nom complet *" value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="col-span-2 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input type="email" placeholder="Email *"
                  value={form.customer_email}
                  onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input type="tel" placeholder="Téléphone"
                  value={form.customer_phone}
                  onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Catégorie</label>
                <select value={form.categorie}
                  onChange={(e) => setForm((f) => ({
                    ...f, categorie: e.target.value, model: '',
                  }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Modèle *</label>
                <select value={form.model}
                  onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">Sélectionner...</option>
                  {(MODELS[form.categorie] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Stockage</label>
                  <select value={form.storage}
                    onChange={(e) => setForm((f) => ({ ...f, storage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="">Indifférent</option>
                    {STORAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input placeholder="Couleur souhaitée" value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm self-end" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Grade souhaité (optionnel)"
                  value={form.grade}
                  onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input type="number" placeholder="Budget max €"
                  value={form.max_budget}
                  onChange={(e) => setForm((f) => ({ ...f, max_budget: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>

              <textarea placeholder="Notes (optionnel)" rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                  Annuler
                </button>
                <button onClick={handleAdd}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-[#00B4CC]">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
