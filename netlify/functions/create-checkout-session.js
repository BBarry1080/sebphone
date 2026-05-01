const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'STRIPE_SECRET_KEY manquante dans les variables env'
      })
    }
  }

  try {
    const {
      phoneId, phoneName, phoneColor, phoneStorage,
      clientName, clientEmail, amount,
      reservationCode, magasinNom,
      paymentMode, totalPrice
    } = JSON.parse(event.body)

    const isAcompte = paymentMode === 'acompte'
    const remaining = (totalPrice || amount) - amount
    const productName = isAcompte
      ? `Acompte réservation — ${phoneName}`
      : `${phoneName}`
    const productDescription = isAcompte
      ? `Acompte réservation — Reste ${remaining}€ en magasin · Code: ${reservationCode}`
      : `Paiement total — ${[phoneName, phoneColor, phoneStorage].filter(Boolean).join(' ')} · Code: ${reservationCode}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: productName,
            description: productDescription,
            images: ['https://sebphone.be/images/logo/SEBPHONEbysebtelecom.png'],
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: clientEmail,
      metadata: {
        phone_id: phoneId || '',
        client_name: clientName || '',
        reservation_code: reservationCode || '',
        magasin: magasinNom || '',
        payment_mode: paymentMode || 'acompte',
      },
      success_url: `https://sebphone.be/confirmation?code=${reservationCode}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://sebphone.be/reservation/${phoneId}`,
      locale: 'fr',
    })

    console.log('Checkout session créée:', session.id)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    }
  } catch (error) {
    console.error('Stripe Checkout error:', error.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    }
  }
}
