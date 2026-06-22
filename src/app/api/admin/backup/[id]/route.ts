import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Props = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const backup = await prisma.backup.findUnique({ where: { id } })
  if (!backup) {
    return NextResponse.json({ error: "Backup not found" }, { status: 404 })
  }

  return new NextResponse(backup.data, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="360-feedback-backup-${backup.createdAt.toISOString().split("T")[0]}.json"`,
    },
  })
}
