import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/usePermissions'
import { Plus, X, Check, Package, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

const FOURNISSEURS_LIST = [
  'SebPhone', 'Louise', 'Anderlecht', 'Molenbeek',
  'Rue Neuve', 'Marrakech', 'Zainab Debboun',
  'Fournisseur externe 1', 'Fournisseur externe 2', 'Autre',
]

const DELAIS = [
  '24-48h', '2-3 jours', '3-5 jours', '1 semaine',
  '1-2 semaines', 'Sur devis', 'En attente stock',
]

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Autre']

const CONDITIONS = ['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'Occasion']

const GRADES = ['A+', 'A', 'B', 'C']

const STORAGES = ['16Go', '32Go', '64Go', '128Go', '256Go', '512Go', '1To']

const emptyForm = {
  brand: 'Apple',
  model: '',
  color: '',
  storage: '128Go',
  condition: 'Neuf',
  grade: 'A',
  price: '',
  fournisseur: 'SebPhone',
  fournisseur_custom: '',
  delai: '2-3 jours',
  visible_on_site: false,
  notes: '',
}

export default function AdminSurCommande() {
  const currentUser = useCurrentUser()
  const [phones, setPhones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showRecuModal, setShowRecuModal] = useState(null)
  const [recuForm, setRecuForm] = useState({ imei: '', battery_health: '' })

  const fetchPhones = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('phones')
      .select('*')
      .eq('status', 'sur_commande')
      .order('created_at', { ascending: false })
    setPhones(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPhones() }, [])

  const handleSave = async () => {
    if (!form.model || !form.price) {
      alert('Modèle et prix sont obligatoires')
      return
    }
    setSaving(true)
    const fournisseur = FOURNISSEURS_LIST.includes(form.fournisseur)
      ? form.fournisseur === 'Autre' ? form.fournisseur_custom : form.fournisseur
      : form.fournisseur_custom

    const payload = {
      name: form.model,
      model: form.model,
      brand: form.brand,
      color: form.color,
      storage: form.storage,
      condition: form.condition.toLowerCase().replace(/ /g, '_'),
      grade: form.grade,
      price: parseFloat(form.price) || 0,
      purchase_price: 0,
      fournisseur,
      status: 'sur_commande',
      visible_on_site: form.visible_on_site,
      magasins: [],
      tva_regime: 'marge',
      parts_replaced: [],
      added_by: currentUser?.name || 'Admin',
      notes: form.notes,
      delai_commande: form.delai,
    }

    if (editingId) {
      await supabase.from('phones').update(payload).eq('id', editingId)
    } else {
      await supabase.from('phones').insert([payload])
    }

    setSaving(false)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    fetchPhones()
  }

  const handleEdit = (phone) => {
    setForm({
      brand: phone.brand || 'Apple',
      model: phone.name || phone.model || '',
      color: phone.color || '',
      storage: phone.storage || '128Go',
      condition: phone.condition || 'Neuf',
      grade: phone.grade || 'A',
      price: phone.price || '',
      fournisseur: FOURNISSEURS_LIST.includes(phone.fournisseur)
        ? phone.fournisseur : 'Autre',
      fournisseur_custom: phone.fournisseur || '',
      delai: phone.delai_commande || '2-3 jours',
      visible_on_site: phone.visible_on_site || false,
      notes: phone.notes || '',
    })
    setEditingId(phone.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce téléphone sur commande ?')) return
    await supabase.from('phones').delete().eq('id', id)
    fetchPhones()
  }

  const toggleVisible = async (phone) => {
    await supabase.from('phones')
      .update({ visible_on_site: !phone.visible_on_site })
      .eq('id', phone.id)
    fetchPhones()
  }

  const handleRecu = async () => {
    if (!showRecuModal) return
    if (!recuForm.imei || recuForm.imei.length < 10) {
      alert('IMEI obligatoire pour recevoir le téléphone')
      return
    }
    await supabase.from('phones').update({
      status: 'disponible',
      imei: recuForm.imei,
      battery_health: recuForm.battery_health
        ? parseInt(recuForm.battery_health) : null,
      visible_on_site: true,
    }).eq('id', showRecuModal.id)
    setShowRecuModal(null)
    setRecuForm({ imei: '', battery_health: '' })
    fetchPhones()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#1B2A4A]">
            📦 Stock Sur Commande
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Téléphones disponibles chez le fournisseur — pas encore en stock physique
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setForm(emptyForm)
          }}
          className="flex items-center gap-2 bg-[#1B2A4A] text-white
                     px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#00B4CC]
                     transition-all">
          <Plus size={16}/>
          Ajouter sur commande
        </button>
      </div>

      {/* FORMULAIRE */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1B2A4A]">
              {editingId ? 'Modifier' : 'Ajouter'} un téléphone sur commande
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null) }}>
              <X size={18} className="text-gray-400"/>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Marque */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Marque
              </label>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map(b => (
                  <button key={b} type="button"
                    onClick={() => setForm(f => ({ ...f, brand: b }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border
                      ${form.brand === b
                        ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                        : 'bg-white text-gray-600 border-gray-200'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Modèle */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Modèle *
              </label>
              <input
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="ex: iPhone 15 Pro Max"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl
                           text-sm focus:border-[#00B4CC] outline-none"
              />
            </div>

            {/* Couleur */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Couleur
              </label>
              <input
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="ex: Noir, Blanc, Bleu..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl
                           text-sm focus:border-[#00B4CC] outline-none"
              />
            </div>

            {/* Stockage */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Stockage
              </label>
              <div className="flex flex-wrap gap-2">
                {STORAGES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, storage: s }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border
                      ${form.storage === s
                        ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                        : 'bg-white text-gray-600 border-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* État */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                État
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm(f => ({ ...f, condition: c }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border
                      ${form.condition === c
                        ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                        : 'bg-white text-gray-600 border-gray-200'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Grade
              </label>
              <div className="flex gap-2">
                {GRADES.map(g => (
                  <button key={g} type="button"
                    onClick={() => setForm(f => ({ ...f, grade: g }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border
                      ${form.grade === g
                        ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                        : 'bg-white text-gray-600 border-gray-200'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Prix */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Prix de vente (€) *
              </label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="ex: 899"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl
                           text-sm focus:border-[#00B4CC] outline-none font-bold"
              />
            </div>

            {/* Fournisseur */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Fournisseur
              </label>
              <select
                value={form.fournisseur}
                onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                {FOURNISSEURS_LIST.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {form.fournisseur === 'Autre' && (
                <input
                  value={form.fournisseur_custom}
                  onChange={e => setForm(f => ({ ...f, fournisseur_custom: e.target.value }))}
                  placeholder="Nom du fournisseur"
                  className="w-full mt-2 px-3 py-2 border border-gray-200
                             rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                />
              )}
            </div>

            {/* Délai */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Délai estimé
              </label>
              <div className="flex flex-wrap gap-2">
                {DELAIS.map(d => (
                  <button key={d} type="button"
                    onClick={() => setForm(f => ({ ...f, delai: d }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border
                      ${form.delai === d
                        ? 'bg-[#00B4CC] text-white border-[#00B4CC]'
                        : 'bg-white text-gray-600 border-gray-200'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                Notes internes
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes sur ce téléphone..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl
                           text-sm focus:border-[#00B4CC] outline-none"
              />
            </div>

            {/* Visible sur site */}
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, visible_on_site: !f.visible_on_site }))}
                className={`relative w-12 h-6 rounded-full transition-all
                  ${form.visible_on_site ? 'bg-[#00B4CC]' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full
                                  transition-all shadow
                  ${form.visible_on_site ? 'left-7' : 'left-1'}`}/>
              </button>
              <span className="text-sm font-medium text-gray-700">
                Visible sur le site public
              </span>
            </div>
          </div>

          {/* Bouton sauvegarder */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className="flex-1 py-2 border border-gray-200 rounded-xl
                         text-gray-600 text-sm font-medium">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-[#1B2A4A] text-white rounded-xl
                         text-sm font-bold disabled:opacity-50
                         hover:bg-[#00B4CC] transition-all">
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* TABLEAU */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : phones.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30"/>
          <p>Aucun téléphone sur commande</p>
          <p className="text-xs mt-1">Ajoutez des téléphones disponibles chez vos fournisseurs</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Modèle', 'État', 'Prix', 'Fournisseur', 'Délai', 'Site', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phones.map(phone => (
                <tr key={phone.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-[#1B2A4A]">{phone.name}</p>
                    <p className="text-xs text-gray-500">
                      {phone.storage} · {phone.color}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700
                                     px-2 py-1 rounded-lg font-medium">
                      {phone.condition} {phone.grade && `· ${phone.grade}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-[#1B2A4A]">
                      {phone.price}€
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {phone.fournisseur || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-orange-100 text-orange-700
                                     px-2 py-1 rounded-lg font-medium">
                      {phone.delai_commande || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisible(phone)}
                      className={`p-1.5 rounded-lg transition-all
                        ${phone.visible_on_site
                          ? 'text-green-600 bg-green-50'
                          : 'text-gray-400 bg-gray-50'}`}>
                      {phone.visible_on_site
                        ? <Eye size={14}/>
                        : <EyeOff size={14}/>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Reçu */}
                      <button
                        onClick={() => {
                          setShowRecuModal(phone)
                          setRecuForm({ imei: '', battery_health: '' })
                        }}
                        title="Marquer comme reçu → passe en stock"
                        className="p-1.5 text-green-600 hover:bg-green-50
                                   rounded-lg transition-all">
                        <Check size={14}/>
                      </button>
                      {/* Modifier */}
                      <button
                        onClick={() => handleEdit(phone)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50
                                   rounded-lg transition-all">
                        <Pencil size={14}/>
                      </button>
                      {/* Supprimer */}
                      <button
                        onClick={() => handleDelete(phone.id)}
                        className="p-1.5 text-red-400 hover:bg-red-50
                                   rounded-lg transition-all">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL REÇU */}
      {showRecuModal && (
        <div className="fixed inset-0 bg-black/50 z-50
                        flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-[#1B2A4A] text-lg mb-1">
              ✅ Téléphone reçu !
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {showRecuModal.name} — {showRecuModal.storage} — {showRecuModal.color}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Ce téléphone va passer en stock disponible.
              Renseigne l'IMEI et la batterie.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  IMEI *
                </label>
                <input
                  type="text"
                  value={recuForm.imei}
                  onChange={e => setRecuForm(f => ({ ...f, imei: e.target.value }))}
                  placeholder="Ex: 352999823425561"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-orange-300
                             rounded-xl text-sm font-mono focus:border-[#00B4CC] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Batterie (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={recuForm.battery_health}
                  onChange={e => setRecuForm(f => ({ ...f, battery_health: e.target.value }))}
                  placeholder="Ex: 92"
                  className="w-full px-3 py-2 border border-gray-200
                             rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRecuModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-xl
                           text-gray-600 text-sm">
                Annuler
              </button>
              <button
                onClick={handleRecu}
                className="flex-1 py-2 bg-green-600 text-white rounded-xl
                           text-sm font-bold hover:bg-green-700 transition-all">
                ✅ Confirmer réception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
