import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY
)

function CheckoutForm({ amount, onSuccess, onError, reservationData }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePay = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    try {
      console.log('Stripe: création du PaymentIntent...')
      const res = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneId: reservationData.phoneId,
          clientName: reservationData.clientName,
          clientEmail: reservationData.clientEmail,
        })
      })

      const { clientSecret, error: serverError } = await res.json()
      if (serverError) throw new Error(serverError)
      console.log('Stripe: clientSecret reçu, confirmation du paiement...')

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: reservationData.clientName,
              email: reservationData.clientEmail,
            }
          }
        })

      if (stripeError) {
        console.error('Stripe: erreur paiement', stripeError)
        setError(stripeError.message)
        onError(stripeError.message)
      } else if (paymentIntent.status === 'succeeded') {
        console.log('Stripe: paiement réussi', paymentIntent.id)
        onSuccess(paymentIntent)
      }
    } catch (err) {
      console.error('Stripe: catch', err)
      setError(err.message)
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-gray-200 rounded-xl p-4 focus-within:border-[#00B4CC] transition-all">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1B2A4A',
                fontFamily: 'Arial, sans-serif',
                '::placeholder': { color: '#94A3B8' }
              },
              invalid: { color: '#ef4444' }
            }
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || loading}
        className="w-full bg-[#1B2A4A] text-white rounded-xl py-4 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#243660] transition-all cursor-pointer">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
            Paiement en cours...
          </span>
        ) : (
          `Payer ${amount}€ maintenant`
        )}
      </button>

      <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
        Paiement sécurisé par Stripe
      </p>
    </div>
  )
}

export default function StripePayment({
  amount,
  onSuccess,
  onError,
  reservationData
}) {
  return (
    <Elements stripe={stripePromise}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1B2A4A]">
            Paiement sécurisé
          </h3>
          <span className="text-2xl font-black text-[#00B4CC]">
            {amount}€
          </span>
        </div>
        <CheckoutForm
          amount={amount}
          onSuccess={onSuccess}
          onError={onError}
          reservationData={reservationData}
        />
      </div>
    </Elements>
  )
}
