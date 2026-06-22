import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
    take: 30,
  })

  return NextResponse.json(backups)
}
