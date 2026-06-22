"use client"

import { useState } from "react"

type Props = {
  memberName: string
  sprintName: string
  tasks: string[]
}

export default function SprintSummary({ memberName, sprintName, tasks }: Props) {
  const [expanded, setExpanded] = useState(false)
  const preview = tasks.slice(0, 5)
  const hasMore = tasks.length > 5

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-indigo-900">
          {memberName}&apos;s Sprint Activity — {sprintName}
        </h3>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-500 hover:underline"
          >
            {expanded ? "Collapse" : `+${tasks.length - 5} more`}
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {(expanded ? tasks : preview).map((task, i) => (
          <li key={i} className="text-sm text-indigo-800 flex items-start gap-1.5">
            <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
            <span>{task}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
