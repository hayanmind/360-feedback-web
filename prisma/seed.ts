import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

const url = process.env.DATABASE_URL ?? "file:dev.db"
const adapter = new PrismaLibSql({ url })
const prisma = new PrismaClient({ adapter })

const sprints = [
  { name: "2026-S6",  startDate: new Date("2026-03-12"), endDate: new Date("2026-03-25") },
  { name: "2026-S7",  startDate: new Date("2026-03-26"), endDate: new Date("2026-04-08") },
  { name: "2026-S8",  startDate: new Date("2026-04-09"), endDate: new Date("2026-04-22") },
  { name: "2026-S9",  startDate: new Date("2026-04-23"), endDate: new Date("2026-05-06") },
  { name: "2026-S10", startDate: new Date("2026-05-07"), endDate: new Date("2026-05-20") },
  { name: "2026-S11", startDate: new Date("2026-05-21"), endDate: new Date("2026-06-03") },
  { name: "2026-S12", startDate: new Date("2026-06-04"), endDate: new Date("2026-06-17") },
  { name: "2026-S13", startDate: new Date("2026-06-18"), endDate: new Date("2026-07-01") },
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
