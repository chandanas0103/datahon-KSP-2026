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
      // Crime by type (top 10)
      db.$queryRawUnsafe(`
        SELECT ct.name as name, COUNT(*) as count
        FROM \`Case\` c
        JOIN CrimeType ct ON c.crimeTypeId = ct.id
        GROUP BY ct.name
        ORDER BY count DESC
        LIMIT 10
      `),
      // Crime by status
      db.$queryRawUnsafe(`
        SELECT c.status as name, COUNT(*) as count
        FROM \`Case\` c
        GROUP BY c.status
        ORDER BY count DESC
      `),
      // Crime by priority
      db.$queryRawUnsafe(`
        SELECT c.priority as name, COUNT(*) as count
        FROM \`Case\` c
        GROUP BY c.priority
        ORDER BY
          CASE c.priority
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
          END
      `),
      // Crime by area (station area)
      db.$queryRawUnsafe(`
        SELECT ps.area as name, COUNT(*) as count
        FROM \`Case\` c
        JOIN PoliceStation ps ON c.stationId = ps.id
        GROUP BY ps.area
        ORDER BY count DESC
      `),
      // Monthly trend (last 12 months)
      // NOTE: SQLite stores DateTime as INTEGER (ms timestamp), so we must
      // compare against a numeric epoch-millisecond value, NOT a text date string.
      // SQLite type affinity rule: INTEGER < TEXT, so string comparisons always fail.
      db.$queryRawUnsafe(`
        SELECT
          strftime('%Y-%m', c.filedDate / 1000, 'unixepoch', 'localtime') as month,
          COUNT(*) as count,
          SUM(CASE WHEN c.status IN ('Closed', 'Charge Sheeted') THEN 1 ELSE 0 END) as resolved
        FROM \`Case\` c
        WHERE c.filedDate >= (strftime('%s', 'now', '-12 months') * 1000)
        GROUP BY strftime('%Y-%m', c.filedDate / 1000, 'unixepoch', 'localtime')
        ORDER BY month ASC
      `),
      // Crime by category
      db.$queryRawUnsafe(`
        SELECT ct.category as name, COUNT(*) as count
        FROM \`Case\` c
        JOIN CrimeType ct ON c.crimeTypeId = ct.id
        GROUP BY ct.category
        ORDER BY count DESC
      `),
      // Top officers by case count
      db.$queryRawUnsafe(`
        SELECT o.name, o.rank, ps.area, COUNT(*) as case_count,
          SUM(CASE WHEN c.status IN ('Closed', 'Charge Sheeted') THEN 1 ELSE 0 END) as resolved
        FROM \`Case\` c
        JOIN Officer o ON c.assignedToId = o.id
        JOIN PoliceStation ps ON o.stationId = ps.id
        GROUP BY o.id
        ORDER BY case_count DESC
        LIMIT 10
      `),
      // Victim gender distribution
      db.$queryRawUnsafe(`
        SELECT
          COALESCE(c.victimGender, 'Unknown') as name,
          COUNT(*) as count
        FROM \`Case\` c
        GROUP BY c.victimGender
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