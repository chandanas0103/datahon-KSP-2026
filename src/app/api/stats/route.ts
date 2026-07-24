import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalCases, openCasesRaw, stations, topCrimeRaw] = await Promise.all([
      db.caseMaster.count(),
      db.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count FROM CaseMaster cm JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE csm.CaseStatusName IN ('Open', 'Under Investigation')
      `),
      db.unit.count(),
      db.$queryRawUnsafe<Array<{ name: string; count: bigint }>>(`
        SELECT csh.CrimeHeadName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID
        GROUP BY csh.CrimeHeadName
        ORDER BY count DESC
        LIMIT 1
      `),
    ]);

    const resolvedRaw = await db.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM CaseMaster cm JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE csm.CaseStatusName IN ('Closed', 'Charge Sheeted')
    `);

    const openCases = Array.isArray(openCasesRaw) && openCasesRaw.length > 0 ? Number(openCasesRaw[0].count) : 0;
    const resolvedCases = Array.isArray(resolvedRaw) && resolvedRaw.length > 0 ? Number(resolvedRaw[0].count) : 0;
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
