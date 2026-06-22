import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const feedback = await prisma.feedback.findUnique({ where: { id } })
  if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (feedback.fromId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.feedback.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const feedback = await prisma.feedback.findUnique({ where: { id } })
  if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (feedback.fromId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { scoreCompetence, scoreTeamwork, scoreExecution, strength, growth } = body

  for (const score of [scoreCompetence, scoreTeamwork, scoreExecution]) {
    if (![-1, 0, 1].includes(score)) return NextResponse.json({ error: "Invalid score" }, { status: 400 })
  }
  if (!strength?.trim() || !growth?.trim()) return NextResponse.json({ error: "Fields required" }, { status: 400 })

  const updated = await prisma.feedback.update({
    where: { id },
    data: { scoreCompetence, scoreTeamwork, scoreExecution, strength: strength.trim(), growth: growth.trim(), notionSynced: false },
  })
  return NextResponse.json(updated)
}
