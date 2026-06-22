import { prisma } from "@/lib/prisma"
import { notion } from "@/lib/notion"
import { DAILY_NOTES_DATA_SOURCE_ID } from "@/lib/members"

/**
 * Ensures all sprints from Notion daily standup DB exist in the web app DB.
 * Safe to call on every page load — only creates missing sprints.
 * Returns the list of all sprints after sync.
 */
export async function ensureSprintsSynced() {
  const existingSprints = await prisma.sprint.findMany({
    orderBy: { startDate: "desc" },
  })

  // Only sync if NOTION_TOKEN is available
  if (!process.env.NOTION_TOKEN) return existingSprints

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
      return prisma.sprint.findMany({ orderBy: { startDate: "desc" } })
    }
    return existingSprints
  } catch (err) {
    console.error("Sprint auto-sync failed:", err)
    return existingSprints
  }
}
