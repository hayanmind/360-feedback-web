import { createClient } from "@libsql/client"
import type { Adapter } from "next-auth/adapters"
import { randomUUID } from "crypto"

function getClient() {
  return createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
}

type Row = Record<string, unknown>

function rowToUser(row: Row) {
  return {
    id: row.id as string,
    email: row.email as string,
    emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
    name: (row.name as string) ?? null,
    image: (row.image as string) ?? null,
  }
}

export function createLibsqlAdapter(): Adapter {
  return {
    async createUser(data) {
      const client = getClient()
      const id = randomUUID()
      const now = new Date().toISOString()
      await client.execute({
        sql: `INSERT INTO users (id, name, email, email_verified, image, role, updated_at) VALUES (?, ?, ?, ?, ?, 'MEMBER', ?)`,
        args: [id, data.name ?? null, data.email, data.emailVerified?.toISOString() ?? null, data.image ?? null, now],
      })
      return { ...data, id }
    },

    async getUser(id) {
      const client = getClient()
      const result = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] })
      const row = result.rows[0]
      return row ? rowToUser(row) : null
    },

    async getUserByEmail(email) {
      const client = getClient()
      const result = await client.execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email] })
      const row = result.rows[0]
      return row ? rowToUser(row) : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const client = getClient()
      const result = await client.execute({
        sql: "SELECT u.* FROM users u JOIN accounts a ON u.id = a.user_id WHERE a.provider = ? AND a.provider_account_id = ?",
        args: [provider, providerAccountId],
      })
      const row = result.rows[0]
      return row ? rowToUser(row) : null
    },

    async updateUser(data) {
      const client = getClient()
      const now = new Date().toISOString()
      await client.execute({
        sql: `UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          email_verified = ?,
          image = COALESCE(?, image),
          updated_at = ?
          WHERE id = ?`,
        args: [data.name ?? null, data.email ?? null, data.emailVerified?.toISOString() ?? null, data.image ?? null, now, data.id],
      })
      const result = await client.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [data.id] })
      return rowToUser(result.rows[0])
    },

    async deleteUser(id) {
      const client = getClient()
      await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] })
    },

    async linkAccount(account) {
      const client = getClient()
      const id = randomUUID()
      const now = new Date().toISOString()
      await client.execute({
        sql: `INSERT INTO accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          (account.refresh_token as string) ?? null,
          (account.access_token as string) ?? null,
          (account.expires_at as number) ?? null,
          (account.token_type as string) ?? null,
          (account.scope as string) ?? null,
          (account.id_token as string) ?? null,
          (account.session_state as string) ?? null,
          now,
        ],
      })
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const client = getClient()
      await client.execute({
        sql: "DELETE FROM accounts WHERE provider = ? AND provider_account_id = ?",
        args: [provider, providerAccountId],
      })
    },

    async createSession(data) {
      const client = getClient()
      const id = randomUUID()
      const now = new Date().toISOString()
      await client.execute({
        sql: "INSERT INTO sessions (id, session_token, user_id, expires, updated_at) VALUES (?, ?, ?, ?, ?)",
        args: [id, data.sessionToken, data.userId, data.expires.toISOString(), now],
      })
      return data
    },

    async getSessionAndUser(sessionToken) {
      const client = getClient()
      const result = await client.execute({
        sql: `SELECT s.session_token, s.user_id, s.expires,
               u.id as uid, u.name, u.email, u.email_verified, u.image
               FROM sessions s JOIN users u ON s.user_id = u.id
               WHERE s.session_token = ?`,
        args: [sessionToken],
      })
      const row = result.rows[0]
      if (!row) return null
      return {
        session: {
          sessionToken: row.session_token as string,
          userId: row.user_id as string,
          expires: new Date(row.expires as string),
        },
        user: {
          id: row.uid as string,
          email: row.email as string,
          emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
          name: (row.name as string) ?? null,
          image: (row.image as string) ?? null,
        },
      }
    },

    async updateSession(data) {
      const client = getClient()
      await client.execute({
        sql: "UPDATE sessions SET expires = ?, updated_at = ? WHERE session_token = ?",
        args: [data.expires?.toISOString() ?? null, new Date().toISOString(), data.sessionToken],
      })
      return null
    },

    async deleteSession(sessionToken) {
      const client = getClient()
      await client.execute({ sql: "DELETE FROM sessions WHERE session_token = ?", args: [sessionToken] })
    },
  }
}
