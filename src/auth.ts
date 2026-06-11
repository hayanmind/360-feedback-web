import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@libsql/client"
import { createLibsqlAdapter } from "@/lib/auth-adapter"
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

async function getDbUser(id: string | undefined) {
  if (!id) return null
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const result = await client.execute({
    sql: "SELECT role, member_name FROM users WHERE id = ?",
    args: [id],
  })
  return result.rows[0] ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createLibsqlAdapter(),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email ?? ""
      return isAllowedEmail(email)
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await getDbUser(user.id)
        token.id = user.id
        token.role = (dbUser?.role as string) ?? "MEMBER"
        token.memberName = (dbUser?.member_name as string) ?? null
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = (token.role as "MEMBER" | "ADMIN") ?? "MEMBER"
      session.user.memberName = (token.memberName as string | null) ?? null
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return
      const memberConfig = getMemberByEmail(user.email)
      if (memberConfig) {
        const isAdmin = ADMIN_EMAILS.includes(user.email)
        const client = createClient({
          url: process.env.DATABASE_URL!,
          authToken: process.env.DATABASE_AUTH_TOKEN,
        })
        await client.execute({
          sql: `UPDATE users SET member_name = ?, ${isAdmin ? "role = 'ADMIN'," : ""} updated_at = ? WHERE id = ?`,
          args: [memberConfig.name, new Date().toISOString(), user.id],
        })
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
