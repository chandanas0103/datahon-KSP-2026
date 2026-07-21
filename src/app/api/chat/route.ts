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
  - filedDate (INTEGER) - Unix timestamp in MILLISECONDS (not text!)
  - incidentDate (INTEGER) - Unix timestamp in MILLISECONDS (not text!)
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
3. CRITICAL: filedDate and incidentDate are stored as INTEGER (Unix milliseconds). NEVER compare them directly with text date strings. Always convert using: filedDate / 1000 to get seconds, then use 'unixepoch' modifier.
4. For date filtering, use: filedDate >= (strftime('%s', 'now', '-N months') * 1000)
5. For extracting year/month, use: strftime('%Y', filedDate / 1000, 'unixepoch', 'localtime') or strftime('%Y-%m', filedDate / 1000, 'unixepoch', 'localtime')
6. For extracting readable date: date(filedDate / 1000, 'unixepoch', 'localtime')
7. Use GROUP BY with COUNT, AVG, MAX, MIN for aggregate queries.
8. Use ORDER BY for sorting results.
9. Use LIMIT to restrict results (default 20 max).
10. Use LIKE for partial text matching.
11. Return ONLY the raw SQL query. No explanation, no markdown formatting.

EXAMPLES:
Q: "How many theft cases were filed in Whitefield last month?"
SQL: SELECT COUNT(*) as total_cases FROM \`Case\` c JOIN PoliceStation ps ON c.stationId = ps.id JOIN CrimeType ct ON c.crimeTypeId = ct.id WHERE ps.area = 'Whitefield' AND ct.name = 'Theft' AND c.filedDate >= (strftime('%s', 'now', '-1 month') * 1000);

Q: "Show open cases assigned to Officer Ravi Kumar"
SQL: SELECT c.firNumber, c.description, date(c.filedDate / 1000, 'unixepoch', 'localtime') as filed_date, c.status, c.priority FROM \`Case\` c JOIN Officer o ON c.assignedToId = o.id WHERE o.name LIKE '%Ravi Kumar%' AND c.status = 'Open' ORDER BY c.filedDate DESC LIMIT 20;

Q: "What's the most common crime type in Indiranagar this year?"
SQL: SELECT ct.name as crime_type, COUNT(*) as case_count FROM \`Case\` c JOIN PoliceStation ps ON c.stationId = ps.id JOIN CrimeType ct ON c.crimeTypeId = ct.id WHERE ps.area = 'Indiranagar' AND strftime('%Y', c.filedDate / 1000, 'unixepoch', 'localtime') = strftime('%Y', 'now') GROUP BY ct.name ORDER BY case_count DESC LIMIT 10;

Q: "Show all high priority cases from last 3 months"
SQL: SELECT c.firNumber, ct.name as crime_type, ps.name as station, c.status, date(c.filedDate / 1000, 'unixepoch', 'localtime') as filed_date, c.priority FROM \`Case\` c JOIN CrimeType ct ON c.crimeTypeId = ct.id JOIN PoliceStation ps ON c.stationId = ps.id WHERE c.priority = 'High' AND c.filedDate >= (strftime('%s', 'now', '-3 months') * 1000) ORDER BY c.filedDate DESC LIMIT 20;
`;

const TRANSLATION_PROMPT = `You are a translator for Indian police queries. Translate the following query to English if it is in Kannada, Hindi, or any other language. If it is already in English, return it exactly as-is. Return ONLY the translated text, nothing else.

Query: `;

const FOLLOWUP_PROMPT = `Based on the user's question and the SQL query result, suggest 3 short follow-up questions (under 10 words each) that a police officer might naturally ask next. Return ONLY a JSON array of strings, no explanation. Example: ["Show details of the top case", "Compare with last year", "Which officer handles most?"]

User question: `;
const ERROR_FIX_PROMPT = `The following SQL query failed with a database error. Fix the SQL and return ONLY the corrected SQL query, no explanation.

Original question: `;
const EXPLAIN_SQL_PROMPT = `You are a SQL teacher for police officers. Explain the following SQL query in simple, plain English (2-3 sentences). Mention which tables are being joined, what filters are applied, and what the result represents. Be concise and clear.

SQL: `;

const CONFIDENCE_PROMPT = `You are evaluating the confidence of a Text-to-SQL answer. Given the original question, the generated SQL, and the query result, rate confidence as "high", "medium", or "low".

Rules:
- "high": SQL clearly matches the question intent, results are non-empty and relevant
- "medium": SQL is reasonable but results are empty, or SQL is a partial match to the question
- "low": SQL seems incorrect, results are empty for an aggregation question, or the question is ambiguous

Return ONLY one word: high, medium, or low.

Question: `;

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
  if (results.length === 1 && Object.keys(results[0]).length === 1) {
    const key = Object.keys(results[0])[0];
    const val = results[0][key];
    if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(val))) {
      return `Found **${val}** matching record(s) based on your query.`;
    }
  }
  if (results.length === 1) {
    const entry = results[0];
    const keys = Object.keys(entry);
    const values = keys.map((k) => `${k}: ${entry[k]}`).join(", ");
    return `Here is the result: ${values}.`;
  }
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

async function callLLM(messages: { role: string; content: string }[], temperature = 0.1): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
    temperature,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

function cleanSQL(sql: string): string {
  return sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function generateFollowups(question: string, results: Record<string, unknown>[]): Promise<string[]> {
  try {
    const resultSummary = results.length > 0
      ? `Results: ${JSON.stringify(results.slice(0, 3))}`
      : "Results: empty";
    const response = await callLLM(
      [
        { role: "assistant", content: FOLLOWUP_PROMPT },
        { role: "user", content: `${question}\n${resultSummary}` },
      ],
      0.7
    );
    const cleaned = response.replace(/```json?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3).map(String);
    }
    return [];
  } catch {
    return [];
  }
}

async function getConfidence(question: string, sql: string, results: Record<string, unknown>[]): Promise<string> {
  try {
    const resultInfo = results.length === 0 ? "Results: empty (0 rows)" : `Results: ${results.length} rows returned`;
    const response = await callLLM(
      [
        { role: "assistant", content: CONFIDENCE_PROMPT },
        { role: "user", content: `${question}\n\nSQL: ${sql}\n\n${resultInfo}` },
      ],
      0.0
    );
    const cleaned = response.toLowerCase().trim();
    if (cleaned.includes("high")) return "high";
    if (cleaned.includes("medium")) return "medium";
    return "low";
  } catch {
    return "medium";
  }
}

async function explainSQL(sql: string): Promise<string> {
  try {
    return await callLLM(
      [{ role: "assistant", content: EXPLAIN_SQL_PROMPT }, { role: "user", content: sql }],
      0.3
    );
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    // Step 1: Translate if needed (Kannada/Hindi → English)
    const t0 = Date.now();
    let translatedQuestion = question;
    try {
      const translated = await callLLM(
        [{ role: "assistant", content: TRANSLATION_PROMPT }, { role: "user", content: question }],
        0.0
      );
      if (translated && translated.toLowerCase() !== question.toLowerCase()) {
        translatedQuestion = translated;
      }
    } catch {
      // Translation failed — proceed with original question
    }
    const translationTime = Date.now() - t0;

    // Step 2: Generate SQL with self-healing retry
    const t1 = Date.now();
    let sql = "";
    let results: Record<string, unknown>[] = [];
    let dbError: string | null = null;
    let retries = 0;
    const maxRetries = 2;
    let lastError = "";

    let retryCount = 0;
    while (retries <= maxRetries) {
      // Generate SQL
      if (retries === 0) {
        sql = cleanSQL(await callLLM(
          [{ role: "assistant", content: SCHEMA_CONTEXT }, { role: "user", content: translatedQuestion }],
          0.1
        ));
      } else {
        // Retry: ask LLM to fix the SQL based on the error
        retryCount++;
        const fixResponse = await callLLM([
          { role: "assistant", content: SCHEMA_CONTEXT + "\n\n" + ERROR_FIX_PROMPT + translatedQuestion + "\n\nBroken SQL: " + sql + "\n\nError: " + lastError },
          { role: "user", content: "Fix this SQL query. Return ONLY the corrected SQL." },
        ]);
        sql = cleanSQL(fixResponse);
      }

      if (!sql) break;

      // Validate
      const validation = validateSQL(sql);
      if (!validation.valid) {
        dbError = validation.reason || "Safety violation";
        break;
      }

      // Execute
      const t2 = Date.now();
      try {
        const rawResults = await db.$queryRawUnsafe(sql);
        results = serializeResults(rawResults as Record<string, unknown>[]);
        dbError = null;
        // execution succeeded
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        retries++;
      }
    }

    if (!sql) {
      return NextResponse.json({
        answer: "I couldn't generate a query for that question. Please try rephrasing it.",
        sql: null, results: [], confidence: "low", translatedQuestion,
        responseTime: Date.now() - startTime, followups: [],
      });
    }

    if (dbError) {
      return NextResponse.json({
        answer: `The generated query encountered an error: ${dbError}. Please try rephrasing your question.`,
        sql, results: [], confidence: "low", error: dbError,
        translatedQuestion, responseTime: Date.now() - startTime, followups: [],
      });
    }

    // Step 3: Generate natural answer + SQL explanation (parallel)
    const t3 = Date.now();
    const [answer, sqlExplanation] = await Promise.all([
      Promise.resolve(generateNaturalAnswer(translatedQuestion, sql, results)),
      explainSQL(sql),
    ]);

    // Step 4: Confidence scoring + followups (parallel)
    const t4 = Date.now();
    const [confidence, followups] = await Promise.all([
      getConfidence(translatedQuestion, sql, results),
      generateFollowups(translatedQuestion, results),
    ]);
    const confidenceTime = Date.now() - t4;
    const sqlGenTimeFinal = t3 - t1; // total SQL gen time (including retries)

    // Step 5: Log the query
    await db.queryLog.create({
      data: { question, sqlQuery: sql, sqlResult: JSON.stringify(results), answer },
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      answer, sql, results, confidence,
      translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
      responseTime, followups,
      sqlExplanation: sqlExplanation || null,
      timing: { translation: translationTime, sqlGeneration: sqlGenTimeFinal, confidence: confidenceTime },
      ...(retryCount > 0 ? { selfHealed: true, retryCount } : {}),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", errMsg);
    return NextResponse.json(
      { answer: `An internal error occurred. Please try again.`, sql: null, results: [], error: "Internal server error", confidence: "low", responseTime: Date.now() - startTime, followups: [] },
      { status: 500 }
    );
  }
}