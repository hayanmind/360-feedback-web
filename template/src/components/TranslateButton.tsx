"use client"

import { useState } from "react"

type Props = {
  text: string
}

export default function TranslateButton({ text }: Props) {
  const [translated, setTranslated] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)

  async function handleTranslate() {
    if (translated) {
      setShowOriginal(!showOriginal)
      return
    }

    setLoading(true)
    try {
      // Detect if text is Korean → translate to English, otherwise → Korean
      const isKorean = /[가-힣]/.test(text)
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: isKorean ? "en" : "ko" }),
      })
      const data = await res.json()
      if (data.translated) {
        setTranslated(data.translated)
        setShowOriginal(false)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">
        {showOriginal ? text : translated}
      </p>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors disabled:text-slate-300"
      >
        {loading
          ? "Translating..."
          : translated && !showOriginal
          ? "See original"
          : "Translate"}
      </button>
    </div>
  )
}
