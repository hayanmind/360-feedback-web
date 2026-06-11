import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import NavBar from "@/components/NavBar"
import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ sprintId?: string; member?: string }>
}

const scoreBg = (s: number) => (s > 0 ? "text-emerald-600" : s === 0 ? "text-amber-600" : "text-red-500")
const scoreLabel = (s: number) => (s > 0 ? `+${s}` : `${s}`)

export default async function AdminPage({ searchParams }: Props) {
  const { sprintId, member: memberFilter } = await searchParams
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const sprints = await prisma.sprint.findMany({ orderBy: { startDate: "desc" } })
  const activeSprint = sprintId ? sprints.find((s) => s.id === sprintId) : sprints[0]

  const feedbacks = await prisma.feedback.findMany({
    where: activeSprint ? { sprintId: activeSprint.id } : {},
    include: {
      from: { select: { memberName: true, name: true } },
      to: { select: { memberName: true, name: true } },
      sprint: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by recipient
  const grouped = new Map<string, typeof feedbacks>()
  for (const fb of feedbacks) {
    const key = fb.to.memberName ?? fb.to.name ?? "Unknown"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(fb)
  }
  const members = Array.from(grouped.keys()).sort()

  const activeMembers = memberFilter ? [memberFilter] : members

  return (
    <>
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Admin — Feedback by Member</h1>
          <p className="text-sm text-slate-500 mt-1">{feedbacks.length} total entries</p>
        </div>

        {/* Sprint filter */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
          <a
            href="/admin"
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !sprintId ? "bg-slate-900 text-white font-medium" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Sprints
          </a>
          {sprints.map((s) => (
            <a
              key={s.id}
              href={`/admin?sprintId=${s.id}${memberFilter ? `&member=${memberFilter}` : ""}`}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeSprint?.id === s.id
                  ? "bg-slate-900 text-white font-medium"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.name}
            </a>
          ))}
        </div>

        {/* Member filter */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-8">
          <a
            href={`/admin${sprintId ? `?sprintId=${sprintId}` : ""}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !memberFilter ? "bg-indigo-600 text-white font-medium" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Members
          </a>
          {members.map((m) => (
            <a
              key={m}
              href={`/admin?${sprintId ? `sprintId=${sprintId}&` : ""}member=${m}`}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                memberFilter === m
                  ? "bg-indigo-600 text-white font-medium"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </a>
          ))}
        </div>

        {feedbacks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center text-slate-400 text-sm">
            No feedback found.
          </div>
        ) : (
          <div className="space-y-8">
            {activeMembers.map((memberName) => {
              const mFeedbacks = grouped.get(memberName)
              if (!mFeedbacks || mFeedbacks.length === 0) return null

              const avg = (vals: number[]) =>
                vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : "—"

              const avgComp = avg(mFeedbacks.map((f) => f.scoreCompetence))
              const avgTeam = avg(mFeedbacks.map((f) => f.scoreTeamwork))
              const avgExec = avg(mFeedbacks.map((f) => f.scoreExecution))

              return (
                <div key={memberName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Member header */}
                  <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-indigo-600">{memberName[0]}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{memberName}</span>
                      <span className="text-xs text-slate-400">{mFeedbacks.length} responses</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-400">Avg Comp: <span className={`font-semibold ${scoreBg(parseFloat(avgComp) || 0)}`}>{Number(avgComp) > 0 ? `+${avgComp}` : avgComp}</span></span>
                      <span className="text-slate-400">Team: <span className={`font-semibold ${scoreBg(parseFloat(avgTeam) || 0)}`}>{Number(avgTeam) > 0 ? `+${avgTeam}` : avgTeam}</span></span>
                      <span className="text-slate-400">Exec: <span className={`font-semibold ${scoreBg(parseFloat(avgExec) || 0)}`}>{Number(avgExec) > 0 ? `+${avgExec}` : avgExec}</span></span>
                    </div>
                  </div>

                  {/* Feedback rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">From</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Comp</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Team</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Exec</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Strength</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Growth</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {mFeedbacks.map((fb) => (
                        <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">{fb.from.memberName ?? fb.from.name}</td>
                          <td className={`px-3 py-3 text-center font-semibold ${scoreBg(fb.scoreCompetence)}`}>{scoreLabel(fb.scoreCompetence)}</td>
                          <td className={`px-3 py-3 text-center font-semibold ${scoreBg(fb.scoreTeamwork)}`}>{scoreLabel(fb.scoreTeamwork)}</td>
                          <td className={`px-3 py-3 text-center font-semibold ${scoreBg(fb.scoreExecution)}`}>{scoreLabel(fb.scoreExecution)}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs">{fb.strength}</td>
                          <td className="px-4 py-3 text-slate-600 max-w-xs">{fb.growth}</td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-medium ${fb.notionSynced ? "text-emerald-600" : "text-slate-300"}`}>
                              {fb.notionSynced ? "✓" : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
