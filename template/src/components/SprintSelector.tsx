"use client"

import { useRouter } from "next/navigation"

type Sprint = {
  id: string
  name: string
}

type Props = {
  sprints: Sprint[]
  activeSprintId?: string
  /** Base path, e.g. "/admin" */
  basePath: string
  /** Query param name for the selected value, e.g. "sprintId" */
  paramName: string
  /** Extra query params to preserve, e.g. { member: "Jay" } */
  extraParams?: Record<string, string>
  showAll?: boolean
  allLabel?: string
}

export default function SprintSelector({
  sprints, activeSprintId, basePath, paramName,
  extraParams = {}, showAll = false, allLabel = "All Sprints",
}: Props) {
  const router = useRouter()

  function navigate(value: string) {
    const params = new URLSearchParams()
    if (value) params.set(paramName, value)
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <select
      value={activeSprintId ?? ""}
      onChange={(e) => navigate(e.target.value)}
      className="px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
    >
      {showAll && <option value="">{allLabel}</option>}
      {sprints.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  )
}
