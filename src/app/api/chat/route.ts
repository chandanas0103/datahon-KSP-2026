import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

const SCHEMA_CONTEXT = `
You are a Text-to-SQL assistant for the Karnataka State Police (KSP) Crime Database.
You MUST return ONLY valid SQLite SQL queries. No explanations, no markdown, no code fences.

DATABASE SCHEMA:

Table: PoliceStation
  - id (TEXT, PK)
  - stationCode (TEXT, UNIQUE) - e.g. "PS-WF-01"
  - name (TEXT) - Full station name
  - area (TEXT) - Area name e.g. "Whitefield", "Indiranagar", "Koramangala", "HSR Layout", "JP Nagar", "BTM Layout", "Marathahalli", "Electronic City", "Sarjapur Road", "Rajajinagar"
  - district (TEXT) - e.g. "Bangalore Urban"
  - address (TEXT)
  - phone (TEXT)

Table: Officer
  - id (TEXT, PK)
  - badgeNumber (TEXT, UNIQUE) - e.g. "BLR-001"
  - name (TEXT) - Officer name
  - rank (TEXT) - "Inspector" or "Sub-Inspector"
  - stationId (TEXT, FK -> PoliceStation.id)
  - phone (TEXT)

Table: CrimeType
  - id (TEXT, PK)
  - name (TEXT, UNIQUE) - e.g. "Theft", "Burglary", "Robbery", "Assault", "Cheating", "Cyber Crime", "Vehicle Theft", "Chain Snatching", "Murder", "Rape", "Kidnapping", "Fraud", "Vandalism", "Domestic Violence", "Drug Offense"
  - category (TEXT) - "Property Crime", "Violent Crime", "Fraud", "Cyber Crime", "Personal Crime", "Narcotics"
  - isBailable (INTEGER, 0/1)
  - description (TEXT)

Table: Case
  - id (TEXT, PK)
  - firNumber (TEXT, UNIQUE) - e.g. "FIR/BLR/2025/0001"
  - crimeTypeId (TEXT, FK -> CrimeType.id)
  - stationId (TEXT, FK -> PoliceStation.id)
  - status (TEXT) - "Open", "Under Investigation", "Closed", "Charge Sheeted", "Acquitted", "Compromised"
  - priority (TEXT) - "Low", "Medium", "High", "Critical"
  - assignedToId (TEXT, FK -> Officer.id, nullable)
  - filedDate (TEXT/DateTime) - ISO date string
  - incidentDate (TEXT/DateTime)
  - incidentTime (TEXT) - HH:MM format
  - resolvedDate (TEXT/DateTime, nullable)
  - description (TEXT)
  - location (TEXT)
  - latitude (REAL)
  - longitude (REAL)
  - victimName (TEXT, nullable)
  - victimAge (INTEGER, nullable)
  - victimGender (TEXT, nullable) - "Male" or "Female"
  - suspectName (TEXT, nullable)
  - suspectAge (INTEGER, nullable)
  - suspectGender (TEXT, nullable)

RULES:
1. ONLY generate SELECT queries. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or any DML/DDL.
2. Use JOINs to connect tables when needed. Always use the proper FK relationships.
3. For date filtering, use SQLite date functions: date(filedDate), date(incidentDate), strftime('%Y', filedDate), etc.
4. Use GROUP BY with COUNT, AVG, MAX, MIN for aggregate queries.
5. Use ORDER BY for sorting results.
6. Use LIMIT to restrict results (default 20 max).
7. Use LIKE for partial text matching.
8. For "last month", use date(filedDate) >= date('now', '-1 month').
9. For "this year", use strftime('%Y', filedDate) = strftime('%Y', 'now').
10. Return ONLY the raw SQL query. No explanation, no markdown formatting.

EXAMPLES:
Q: "How many theft cases were filed in Whitefield last month?"
SQL: SELECT COUNT(*) as total_cases FROM \`Case\` c JOIN PoliceStation ps ON c.stationId = ps.id JOIN CrimeType ct ON c.crimeTypeId = ct.id WHERE ps.area = 'Whitefield' AND ct.name = 'Theft' AND date(c.filedDate) >= date('now', '-1 month');

Q: "Show open cases assigned to Officer Ravi Kumar"
SQL: SELECT c.firNumber, c.description, c.filedDate, c.status, c.priority FROM \`Case\` c JOIN Officer o ON c.assignedToId = o.id WHERE o.name LIKE '%Ravi Kumar%' AND c.status = 'Open' ORDER BY c.filedDate DESC LIMIT 20;

Q: "What's the most common crime type in Indiranagar this year?"
SQL: SELECT ct.name as crime_type, COUNT(*) as case_count FROM \`Case\` c JOIN PoliceStation ps ON c.stationId = ps.id JOIN CrimeType ct ON c.crimeTypeId = ct.id WHERE ps.area = 'Indiranagar' AND strftime('%Y', c.filedDate) = strftime('%Y', 'now') GROUP BY ct.name ORDER BY case_count DESC LIMIT 10;

Q: "Show all high priority cases from last 3 months"
SQL: SELECT c.firNumber, ct.name as crime_type, ps.name as station, c.status, c.filedDate, c.priority FROM \`Case\` c JOIN CrimeType ct ON c.crimeTypeId = ct.id JOIN PoliceStation ps ON c.stationId = ps.id WHERE c.priority = 'High' AND date(c.filedDate) >= date('now', '-3 months') ORDER BY c.filedDate DESC LIMIT 20;
`;

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

function validateSQL(sql: string): { valid: boolean; reason?: string } {
  const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

  const forbidden = [
    /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/,
    /;\s*(insert|update|delete|drop|alter|create|truncate)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "Only SELECT queries are allowed for safety." };
    }
  }

  if (!normalized.startsWith("select")) {
    return { valid: false, reason: "Only SELECT queries are permitted." };
  }

  return { valid: true };
}

function generateNaturalAnswer(
  question: string,
  sql: string,
  results: Record<string, unknown>[]
): string {
  if (results.length === 0) {
    return "No matching records found for your query. You may want to try adjusting your search criteria or checking if the data exists in the database.";
  }

  // Count query
  if (results.length === 1 && Object.keys(results[0]).length === 1) {
    const key = Object.keys(results[0])[0];
    const val = results[0][key];
    if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val))) {
      return `Found **${val}** matching record(s) based on your query.`;
    }
  }

  // Top-item query
  if (results.length === 1) {
    const entry = results[0];
    const keys = Object.keys(entry);
    const values = keys.map((k) => `${k}: ${entry[k]}`).join(", ");
    return `Here is the result: ${values}.`;
  }

  // Multi-row results
  const totalRows = results.length;
  const displayRows = results.slice(0, 5);
  const summary = displayRows
    .map((row) => {
      const keys = Object.keys(row);
      return keys.map((k) => `${k}: ${row[k]}`).join(", ");
    })
    .join("\n");

  const more = totalRows > 5 ? `\n...and ${totalRows - 5} more results (showing top 5).` : "";
  return `Found **${totalRows}** results. Top results:\n${summary}${more}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 }
      );
    }

    // Call LLM to generate SQL
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SCHEMA_CONTEXT },
        { role: "user", content: question },
      ],
      thinking: { type: "disabled" },
      temperature: 0.1,
    });

    let sql = completion.choices[0]?.message?.content?.trim() || "";

    // Clean up markdown code fences if the LLM wrapped them
    sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim();

    if (!sql) {
      return NextResponse.json({
        answer:
          "I couldn't generate a query for that question. Please try rephrasing it.",
        sql: null,
        results: [],
      });
    }

    // Validate SQL
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return NextResponse.json({
        answer: `Safety restriction: ${validation.reason}`,
        sql,
        results: [],
      });
    }

    // Execute SQL against SQLite
    let results: Record<string, unknown>[] = [];
    try {
      const rawResults = await db.$queryRawUnsafe(sql);
      results = serializeResults(rawResults as Record<string, unknown>[]);
    } catch (dbError: unknown) {
      const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json({
        answer: `The generated query encountered a database error: ${errMsg}. Please try rephrasing your question.`,
        sql,
        results: [],
        error: errMsg,
      });
    }

    // Generate natural language answer
    const answer = generateNaturalAnswer(question, sql, results);

    // Log the query
    await db.queryLog.create({
      data: {
        question,
        sqlQuery: sql,
        sqlResult: JSON.stringify(results),
        answer,
      },
    });

    return NextResponse.json({
      answer,
      sql,
      results,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", errMsg);
    return NextResponse.json(
      {
        answer: `An internal error occurred: ${errMsg}. Please try again.`,
        sql: null,
        results: [],
        error: errMsg,
      },
      { status: 500 }
    );
  }
}