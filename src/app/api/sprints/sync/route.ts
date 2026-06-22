import { prisma } from "@/lib/prisma"
import { notion } from "@/lib/notion"
import { DAILY_NOTES_DATA_SOURCE_ID } from "@/lib/members"
import { NextResponse } from "next/server"

/**
 * GET /api/sprints/sync
 * Queries Notion daily standup DB for sprint entries and auto-creates
 * missing Sprint records in the web app DB.
 *
 * Notion titles follow: "Daily Standup S13 (W1)"
 * Each sprint = 2 weeks. W1 start date = sprint start, W2 end date = sprint end.
 */
export async function GET() {
  if (!process.env.NOTION_TOKEN) {
    return NextResponse.json({ error: "NOTION_TOKEN not set" }, { status: 500 })
  }

  try {
    // Fetch recent daily standup pages from Notion
    const response = await notion.dataSources.query({
      data_source_id: DAILY_NOTES_DATA_SOURCE_ID,
      filter: { property: "Name", rich_text: { contains: "Daily Standup S" } },
      sorts: [{ property: "Date", direction: "descending" }],
      page_size: 100,
    })

    // Parse sprint info from Notion pages
    const sprintMap = new Map<number, { w1Start: string | null; w1End: string | null; w2Start: string | null; w2End: string | null }>()

    for (const page of response.results) {
      const p = page as Record<string, unknown>
      const props = p.properties as Record<string, unknown>

      // Extract title
      let title = ""
      for (const key of Object.keys(props)) {
        const prop = props[key] as Record<string, unknown>
        if (prop?.type === "title") {
          const titleArr = prop.title as Array<{ plain_text?: string }>
          title = titleArr?.map((t) => t.plain_text ?? "").join("") || ""
        }
      }

      // Parse "Daily Standup S13 (W1)" → sprint=13, week=1
      const match = title.match(/Daily Standup S(\d+)\s*\(W([12])\)/)
      if (!match) continue

      const sprintNum = parseInt(match[1])
      const week = parseInt(match[2])

      // Extract date range
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

    // Get existing sprints from DB
    const existingSprints = await prisma.sprint.findMany({
      select: { name: true },
    })
    const existingNames = new Set(existingSprints.map((s) => s.name))

    // Create missing sprints
    const created: string[] = []
    for (const [sprintNum, dates] of Array.from(sprintMap.entries()).sort((a, b) => a[0] - b[0])) {
      const name = `2026-S${sprintNum}`
      if (existingNames.has(name)) continue

      // Calculate sprint start and end dates
      // Sprint start = W1 start date (Monday of W1)
      // Sprint end = W2 end date (Friday of W2), or W1 end + 7 days if W2 not yet created
      const startDate = dates.w1Start
      let endDate = dates.w2End

      if (!startDate) continue // Need at least W1 to create sprint

      if (!endDate) {
        // W2 not yet in Notion — calculate from W1 end date
        // W1 end is Friday, W2 end is next Friday (+7 days)
        if (dates.w1End) {
          const w1End = new Date(dates.w1End)
          w1End.setDate(w1End.getDate() + 7)
          endDate = w1End.toISOString().split("T")[0]
        } else {
          // Fallback: W1 start + 13 days (Mon to next Fri = 2 weeks - 1 weekend day)
          const start = new Date(startDate)
          start.setDate(start.getDate() + 11) // Mon + 11 = Fri of W2
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
      created.push(name)
    }

    return NextResponse.json({
      synced: created,
      total: sprintMap.size,
      existing: existingNames.size,
    })
  } catch (err) {
    console.error("Sprint sync failed:", err)
    return NextResponse.json({ error: "Sprint sync failed" }, { status: 500 })
  }
}
