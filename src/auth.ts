import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required when running behind a reverse proxy (Caddy on the EC2 host).
  // Tells NextAuth to honor X-Forwarded-Host / X-Forwarded-Proto so it
  // generates absolute URLs and Secure cookies against the public origin
  // rather than the internal upstream (web:3000).
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [GitHub],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.userId === 'string' && session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
