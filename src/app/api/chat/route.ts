import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";
import { CatalystQuickMLService, CatalystDataStoreService, CatalystCircuitsService } from "@/lib/catalyst";

const SCHEMA_CONTEXT = `
You are a Text-to-SQL assistant for the official Karnataka State Police (KSP) FIR Database.
You MUST return ONLY valid SQLite SQL queries. No explanations, no markdown, no code fences.

DATABASE SCHEMA:

Table: CaseMaster
  - CaseMasterID (INTEGER, PK)
  - CrimeNo (TEXT, UNIQUE) - Structured 19-digit FIR number e.g. "104430006202600001"
  - CaseNo (TEXT) - e.g. "202600001"
  - CrimeRegisteredDate (DATETIME) - Registration timestamp
  - PolicePersonID (INTEGER, FK -> Employee.EmployeeID) - Registering officer ID
  - PoliceStationID (INTEGER, FK -> Unit.UnitID) - Police Station ID
  - CaseCategoryID (INTEGER, FK -> CaseCategory.CaseCategoryID) - FIR, UDR, Zero FIR
  - GravityOffenceID (INTEGER, FK -> GravityOffence.GravityOffenceID) - Heinous, Non-Heinous
  - CrimeMajorHeadID (INTEGER, FK -> CrimeHead.CrimeHeadID) - Major crime classification
  - CrimeMinorHeadID (INTEGER, FK -> CrimeSubHead.CrimeSubHeadID) - Minor crime subhead
  - CaseStatusID (INTEGER, FK -> CaseStatusMaster.CaseStatusID) - Open, Under Investigation, Closed, Charge Sheeted
  - CourtID (INTEGER, FK -> Court.CourtID)
  - IncidentFromDate (DATETIME), IncidentToDate (DATETIME)
  - latitude (REAL), longitude (REAL), BriefFacts (TEXT)

Table: Unit
  - UnitID (INTEGER, PK)
  - UnitName (TEXT) - Police Station name e.g. "Whitefield Police Station", "Indiranagar Police Station", "Koramangala Police Station", "HSR Layout Police Station", "JP Nagar Police Station", "BTM Layout Police Station", "Marathahalli Police Station", "Electronic City Police Station", "Sarjapur Road Police Station", "Rajajinagar Police Station"
  - DistrictID (INTEGER, FK -> District.DistrictID)
  - StateID (INTEGER, FK -> State.StateID)

Table: Employee
  - EmployeeID (INTEGER, PK)
  - KGID (TEXT, UNIQUE) - Karnataka Government Employee ID e.g. "KGID-2021-001"
  - FirstName (TEXT) - Officer name e.g. "Ravi Kumar", "Priya Sharma", "Anand Reddy"
  - UnitID (INTEGER, FK -> Unit.UnitID)
  - RankID (INTEGER, FK -> Rank.RankID) - Inspector, Sub-Inspector
  - DesignationID (INTEGER, FK -> Designation.DesignationID) - Station House Officer, Investigating Officer

Table: Victim
  - VictimMasterID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - VictimName (TEXT), AgeYear (INTEGER), GenderID (INTEGER: 1=Male, 2=Female), VictimPolice (TEXT)

Table: Accused
  - AccusedMasterID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - AccusedName (TEXT), AgeYear (INTEGER), GenderID (INTEGER: 1=Male, 2=Female), PersonID (TEXT)

Table: Act
  - ActCode (TEXT, PK) - e.g. "IPC", "IT_ACT"
  - ActDescription (TEXT), ShortName (TEXT)

Table: Section
  - id (INTEGER, PK)
  - ActCode (TEXT, FK -> Act.ActCode)
  - SectionCode (TEXT) - e.g. "302", "379", "380", "420", "66D"
  - SectionDescription (TEXT)

Table: ActSectionAssociation
  - id (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - ActID (TEXT, FK -> Act.ActCode)
  - SectionID (INTEGER, FK -> Section.id)

Table: ArrestSurrender
  - ArrestSurrenderID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - ArrestSurrenderDate (DATETIME)
  - PoliceStationID (INTEGER, FK -> Unit.UnitID)
  - IOID (INTEGER, FK -> Employee.EmployeeID) - Investigating Officer ID
  - AccusedMasterID (INTEGER, FK -> Accused.AccusedMasterID)

Table: ChargesheetDetails
  - CSID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - csdate (DATETIME), cstype (TEXT), PolicePersonID (INTEGER, FK -> Employee.EmployeeID)

Table: CrimeHead
  - CrimeHeadID (INTEGER, PK), CrimeGroupName (TEXT) - "Property Crime", "Violent Crime", "Cyber Crime", "Fraud"

Table: CrimeSubHead
  - CrimeSubHeadID (INTEGER, PK), CrimeHeadID (INTEGER, FK -> CrimeHead.CrimeHeadID), CrimeHeadName (TEXT) - "Theft", "Burglary", "Murder", "Robbery", "Online Financial Fraud", "Cheating"

Table: CaseStatusMaster
  - CaseStatusID (INTEGER, PK), CaseStatusName (TEXT) - "Open", "Under Investigation", "Closed", "Charge Sheeted"

RULES:
1. ONLY generate SELECT queries. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, or any DML/DDL.
2. Join Unit for station location/name (e.g. UnitName LIKE '%Whitefield%').
3. Join Employee for officer details (e.g. FirstName LIKE '%Ravi Kumar%' or KGID = 'KGID-2021-001').
4. Join CrimeSubHead for crime types (e.g. CrimeHeadName = 'Theft' or 'Murder').
5. Join Act and Section via ActSectionAssociation for legal section queries (e.g. SectionCode = '302' or SectionCode = '379').
6. For date filtering in SQLite, CrimeRegisteredDate is stored as ISO string or timestamp.
7. Limit results to 20 by default unless aggregated.
8. Return ONLY raw SQL. No explanations or code fences.

EXAMPLES:
Q: "Show theft cases registered in Whitefield Police Station"
SQL: SELECT cm.CrimeNo, cm.CaseNo, u.UnitName, csh.CrimeHeadName, cm.BriefFacts, cm.CrimeRegisteredDate FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID WHERE u.UnitName LIKE '%Whitefield%' AND csh.CrimeHeadName = 'Theft' ORDER BY cm.CrimeRegisteredDate DESC LIMIT 20;

Q: "Show cases registered under IPC Section 302"
SQL: SELECT cm.CrimeNo, cm.CaseNo, u.UnitName, a.ActCode, s.SectionCode, s.SectionDescription, cm.BriefFacts FROM CaseMaster cm JOIN ActSectionAssociation asa ON cm.CaseMasterID = asa.CaseMasterID JOIN Act a ON asa.ActID = a.ActCode JOIN Section s ON asa.SectionID = s.id JOIN Unit u ON cm.PoliceStationID = u.UnitID WHERE s.SectionCode = '302' LIMIT 20;

Q: "List cases handled by Officer Ravi Kumar"
SQL: SELECT cm.CrimeNo, cm.CaseNo, e.FirstName as OfficerName, e.KGID, csh.CrimeHeadName, csm.CaseStatusName FROM CaseMaster cm JOIN Employee e ON cm.PolicePersonID = e.EmployeeID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE e.FirstName LIKE '%Ravi Kumar%' LIMIT 20;

Q: "How many cases were filed per police station?"
SQL: SELECT u.UnitName as station_name, COUNT(cm.CaseMasterID) as total_cases FROM Unit u LEFT JOIN CaseMaster cm ON u.UnitID = cm.PoliceStationID GROUP BY u.UnitName ORDER BY total_cases DESC;
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
  // Strip comments
  const stripped = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();

  const normalized = stripped.toLowerCase();
  const forbidden = [
    /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|pragma|attach|detach|vacuum|execute|exec)\b/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(normalized)) {
      return { valid: false, reason: "Only SELECT queries are allowed for safety." };
    }
  }

  if (!normalized.startsWith("select") && !normalized.startsWith("with")) {
    return { valid: false, reason: "Only SELECT queries are permitted." };
  }

  const statements = stripped.split(";").filter((s) => s.trim().length > 0);
  if (statements.length > 1) {
    return { valid: false, reason: "Multiple SQL statements are not allowed." };
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

async function callLLM(messages: { role: "user" | "system" | "assistant"; content: string }[], temperature = 0.1): Promise<string> {
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

    // Step 3: Generate natural answer & SQL explanation
    const t3 = Date.now();
    const [answer, sqlExplanation, investigationBriefing, relatedCases, circuitState] = await Promise.all([
      Promise.resolve(generateNaturalAnswer(translatedQuestion, sql, results)),
      explainSQL(sql),
      CatalystQuickMLService.generateInvestigationSummary(translatedQuestion, sql, results),
      CatalystDataStoreService.findRelatedCases(translatedQuestion, results),
      CatalystCircuitsService.executeQueryWorkflow(question),
    ]);

    // Step 4: Confidence scoring + followups (parallel)
    const t4 = Date.now();
    const [confidence, followups] = await Promise.all([
      getConfidence(translatedQuestion, sql, results),
      generateFollowups(translatedQuestion, results),
    ]);
    const confidenceTime = Date.now() - t4;
    const sqlGenTimeFinal = t3 - t1; // total SQL gen time

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
      investigationBriefing,
      relatedCases,
      circuitState,
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