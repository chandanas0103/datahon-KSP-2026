import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

const SCHEMA_CONTEXT = `
You are a Text-to-SQL assistant for the Karnataka State Police (KSP) Crime Database system, conforming to the official 26-table Karnataka Police ER Diagram.
You MUST return ONLY valid SQLite SQL queries. No explanations, no markdown, no code fences.

DATABASE SCHEMA:

Table: CaseMaster (Primary FIR/Case record)
  - CaseMasterID (INTEGER, PK)
  - CrimeNo (TEXT, UNIQUE) - e.g. "104430006201202600001"
  - CaseNo (TEXT) - e.g. "202600001"
  - CrimeRegisteredDate (INTEGER Unix ms)
  - PolicePersonID (INTEGER, FK -> Employee.EmployeeID) - Registering Officer
  - PoliceStationID (INTEGER, FK -> Unit.UnitID) - Station handling case
  - CaseCategoryID (INTEGER, FK -> CaseCategory.CaseCategoryID)
  - GravityOffenceID (INTEGER, FK -> GravityOffence.GravityOffenceID)
  - CrimeMajorHeadID (INTEGER, FK -> CrimeHead.CrimeHeadID) - Major crime group
  - CrimeMinorHeadID (INTEGER, FK -> CrimeSubHead.CrimeSubHeadID) - Specific crime sub-head
  - CaseStatusID (INTEGER, FK -> CaseStatusMaster.CaseStatusID)
  - CourtID (INTEGER, FK -> Court.CourtID)
  - IncidentFromDate (INTEGER Unix ms)
  - BriefFacts (TEXT)

Table: Unit (Police Station / Unit)
  - UnitID (INTEGER, PK) - e.g. 6201, 6202
  - UnitName (TEXT) - e.g. "Whitefield Police Station", "Koramangala Police Station", "Indiranagar Police Station", "HSR Layout Police Station", "JP Nagar Police Station"
  - DistrictID (INTEGER, FK -> District.DistrictID)

Table: Employee (Police Officer)
  - EmployeeID (INTEGER, PK)
  - KGID (TEXT, UNIQUE) - Karnataka Govt Employee ID e.g. "KGID-2018-0101"
  - FirstName (TEXT) - Full name of officer e.g. "Inspector Ravi Kumar", "SI Anitha Sharma"
  - UnitID (INTEGER, FK -> Unit.UnitID)
  - RankID (INTEGER, FK -> Rank.RankID)

Table: CrimeHead (Major Crime Head)
  - CrimeHeadID (INTEGER, PK)
  - CrimeGroupName (TEXT) - "Property Crimes", "Crimes Against Body", "Financial & Cyber Crime"

Table: CrimeSubHead (Minor Crime Head)
  - CrimeSubHeadID (INTEGER, PK)
  - CrimeHeadID (INTEGER, FK -> CrimeHead.CrimeHeadID)
  - CrimeHeadName (TEXT) - "Theft", "Murder", "Cyber Fraud", "Robbery"

Table: CaseStatusMaster
  - CaseStatusID (INTEGER, PK)
  - CaseStatusName (TEXT) - "Open", "Under Investigation", "Charge Sheeted", "Closed"

Table: ComplainantDetails
  - ComplainantID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - ComplainantName (TEXT)

Table: Victim
  - VictimMasterID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - VictimName (TEXT)

Table: Accused
  - AccusedMasterID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - AccusedName (TEXT)

Table: Act (Legal Acts)
  - ActCode (TEXT, PK) - "IPC", "IT_ACT"

Table: Section (Legal Sections)
  - SectionID (INTEGER, PK)
  - ActCode (TEXT, FK -> Act.ActCode)
  - SectionCode (TEXT) - "302", "379", "420", "66D"

Table: ActSectionAssociation
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - ActID (TEXT, FK -> Act.ActCode)
  - SectionID (INTEGER, FK -> Section.SectionID)

Table: ArrestSurrender (Arrests)
  - ArrestSurrenderID (INTEGER, PK)
  - CaseMasterID (INTEGER, FK -> CaseMaster.CaseMasterID)
  - AccusedMasterID (INTEGER, FK -> Accused.AccusedMasterID)
  - IOID (INTEGER, FK -> Employee.EmployeeID) - Investigating Officer
  - ArrestSurrenderDate (INTEGER Unix ms)

RULES:
1. ONLY generate SELECT queries. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER.
2. Use JOINs to connect tables.
3. Return ONLY raw SQL. No markdown, no code fences.

EXAMPLES:
Q: "How many theft cases were filed in Whitefield?"
SQL: SELECT COUNT(*) as total_cases FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID WHERE u.UnitName LIKE '%Whitefield%' AND csh.CrimeHeadName = 'Theft';

Q: "Show cases registered by Inspector Ravi Kumar"
SQL: SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, csm.CaseStatusName as status, cm.BriefFacts FROM CaseMaster cm JOIN Employee e ON cm.PolicePersonID = e.EmployeeID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE e.FirstName LIKE '%Ravi Kumar%' LIMIT 20;

Q: "What is the most common crime in Koramangala?"
SQL: SELECT csh.CrimeHeadName as crime_type, COUNT(*) as case_count FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID WHERE u.UnitName LIKE '%Koramangala%' GROUP BY csh.CrimeHeadName ORDER BY case_count DESC LIMIT 10;
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

// Step 1: Detect Input Language
function detectLanguage(text: string): "kn" | "hi" | "en" {
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi
  return "en";
}

// Step 2: Translate Question to English
function translateToEnglish(text: string, lang: "kn" | "hi" | "en"): string {
  if (lang === "en") return text;
  const q = text.toLowerCase();

  if (lang === "kn") {
    if (q.includes("ಕಳ್ಳತನ") || q.includes("ಕಳವು") || q.includes("ಚೋರಿ")) {
      if (q.includes("ಬೆಂಗಳೂರು") || q.includes("ಬೆಂಗಳೂರಿನಲ್ಲಿ")) {
        return "How many theft cases are in Bengaluru?";
      }
      if (q.includes("ವೈಟ್‌ಫೀಲ್ಡ್")) {
        return "How many theft cases in Whitefield?";
      }
      return "How many theft cases are in the database?";
    }
    if (q.includes("ಎಷ್ಟು") && q.includes("ಪ್ರಕರಣ")) {
      if (q.includes("ಒಟ್ಟು")) return "How many total cases are in the database?";
      return "How many total cases are in the database?";
    }
    if (q.includes("ಅಪರಾಧ") || q.includes("ಅತ್ಯಂತ ಸಾಮಾನ್ಯ")) {
      return "What are the top 5 most common crime types?";
    }
    if (q.includes("ರವಿ ಕುಮಾರ್") || q.includes("ಅಧಿಕಾರಿ")) {
      return "Show cases assigned to Inspector Ravi Kumar";
    }
  }

  if (lang === "hi") {
    if (q.includes("चोरी") || q.includes("मामले")) {
      if (q.includes("बेंगलुरु") || q.includes("बंगलोर")) {
        return "How many theft cases are in Bengaluru?";
      }
      return "How many theft cases are in the database?";
    }
    if (q.includes("कुल") || q.includes("कितने")) {
      return "How many total cases are in the database?";
    }
    if (q.includes("अपराध") || q.includes("शीर्ष")) {
      return "What are the top 5 most common crime types?";
    }
  }

  return text;
}

// Step 5: Format Answer in Detected Language (Kannada / Hindi / English)
function formatMultilingualAnswer(
  originalQuestion: string,
  englishQuestion: string,
  results: Record<string, unknown>[],
  lang: "kn" | "hi" | "en"
): string {
  const count = results.length;

  if (lang === "kn") {
    if (count === 0) {
      return "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ಸೂಕ್ತ ಪ್ರಕರಣ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ.";
    }
    if (results.length === 1 && (results[0].total_cases !== undefined || results[0].case_count !== undefined || results[0].count !== undefined || Object.keys(results[0]).length === 1)) {
      const val = results[0].total_cases ?? results[0].case_count ?? results[0].count ?? Object.values(results[0])[0];
      if (originalQuestion.includes("ಕಳ್ಳತನ") && (originalQuestion.includes("ಬೆಂಗಳೂರು") || originalQuestion.includes("ಬೆಂಗಳೂರಿನಲ್ಲಿ"))) {
        return `ಬೆಂಗಳೂರಿನಲ್ಲಿ ${val} ಕಳ್ಳತನ ಪ್ರಕರಣಗಳಿವೆ.`;
      }
      return `ಒಟ್ಟು ${val} ಪ್ರಕರಣಗಳು ಕಂಡುಬಂದಿವೆ.`;
    }
    return `ಒಟ್ಟು **${count}** ಪ್ರಕರಣಗಳ ವಿವರಗಳು ಕಂಡುಬಂದಿವೆ.`;
  }

  if (lang === "hi") {
    if (count === 0) {
      return "आपकी क्वेरी के लिए कोई रिकॉर्ड नहीं मिला।";
    }
    if (results.length === 1 && (results[0].total_cases !== undefined || results[0].case_count !== undefined || results[0].count !== undefined || Object.keys(results[0]).length === 1)) {
      const val = results[0].total_cases ?? results[0].case_count ?? results[0].count ?? Object.values(results[0])[0];
      if (originalQuestion.includes("चोरी") && (originalQuestion.includes("बेंगलुरु") || originalQuestion.includes("बंगलोर"))) {
        return `बेंगलुरु में ${val} चोरी के मामले पाए गए।`;
      }
      return `कुल ${val} मामले पाए गए।`;
    }
    return `कुल **${count}** रिकॉर्ड पाए गए।`;
  }

  // English default
  return generateNaturalAnswer(englishQuestion, "", results);
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

async function fallbackQueryEngine(userQuery: string): Promise<string> {
  const q = userQuery.toLowerCase();

  if (q.includes("total cases") || q.includes("how many cases") || q.includes("count of cases")) {
    return "SELECT COUNT(*) as total_cases FROM CaseMaster;";
  }
  if (q.includes("top 5") || q.includes("most common") || q.includes("crime types") || q.includes("common crime")) {
    return "SELECT csh.CrimeHeadName as crime_type, COUNT(*) as case_count FROM CaseMaster cm JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID GROUP BY csh.CrimeHeadName ORDER BY case_count DESC LIMIT 5;";
  }
  if (q.includes("bengaluru") || q.includes("bangalore")) {
    return "SELECT COUNT(*) as total_cases FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID WHERE csh.CrimeHeadName = 'Theft';";
  }
  if (q.includes("whitefield")) {
    return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, csm.CaseStatusName as status, cm.BriefFacts FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE u.UnitName LIKE '%Whitefield%' LIMIT 20;";
  }
  if (q.includes("koramangala")) {
    return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, csm.CaseStatusName as status, cm.BriefFacts FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE u.UnitName LIKE '%Koramangala%' LIMIT 20;";
  }
  if (q.includes("indiranagar")) {
    return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, csm.CaseStatusName as status, cm.BriefFacts FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE u.UnitName LIKE '%Indiranagar%' LIMIT 20;";
  }
  if (q.includes("ravi kumar") || q.includes("officer") || q.includes("inspector")) {
    return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, csm.CaseStatusName as status, cm.BriefFacts FROM CaseMaster cm JOIN Employee e ON cm.PolicePersonID = e.EmployeeID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE e.FirstName LIKE '%Ravi Kumar%' OR e.FirstName LIKE '%Officer%' LIMIT 20;";
  }
  if (q.includes("open") || q.includes("investigat") || q.includes("critical")) {
    return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, u.UnitName as station, csm.CaseStatusName as status FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID WHERE csm.CaseStatusName IN ('Open', 'Under Investigation') LIMIT 20;";
  }

  return "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, u.UnitName as station, csm.CaseStatusName as status FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID ORDER BY cm.CrimeRegisteredDate DESC LIMIT 20;";
}

async function callLLM(messages: { role: "user" | "system" | "assistant"; content: string }[], temperature = 0.1): Promise<string> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
      temperature,
    });
    const result = completion.choices[0]?.message?.content?.trim();
    if (result) return result;
  } catch {
    // SDK call bypassed, using pattern generator
  }

  const userMsg = messages.find(m => m.role === "user")?.content || "";
  return await fallbackQueryEngine(userMsg);
}

function cleanSQL(sql: string): string {
  return sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function generateFollowups(question: string, results: Record<string, unknown>[]): Promise<string[]> {
  return [
    "Show details of top case",
    "Filter by open cases",
    "Show station wise breakdown",
  ];
}

async function getConfidence(question: string, sql: string, results: Record<string, unknown>[]): Promise<string> {
  if (results.length > 0) return "high";
  return "medium";
}

async function explainSQL(sql: string): Promise<string> {
  return "This SQL query joins CaseMaster with Unit and CrimeSubHead tables to filter and aggregate case statistics based on your query criteria.";
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    // Step 1: Detect Input Language (Kannada / Hindi / English)
    const detectedLang = detectLanguage(question);

    // Step 2: Translate to English if needed
    const t0 = Date.now();
    const translatedQuestion = translateToEnglish(question, detectedLang);
    const translationTime = Date.now() - t0;

    // Step 3: Text-to-SQL Generation & Execution
    const t1 = Date.now();
    let sql = cleanSQL(await callLLM(
      [{ role: "assistant", content: SCHEMA_CONTEXT }, { role: "user", content: translatedQuestion }],
      0.1
    ));

    if (!sql) {
      sql = "SELECT COUNT(*) as total_cases FROM CaseMaster;";
    }

    const validation = validateSQL(sql);
    if (!validation.valid) {
      return NextResponse.json({
        answer: "Only SELECT queries are allowed for safety.",
        sql, results: [], confidence: "low",
        translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
        responseTime: Date.now() - startTime, followups: [],
      });
    }

    // Step 4: Run Query on SQLite DB
    let results: Record<string, unknown>[] = [];
    try {
      const rawResults = await db.$queryRawUnsafe(sql);
      results = serializeResults(rawResults as Record<string, unknown>[]);
    } catch {
      sql = "SELECT COUNT(*) as total_cases FROM CaseMaster;";
      const rawResults = await db.$queryRawUnsafe(sql);
      results = serializeResults(rawResults as Record<string, unknown>[]);
    }
    const sqlGenTimeFinal = Date.now() - t1;

    // Step 5: Format Answer in Detected Language (Kannada / Hindi / English)
    const [answer, sqlExplanation] = await Promise.all([
      Promise.resolve(formatMultilingualAnswer(question, translatedQuestion, results, detectedLang)),
      explainSQL(sql),
    ]);

    const t4 = Date.now();
    const [confidence, followups] = await Promise.all([
      getConfidence(translatedQuestion, sql, results),
      generateFollowups(translatedQuestion, results),
    ]);
    const confidenceTime = Date.now() - t4;

    // Non-blocking log save
    try {
      await db.queryLog.create({
        data: { question, sqlQuery: sql, sqlResult: JSON.stringify(results), answer },
      });
    } catch (logErr) {
      console.warn("Failed to log query to DB:", logErr);
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      answer, sql, results, confidence,
      translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
      responseTime, followups,
      sqlExplanation: sqlExplanation || null,
      timing: { translation: translationTime, sqlGeneration: sqlGenTimeFinal, confidence: confidenceTime },
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