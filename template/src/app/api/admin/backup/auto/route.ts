import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

const MAX_BACKUPS = 30 // Keep last 30 days

/**
 * GET /api/admin/backup/auto
 * Called by Vercel Cron daily. Creates a DB snapshot and stores it.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [users, sprints, feedbacks] = await Promise.all([
      prisma.user.findMany(),
      prisma.sprint.findMany(),
      prisma.feedback.findMany(),
    ])

    const snapshot = JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      data: { users, sprints, feedbacks },
    })

    await prisma.backup.create({ data: { data: snapshot } })

    // Clean up old backups beyond MAX_BACKUPS
    const allBackups = await prisma.backup.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    if (allBackups.length > MAX_BACKUPS) {
      const toDelete = allBackups.slice(MAX_BACKUPS).map((b) => b.id)
      await prisma.backup.deleteMany({ where: { id: { in: toDelete } } })
    }

    return NextResponse.json({
      success: true,
      backupCount: Math.min(allBackups.length + 1, MAX_BACKUPS),
    })
  } catch (err) {
    console.error("Auto backup failed:", err)
    return NextResponse.json({ error: "Auto backup failed" }, { status: 500 })
  }
}
