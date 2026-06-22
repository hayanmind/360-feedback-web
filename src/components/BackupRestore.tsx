"use client"

import { useState, useRef } from "react"

export default function BackupRestore() {
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleBackup() {
    setStatus("Downloading backup...")
    try {
      const res = await fetch("/api/admin/backup")
      if (!res.ok) throw new Error("Backup failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `360-feedback-backup-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus("Backup downloaded!")
    } catch {
      setStatus("Backup failed")
    }
  }

  async function handleRestore() {
    const file = fileRef.current?.files?.[0]
    if (!file) return setStatus("Select a backup file first")

    if (!confirm("This will overwrite existing data. Continue?")) return

    setStatus("Restoring...")
    try {
      const text = await file.text()
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(`Restored: ${data.restored.sprints} sprints, ${data.restored.feedbacks} feedbacks`)
    } catch (err) {
      setStatus(`Restore failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Database Backup</h2>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleBackup}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Download Backup
        </button>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json" className="text-sm text-slate-500" />
          <button
            onClick={handleRestore}
            className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Restore
          </button>
        </div>
      </div>
      {status && (
        <p className="mt-3 text-sm text-slate-600">{status}</p>
      )}
    </div>
  )
}
