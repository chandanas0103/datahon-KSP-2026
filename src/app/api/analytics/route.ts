import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function serializeResults(
  results: Record<string, unknown>[]
): Record<string, unknown>[] {
  return results.map((row) => {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "bigint") {
        serialized[key] = Number(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  });
}

export async function GET() {
  try {
    const [
      crimeByType,
      crimeByStatus,
      crimeByPriority,
      crimeByArea,
      crimeByMonth,
      crimeByCategory,
      topOfficers,
      genderDist,
    ] = await Promise.all([
      // Crime by type (top 10 minor heads)
      db.$queryRawUnsafe(`
        SELECT csh.CrimeHeadName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID
        GROUP BY csh.CrimeHeadName
        ORDER BY count DESC
        LIMIT 10
      `),
      // Crime by status
      db.$queryRawUnsafe(`
        SELECT csm.CaseStatusName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID
        GROUP BY csm.CaseStatusName
        ORDER BY count DESC
      `),
      // Crime by gravity/offence priority
      db.$queryRawUnsafe(`
        SELECT go.LookupValue as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN GravityOffence go ON cm.GravityOffenceID = go.GravityOffenceID
        GROUP BY go.LookupValue
        ORDER BY count DESC
      `),
      // Crime by station area
      db.$queryRawUnsafe(`
        SELECT u.UnitName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN Unit u ON cm.PoliceStationID = u.UnitID
        GROUP BY u.UnitName
        ORDER BY count DESC
      `),
      // Monthly trend
      db.$queryRawUnsafe(`
        SELECT
          strftime('%Y-%m', cm.CrimeRegisteredDate / 1000, 'unixepoch', 'localtime') as month,
          COUNT(*) as count,
          SUM(CASE WHEN csm.CaseStatusName IN ('Closed', 'Charge Sheeted') THEN 1 ELSE 0 END) as resolved
        FROM CaseMaster cm
        JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID
        WHERE cm.CrimeRegisteredDate >= (strftime('%s', 'now', '-12 months') * 1000)
        GROUP BY strftime('%Y-%m', cm.CrimeRegisteredDate / 1000, 'unixepoch', 'localtime')
        ORDER BY month ASC
      `),
      // Crime by major category (major head)
      db.$queryRawUnsafe(`
        SELECT ch.CrimeGroupName as name, COUNT(*) as count
        FROM CaseMaster cm
        JOIN CrimeHead ch ON cm.CrimeMajorHeadID = ch.CrimeHeadID
        GROUP BY ch.CrimeGroupName
        ORDER BY count DESC
      `),
      // Top officers by registered case count
      db.$queryRawUnsafe(`
        SELECT e.FirstName as name, r.RankName as rank, u.UnitName as area, COUNT(*) as case_count,
          SUM(CASE WHEN csm.CaseStatusName IN ('Closed', 'Charge Sheeted') THEN 1 ELSE 0 END) as resolved
        FROM CaseMaster cm
        JOIN Employee e ON cm.PolicePersonID = e.EmployeeID
        JOIN Rank r ON e.RankID = r.RankID
        JOIN Unit u ON cm.PoliceStationID = u.UnitID
        JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID
        GROUP BY e.EmployeeID
        ORDER BY case_count DESC
        LIMIT 10
      `),
      // Victim gender distribution
      db.$queryRawUnsafe(`
        SELECT
          CASE v.GenderID WHEN 1 THEN 'Male' WHEN 2 THEN 'Female' ELSE 'Unknown' END as name,
          COUNT(*) as count
        FROM Victim v
        GROUP BY v.GenderID
        ORDER BY count DESC
      `),
    ]);

    return NextResponse.json({
      crimeByType: serializeResults(crimeByType as Record<string, unknown>[]),
      crimeByStatus: serializeResults(crimeByStatus as Record<string, unknown>[]),
      crimeByPriority: serializeResults(crimeByPriority as Record<string, unknown>[]),
      crimeByArea: serializeResults(crimeByArea as Record<string, unknown>[]),
      crimeByMonth: serializeResults(crimeByMonth as Record<string, unknown>[]),
      crimeByCategory: serializeResults(crimeByCategory as Record<string, unknown>[]),
      topOfficers: serializeResults(topOfficers as Record<string, unknown>[]),
      genderDist: serializeResults(genderDist as Record<string, unknown>[]),
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}