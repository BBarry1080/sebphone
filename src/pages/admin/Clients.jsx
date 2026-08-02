import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useIsAdmin, usePermission } from '../../hooks/usePermissions'
import { logActivity } from '../../lib/logActivity'
import { MAGASINS_PHYSIQUES } from '../../utils/magasins'
import { Plus, Pencil, Trash2, MapPin, Download, Mail, Search, X } from 'lucide-react'

const pad4 = (n) => String(n).padStart(4, '0')

const emptyForm = () => ({
  nom: '', prenom: '', tel: '', tel2: '',
  adresse: '', ville: '', cp: '', pays: 'Belgique',
  magasin_id: MAGASINS_PHYSIQUES[0]?.id || '',
})

export default function Clients() {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const canView = usePermission('voir_clients')
  const canAdd = usePermission('ajouter_clients')
  const canEdit = usePermission('modifier_clients')
  const canDelete = usePermission('supprimer_clients')

  useEffect(() => {
    if (!isAdmin && !canView) navigate('/admin/dashboard', { replace: true })
  }, [isAdmin, canView, navigate])

  const [clients, setClients]                 = useState([])
  const [loading, setLoading]                 = useState(true)
  const [filterVille, setFilterVille]         = useState('all')
  const [filterField, setFilterField]         = useState('nom')
  const [filterText, setFilterText]           = useState('')
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [showModal, setShowModal]             = useState(false)
  const [editingClient, setEditingClient]     = useState(null)
  const [form, setForm]                       = useState(emptyForm())
  const [saving, setSaving]                   = useState(false)

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const villes = useMemo(() => {
    return [...new Set(clients.map((c) => c.ville).filter(Boolean))].sort()
  }, [clients])

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return clients.filter((c) => {
      if (filterVille !== 'all' && c.ville !== filterVille) return false
      if (!q) return true
      const target =
        filterField === 'nom'    ? c.nom :
        filterField === 'prenom' ? c.prenom :
        filterField === 'tel'    ? (c.tel || '') + ' ' + (c.tel2 || '') :
        ''
      return (target || '').toLowerCase().includes(q)
    })
  }, [clients, filterVille, filterField, filterText])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  )

  const openNewModal = () => {
    setEditingClient(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEditModal = () => {
    if (!selectedClient) {
      alert('Sélectionnez un client dans la liste')
      return
    }
    setEditingClient(selectedClient)
    setForm({
      nom: selectedClient.nom || '',
      prenom: selectedClient.prenom || '',
      tel: selectedClient.tel || '',
      tel2: selectedClient.tel2 || '',
      adresse: selectedClient.adresse || '',
      ville: selectedClient.ville || '',
      cp: selectedClient.cp || '',
      pays: selectedClient.pays || 'Belgique',
      magasin_id: selectedClient.magasin_id || MAGASINS_PHYSIQUES[0]?.id || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nom.trim()) { alert('Nom requis'); return }
    if (!form.magasin_id) { alert('Magasin requis'); return }
    setSaving(true)

    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim() || null,
      tel: form.tel.trim() || null,
      tel2: form.tel2.trim() || null,
      adresse: form.adresse.trim() || null,
      ville: form.ville.trim() || null,
      cp: form.cp.trim() || null,
      pays: form.pays.trim() || 'Belgique',
      magasin_id: form.magasin_id,
    }

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', editingClient.id)
      setSaving(false)
      if (error) { alert('Erreur : ' + error.message); return }
      logActivity('client_update', `Fiche client mise à jour — ${payload.nom}`)
    } else {
      const { count } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('magasin_id', form.magasin_id)
      payload.client_number = 'CL-' + pad4((count || 0) + 1)
      const { error } = await supabase.from('clients').insert(payload)
      setSaving(false)
      if (error) { alert('Erreur : ' + error.message); return }
      logActivity('client_create', `Nouvelle fiche client — ${payload.nom}`)
    }

    setShowModal(false)
    setEditingClient(null)
    setForm(emptyForm())
    fetchClients()
  }

  const handleDelete = async () => {
    if (!selectedClient) {
      alert('Sélectionnez un client dans la liste')
      return
    }
    if (!window.confirm(`Supprimer le client ${selectedClient.nom} ?`)) return
    const { error } = await supabase.from('clients').delete().eq('id', selectedClient.id)
    if (error) { alert('Erreur : ' + error.message); return }
    logActivity('client_delete', `Suppression fiche client — ${selectedClient.nom}`)
    setSelectedClientId(null)
    fetchClients()
  }

  const handleLocate = () => {
    if (!selectedClient) {
      alert('Sélectionnez un client dans la liste')
      return
    }
    const query = [selectedClient.adresse, selectedClient.cp, selectedClient.ville, selectedClient.pays]
      .filter(Boolean)
      .join(', ')
    if (!query) {
      alert('Ce client n\'a pas d\'adresse renseignée')
      return
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank')
  }

  const handleExportCsv = () => {
    const headers = ['Code', 'Nom', 'Prénom', 'Tel 1', 'Tel 2', 'Adresse', 'Ville', 'CP', 'Pays', 'Magasin']
    const escape = (v) => {
      const s = String(v ?? '')
      if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const rows = filtered.map((c) => [
      c.client_number || '',
      c.nom || '',
      c.prenom || '',
      c.tel || '',
      c.tel2 || '',
      c.adresse || '',
      c.ville || '',
      c.cp || '',
      c.pays || '',
      c.magasin_id || '',
    ].map(escape).join(';'))
    const csv = '﻿' + [headers.map(escape).join(';'), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sebphone-clients.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMailing = () => {
    alert('Mailing groupé — bientôt disponible')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''} — {clients.length} au total
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ville</label>
            <select value={filterVille}
              onChange={(e) => setFilterVille(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none">
              <option value="all">Toutes les villes</option>
              {villes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Recherche par</label>
            <select value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none">
              <option value="nom">Nom</option>
              <option value="prenom">Prénom</option>
              <option value="tel">Téléphone</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Terme</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Layout : tableau + colonne boutons */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-60">
              <div className="w-7 h-7 border-2 border-[#00B4CC] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              Aucun client
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Code','Nom','Prénom','Tel 1','Tel 2','Adresse','Ville','CP','Pays'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 font-bold text-gray-500 text-xs uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const isSel = c.id === selectedClientId
                    return (
                      <tr key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${
                          isSel ? 'bg-cyan-50' : 'hover:bg-gray-50'
                        }`}>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">{c.client_number || '—'}</td>
                        <td className="px-3 py-2.5 font-medium text-[#1B2A4A]">{c.nom}</td>
                        <td className="px-3 py-2.5 text-gray-700">{c.prenom || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{c.tel || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{c.tel2 || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">{c.adresse || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">{c.ville || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{c.cp || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-600">{c.pays || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonne boutons */}
        <div className="w-[190px] flex flex-col gap-2 flex-shrink-0">
          {(canAdd || isAdmin) && (
            <button onClick={openNewModal}
              className="w-full flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#00B4CC] transition-all">
              <Plus size={15} /> Nouveau
            </button>
          )}
          {(canEdit || isAdmin) && (
            <button onClick={openEditModal}
              className="w-full flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#1B2A4A]">
              <Pencil size={15} /> Éditer
            </button>
          )}
          {(canDelete || isAdmin) && (
            <button onClick={handleDelete}
              className="w-full flex items-center gap-2 bg-white border border-gray-200 text-red-500 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-red-300 hover:bg-red-50">
              <Trash2 size={15} /> Supprimer
            </button>
          )}
          <button onClick={handleLocate}
            className="w-full flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#00B4CC]">
            <MapPin size={15} /> Localiser
          </button>
          <button onClick={handleExportCsv}
            className="w-full flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#00B4CC]">
            <Download size={15} /> Exporter CSV
          </button>
          <button onClick={handleMailing}
            className="w-full flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:border-[#00B4CC]">
            <Mail size={15} /> Mailing
          </button>
        </div>
      </div>

      {/* MODAL Nouveau / Éditer */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-[#1B2A4A]">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nom *</label>
                <input value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prénom</label>
                <input value={form.prenom}
                  onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone 1</label>
                <input type="tel" value={form.tel}
                  onChange={(e) => setForm((f) => ({ ...f, tel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Téléphone 2</label>
                <input type="tel" value={form.tel2}
                  onChange={(e) => setForm((f) => ({ ...f, tel2: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Adresse</label>
                <input value={form.adresse}
                  onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ville</label>
                <input value={form.ville}
                  onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Code postal</label>
                <input value={form.cp}
                  onChange={(e) => setForm((f) => ({ ...f, cp: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pays</label>
                <input value={form.pays}
                  onChange={(e) => setForm((f) => ({ ...f, pays: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC]" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Magasin *</label>
                <select value={form.magasin_id}
                  onChange={(e) => setForm((f) => ({ ...f, magasin_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-[#00B4CC]">
                  {MAGASINS_PHYSIQUES.map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex gap-3 mt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm">
                  Annuler
                </button>
                <button onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-bold hover:bg-[#00B4CC] disabled:opacity-50">
                  {saving ? 'Enregistrement...' : (editingClient ? 'Sauvegarder' : 'Créer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
