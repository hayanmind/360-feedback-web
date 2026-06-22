import { auth } from "@/auth"
import { ensureSprintsSynced, findCurrentSprint } from "@/lib/sprint-sync"
import { getMemberByName } from "@/lib/members"
import { getSprintStandups } from "@/lib/notion"
import NavBar from "@/components/NavBar"
import FeedbackForm from "@/components/FeedbackForm"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

type Props = {
  params: Promise<{ name: string }>
}

export default async function FeedbackPage({ params }: Props) {
  const { name } = await params
  const session = await auth()

  const memberConfig = getMemberByName(name)
  if (!memberConfig) notFound()

  // Prevent self-feedback
  if (session?.user?.memberName?.toLowerCase() === name.toLowerCase()) {
    redirect(`/members/${name}`)
  }

  const sprints = await ensureSprintsSynced()
  const activeSprint = findCurrentSprint(sprints)

  // Fetch standup data for the active sprint (SSR initial load)
  const standups = activeSprint
    ? await getSprintStandups(activeSprint.name, memberConfig.name)
    : []

  // Flatten all tasks from standups into a compact summary
  const allTasks: string[] = []
  for (const standup of standups) {
    for (const day of standup.weekContent) {
      for (const task of day.tasks) {
        if (task.trim() && !allTasks.includes(task.trim())) {
          allTasks.push(task.trim())
        }
      }
    }
  }

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href={`/members/${name}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Back to {name}&apos;s profile
          </Link>
        </div>

        <FeedbackForm
          toMemberName={name}
          currentSprintId={activeSprint?.id}
          initialTasks={allTasks}
          sprints={sprints.map((s) => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate.toISOString(),
            endDate: s.endDate.toISOString(),
          }))}
        />
      </main>
    </>
  )
}
