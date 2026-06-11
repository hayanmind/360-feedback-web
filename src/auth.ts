import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { getMemberByEmail, isAllowedEmail, ADMIN_EMAILS } from "@/lib/members"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "MEMBER" | "ADMIN"
      memberName: string | null
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email ?? ""
      return isAllowedEmail(email)
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      session.user.id = user.id
      session.user.role = (dbUser?.role as "MEMBER" | "ADMIN") ?? "MEMBER"
      session.user.memberName = dbUser?.memberName ?? null
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return
      const memberConfig = getMemberByEmail(user.email)
      if (memberConfig) {
        const isAdmin = ADMIN_EMAILS.includes(user.email)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            memberName: memberConfig.name,
            ...(isAdmin ? { role: "ADMIN" } : {}),
          },
        })
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
