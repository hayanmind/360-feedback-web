"use client"

type Score = -1 | 0 | 1

type Props = {
  value: Score | null
  onChange: (value: Score) => void
  label: string
  description?: string
}

const options: { value: Score; label: string; color: string; activeColor: string }[] = [
  { value: 1, label: "+1 Exceeds", color: "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50", activeColor: "border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold" },
  { value: 0, label: "0 Meets", color: "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50", activeColor: "border-amber-400 bg-amber-50 text-amber-700 font-semibold" },
  { value: -1, label: "−1 Needs", color: "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50", activeColor: "border-red-400 bg-red-50 text-red-700 font-semibold" },
]

export default function ScoreSelector({ value, onChange, label, description }: Props) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
              value === opt.value ? opt.activeColor : opt.color
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
