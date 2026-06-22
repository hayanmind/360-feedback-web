import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [users, sprints, feedbacks, accounts, sessions] = await Promise.all([
    prisma.user.findMany(),
    prisma.sprint.findMany(),
    prisma.feedback.findMany(),
    prisma.account.findMany(),
    prisma.session.findMany(),
  ])

  const backup = {
    version: 1,
    createdAt: new Date().toISOString(),
    data: { users, sprints, feedbacks, accounts, sessions },
  }

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="360-feedback-backup-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}
