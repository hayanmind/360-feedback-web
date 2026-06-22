"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Feedback = {
  id: string
  toMemberName: string
  sprintName: string
  scoreCompetence: number
  scoreTeamwork: number
  scoreExecution: number
  strength: string
  growth: string
  createdAt: Date
}

const SCORE_OPTIONS = [
  { value: 1, label: "+1 Exceeds" },
  { value: 0, label: "0 Meets" },
  { value: -1, label: "-1 Needs" },
]

const scoreBadge = (s: number) =>
  s > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
  s === 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
  "bg-red-50 text-red-700 border-red-200"

const scoreLabel = (s: number) =>
  s > 0 ? "+1 Exceeds" : s === 0 ? "0 Meets" : "-1 Needs"

export default function GivenFeedbackCard({ feedback, index }: { feedback: Feedback; index: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    scoreCompetence: feedback.scoreCompetence,
    scoreTeamwork: feedback.scoreTeamwork,
    scoreExecution: feedback.scoreExecution,
    strength: feedback.strength,
    growth: feedback.growth,
  })

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this feedback?")) return
    setLoading(true)
    await fetch(`/api/feedback/${feedback.id}`, { method: "DELETE" })
    router.refresh()
  }

  async function handleSave() {
    setLoading(true)
    const res = await fetch(`/api/feedback/${feedback.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-semibold text-slate-800">→ {feedback.toMemberName}</span>
          <span className="ml-2 text-xs text-slate-400">{feedback.sprintName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300">
            {new Date(feedback.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-4">
          {[
            { key: "scoreCompetence" as const, label: "Competence & Skills" },
            { key: "scoreTeamwork" as const, label: "Teamwork & Growth" },
            { key: "scoreExecution" as const, label: "Execution & Results" },
          ].map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, [key]: opt.value }))}
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                      form[key] === opt.value
                        ? "bg-slate-900 text-white border-slate-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Strength</p>
            <textarea
              value={form.strength}
              onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Growth Area</p>
            <textarea
              value={form.growth}
              onChange={(e) => setForm((f) => ({ ...f, growth: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditing(false); setForm({ scoreCompetence: feedback.scoreCompetence, scoreTeamwork: feedback.scoreTeamwork, scoreExecution: feedback.scoreExecution, strength: feedback.strength, growth: feedback.growth }) }}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "Competence", score: feedback.scoreCompetence },
              { label: "Teamwork", score: feedback.scoreTeamwork },
              { label: "Execution", score: feedback.scoreExecution },
            ].map(({ label, score }) => (
              <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${scoreBadge(score)}`}>
                {label}: {scoreLabel(score)}
              </span>
            ))}
          </div>
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-400 mb-1">⭐ Strength</p>
            <p className="text-sm text-slate-700">{feedback.strength}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">🌱 Growth Area</p>
            <p className="text-sm text-slate-700">{feedback.growth}</p>
          </div>
        </>
      )}
    </div>
  )
}
