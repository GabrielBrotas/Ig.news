import { fauna } from '../../../services/fauna';
import { query as q } from 'faunadb';

import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'

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
