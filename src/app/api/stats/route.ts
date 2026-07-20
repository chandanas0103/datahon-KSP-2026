import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalCases, openCases, stations, topCrimeRaw] = await Promise.all([
      db.case.count(),
      db.case.count({ where: { status: { in: ["Open", "Under Investigation"] } } }),
      db.policeStation.count(),
      db.$queryRawUnsafe<Array<{ name: string; count: bigint }>>(`
        SELECT ct.name as name, COUNT(*) as count
        FROM \`Case\` c
        JOIN CrimeType ct ON c.crimeTypeId = ct.id
        GROUP BY ct.name
        ORDER BY count DESC
        LIMIT 1
      `),
    ]);

    const resolvedCases = await db.case.count({
      where: { status: { in: ["Closed", "Charge Sheeted"] } },
    });
    const resolutionRate = totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 0;

    const topCrime = Array.isArray(topCrimeRaw) && topCrimeRaw.length > 0
      ? { name: topCrimeRaw[0].name, count: Number(topCrimeRaw[0].count) }
      : null;

    return NextResponse.json({
      totalCases,
      openCases,
      stations,
      resolutionRate,
      topCrime,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ totalCases: 0, openCases: 0, stations: 0, resolutionRate: 0, topCrime: null });
  }
}
