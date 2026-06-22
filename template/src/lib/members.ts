import config from "../../config.json"

export type MemberConfig = {
  name: string
  email: string
  notionDbId: string
}

export const MEMBERS: readonly MemberConfig[] = config.members

export const COMPANY_NAME = config.companyName

export const DAILY_NOTES_DB_ID = ""
export const DAILY_NOTES_DATA_SOURCE_ID = config.notionDailyNotesDataSourceId || ""

export const ALLOWED_DOMAINS: string[] = config.allowedDomains

export const ADMIN_EMAILS: string[] = config.adminEmails

export const NOTION_ENABLED: boolean = config.notionEnabled

export function getMemberByName(name: string) {
  return MEMBERS.find((m) => m.name.toLowerCase() === name.toLowerCase())
}

export function getMemberByEmail(email: string) {
  return MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase())
}

export function isAllowedEmail(email: string) {
  return ALLOWED_DOMAINS.some((domain) => email.endsWith(`@${domain}`))
}
