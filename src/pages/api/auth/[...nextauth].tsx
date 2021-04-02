import { fauna } from '../../../services/fauna';
import { query as q } from 'faunadb';

import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'
import { session } from 'next-auth/client';

export default NextAuth({
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: 'read:user'
    }),
  ],
  // funções executadas a partir de alguma ação
  callbacks: {
    async session(session) { // modificar os dados da session
      try {
        const userActiveSubscription = await fauna.query(
          q.Get(
            q.Intersection([
              q.Match(
                q.Index('subscription_by_user_ref'),
                q.Select(
                  "ref",
                  q.Get(
                    q.Match(
                      q.Index('user_by_email'),
                      q.Casefold(session.user.email)
                    )
                  )
                )
              ),
              q.Match(
                q.Index('subscription_by_status'),
                "active"
              )
            ])
          )
        )

        return {
          ...session,
          activeSubscription: userActiveSubscription
        }
      } catch (err) {
        return {
          ...session,
          activeSubscription: false
        }
      }
    },
    async signIn(user, account, profile) {
      const { email } = user;
      
      try {
        // os dados no fauna só buscado pelos indices, então para ter acesso ao email vamos ter que criar o índice user_by_email
        await fauna.query(
          q.If( // se
            q.Not( // não
              q.Exists( // existe
                q.Match( // um usuario que de match
                  q.Index('user_by_email'), // buscar os usuarios pelo indice
                  q.Casefold(user.email) // e comparar com o email atual em lowercase
                )
              )
            ),
            // caso não exista vamos criar um
            q.Create( 
              q.Collection('users'),
              { data: { email }}
            ),
            // caso já exista vamos pegar os dados dele
            q.Get( // select
              q.Match(
                q.Index('user_by_email'),
                q.Casefold(user.email)
              )
            )
          ),
        );
        
        return true
      } catch {
        return false
      }
    },
  }
})
