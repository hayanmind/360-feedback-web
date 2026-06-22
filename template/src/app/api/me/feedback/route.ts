import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sprintId = searchParams.get("sprintId")

  const where = {
    toId: session.user.id,
    ...(sprintId ? { sprintId } : {}),
  }

  // Never expose fromId — use select only (no include)
  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sprintId: true,
      scoreCompetence: true,
      scoreTeamwork: true,
      scoreExecution: true,
      strength: true,
      growth: true,
      createdAt: true,
      sprint: { select: { id: true, name: true, startDate: true, endDate: true } },
    },
  })

  return NextResponse.json(feedbacks)
}
