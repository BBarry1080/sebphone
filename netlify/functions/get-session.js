const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  const { session_id } = event.queryStringParameters || {}

  if (!session_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'session_id manquant' })
    }
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservation_code: session.metadata?.reservation_code,
        client_email:     session.customer_email,
        client_name:      session.metadata?.client_name,
        amount:           session.amount_total / 100,
        payment_status:   session.payment_status,
      })
    }
  } catch (error) {
    console.error('get-session error:', error.message)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    }
  }
}
