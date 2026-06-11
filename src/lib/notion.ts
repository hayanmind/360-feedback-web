import { Client } from "@notionhq/client"
import { DAILY_NOTES_DATA_SOURCE_ID, getMemberByName } from "./members"

export const notion = new Client({ auth: process.env.NOTION_TOKEN })

export type DailyNote = {
  id: string
  title: string
  date: string | null
  url: string
}

export type StandupDayContent = {
  day: string
  tasks: string[]
}

export type StandupNote = {
  id: string
  title: string
  date: string | null
  url: string
  weekContent: StandupDayContent[]
}

export type FeedbackSyncData = {
  sprintName: string
  sprintDate: string
  scoreCompetence: number | null
  scoreTeamwork: number | null
  scoreExecution: number | null
  overallScore: number | null
  feedbackCount: number
  strengths: string[]
  growthAreas: string[]
}

function extractTitle(page: Record<string, unknown>): string {
  const props = page.properties as Record<string, unknown>
  if (!props) return "Untitled"

  for (const key of Object.keys(props)) {
    const prop = props[key] as Record<string, unknown>
    if (prop?.type === "title") {
      const titleArr = prop.title as Array<{ plain_text?: string }>
      return titleArr?.map((t) => t.plain_text ?? "").join("") || "Untitled"
    }
  }
  return "Untitled"
}

function extractDate(page: Record<string, unknown>): string | null {
  const props = page.properties as Record<string, unknown>
  if (!props) return null

  for (const key of ["Date", "날짜", "date"]) {
    const prop = props[key] as Record<string, unknown>
    if (prop?.type === "date") {
      const date = prop.date as { start?: string } | null
      return date?.start ?? null
    }
  }

  const created = page.created_time as string | undefined
  return created ? created.split("T")[0] : null
}

export async function getSprintStandups(
  sprintName: string,
  memberName: string
): Promise<StandupNote[]> {
  if (!process.env.NOTION_TOKEN) return []

  // "2026-S9" → "S9"
  const sprintNum = sprintName.split("-").pop() ?? sprintName

  try {
    const response = await notion.dataSources.query({
      data_source_id: DAILY_NOTES_DATA_SOURCE_ID,
      filter: { property: "Name", rich_text: { contains: `Daily Standup ${sprintNum}` } },
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 10,
    })

    // Filter and deduplicate by title (keep the one with the most recent date)
    const seen = new Map<string, Record<string, unknown>>()
    for (const page of response.results) {
      const p = page as Record<string, unknown>
      const title = extractTitle(p)
      if (!title.startsWith("Daily Standup") || !title.includes(sprintNum)) continue
      const date = extractDate(p) ?? ""
      if (!date.startsWith("2026")) continue
      const existing = seen.get(title)
      if (!existing) {
        seen.set(title, p)
      } else {
        // Keep the one with a more recent date
        const existingDate = extractDate(existing) ?? ""
        const currentDate = extractDate(p) ?? ""
        if (currentDate > existingDate) seen.set(title, p)
      }
    }
    const pages = Array.from(seen.values())

    const results: StandupNote[] = []
    for (const page of pages) {
      const p = page as Record<string, unknown>
      const weekContent = await getMemberStandupContent(p.id as string, memberName)
      results.push({
        id: p.id as string,
        title: extractTitle(p),
        date: extractDate(p),
        url: p.url as string,
        weekContent,
      })
    }
    return results
  } catch (err) {
    console.error("Failed to fetch standup notes:", err)
    return []
  }
}

async function getMemberStandupContent(
  pageId: string,
  memberName: string
): Promise<StandupDayContent[]> {
  try {
    const blocksRes = await notion.blocks.children.list({ block_id: pageId })
    const tableBlocks = blocksRes.results.filter(
      (b) => (b as Record<string, unknown>).type === "table"
    )
    if (tableBlocks.length === 0) return []

    for (const tableBlock of tableBlocks) {
      const rowsRes = await notion.blocks.children.list({ block_id: tableBlock.id })
      const rows = rowsRes.results.filter(
        (b) => (b as Record<string, unknown>).type === "table_row"
      )
      if (rows.length < 2) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const headerCells = (rows[0] as any).table_row.cells as Array<Array<{ plain_text: string }>>
      const days = headerCells.slice(1).map((cell) => cell.map((rt) => rt.plain_text).join(""))

      const memberRow = rows.slice(1).find((row) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstCell = (row as any).table_row.cells[0] as Array<{ plain_text: string }>
        const text = firstCell.map((rt) => rt.plain_text).join("").toLowerCase()
        return text.includes(memberName.toLowerCase())
      })

      if (!memberRow) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells = (memberRow as any).table_row.cells as Array<Array<{ plain_text: string }>>

      const result = days
        .map((day, i) => ({
          day,
          tasks: (cells[i + 1] ?? [])
            .map((rt) => rt.plain_text)
            .join("")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        }))
        .filter((d) => d.tasks.length > 0)

      if (result.length > 0) return result
    }

    return []
  } catch (err) {
    console.error("Failed to fetch standup content for", memberName, err)
    return []
  }
}

function scoreDisplay(score: number | null): string {
  if (score === null) return "N/A"
  if (score > 0) return `+${score.toFixed(2)}`
  return score.toFixed(2)
}

export async function syncFeedbackToNotion(
  memberName: string,
  data: FeedbackSyncData
): Promise<boolean> {
  if (!process.env.NOTION_TOKEN) return false

  const member = getMemberByName(memberName)
  if (!member) return false

  try {
    const { sprintName, sprintDate, scoreCompetence, scoreTeamwork, scoreExecution, overallScore, feedbackCount, strengths, growthAreas } = data

    // Check if entry exists for this sprint
    const existing = await notion.dataSources.query({
      data_source_id: member.notionDbId,
      filter: { property: "Sprint", rich_text: { equals: sprintName } },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: any = {
      Name: { title: [{ text: { content: sprintName } }] },
      Date: { date: { start: sprintDate } },
      Sprint: { rich_text: [{ text: { content: sprintName } }] },
      "Overall Score": { number: overallScore },
      "Score: Competence": { number: scoreCompetence },
      "Score: Growing Together": { number: scoreTeamwork },
      "Score: Proactive Execution": { number: scoreExecution },
    }

    const blocks = buildFeedbackBlocks(memberName, sprintName, data)

    if (existing.results.length > 0) {
      const pageId = existing.results[0].id
      await notion.pages.update({ page_id: pageId, properties })
      const existingBlocks = await notion.blocks.children.list({ block_id: pageId })
      for (const block of existingBlocks.results) {
        await notion.blocks.delete({ block_id: block.id })
      }
      await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(0, 100) as Parameters<typeof notion.blocks.children.append>[0]["children"] })
    } else {
      await notion.pages.create({
        parent: { database_id: member.notionDbId },
        properties,
        children: blocks.slice(0, 100) as Parameters<typeof notion.pages.create>[0]["children"],
      })
    }

    return true
  } catch (err) {
    console.error(`Failed to sync Notion for ${memberName}:`, err)
    return false
  }
}

function buildFeedbackBlocks(
  memberName: string,
  sprintName: string,
  data: FeedbackSyncData
): unknown[] {
  const { scoreCompetence, scoreTeamwork, scoreExecution, overallScore, feedbackCount, strengths, growthAreas } = data

  const blocks: unknown[] = [
    { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: `📋 ${memberName} · ${sprintName}` } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `Respondents: ${feedbackCount}` }, annotations: { bold: true } }] } },
    { object: "block", type: "divider", divider: {} },
    { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📊 Score Summary" } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `• Competence & Skills: ${scoreDisplay(scoreCompetence)}` } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `• Teamwork & Growth: ${scoreDisplay(scoreTeamwork)}` } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `• Execution & Results: ${scoreDisplay(scoreExecution)}` } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: `▶ Overall Score: ${scoreDisplay(overallScore)}` }, annotations: { bold: true } }] } },
    { object: "block", type: "divider", divider: {} },
  ]

  if (strengths.length > 0) {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "⭐ Strengths" } }] } })
    for (const s of strengths) {
      blocks.push({ object: "block", type: "callout", callout: { icon: { type: "emoji", emoji: "⭐" }, rich_text: [{ type: "text", text: { content: s } }], color: "yellow_background" } })
    }
  }

  if (growthAreas.length > 0) {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🌱 Growth Areas" } }] } })
    for (const g of growthAreas) {
      blocks.push({ object: "block", type: "callout", callout: { icon: { type: "emoji", emoji: "🌱" }, rich_text: [{ type: "text", text: { content: g } }], color: "green_background" } })
    }
  }

  return blocks
}
