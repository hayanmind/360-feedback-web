import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ensureSprintsSynced } from "@/lib/sprint-sync"
import { getMemberByName, NOTION_ENABLED } from "@/lib/members"
import { getSprintStandups } from "@/lib/notion"
import NavBar from "@/components/NavBar"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ name: string }>
  searchParams: Promise<{ sprint?: string; submitted?: string }>
}

export default async function MemberProfilePage({ params, searchParams }: Props) {
  const { name } = await params
  const { sprint: sprintParam, submitted } = await searchParams

  const memberConfig = getMemberByName(name)
  if (!memberConfig) notFound()

  const session = await auth()
  const isOwnProfile = session?.user?.memberName?.toLowerCase() === name.toLowerCase()

  // Get sprints (auto-creates missing ones from Notion)
  const sprints = await ensureSprintsSynced()
  const activeSprint = sprintParam
    ? sprints.find((s) => s.name === sprintParam)
    : sprints[0]

  // Check if current user already submitted feedback for this member this sprint
  let alreadySubmitted = false
  if (!isOwnProfile && session?.user?.id && activeSprint) {
    const existing = await prisma.feedback.findFirst({
      where: { fromId: session.user.id, to: { memberName: name }, sprintId: activeSprint.id },
    })
    alreadySubmitted = !!existing
  }

  // Fetch Notion standup content for the active sprint (only if Notion enabled)
  const standups = NOTION_ENABLED && activeSprint
    ? await getSprintStandups(activeSprint.name, memberConfig.name)
    : []

  // Get member's Google profile image
  const dbUser = await prisma.user.findFirst({
    where: { memberName: memberConfig.name },
    select: { image: true },
  })

  return (
    <>
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            {dbUser?.image ? (
              <Image src={dbUser.image} alt={name} width={56} height={56} className="rounded-full" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="text-2xl font-semibold text-slate-400">{name[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{name}</h1>
              {isOwnProfile && (
                <Link href="/me" className="text-sm text-indigo-500 hover:underline">
                  View my feedback →
                </Link>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <div>
              {alreadySubmitted ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Feedback submitted
                </span>
              ) : (
                <Link
                  href={`/members/${name}/feedback`}
                  className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Leave Feedback
                </Link>
              )}
            </div>
          )}
        </div>

        {submitted && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            Feedback submitted successfully!
          </div>
        )}

        {/* Sprint tabs */}
        {sprints.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {sprints.map((s) => (
                <Link
                  key={s.id}
                  href={`/members/${name}?sprint=${s.name}`}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeSprint?.id === s.id
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Daily standup content */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Daily Standups — {activeSprint?.name ?? "No sprint selected"}
          </h2>

          {standups.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No standup notes found for this sprint.
            </div>
          ) : (
            <div className="space-y-4">
              {standups.map((standup) => (
                <div key={standup.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-sm font-medium text-slate-700">{standup.title}</span>
                    <div className="flex items-center gap-3">
                      {standup.date && (
                        <span className="text-xs text-slate-400">{standup.date}</span>
                      )}
                      <a
                        href={standup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        View in Notion →
                      </a>
                    </div>
                  </div>

                  {standup.weekContent.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-slate-400">No entries for this member.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {standup.weekContent.map((day) => (
                        <div key={day.day} className="px-4 py-3">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                            {day.day}
                          </div>
                          <ul className="space-y-0.5">
                            {day.tasks.map((task, i) => (
                              <li key={i} className="text-sm text-slate-700">
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
