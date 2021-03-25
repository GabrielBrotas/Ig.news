// funcionalidades do stripe que vão ser utilizadas pelo front end, não precisam de secret key
import { loadStripe } from '@stripe/stripe-js';

export async function getStripeJS() {
    const stripeJs = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY)

    return stripeJs
}