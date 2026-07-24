import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalCases, openCases, stations, topCrimeRaw, resolvedCases] = await Promise.all([
      db.caseMaster.count(),
      db.caseMaster.count({
        where: {
          status: {
            CaseStatusName: { in: ["Open", "Under Investigation"] },
          },
        },
      }),
      db.unit.count(),
      db.$queryRawUnsafe<Array<{ name: string; count: bigint }>>(`
        SELECT csh.CrimeHeadName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID
        GROUP BY csh.CrimeHeadName
        ORDER BY count DESC
        LIMIT 1
      `),
      db.caseMaster.count({
        where: {
          status: {
            CaseStatusName: { in: ["Closed", "Charge Sheeted"] },
          },
        },
      }),
    ]);

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
