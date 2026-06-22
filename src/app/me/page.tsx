import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ensureSprintsSynced, findCurrentSprint } from "@/lib/sprint-sync"
import NavBar from "@/components/NavBar"
import SprintSelector from "@/components/SprintSelector"
import GivenFeedbackCard from "@/components/GivenFeedbackCard"
import TranslateButton from "@/components/TranslateButton"
import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ sprintId?: string; tab?: string }>
}

const scoreLabel = (s: number) =>
  s > 0 ? `+${s} Exceeds` : s === 0 ? "0 Meets" : `${s} Needs Improvement`

const scoreBadge = (s: number) =>
  s > 0
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s === 0
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-red-50 text-red-700 border-red-200"

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

export default async function MyFeedbackPage({ searchParams }: Props) {
  const { sprintId, tab = "received" } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const sprints = await ensureSprintsSynced()
  const activeSprint = sprintId
    ? sprints.find((s) => s.id === sprintId)
    : findCurrentSprint(sprints)

  const sprintFilter = activeSprint ? { sprintId: activeSprint.id } : {}

  const [received, given, stats] = await Promise.all([
    prisma.feedback.findMany({
      where: { toId: session.user.id, ...sprintFilter },
      select: {
        id: true, scoreCompetence: true, scoreTeamwork: true, scoreExecution: true,
        strength: true, growth: true, createdAt: true,
        sprint: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.findMany({
      where: { fromId: session.user.id, ...sprintFilter },
      include: {
        to: { select: { memberName: true, name: true } },
        sprint: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedback.aggregate({
      where: { toId: session.user.id, ...sprintFilter },
      _avg: { scoreCompetence: true, scoreTeamwork: true, scoreExecution: true },
    }),
  ])

  const avgCompetence = stats._avg.scoreCompetence !== null ? Math.round(stats._avg.scoreCompetence * 100) / 100 : null
  const avgTeamwork = stats._avg.scoreTeamwork !== null ? Math.round(stats._avg.scoreTeamwork * 100) / 100 : null
  const avgExecution = stats._avg.scoreExecution !== null ? Math.round(stats._avg.scoreExecution * 100) / 100 : null
  const overallAvg = avg([avgCompetence, avgTeamwork, avgExecution].filter((v) => v !== null) as number[])

  const sprintQuery = sprintId ? `&sprintId=${sprintId}` : activeSprint ? `&sprintId=${activeSprint.id}` : ""

  return (
    <>
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">My Feedback</h1>
        </div>

        {/* Sprint filter */}
        {sprints.length > 0 && (
          <div className="mb-6">
            <SprintSelector
              sprints={sprints.map((s) => ({ id: s.id, name: s.name }))}
              activeSprintId={activeSprint?.id}
              basePath="/me"
              paramName="sprintId"
              extraParams={{ tab }}
              showAll
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <a
            href={`/me?tab=received${sprintQuery}`}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "received"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Received <span className="ml-1 text-xs text-slate-400">{received.length}</span>
          </a>
          <a
            href={`/me?tab=given${sprintQuery}`}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "given"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Given <span className="ml-1 text-xs text-slate-400">{given.length}</span>
          </a>
        </div>

        {tab === "received" && (
          received.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No feedback received for this sprint yet.
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Score Summary</h2>
                  <span className="text-xs text-slate-400">{received.length} response{received.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Competence", value: avgCompetence },
                    { label: "Teamwork", value: avgTeamwork },
                    { label: "Execution", value: avgExecution },
                    { label: "Overall", value: overallAvg },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-slate-400 mb-1">{label}</p>
                      <p className={`text-lg font-bold ${
                        value === null ? "text-slate-300" : value > 0 ? "text-emerald-600" : value === 0 ? "text-blue-600" : "text-red-500"
                      }`}>
                        {value === null ? "—" : value > 0 ? `+${value}` : value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {received.map((fb, i) => (
                  <div key={fb.id} className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium text-slate-400">Response {i + 1}</span>
                      <span className="text-xs text-slate-300">
                        {new Date(fb.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { label: "Competence", score: fb.scoreCompetence },
                        { label: "Teamwork", score: fb.scoreTeamwork },
                        { label: "Execution", score: fb.scoreExecution },
                      ].map(({ label, score }) => (
                        <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${scoreBadge(score)}`}>
                          {label}: {scoreLabel(score)}
                        </span>
                      ))}
                    </div>
                    {fb.strength && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-slate-400 mb-1">⭐ Strength</p>
                        <TranslateButton text={fb.strength} />
                      </div>
                    )}
                    {fb.growth && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-1">🌱 Growth Area</p>
                        <TranslateButton text={fb.growth} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )
        )}

        {tab === "given" && (
          given.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No feedback given for this sprint yet.
            </div>
          ) : (
            <div className="space-y-4">
              {given.map((fb, i) => (
                <GivenFeedbackCard
                  key={fb.id}
                  index={i}
                  feedback={{
                    id: fb.id,
                    toMemberName: fb.to.memberName ?? fb.to.name ?? "Unknown",
                    sprintName: fb.sprint.name,
                    scoreCompetence: fb.scoreCompetence,
                    scoreTeamwork: fb.scoreTeamwork,
                    scoreExecution: fb.scoreExecution,
                    strength: fb.strength,
                    growth: fb.growth,
                    createdAt: fb.createdAt,
                  }}
                />
              ))}
            </div>
          )
        )}
      </main>
    </>
  )
}
