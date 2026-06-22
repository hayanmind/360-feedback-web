"use client"

import { useState, useRef, useEffect } from "react"

type BackupEntry = { id: string; createdAt: string }

export default function BackupRestore() {
  const [status, setStatus] = useState<string | null>(null)
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/admin/backup/list")
      .then((r) => r.json())
      .then(setBackups)
      .catch(() => {})
  }, [])

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

  async function handleRestoreFromBackup(id: string, date: string) {
    if (!confirm(`Restore from backup ${date}? This will overwrite existing data.`)) return

    setStatus("Restoring from backup...")
    try {
      const res = await fetch(`/api/admin/backup/${id}`)
      if (!res.ok) throw new Error("Failed to fetch backup")
      const text = await res.text()

      const restoreRes = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      })
      const data = await restoreRes.json()
      if (!restoreRes.ok) throw new Error(data.error)
      setStatus(`Restored from ${date}: ${data.restored.sprints} sprints, ${data.restored.feedbacks} feedbacks`)
    } catch (err) {
      setStatus(`Restore failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Database Backup</h2>

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
            Upload & Restore
          </button>
        </div>
      </div>

      {status && <p className="mb-4 text-sm text-slate-600">{status}</p>}

      {backups.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Auto Backups (daily, last {backups.length})
          </h3>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {backups.map((b) => {
              const date = new Date(b.createdAt).toLocaleString("ko-KR", {
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit",
              })
              return (
                <div key={b.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50">
                  <span className="text-slate-600">{date}</span>
                  <div className="flex gap-2">
                    <a
                      href={`/api/admin/backup/${b.id}`}
                      className="text-xs text-indigo-500 hover:underline"
                    >
                      Download
                    </a>
                    <button
                      onClick={() => handleRestoreFromBackup(b.id, date)}
                      className="text-xs text-amber-600 hover:underline"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
