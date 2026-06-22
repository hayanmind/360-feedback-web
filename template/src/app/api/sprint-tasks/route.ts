import { NextRequest, NextResponse } from "next/server"
import { getSprintStandups } from "@/lib/notion"
import { getMemberByName } from "@/lib/members"

export async function GET(req: NextRequest) {
  const sprintName = req.nextUrl.searchParams.get("sprint")
  const memberName = req.nextUrl.searchParams.get("member")

  if (!sprintName || !memberName) {
    return NextResponse.json({ tasks: [] })
  }

  const memberConfig = getMemberByName(memberName)
  if (!memberConfig) {
    return NextResponse.json({ tasks: [] })
  }

  try {
    const standups = await getSprintStandups(sprintName, memberConfig.name)
    const tasks: string[] = []
    for (const standup of standups) {
      for (const day of standup.weekContent) {
        for (const task of day.tasks) {
          if (task.trim() && !tasks.includes(task.trim())) {
            tasks.push(task.trim())
          }
        }
      }
    }
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ tasks: [] })
  }
}
