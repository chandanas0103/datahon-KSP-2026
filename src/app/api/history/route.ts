import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const logs = await db.queryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, question: true, answer: true, createdAt: true },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json([]);
  }
}