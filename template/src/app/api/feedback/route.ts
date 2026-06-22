import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { syncFeedbackToNotion } from "@/lib/notion"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { toMemberName, sprintId, scoreCompetence, scoreTeamwork, scoreExecution, strength, growth } = body

  // Validate scores
  for (const score of [scoreCompetence, scoreTeamwork, scoreExecution]) {
    if (![- 1, 0, 1].includes(score)) {
      return NextResponse.json({ error: "Invalid score value" }, { status: 400 })
    }
  }

  if (!strength?.trim() || !growth?.trim()) {
    return NextResponse.json({ error: "Strength and growth fields are required" }, { status: 400 })
  }

  // Find target user
  const toUser = await prisma.user.findFirst({ where: { memberName: toMemberName } })
  if (!toUser) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 })
  }

  // Prevent self-feedback
  if (toUser.id === session.user.id) {
    return NextResponse.json({ error: "Cannot give feedback to yourself" }, { status: 400 })
  }

  // Validate sprint
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
  if (!sprint) {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 })
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        fromId: session.user.id,
        toId: toUser.id,
        sprintId,
        scoreCompetence,
        scoreTeamwork,
        scoreExecution,
        strength: strength.trim(),
        growth: growth.trim(),
      },
    })

    // Async Notion sync — don't block the response
    syncFeedbackForMember(toMemberName, sprint.name, sprint.startDate.toISOString().split("T")[0]).catch(
      console.error
    )

    return NextResponse.json({ success: true, id: feedback.id })
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already submitted feedback for this person this sprint" },
        { status: 409 }
      )
    }
    console.error("Feedback creation error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function syncFeedbackForMember(memberName: string, sprintName: string, sprintDate: string) {
  const toUser = await prisma.user.findFirst({ where: { memberName } })
  if (!toUser) return

  const allFeedback = await prisma.feedback.findMany({
    where: { toId: toUser.id, sprint: { name: sprintName } },
  })

  if (allFeedback.length === 0) return

  const avg = (vals: number[]) =>
    vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null

  const scoreCompetence = avg(allFeedback.map((f) => f.scoreCompetence))
  const scoreTeamwork = avg(allFeedback.map((f) => f.scoreTeamwork))
  const scoreExecution = avg(allFeedback.map((f) => f.scoreExecution))

  const scores = [scoreCompetence, scoreTeamwork, scoreExecution].filter((s) => s !== null) as number[]
  const overallScore = avg(scores)

  const synced = await syncFeedbackToNotion(memberName, {
    sprintName,
    sprintDate,
    scoreCompetence,
    scoreTeamwork,
    scoreExecution,
    overallScore,
    feedbackCount: allFeedback.length,
    strengths: allFeedback.map((f) => f.strength).filter(Boolean),
    growthAreas: allFeedback.map((f) => f.growth).filter(Boolean),
  })

  if (synced) {
    await prisma.feedback.updateMany({
      where: { toId: toUser.id, sprint: { name: sprintName } },
      data: { notionSynced: true },
    })
  }
}
