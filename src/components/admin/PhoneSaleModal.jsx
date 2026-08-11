import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import emailjs from '@emailjs/browser'
import { MAGASINS_PHYSIQUES, MAGASINS as MAGASINS_MAP } from '../../utils/magasins'
import { GOOGLE_REVIEW_LINKS } from '../../data/googleReviews'

const EMAILJS_SERVICE_ID   = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_nn74puq'
const EMAILJS_PUBLIC_KEY   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'rqbaYNMIGNP6IQB9O'
const INVOICE_TEMPLATE_ID  = 'template_pzv7w8d'

export default function PhoneSaleModal({ phone, onClose, onSold, priceSettings, modelLimits }) {
  const [saleLoading, setSaleLoading]     = useState(false)
  const [saleForm, setSaleForm]           = useState({
    customer_firstname: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payments: [{ method: 'Cash', amount: '' }],
    sale_price: phone?.price?.toString() || '',
    sale_magasin: phone?.magasin_id || phone?.magasins?.[0] || '',
    notes: '',
    discount_value:     '',
    discount_type:      'fixed',
    is_company_sale:    false,
    company_name:       '',
    company_vat:        '',
    company_address:    '',
    company_email:      '',
    company_phone:      '',
    company_tva_regime: 'marge',
    imei_confirm:       phone?.imei || '',
  })

  const getPriceLimits = (modelName) => {
    const modelLimit = (modelLimits || []).find((l) => l.model_name === modelName)
    const min = modelLimit?.price_min ?? priceSettings?.min ?? 0
    const max = modelLimit?.price_max ?? priceSettings?.max ?? 5000
    return {
      min: Number(min) || 0,
      max: Number(max) || 5000,
    }
  }

  const handleSale = async () => {
    if (!saleForm.customer_firstname || !saleForm.customer_name) {
      alert('Prénom et nom obligatoires')
      return
    }
    if (!saleForm.sale_price) {
      alert('Prix de vente obligatoire')
      return
    }
    if (!saleForm.sale_magasin) {
      alert('Sélectionnez le magasin de vente')
      return
    }
    // Vérifie IMEI si téléphone n'en a pas
    const imeiToUse = phone?.imei || saleForm.imei_confirm
    if (!imeiToUse || imeiToUse.length < 10) {
      alert('⚠️ Veuillez saisir l\'IMEI du téléphone avant de valider la vente')
      return
    }
    const wasSurCommande = phone?.status === 'sur_commande'
    if (wasSurCommande) {
      const confirmed = window.confirm(
        '⚠️ TÉLÉPHONE SUR COMMANDE\n\n' +
        'Ce téléphone appartient au fournisseur.\n' +
        'En clôturant cette vente vous confirmez que :\n\n' +
        '✓ Vous avez commandé ce téléphone au fournisseur\n' +
        '✓ Le téléphone a été reçu en magasin\n' +
        '✓ Le prix d\'achat sera mis à jour en comptabilité\n\n' +
        'Confirmer la vente ?'
      )
      if (!confirmed) return
    }

    // Validation limites de prix — AVANT setSaleLoading et tout fetch
    const limits = getPriceLimits(phone?.name || phone?.model)
    const basePrice = Number(saleForm.sale_price) || Number(phone?.price) || 0
    const discountValue = Number(saleForm.discount_value) || 0
    const discountType = saleForm.discount_type || 'fixed'
    const computedFinalPrice = discountType === 'percent'
      ? basePrice * (1 - discountValue / 100)
      : basePrice - discountValue

    console.log('VALIDATION PRIX:', {
      model: phone?.name || phone?.model,
      limits, basePrice, discountValue, computedFinalPrice,
    })

    if (limits.min > 0 && computedFinalPrice < limits.min) {
      alert(`⛔ VENTE REFUSÉE\n\nPrix après remise : ${computedFinalPrice.toFixed(2)}€\nPrix MINIMUM autorisé : ${limits.min}€\n\nRéduisez la remise.`)
      return
    }
    if (limits.max > 0 && computedFinalPrice > limits.max) {
      alert(`⛔ VENTE REFUSÉE\n\nPrix : ${computedFinalPrice.toFixed(2)}€\nPrix MAXIMUM autorisé : ${limits.max}€\n\nBaissez le prix.`)
      return
    }

    setSaleLoading(true)
    try {
      // Met à jour l'IMEI si nouveau
      if (!phone?.imei && saleForm.imei_confirm) {
        await supabase.from('phones')
          .update({ imei: saleForm.imei_confirm })
          .eq('id', phone.id)
      }

      const saleDate = new Date().toISOString()
      const reservationCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const salePriceNum = parseFloat(saleForm.sale_price) || 0
      const discountAmount = saleForm.discount_type === 'percent'
        ? salePriceNum * (parseFloat(saleForm.discount_value) || 0) / 100
        : (parseFloat(saleForm.discount_value) || 0)
      const finalPrice = Math.max(salePriceNum - discountAmount, 0)

      const { error: phoneError } = await supabase
        .from('phones')
        .update({
          status: 'vendu',
          price: finalPrice,
        })
        .eq('id', phone.id)
      if (phoneError) throw phoneError

      const { error: orderError } = await supabase
        .from('orders')
        .insert([{
          phone_id:           phone.id,
          customer_name:      `${saleForm.customer_firstname} ${saleForm.customer_name}`,
          customer_email:     saleForm.customer_email || null,
          customer_phone:     saleForm.customer_phone || null,
          phone_name:         phone.name || phone.model,
          phone_storage:      phone.storage,
          phone_color:        phone.color,
          phone_grade:        phone.grade,
          delivery_mode:      'collect',
          magasin_id:         saleForm.sale_magasin,
          payment_mode:       'total',
          total_amount:       finalPrice,
          deposit_amount:     0,
          reservation_code:   reservationCode,
          status:             'recupere',
          encaisse_at:        saleDate,
          notes:              saleForm.notes || null,
          discount_value:     parseFloat(saleForm.discount_value) || 0,
          discount_type:      saleForm.discount_type,
          final_price:        finalPrice,
          is_company_sale:    saleForm.is_company_sale,
          company_name:       saleForm.company_name || null,
          company_vat:        saleForm.company_vat || null,
          company_address:    saleForm.company_address || null,
          company_email:      saleForm.company_email || null,
          company_phone:      saleForm.company_phone || null,
          company_tva_regime: saleForm.company_tva_regime,
        }])
      if (orderError) throw orderError

      const normalizeMethod = (m) => {
        if (m === 'Cash')               return 'cash'
        if (m === 'Virement bancaire')  return 'virement bancaire'
        if (m === 'Bancontact')         return 'bancontact'
        return (m || '').toLowerCase()
      }

      const paymentRows = saleForm.payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          phone_id:       phone.id,
          magasin_id:     saleForm.sale_magasin,
          payment_method: normalizeMethod(p.method),
          amount:         parseFloat(p.amount),
          purchase_price: phone.purchase_price || 0,
          description:    `Vente ${phone.name || phone.model} — ${saleForm.customer_firstname} ${saleForm.customer_name}`,
          payment_date:   saleDate,
        }))

      if (paymentRows.length > 0) {
        await supabase
          .from('payments')
          .insert(paymentRows)
          .select()
      }

      const paymentMethodLabel = saleForm.payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => p.method)
        .join(' + ') || 'Cash'

      if (saleForm.customer_email) {
        try {
          const now      = new Date()
          const expiry   = new Date(now)
          expiry.setMonth(expiry.getMonth() + 24)
          const magasin  = MAGASINS_MAP[saleForm.sale_magasin]

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            INVOICE_TEMPLATE_ID,
            {
              to_email:         saleForm.customer_email,
              to_name:          `${saleForm.customer_firstname} ${saleForm.customer_name}`,
              email_type:       'facture',
              phone_name:       phone.name || phone.model,
              phone_color:      phone.color || '—',
              phone_storage:    phone.storage || '—',
              phone_condition:  phone.condition || '—',
              phone_grade:      phone.grade || '—',
              phone_imei:       phone.imei || '—',
              price_total:      `${finalPrice.toFixed(2)}€`,
              price_original:   `${salePriceNum.toFixed(2)}€`,
              discount_amount:  discountAmount > 0 ? `${discountAmount.toFixed(2)}€` : '0€',
              deposit_paid:     `${finalPrice.toFixed(2)}€`,
              remaining:        '0€',
              payment_label:    'Montant total payé ✓',
              accessories_total: '0€',
              accessory_pack:   'Aucun',
              battery_replace:  'Non',
              warning_message:  '',
              payment_method:   paymentMethodLabel,
              tva_mention:      phone.tva_regime === 'marge'
                ? "Régime particulier — Biens d'occasion (Art. 313-343 Code TVA belge)"
                : 'TVA 21% incluse',
              magasin_nom:      magasin?.nom || 'SebPhone',
              magasin_adresse:  magasin?.adresse || 'sebphone.be',
              reservation_code: reservationCode,
              reservation_url:  `https://sebphone.be/commande/${reservationCode}`,
              invoice_url:      `https://sebphone.be/facture/${reservationCode}`,
              pickup_date:      now.toLocaleDateString('fr-BE'),
              warranty_expiry:  expiry.toLocaleDateString('fr-BE'),
            },
            EMAILJS_PUBLIC_KEY
          )
        } catch (emailErr) {
          console.warn('Email facture non envoyé:', emailErr)
        }
      }

      // ── Email avis Google (post-vente) ──
      try {
        const reviewLink = GOOGLE_REVIEW_LINKS[saleForm.sale_magasin]
        if (reviewLink && saleForm.customer_email) {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            'template_jg2nh5n',
            {
              to_email: saleForm.customer_email,
              to_name: `${saleForm.customer_firstname} ${saleForm.customer_name}`,
              customer_name: `${saleForm.customer_firstname} ${saleForm.customer_name}`,
              phone_name: phone.name || phone.model,
              magasin_nom: reviewLink.nom,
              google_review_url: reviewLink.url,
              review_page_url: `https://sebphone.be/avis?email=${encodeURIComponent(saleForm.customer_email)}&magasin=${saleForm.sale_magasin}`,
            },
            EMAILJS_PUBLIC_KEY
          )
        }
      } catch (reviewEmailErr) {
        console.warn('Email avis Google non envoyé:', reviewEmailErr)
      }

      /*
        ────────────────────────────────────────────────────────────────
        TEMPLATE EMAILJS — `template_societe` (à créer dans EmailJS)
        ────────────────────────────────────────────────────────────────
        Subject: Facture {{company_name}} — {{phone_name}}

        Variables disponibles :
          to_email, to_name
          company_name, company_vat, company_address, company_phone
          company_tva_regime  ('marge' ou 'normale')
          phone_name, phone_color, phone_storage, phone_condition,
          phone_grade, phone_imei
          price_original     (ex: '499.00€')
          discount_amount    (ex: '50.00€' ou '0€')
          discount_label     (ex: 'Remise 10%' ou 'Remise' ou '')
          price_final        (ex: '449.00€')
          payment_method     (ex: 'Cash', 'Bancontact', 'Virement')
          tva_regime         ('marge' ou 'normale')
          tva_mention        (texte légal complet)
          magasin_nom, magasin_adresse
          sale_date, reservation_code, invoice_url
          warranty_expiry

        Suggestion HTML :
          <h2>Facture professionnelle — SebPhone</h2>
          <p>À l'attention de <b>{{company_name}}</b> — TVA {{company_vat}}</p>
          <p>{{company_address}}</p>
          <hr/>
          <h3>{{phone_name}}</h3>
          <p>{{phone_color}} · {{phone_storage}} · {{phone_grade}} · IMEI {{phone_imei}}</p>
          <p>Prix : {{price_original}}<br/>
             {{discount_label}} : -{{discount_amount}}<br/>
             <b>Total : {{price_final}}</b></p>
          <p style="font-style:italic">{{tva_mention}}</p>
          <p>Paiement : {{payment_method}} · {{magasin_nom}} · {{sale_date}}</p>
          <p>Garantie 24 mois (jusqu'au {{warranty_expiry}})</p>
          <a href="{{invoice_url}}">Télécharger ma facture PDF</a>
        ────────────────────────────────────────────────────────────────
      */

      // ── Email facture société (si différent du client) ──
      if (saleForm.is_company_sale && saleForm.company_email && saleForm.company_email !== saleForm.customer_email) {
        try {
          const now     = new Date()
          const expiry  = new Date(now)
          expiry.setMonth(expiry.getMonth() + 24)
          const magasin = MAGASINS_MAP[saleForm.sale_magasin]

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            'template_qukek6a',
            {
              to_email:           saleForm.company_email,
              to_name:            saleForm.company_name,
              company_name:       saleForm.company_name,
              company_vat:        saleForm.company_vat,
              company_address:    saleForm.company_address,
              company_phone:      saleForm.company_phone,
              company_tva_regime: saleForm.company_tva_regime,
              phone_name:         phone.name || phone.model,
              phone_color:        phone.color || '—',
              phone_storage:      phone.storage || '—',
              phone_condition:    phone.condition || '—',
              phone_grade:        phone.grade || '—',
              phone_imei:         phone.imei || '—',
              price_original:     `${salePriceNum.toFixed(2)}€`,
              discount_amount:    discountAmount > 0 ? `${discountAmount.toFixed(2)}€` : '0€',
              discount_label:     discountAmount > 0
                ? (saleForm.discount_type === 'percent' ? `Remise ${saleForm.discount_value}%` : 'Remise')
                : '',
              price_final:        `${finalPrice.toFixed(2)}€`,
              payment_method:     paymentMethodLabel,
              tva_regime:         saleForm.company_tva_regime,
              tva_mention:        saleForm.company_tva_regime === 'marge'
                ? "Régime particulier — Biens d'occasion (Art. 313-343 Code TVA belge)"
                : 'TVA 21% incluse',
              magasin_nom:        magasin?.nom || 'SebPhone',
              magasin_adresse:    magasin?.adresse || 'sebphone.be',
              sale_date:          now.toLocaleDateString('fr-BE'),
              reservation_code:   reservationCode,
              invoice_url:        `https://sebphone.be/facture/${reservationCode}`,
              warranty_expiry:    expiry.toLocaleDateString('fr-BE'),
            },
            EMAILJS_PUBLIC_KEY
          )
        } catch (err) {
          console.warn('Email société non envoyé:', err)
        }
      }

      if (wasSurCommande) {
        console.info('Vente sur commande clôturée - penser à mettre à jour prix achat')
      }

      onSold()
      onClose()
      alert(`✅ Vente enregistrée ! Code: ${reservationCode}`)
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setSaleLoading(false)
    }
  }

  if (!phone) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-[#1B2A4A] text-lg">💰 Enregistrer une vente</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {phone.name || phone.model}
              {phone.color ? ` · ${phone.color}` : ''}
              {phone.storage ? ` · ${phone.storage}` : ''}
            </p>
          </div>
          <button onClick={() => onClose()} className="cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="bg-[#f8fafc] rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">📱 Téléphone vendu</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Modèle', phone.name || phone.model],
                ['Couleur', phone.color || '—'],
                ['Stockage', phone.storage || '—'],
                ['Grade', phone.grade || '—'],
                ['IMEI', phone.imei || '—'],
                ['Prix achat', phone.purchase_price ? `${phone.purchase_price}€` : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-xs font-semibold text-[#1B2A4A] truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#1B2A4A] uppercase mb-3">👤 Informations client</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prénom *</label>
                <input
                  type="text"
                  value={saleForm.customer_firstname}
                  onChange={(e) => setSaleForm((f) => ({ ...f, customer_firstname: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="Mohamed"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nom *</label>
                <input
                  type="text"
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="Dupont"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone</label>
                <input
                  type="tel"
                  value={saleForm.customer_phone}
                  onChange={(e) => setSaleForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="+32 472 12 34 56"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={saleForm.customer_email}
                  onChange={(e) => setSaleForm((f) => ({ ...f, customer_email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                  placeholder="client@email.com"
                />
                {saleForm.customer_email ? (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    📧 La facture sera envoyée automatiquement à cette adresse
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Ajoutez un email pour envoyer la facture automatiquement
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Magasin de vente *</label>
            <select
              value={saleForm.sale_magasin}
              onChange={(e) => setSaleForm((f) => ({ ...f, sale_magasin: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:border-[#00B4CC] outline-none"
            >
              <option value="">— Sélectionner le magasin —</option>
              <option value="sebphone">💻 SebPhone (en ligne)</option>
              {MAGASINS_PHYSIQUES.map((m) => (
                <option key={m.id} value={m.id}>📍 {m.nom.replace('Seb Telecom — ', '')}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#1B2A4A] uppercase mb-3">💳 Paiement</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prix de vente (€) *</label>
                <input
                  type="number"
                  value={saleForm.sale_price}
                  onChange={(e) => setSaleForm((f) => ({ ...f, sale_price: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none font-bold"
                />
                {phone.purchase_price && saleForm.sale_price && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Bénéfice : +{(Math.max(
                      parseFloat(saleForm.sale_price) -
                      (saleForm.discount_type === 'percent'
                        ? parseFloat(saleForm.sale_price) * parseFloat(saleForm.discount_value || 0) / 100
                        : parseFloat(saleForm.discount_value || 0)),
                      0
                    ) - phone.purchase_price).toFixed(0)}€
                  </p>
                )}
                {(() => {
                  if (!phone) return null
                  const limits = getPriceLimits(phone.name || phone.model)
                  const current = Number(saleForm.sale_price) || 0
                  const discount = Number(saleForm.discount_value) || 0
                  const final = saleForm.discount_type === 'percent'
                    ? current * (1 - discount / 100)
                    : current - discount
                  const tooLow  = limits.min > 0 && final < limits.min && current > 0
                  const tooHigh = limits.max > 0 && final > limits.max
                  return (
                    <div className="mt-1">
                      <p className="text-xs text-gray-400">
                        Limites : {limits.min}€ — {limits.max}€
                      </p>
                      {tooLow && (
                        <p className="text-xs text-red-600 font-bold">
                          ⛔ Prix final {final.toFixed(2)}€ sous le minimum {limits.min}€
                        </p>
                      )}
                      {tooHigh && (
                        <p className="text-xs text-red-600 font-bold">
                          ⛔ Prix {final.toFixed(2)}€ dépasse le maximum {limits.max}€
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  IMEI {!phone?.imei && <span className="text-red-500">*</span>}
                </label>
                {phone?.imei ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-700 bg-gray-50 px-3 py-2 rounded-xl flex-1">
                      {phone.imei}
                    </p>
                    <span className="text-green-500 text-xs font-bold">✓ Déjà renseigné</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={saleForm.imei_confirm}
                    onChange={(e) => setSaleForm((f) => ({ ...f, imei_confirm: e.target.value }))}
                    placeholder="Saisir l'IMEI avant de vendre"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-orange-300 rounded-xl text-sm font-mono focus:border-[#00B4CC] outline-none"
                  />
                )}
              </div>

              {/* Multi-paiements */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Modes de paiement</label>
                <div className="space-y-2">
                  {saleForm.payments.map((pay, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex flex-1 border border-gray-200 rounded-xl overflow-hidden">
                        {['Cash', 'Bancontact', 'Virement bancaire'].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSaleForm((f) => ({
                              ...f,
                              payments: f.payments.map((p, i) => i === idx ? { ...p, method } : p),
                            }))}
                            className={`flex-1 px-2 py-2 text-xs font-medium transition-all cursor-pointer ${
                              pay.method === method ? 'bg-[#1B2A4A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {method === 'Cash' ? '💵' : method === 'Bancontact' ? '💳' : '🏦'}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={pay.amount}
                        onChange={(e) => setSaleForm((f) => ({
                          ...f,
                          payments: f.payments.map((p, i) => i === idx ? { ...p, amount: e.target.value } : p),
                        }))}
                        className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                        placeholder="€"
                      />
                      {saleForm.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSaleForm((f) => ({
                            ...f,
                            payments: f.payments.filter((_, i) => i !== idx),
                          }))}
                          className="p-2 text-red-400 hover:text-red-600 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setSaleForm((f) => ({
                      ...f,
                      payments: [...f.payments, { method: 'Cash', amount: '' }],
                    }))}
                    className="text-xs text-[#00B4CC] hover:text-cyan-700 font-semibold cursor-pointer"
                  >
                    + Ajouter un mode de paiement
                  </button>
                </div>

                {/* Récap dynamique */}
                {(() => {
                  const sp = parseFloat(saleForm.sale_price) || 0
                  const dv = parseFloat(saleForm.discount_value) || 0
                  const da = saleForm.discount_type === 'percent' ? sp * dv / 100 : dv
                  const fp = Math.max(sp - da, 0)
                  const total = saleForm.payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
                  if (sp === 0) return null
                  if (Math.abs(total - fp) < 0.01) {
                    return (
                      <div className="mt-2 bg-green-50 rounded-xl p-2 text-xs font-bold text-green-700 text-center">
                        ✓ Paiement complet — {total.toFixed(2)}€
                      </div>
                    )
                  }
                  if (total > fp) {
                    return (
                      <div className="mt-2 bg-red-50 rounded-xl p-2 text-xs font-bold text-red-600 flex justify-between">
                        <span>Total : {total.toFixed(2)}€ / {fp.toFixed(2)}€</span>
                        <span>Dépassement : +{(total - fp).toFixed(2)}€</span>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>

          {/* REMISE */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Remise (optionnel)</label>
            <div className="flex gap-2">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                {['fixed', 'percent'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSaleForm((f) => ({ ...f, discount_type: type }))}
                    className={`px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                      saleForm.discount_type === type ? 'bg-[#1B2A4A] text-white' : 'bg-white text-gray-600'
                    }`}
                  >
                    {type === 'fixed' ? '€' : '%'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={saleForm.discount_value}
                onChange={(e) => setSaleForm((f) => ({ ...f, discount_value: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                placeholder="0"
                min="0"
              />
            </div>
            {(() => {
              const sp = parseFloat(saleForm.sale_price) || 0
              const dv = parseFloat(saleForm.discount_value) || 0
              if (dv <= 0) return null
              const da = saleForm.discount_type === 'percent' ? sp * dv / 100 : dv
              const fp = Math.max(sp - da, 0)
              return (
                <div className="mt-2 bg-green-50 rounded-xl p-2 flex justify-between text-sm">
                  <span className="text-gray-500">Prix après remise :</span>
                  <span className="font-bold text-green-600">
                    {fp.toFixed(2)}€
                    <span className="text-xs text-gray-400 ml-1">(-{da.toFixed(2)}€)</span>
                  </span>
                </div>
              )
            })()}
            {(() => {
              if (!phone) return null
              const lim = getPriceLimits(phone.name || phone.model)
              if (!lim.min && !lim.max) return null
              return (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⚠️ Prix min autorisé : {lim.min}€
                  {lim.max < 5000 ? ` · Max : ${lim.max}€` : ''}
                </p>
              )
            })()}
          </div>

          {/* VENTE SOCIÉTÉ */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                checked={saleForm.is_company_sale}
                onChange={(e) => setSaleForm((f) => ({ ...f, is_company_sale: e.target.checked }))}
                className="w-4 h-4 accent-[#00B4CC]"
              />
              <div>
                <p className="text-sm font-medium text-[#1B2A4A]">🏢 Vente à une société</p>
                <p className="text-xs text-gray-400">Facture professionnelle envoyée à la société</p>
              </div>
            </label>

            {saleForm.is_company_sale && (
              <div className="mt-3 border-2 border-[#00B4CC] rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-[#00B4CC] uppercase">Informations société</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Nom de la société *</label>
                    <input
                      type="text"
                      value={saleForm.company_name}
                      onChange={(e) => setSaleForm((f) => ({ ...f, company_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="ACME SRL"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">N° TVA *</label>
                    <input
                      type="text"
                      value={saleForm.company_vat}
                      onChange={(e) => setSaleForm((f) => ({ ...f, company_vat: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="BE 1234.567.890"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone société</label>
                    <input
                      type="tel"
                      value={saleForm.company_phone}
                      onChange={(e) => setSaleForm((f) => ({ ...f, company_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="+32 2 123 45 67"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Siège social</label>
                    <input
                      type="text"
                      value={saleForm.company_address}
                      onChange={(e) => setSaleForm((f) => ({ ...f, company_address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="Rue de la Loi 1, 1000 Bruxelles"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Email société *</label>
                    <input
                      type="email"
                      value={saleForm.company_email}
                      onChange={(e) => setSaleForm((f) => ({ ...f, company_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none"
                      placeholder="comptabilite@societe.be"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600 mb-2 block">Régime TVA facture</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'marge',   label: '📊 TVA sur marge',    sub: "Biens d'occasion" },
                        { value: 'normale', label: '💼 TVA normale 21%',  sub: 'Standard' },
                      ].map(({ value, label, sub }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSaleForm((f) => ({ ...f, company_tva_regime: value }))}
                          className={`p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            saleForm.company_tva_regime === value ? 'border-[#00B4CC] bg-cyan-50' : 'border-gray-200 hover:border-[#00B4CC]'
                          }`}
                        >
                          <p className={`text-xs font-bold ${saleForm.company_tva_regime === value ? 'text-[#00B4CC]' : 'text-[#1B2A4A]'}`}>{label}</p>
                          <p className="text-xs text-gray-400">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes (optionnel)</label>
            <textarea
              value={saleForm.notes}
              onChange={(e) => setSaleForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#00B4CC] outline-none resize-none"
              placeholder="Remarques sur la vente..."
            />
          </div>

          <button
            onClick={handleSale}
            disabled={
              saleLoading ||
              !saleForm.customer_firstname ||
              !saleForm.customer_name ||
              !saleForm.sale_price ||
              !saleForm.sale_magasin
            }
            className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm hover:bg-green-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saleLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </span>
            ) : '✅ Confirmer la vente'}
          </button>
        </div>
      </div>
    </div>
  )
}
