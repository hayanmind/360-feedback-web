import { NextRequest, NextResponse } from "next/server"
import translate from "google-translate-api-x"

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json()

  if (!text || !targetLang) {
    return NextResponse.json({ error: "Missing text or targetLang" }, { status: 400 })
  }

  try {
    const res = await translate(text as string, { to: targetLang }) as { text: string; from: { language: { iso: string } } }
    return NextResponse.json({
      translated: res.text,
      detectedLang: res.from.language.iso,
    })
  } catch (err) {
    console.error("Translation error:", err)
    return NextResponse.json({ error: "Translation failed" }, { status: 500 })
  }
}
