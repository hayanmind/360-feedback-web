import { auth } from "@/auth"
import { ensureSprintsSynced } from "@/lib/sprint-sync"
import { getMemberByName } from "@/lib/members"
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

  return (
    <>
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Link href={`/members/${name}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Back to {name}&apos;s profile
          </Link>
        </div>

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
