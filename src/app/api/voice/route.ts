import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: "Text string required for synthesis" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      translatedText: text,
      audioUrl: null,
      servicesUsed: "Browser SpeechSynthesis",
    });
  } catch (error) {
    console.error("Voice route error:", error);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
