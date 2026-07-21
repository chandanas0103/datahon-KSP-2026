import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const AREA_COORDS: Record<string, [number, number]> = {
  "Whitefield": [12.9698, 77.7500],
  "Indiranagar": [12.9784, 77.6408],
  "Koramangala": [12.9352, 77.6245],
  "HSR Layout": [12.9116, 77.6389],
  "JP Nagar": [12.9166, 77.6101],
  "BTM Layout": [12.9166, 77.6101],
  "Marathahalli": [12.9591, 77.6974],
  "Electronic City": [12.8399, 77.6770],
  "Sarjapur Road": [12.9100, 77.6870],
  "Rajajinagar": [12.9860, 77.5540],
};

export async function GET() {
  try {
    const rows = await db.$queryRawUnsafe<Array<{
      area: string;
      total: bigint;
      crime_type: string;
    }>>(`
      SELECT
        ps.area,
        COUNT(*) as total,
        ct.name as crime_type
      FROM \`Case\` c
      JOIN PoliceStation ps ON c.stationId = ps.id
      JOIN CrimeType ct ON c.crimeTypeId = ct.id
      GROUP BY ps.area, ct.name
      ORDER BY total DESC
    `);

    const areaMap = new Map<string, {
      area: string;
      lat: number;
      lng: number;
      total: number;
      breakdown: Record<string, number>;
    }>();

    for (const row of rows) {
      const coords = AREA_COORDS[row.area] || [12.9716, 77.5946];
      const existing = areaMap.get(row.area);
      const count = Number(row.total);
      if (existing) {
        existing.total += count;
        existing.breakdown[row.crime_type] = (existing.breakdown[row.crime_type] || 0) + count;
      } else {
        areaMap.set(row.area, {
          area: row.area,
          lat: coords[0],
          lng: coords[1],
          total: count,
          breakdown: { [row.crime_type]: count },
        });
      }
    }

    const data = Array.from(areaMap.values()).sort((a, b) => b.total - a.total);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Map data error:", error);
    return NextResponse.json([], { status: 500 });
  }
}