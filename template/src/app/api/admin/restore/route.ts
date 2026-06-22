import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const backup = await req.json()

    if (!backup?.version || !backup?.data) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 })
    }

    const { sprints, feedbacks } = backup.data

    let sprintsRestored = 0
    let feedbacksRestored = 0

    // Restore sprints
    if (sprints?.length) {
      for (const sprint of sprints) {
        await prisma.sprint.upsert({
          where: { id: sprint.id },
          update: {
            name: sprint.name,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          },
          create: {
            id: sprint.id,
            name: sprint.name,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          },
        })
        sprintsRestored++
      }
    }

    // Restore feedbacks
    if (feedbacks?.length) {
      for (const fb of feedbacks) {
        await prisma.feedback.upsert({
          where: { id: fb.id },
          update: {
            fromId: fb.fromId,
            toId: fb.toId,
            sprintId: fb.sprintId,
            scoreCompetence: fb.scoreCompetence,
            scoreTeamwork: fb.scoreTeamwork,
            scoreExecution: fb.scoreExecution,
            strength: fb.strength,
            growth: fb.growth,
            notionSynced: fb.notionSynced,
          },
          create: {
            id: fb.id,
            fromId: fb.fromId,
            toId: fb.toId,
            sprintId: fb.sprintId,
            scoreCompetence: fb.scoreCompetence,
            scoreTeamwork: fb.scoreTeamwork,
            scoreExecution: fb.scoreExecution,
            strength: fb.strength,
            growth: fb.growth,
            notionSynced: fb.notionSynced,
            createdAt: new Date(fb.createdAt),
          },
        })
        feedbacksRestored++
      }
    }

    return NextResponse.json({
      success: true,
      restored: { sprints: sprintsRestored, feedbacks: feedbacksRestored },
    })
  } catch (err) {
    console.error("Restore failed:", err)
    return NextResponse.json({ error: "Restore failed" }, { status: 500 })
  }
}
