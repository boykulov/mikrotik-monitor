import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { z } from 'zod'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
})

export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin  = nextUrl.pathname.startsWith('/login')
      if (isLoggedIn && isOnLogin)  return Response.redirect(new URL('/dashboard', nextUrl))
      if (!isLoggedIn && !isOnLogin) return Response.redirect(new URL('/login', nextUrl))
      return true
    },
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = 'SUPERADMIN' }
      return token
    },
    session({ session, token }) {
      if (token) { session.user.id = token.id as string; session.user.role = token.role as string }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        const admin = await prisma.superAdmin.findUnique({ where: { email } })
        if (!admin) return null
        const valid = await bcrypt.compare(password, admin.password)
        if (!valid) return null
        await prisma.superAdmin.update({ where: { id: admin.id }, data: { lastLogin: new Date() } })
        return { id: admin.id, email: admin.email, name: admin.name }
      },
    }),
  ],
}
