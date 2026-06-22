"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import ScoreSelector from "./ScoreSelector"
import SprintSummary from "./SprintSummary"

type Sprint = { id: string; name: string; startDate: string; endDate: string }
type Score = -1 | 0 | 1

type Props = {
  toMemberName: string
  sprints: Sprint[]
  currentSprintId?: string
  initialTasks?: string[]
}

export default function FeedbackForm({ toMemberName, sprints, currentSprintId, initialTasks = [] }: Props) {
  const router = useRouter()
  const [sprintId, setSprintId] = useState(currentSprintId ?? sprints[0]?.id ?? "")
  const [scoreCompetence, setScoreCompetence] = useState<Score | null>(null)
  const [scoreTeamwork, setScoreTeamwork] = useState<Score | null>(null)
  const [scoreExecution, setScoreExecution] = useState<Score | null>(null)
  const [strength, setStrength] = useState("")
  const [growth, setGrowth] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<string[]>(initialTasks)
  const [loadingTasks, setLoadingTasks] = useState(false)

  const selectedSprint = sprints.find((s) => s.id === sprintId)

  const fetchTasks = useCallback(async (sprintName: string) => {
    setLoadingTasks(true)
    try {
      const res = await fetch(`/api/sprint-tasks?sprint=${encodeURIComponent(sprintName)}&member=${encodeURIComponent(toMemberName)}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch {
      setTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }, [toMemberName])

  useEffect(() => {
    // Skip fetch for initial sprint (tasks already provided via SSR)
    if (sprintId === (currentSprintId ?? sprints[0]?.id)) return
    const sprint = sprints.find((s) => s.id === sprintId)
    if (sprint) fetchTasks(sprint.name)
  }, [sprintId, currentSprintId, sprints, fetchTasks])

  const isValid =
    sprintId &&
    scoreCompetence !== null &&
    scoreTeamwork !== null &&
    scoreExecution !== null &&
    strength.trim().length > 0 &&
    growth.trim().length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toMemberName,
          sprintId,
          scoreCompetence,
          scoreTeamwork,
          scoreExecution,
          strength,
          growth,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }

      router.push(`/members/${toMemberName}?submitted=true`)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {loadingTasks ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-4 text-sm text-indigo-500">
          Loading activity...
        </div>
      ) : tasks.length > 0 && (
        <SprintSummary
          memberName={toMemberName}
          sprintName={selectedSprint?.name ?? ""}
          tasks={tasks}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Feedback for {toMemberName}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your response is anonymous. Be honest and constructive.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sprint selector */}
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-2">Sprint</label>
            <select
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scores */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Scores</p>
            <ScoreSelector
              label="Competence & Skills"
              description="Technical skills, domain knowledge, and quality of work"
              value={scoreCompetence}
              onChange={setScoreCompetence}
            />
            <ScoreSelector
              label="Teamwork & Growth"
              description="Collaboration, communication, and helping others grow"
              value={scoreTeamwork}
              onChange={setScoreTeamwork}
            />
            <ScoreSelector
              label="Execution & Results"
              description="Proactive delivery, focus on outcomes, and follow-through"
              value={scoreExecution}
              onChange={setScoreExecution}
            />
          </div>

          {/* Text fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Written Feedback</p>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Biggest Strength
              </label>
              <textarea
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="What is this person's strongest contribution or quality?"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1.5">
                Area for Growth
              </label>
              <textarea
                value={growth}
                onChange={(e) => setGrowth(e.target.value)}
                placeholder="What is one key area where this person could improve?"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </form>
      </div>
    </>
  )
}
