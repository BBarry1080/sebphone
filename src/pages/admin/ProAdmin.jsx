import { useEffect, useState } from 'react'
import { Check, X, Building2, Smartphone } from 'lucide-react'
import { supabase, isSupabaseReady } from '../../lib/supabase'
import { useCurrentUser } from '../../hooks/usePermissions'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'rqbaYNMIGNP6IQB9O'
const PRO_TEMPLATE_ID = 'template_rs9zkwo'

export default function ProAdmin() {
  const currentUser = useCurrentUser()
  const [pending, setPending]   = useState([])
  const [processedAccounts, setProcessedAccounts] = useState([])
  const [phones, setPhones]     = useState([])
  const [proStock, setProStock] = useState([])
  const [loading, setLoading]   = useState(true)
  const [processing, setProcessing] = useState(null) // stocke l'id en cours

  const fetchAccounts = async () => {
    if (!isSupabaseReady) return
    // Demandes en attente
    const { data: pendingData } = await supabase
      .from('pro_accounts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPending(pendingData || [])

    // Comptes traités
    const { data: processed } = await supabase
      .from('pro_accounts')
      .select('*')
      .in('status', ['approved', 'rejected'])
      .order('created_at', { ascending: false })
    setProcessedAccounts(processed || [])
  }

  const fetchAll = async () => {
    setLoading(true)
    if (!isSupabaseReady) { setLoading(false); return }
    const [{ data: ph }, { data: ps }] = await Promise.all([
      supabase.from('phones').select('*').eq('status', 'disponible').order('created_at', { ascending: false }),
      supabase.from('pro_stock').select('*'),
    ])
    await fetchAccounts()
    setPhones(ph || [])
    setProStock(ps || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const approve = async (acc) => {
    setProcessing(acc.id)
    try {
      await supabase.from('pro_accounts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.email || 'Admin'
        })
        .eq('id', acc.id)

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, PRO_TEMPLATE_ID, {
          to_email: acc.email,
          to_name: acc.contact_name,
          contact_name: acc.contact_name,
          company_name: acc.company_name,
          vat_number: acc.vat_number || 'Non renseigné',
          subject: 'Compte professionnel approuvé',
          status_label: 'Compte approuvé !',
          status_class: 'status-approved',
          message: 'Félicitations ! Votre compte professionnel SebPhone a été approuvé. Vous pouvez dès maintenant accéder à notre catalogue exclusif réservé aux revendeurs.',
        }, EMAILJS_PUBLIC_KEY)
      } catch (emailErr) {
        console.warn('Email approbation non envoyé:', emailErr)
      }

      fetchAccounts()
      // Force re-fetch après 500ms
      setTimeout(() => fetchAccounts(), 500)
    } catch (err) {
      console.error('Erreur approbation:', err)
      alert('Erreur lors de l\'approbation')
    } finally {
      setProcessing(null)
    }
  }

  const reject = async (acc) => {
    setProcessing(acc.id)
    try {
      await supabase.from('pro_accounts')
        .update({ status: 'rejected' })
        .eq('id', acc.id)

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, PRO_TEMPLATE_ID, {
          to_email: acc.email,
          to_name: acc.contact_name,
          contact_name: acc.contact_name,
          company_name: acc.company_name,
          vat_number: acc.vat_number || 'Non renseigné',
          subject: 'Demande de compte professionnel',
          status_label: 'Demande non retenue',
          status_class: 'status-pending',
          message: 'Après examen de votre dossier, nous ne sommes pas en mesure d\'approuver votre demande de compte professionnel pour le moment. Pour toute question, contactez-nous à contact@sebphone.be.',
        }, EMAILJS_PUBLIC_KEY)
      } catch (emailErr) {
        console.warn('Email refus non envoyé:', emailErr)
      }

      fetchAccounts()
      // Force re-fetch après 500ms
      setTimeout(() => fetchAccounts(), 500)
    } catch (err) {
      console.error('Erreur refus:', err)
      alert('Erreur lors du refus')
    } finally {
      setProcessing(null)
    }
  }

  const proStockFor = (phoneId) => proStock.find((s) => s.phone_id === phoneId)

  const togglePro = async (phone) => {
    const existing = proStockFor(phone.id)
    if (existing) {
      const { error } = await supabase
        .from('pro_stock')
        .update({ visible: !existing.visible })
        .eq('id', existing.id)
      if (error) { alert('Erreur: ' + error.message); return }
    } else {
      const { error } = await supabase
        .from('pro_stock')
        .insert([{
          phone_id:  phone.id,
          pro_price: phone.price || 0,
          lot_price: null,
          lot_size:  null,
          visible:   true,
        }])
      if (error) { alert('Erreur: ' + error.message); return }
    }
    fetchAll()
  }

  const updateProField = async (phoneId, field, value) => {
    const existing = proStockFor(phoneId)
    if (!existing) return
    const { error } = await supabase
      .from('pro_stock')
      .update({ [field]: value === '' ? null : Number(value) })
      .eq('id', existing.id)
    if (error) { alert('Erreur: ' + error.message); return }
    setProStock((prev) => prev.map((s) =>
      s.id === existing.id ? { ...s, [field]: value === '' ? null : Number(value) } : s))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-poppins font-bold text-2xl text-[#1B2A4A]">👔 Espace Pro</h1>
        <p className="text-sm text-[#555]">Gestion des comptes et du stock professionnels</p>
      </div>

      {/* Section A — Demandes d'accès */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#00B4CC]" />
          Demandes d'accès ({pending.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[#888] py-6 text-center">Chargement...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Aucune demande en attente</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Société', 'Contact', 'Email', 'TVA', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((acc) => (
                  <tr key={acc.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{acc.company_name}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.contact_name}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.email}</td>
                    <td className="px-3 py-2 text-gray-600">{acc.vat_number}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {acc.created_at ? new Date(acc.created_at).toLocaleDateString('fr-BE') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(acc)}
                          disabled={processing === acc.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 cursor-pointer ${processing === acc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Check size={13} /> Approuver
                        </button>
                        <button
                          onClick={() => reject(acc)}
                          disabled={processing === acc.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 cursor-pointer ${processing === acc.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <X size={13} /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Comptes sociétés (traités) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2">
            🏢 Comptes sociétés ({processedAccounts.length})
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Société', 'Contact', 'Email', 'TVA', 'Date', 'Statut'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedAccounts.map(acc => (
              <tr key={acc.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-[#1B2A4A]">
                  {acc.company_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.contact_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{acc.vat_number || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(acc.created_at).toLocaleDateString('fr-BE')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-lg font-bold
                    ${acc.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'}`}>
                    {acc.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
                  </span>
                </td>
              </tr>
            ))}
            {processedAccounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Aucun compte traité
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Section B — Stock professionnel */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-[#1B2A4A] flex items-center gap-2 mb-4">
          <Smartphone size={18} className="text-[#00B4CC]" />
          Stock professionnel
        </h2>
        {loading ? (
          <p className="text-sm text-[#888] py-6 text-center">Chargement...</p>
        ) : phones.length === 0 ? (
          <p className="text-sm text-[#888] py-6 text-center">Aucun téléphone disponible</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Modèle', 'État', 'Stockage', 'Visible pro', 'Prix pro (€)', 'Prix lot (€)', 'Taille lot'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {phones.map((phone) => {
                  const ps = proStockFor(phone.id)
                  const isPro = ps && ps.visible
                  return (
                    <tr key={phone.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium">
                        {phone.name || phone.model}
                        {isPro && (
                          <span className="ml-2 text-[10px] font-bold bg-[#00B4CC] text-white px-1.5 py-0.5 rounded">PRO</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{phone.condition}</td>
                      <td className="px-3 py-2 text-gray-600">{phone.storage || '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => togglePro(phone)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                            isPro ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isPro ? 'Visible' : 'Masqué'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.pro_price ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'pro_price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.lot_price ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'lot_price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          disabled={!ps}
                          defaultValue={ps?.lot_size ?? ''}
                          onBlur={(e) => updateProField(phone.id, 'lot_size', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
