import { auth } from "@/auth"
import { ensureSprintsSynced } from "@/lib/sprint-sync"
import { getMemberByName } from "@/lib/members"
import { getSprintStandups } from "@/lib/notion"
import NavBar from "@/components/NavBar"
import FeedbackForm from "@/components/FeedbackForm"
import SprintSummary from "@/components/SprintSummary"
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
  const activeSprint = sprints[0]

  // Fetch standup data for the active sprint
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

        {allTasks.length > 0 && (
          <SprintSummary
            memberName={name}
            sprintName={activeSprint?.name ?? ""}
            tasks={allTasks}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-900">Feedback for {name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Your response is anonymous. Be honest and constructive.
            </p>
          </div>

          <FeedbackForm
            toMemberName={name}
            sprints={sprints.map((s) => ({
              id: s.id,
              name: s.name,
              startDate: s.startDate.toISOString(),
              endDate: s.endDate.toISOString(),
            }))}
          />
        </div>
      </main>
    </>
  )
}
