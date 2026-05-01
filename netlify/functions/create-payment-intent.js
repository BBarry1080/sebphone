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
    const { amount, phoneId, clientName, clientEmail } =
      JSON.parse(event.body)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'eur',
      metadata: {
        phone_id: phoneId || '',
        client_name: clientName || '',
        client_email: clientEmail || '',
        source: 'sebphone.be'
      }
    })

    console.log('PaymentIntent créé:', paymentIntent.id)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    }
  } catch (error) {
    console.error('Stripe error:', error.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    }
  }
}
