import { prisma } from "@/lib/prisma"
import { notion } from "@/lib/notion"
import { DAILY_NOTES_DATA_SOURCE_ID } from "@/lib/members"

/** Extract sprint number from name like "2026-S13" → 13 */
function sprintNumber(name: string): number {
  const m = name.match(/S(\d+)/)
  return m ? parseInt(m[1]) : 0
}

/** Sort sprints by number descending (S13, S12, S11, ...) */
function sortSprints<T extends { name: string }>(sprints: T[]): T[] {
  return [...sprints].sort((a, b) => sprintNumber(b.name) - sprintNumber(a.name))
}

/** Find the current sprint (contains today) or most recent past sprint */
export function findCurrentSprint<T extends { startDate: Date; endDate: Date }>(sprints: T[]): T | undefined {
  const today = new Date()
  // First try: sprint whose date range contains today
  const current = sprints.find((s) => s.startDate <= today && s.endDate >= today)
  if (current) return current
  // Fallback: most recent sprint that has already started
  const past = sprints.filter((s) => s.startDate <= today)
  if (past.length === 0) return sprints[0]
  return past.reduce((a, b) => (a.startDate > b.startDate ? a : b))
}

/** Filter out future sprints (only keep current + past) */
function filterCurrentSprints<T extends { name: string; startDate: Date; endDate: Date }>(sprints: T[]): T[] {
  const current = findCurrentSprint(sprints)
  if (!current) return sprints
  const currentNum = sprintNumber(current.name)
  // Keep only sprints with number <= current sprint number
  return sprints.filter((s) => sprintNumber(s.name) <= currentNum)
}

/**
 * Ensures all sprints from Notion daily standup DB exist in the web app DB.
 * Safe to call on every page load — only creates missing sprints.
 * Returns the list of current/past sprints after sync (sorted by sprint number desc).
 */
export async function ensureSprintsSynced() {
  const existingSprints = await prisma.sprint.findMany({
    orderBy: { startDate: "desc" },
  })

  // Only sync if NOTION_TOKEN is available
  if (!process.env.NOTION_TOKEN) return sortSprints(filterCurrentSprints(existingSprints))

  try {
    const response = await notion.dataSources.query({
      data_source_id: DAILY_NOTES_DATA_SOURCE_ID,
      filter: { property: "Name", rich_text: { contains: "Daily Standup S" } },
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100,
    })

    // Parse sprint numbers and dates from Notion
    const sprintMap = new Map<number, { w1Start: string | null; w1End: string | null; w2Start: string | null; w2End: string | null }>()

    for (const page of response.results) {
      const p = page as Record<string, unknown>
      const props = p.properties as Record<string, unknown>

      let title = ""
      for (const key of Object.keys(props)) {
        const prop = props[key] as Record<string, unknown>
        if (prop?.type === "title") {
          const titleArr = prop.title as Array<{ plain_text?: string }>
          title = titleArr?.map((t) => t.plain_text ?? "").join("") || ""
        }
      }

      const match = title.match(/Daily Standup S(\d+)\s*\(W([12])\)/)
      if (!match) continue

      const sprintNum = parseInt(match[1])
      const week = parseInt(match[2])

      let startDate: string | null = null
      let endDate: string | null = null
      for (const key of ["Date", "날짜", "date"]) {
        const prop = props[key] as Record<string, unknown>
        if (prop?.type === "date") {
          const date = prop.date as { start?: string; end?: string } | null
          startDate = date?.start ?? null
          endDate = date?.end ?? null
          break
        }
      }

      if (!sprintMap.has(sprintNum)) {
        sprintMap.set(sprintNum, { w1Start: null, w1End: null, w2Start: null, w2End: null })
      }
      const entry = sprintMap.get(sprintNum)!
      if (week === 1) {
        entry.w1Start = startDate
        entry.w1End = endDate
      } else {
        entry.w2Start = startDate
        entry.w2End = endDate
      }
    }

    const existingNames = new Set(existingSprints.map((s) => s.name))
    let created = false

    for (const [sprintNum, dates] of sprintMap) {
      const name = `2026-S${sprintNum}`
      if (existingNames.has(name)) continue

      const startDate = dates.w1Start
      if (!startDate) continue

      let endDate = dates.w2End
      if (!endDate) {
        if (dates.w1End) {
          const w1End = new Date(dates.w1End)
          w1End.setDate(w1End.getDate() + 7)
          endDate = w1End.toISOString().split("T")[0]
        } else {
          const start = new Date(startDate)
          start.setDate(start.getDate() + 11)
          endDate = start.toISOString().split("T")[0]
        }
      }

      await prisma.sprint.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      })
      created = true
    }

    // Re-fetch if new sprints were created
    if (created) {
      const all = await prisma.sprint.findMany({ orderBy: { startDate: "desc" } })
      return sortSprints(filterCurrentSprints(all))
    }
    return sortSprints(filterCurrentSprints(existingSprints))
  } catch (err) {
    console.error("Sprint auto-sync failed:", err)
    return sortSprints(filterCurrentSprints(existingSprints))
  }
}
