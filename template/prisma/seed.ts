import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const url = process.env.DATABASE_URL ?? "file:dev.db"
const adapter = new PrismaLibSql({ url })
const prisma = new PrismaClient({ adapter })

// Edit these sprints to match your company's feedback cycle.
// Example: quarterly, monthly, or sprint-based.
const sprints = [
  { name: "2026-Q3", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30") },
  { name: "2026-Q4", startDate: new Date("2026-10-01"), endDate: new Date("2026-12-31") },
]

async function main() {
  console.log("Seeding sprints...")
  for (const sprint of sprints) {
    await prisma.sprint.upsert({
      where: { name: sprint.name },
      update: {},
      create: sprint,
    })
    console.log(`  ✓ ${sprint.name}`)
  }
  console.log("\nDone!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
