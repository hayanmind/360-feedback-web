export const MEMBERS = [
  {
    name: "Nynin",
    email: "nynin1@hayanmind.com",
    notionDbId: "248a9757-5795-8089-9600-000bfcba66f3",
  },
  {
    name: "Jay",
    email: "jay@hayanmind.com",
    notionDbId: "247a9757-5795-80ba-b825-000b31b25676",
  },
  {
    name: "Daehoon",
    email: "daehoon@hayanmind.com",
    notionDbId: "247a9757-5795-80a5-90c3-000b00372b97",
  },
  {
    name: "Kristy",
    email: "kristy@hayanmind.com",
    notionDbId: "247a9757-5795-80a7-bb6e-000b69b9bbdc",
  },
  {
    name: "Mujin",
    email: "mujin@hayanmind.com",
    notionDbId: "247a9757-5795-8053-b759-000ba1ba89c8",
  },
  {
    name: "Vika",
    email: "viktoriya.kim@hayanmind.com",
    notionDbId: "248a9757-5795-80ef-bff2-000b19f918a8",
  },
] as const

export type MemberName = (typeof MEMBERS)[number]["name"]

export const DAILY_NOTES_DB_ID = "0c7fa2ac-e00f-4f1e-8d3d-4aae4ed6d31c"
// data_source_id used by dataSources.query (differs from database_id in URL)
export const DAILY_NOTES_DATA_SOURCE_ID = "7d83000d-c0bc-4333-b128-146ceb091e52"

export const ALLOWED_DOMAINS = ["hayanmind.com", "readinginno.com"]

export const ADMIN_EMAILS = ["nynin1@hayanmind.com", "daehoon@hayanmind.com", "jay@hayanmind.com"]

export function getMemberByName(name: string) {
  return MEMBERS.find((m) => m.name.toLowerCase() === name.toLowerCase())
}

export function getMemberByEmail(email: string) {
  return MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase())
}

export function isAllowedEmail(email: string) {
  return ALLOWED_DOMAINS.some((domain) => email.endsWith(`@${domain}`))
}
