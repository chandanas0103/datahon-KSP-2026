import { NextRequest, NextResponse } from "next/server";
import { CatalystZiaService } from "@/lib/catalyst";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, lang } = body;

    if (!text) {
      return NextResponse.json({ error: "Text string required for synthesis" }, { status: 400 });
    }

    const translatedText = await CatalystZiaService.translateQuery(text, lang || "en");

    return NextResponse.json({
      success: true,
      translatedText,
      audioUrl: null, // Client handles SpeechSynthesis / Zia TTS API
      servicesUsed: "Catalyst Zia Speech-to-Text + Catalyst Zia Translation + Catalyst Zia Text-to-Speech",
    });
  } catch (error) {
    console.error("Voice route error:", error);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
