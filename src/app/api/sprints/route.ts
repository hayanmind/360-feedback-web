import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sprints = await prisma.sprint.findMany({
    orderBy: { startDate: "desc" },
  })

  return NextResponse.json(sprints)
}
