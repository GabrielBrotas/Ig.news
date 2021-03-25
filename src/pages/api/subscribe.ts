import { NextApiRequest, NextApiResponse } from "next";
import { stripe } from '../../services/stripe';
import { getSession } from 'next-auth/client';
import { fauna } from "../../services/fauna";
import { query as q } from 'faunadb'; 

type User = {
    ref: {
        id: string;
    },
    data: {
        stripe_custumer_id: string
    }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        // as sessions do github feita pelo NextAuth são salvas nos cookies e tanto o front quanto o back tem acesso a esses cookies
        // essa função vai fazer isso para nós e assim vamos ter acesso a sessao do usuario
        const session = await getSession({ req });

        // pegar os dados do usuario logado
        const user = await fauna.query<User>(
            q.Get(
                q.Match(
                    q.Index('user_by_email'),
                    q.Casefold(session.user.email)
                )
            )
        )

        // verificar se ele já tem um custumerId ( se ele ja fez o subscribe antes )
        let customerId = user.data.stripe_custumer_id
        
        // se nao, vamos fazer
        if(!customerId) {
            // criar um costumerstripe que vai salvar os dados do usuario dentro do stripe
            const stripeCostumer = await stripe.customers.create({
                email: session.user.email,
            })

            // atualizar os dados do usuario salvando o stripeCostumer.id nele para podermos identificar que ele já tem
            await fauna.query(
                q.Update(
                    q.Ref(q.Collection('users'), user.ref.id ),
                    {
                        data: {
                            stripe_custumer_id: stripeCostumer.id
                        }
                    }
                )
            )
            customerId = stripeCostumer.id;
        }

        const stripeCheckoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            // endereço ser obrigatório
            billing_address_collection: 'required',
            line_items: [
                // como só temos um produto vamos deixar ele estático
                { price: 'price_1IYfTqC6M4XXHF0mkTW9kHa9', quantity: 1 }
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: process.env.STRIPE_SUCCESS_URL, // depois que o usuario comprar para onde ele deve ser redirecionado
            cancel_url: process.env.STRIPE_CANCEL_URL,
        })

        return res.status(200).json({ sessionId: stripeCheckoutSession.id })
    } else {
        // devolver um reposta dizendo que só aceita o método post
        res.setHeader('Allow', 'POST')
        // retornar erro
        res.status(405).end('Method not allowed')
    }
}