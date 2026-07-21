import re

with open('/home/z/my-project/src/app/api/chat/route.ts', 'r') as f:
    content = f.read()

# === EDIT 1: Add new prompts after INSIGHT_PROMPT ===
ins = """const TABLE_SUMMARY_PROMPT = `You are a crime data analyst. Summarize these query results in 2 concise sentences. Mention the total count, the top entries with numbers, and any notable patterns. Be specific with numbers, not vague.

Results: `;

const COMPARISON_SQL_PROMPT = `You are a SQL expert for Karnataka State Police crime database.

"""

ins2 = """const COMPARISON_SUMMARY_PROMPT = `You are a senior crime analyst for Karnataka State Police. Compare these two query result sets and provide a 2-3 sentence comparison summary. Highlight key differences, mention specific numbers and percentages, and suggest actionable insights. Be precise.

"""

# Insert before function serializeResults
anchor = 'function serializeResults('
if anchor in content and 'TABLE_SUMMARY_PROMPT' not in content:
    content = content.replace(anchor, ins + '\n' + ins2 + '\nfunction serializeResults(')

# === EDIT 2: Add QueryCache class and detectComparison after cleanSQL ===
class_code = '''

// ── Query Cache (in-memory LRU) ──
class QueryCache {
  private cache = new Map<string, { data: Record<string, unknown>; ts: number }>();
  private maxSize = 100;
  private ttl = 5 * 60 * 1000;

  private key(q: string): string {
    let h = 0;
    const s = q.toLowerCase().trim();
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return String(h);
  }

  get(q: string): Record<string, unknown> | null {
    const entry = this.cache.get(this.key(q));
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) { this.cache.delete(this.key(q)); return null; }
    return entry.data;
  }

  set(q: string, data: Record<string, unknown>): void {
    const k = this.key(q);
    if (this.cache.size >= this.maxSize) { const first = this.cache.keys().next().value; if (first) this.cache.delete(first as string); }
    this.cache.set(k, { data, ts: Date.now() });
  }
}

const queryCache = new QueryCache();

// ── Comparison Detection ──
function detectComparison(question: string): { isComparison: boolean; entityA?: string; entityB?: string } {
  const patterns = [
    /compare\\s+(.+?)\\s+(?:vs|versus)\\.?\\s+(.+)/i,
    /difference\\s+between\\s+(.+?)\\s+and\\s+(.+)/i,
    /(.+?)\\s+(?:vs|versus)\\.?\\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = question.match(p);
    if (m) {
      const a = m[1].trim().replace(/^(show me|what is|how many|list|get|find)\\s*/i, '');
      const b = m[2].trim().replace(/[?!.]+$/, '');
      if (a.length > 1 && b.length > 1) return { isComparison: true, entityA: a, entityB: b };
    }
  }
  return { isComparison: false };
}
'''

anchor2 = 'async function generateFollowups('
if 'class QueryCache' not in content:
    content = content.replace(anchor2, class_code + '\nasync function generateFollowups(')

# === EDIT 3: Add new LLM functions before export POST ===
new_funcs = '''
async function generateComparisonSQL(question: string, entityA: string, entityB: string): Promise<string[]> {
  try {
    const response = await callLLM(
      [
        { role: "assistant", content: COMPARISON_SQL_PROMPT + question + `\nEntity A: ${entityA}\nEntity B: ${entityB}` },
        { role: "user", content: "Generate the two SQL queries as a JSON array." },
      ],
      0.1
    );
    const cleaned = response.replace(/```json?/gi, "").replace(/```/g, "").trim();
    const queries = JSON.parse(cleaned);
    if (Array.isArray(queries) && queries.length === 2 && typeof queries[0] === "string" && typeof queries[1] === "string") {
      return queries.map(cleanSQL);
    }
    return [];
  } catch { return []; }
}

async function generateComparisonSummary(question: string, entityA: string, entityB: string, resultsA: Record<string, unknown>[], resultsB: Record<string, unknown>[]): Promise<string> {
  try {
    return await callLLM(
      [
        { role: "assistant", content: COMPARISON_SUMMARY_PROMPT },
        { role: "user", content: `Question: ${question}\n\n${entityA} results (${resultsA.length} rows): ${JSON.stringify(resultsA.slice(0, 10))}\n\n${entityB} results (${resultsB.length} rows): ${JSON.stringify(resultsB.slice(0, 10))}` },
      ],
      0.4
    );
  } catch { return ""; }
}

async function generateTableSummary(question: string, results: Record<string, unknown>[]): Promise<string> {
  if (results.length <= 5) return "";
  try {
    return await callLLM(
      [
        { role: "assistant", content: TABLE_SUMMARY_PROMPT },
        { role: "user", content: `Question: ${question}\n\nResults (${results.length} rows): ${JSON.stringify(results.slice(0, 10))}` },
      ],
      0.3
    );
  } catch { return ""; }
}

'''

anchor3 = 'export async function POST(request: NextRequest)'
if 'generateComparisonSQL' not in content:
    content = content.replace(anchor3, new_funcs + 'export async function POST(request: NextRequest)')

# === EDIT 4: Add cache check after question validation ===
cache_check = '''    // ── Query Cache Check ──
    const cachedResult = queryCache.get(question);
    if (cachedResult) {
      return NextResponse.json({ ...cachedResult, cached: true, responseTime: Date.now() - startTime });
    }

'''
anchor4 = '    // ── SQL Playground mode'
if 'queryCache.get' not in content:
    content = content.replace(anchor4, cache_check + '    // ── SQL Playground mode')

# === EDIT 5: Add comparison detection after translation ===
comp_block = '''    const translationTime = Date.now() - t0;

    // ── Comparison Query Detection ──
    const comp = detectComparison(translatedQuestion);
    if (comp.isComparison && comp.entityA && comp.entityB) {
      const comparisonSqls = await generateComparisonSQL(translatedQuestion, comp.entityA, comp.entityB);
      if (comparisonSqls.length === 2) {
        const vA = validateSQL(comparisonSqls[0]);
        const vB = validateSQL(comparisonSqls[1]);
        if (vA.valid && vB.valid) {
          try {
            const [rawA, rawB] = await Promise.all([
              db.$queryRawUnsafe(comparisonSqls[0]),
              db.$queryRawUnsafe(comparisonSqls[1]),
            ]);
            const resultsA = serializeResults(rawA as Record<string, unknown>[]);
            const resultsB = serializeResults(rawB as Record<string, unknown>[]);
            const compSummary = await generateComparisonSummary(translatedQuestion, comp.entityA!, comp.entityB!, resultsA, resultsB);
            const compData = {
              entityA: comp.entityA,
              entityB: comp.entityB,
              resultsA,
              resultsB,
              sqlA: comparisonSqls[0],
              sqlB: comparisonSqls[1],
              summary: compSummary,
            };
            const compAnswer = `Here\u2019s a comparison between **${comp.entityA}** and **${comp.entityB}**.`;
            const compResponseData = {
              answer: compAnswer, sql: `${comparisonSqls[0]}\n--- vs ---\n${comparisonSqls[1]}`,
              results: resultsA, confidence: "high",
              translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
              responseTime: Date.now() - startTime, followups: [],
              sqlExplanation: null, insight: compSummary,
              tableSummary: null, comparison: compData, cached: false,
              timing: { translation: translationTime },
            };
            queryCache.set(question, compResponseData);
            await db.queryLog.create({ data: { question, sqlQuery: compResponseData.sql as string, sqlResult: JSON.stringify(resultsA), answer: compAnswer } });
            return NextResponse.json(compResponseData);
          } catch (err: unknown) {
            // Fall through to normal flow if comparison fails
            console.error("Comparison query failed, falling back to normal flow:", err);
          }
        }
      }
    }

    // Step 2: Generate SQL with self-healing retry'''

anchor5 = '    const translationTime = Date.now() - t0;\n\n    // Step 2: Generate SQL with self-healing retry'
if 'detectComparison' not in content.split('export async function POST')[1] if 'export async function POST' in content else '':
    pass

# Safer approach: find the exact anchor
old_step2 = '    const translationTime = Date.now() - t0;\n\n    // Step 2: Generate SQL with self-healing retry'
if old_step2 in content:
    content = content.replace(old_step2, comp_block)
else:
    # Try without the double newline
    old_step2b = 'const translationTime = Date.now() - t0;\n\n    // Step 2'
    if old_step2b in content:
        content = content.replace(old_step2b, comp_block)
    else:
        print("WARNING: Could not find Step 2 anchor for comparison insertion")
        # Find the line with translationTime
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'const translationTime = Date.now()' in line:
                print(f"Found translationTime at line {i+1}")
                # Find the next Step 2
                for j in range(i+1, min(i+5, len(lines))):
                    if 'Step 2' in lines[j]:
                        print(f"Found Step 2 at line {j+1}")
                        break

# === EDIT 6: Add tableSummary to parallel calls ===
old_parallel = '''    const [answer, sqlExplanation, insight] = await Promise.all([
      Promise.resolve(generateNaturalAnswer(translatedQuestion, sql, results)),
      explainSQL(sql),
      generateInsight(translatedQuestion, sql, results),
    ]);'''

new_parallel = '''    const [answer, sqlExplanation, insight, tableSummary] = await Promise.all([
      Promise.resolve(generateNaturalAnswer(translatedQuestion, sql, results)),
      explainSQL(sql),
      generateInsight(translatedQuestion, sql, results),
      generateTableSummary(translatedQuestion, results),
    ]);'''

if 'tableSummary' not in content.split('export async function POST')[1] if 'export async function POST' in content else '':
    if old_parallel in content:
        content = content.replace(old_parallel, new_parallel)
    else:
        print("WARNING: Could not find parallel Promise.all for tableSummary")

# === EDIT 7: Modify return to include new fields and cache ===
old_return = '''    return NextResponse.json({
      answer, sql, results, confidence,
      translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
      responseTime, followups,
      sqlExplanation: sqlExplanation || null,
      insight: insight || null,
      timing: { translation: translationTime, sqlGeneration: sqlGenTimeFinal, confidence: confidenceTime },
      ...(retryCount > 0 ? { selfHealed: true, retryCount } : {}),
    });'''

new_return = '''    const responseData = {
      answer, sql, results, confidence,
      translatedQuestion: translatedQuestion !== question ? translatedQuestion : null,
      responseTime, followups,
      sqlExplanation: sqlExplanation || null,
      insight: insight || null,
      tableSummary: tableSummary || null,
      comparison: null, cached: false,
      timing: { translation: translationTime, sqlGeneration: sqlGenTimeFinal, confidence: confidenceTime },
      ...(retryCount > 0 ? { selfHealed: true, retryCount } : {}),
    };
    queryCache.set(question, responseData);
    return NextResponse.json(responseData);'''

if 'queryCache.set(question, responseData)' not in content:
    if old_return in content:
        content = content.replace(old_return, new_return)
    else:
        print("WARNING: Could not find main return for caching")

# === EDIT 8: Update error returns to include new fields ===
# Empty SQL error
old_err1 = '''answer: "I couldn\u2019t generate a query for that question. Please try rephrasing it.",
        sql: null, results: [], confidence: "low", translatedQuestion,
        responseTime: Date.now() - startTime, followups: [],'''
new_err1 = '''answer: "I couldn\u2019t generate a query for that question. Please try rephrasing it.",
        sql: null, results: [], confidence: "low", translatedQuestion,
        responseTime: Date.now() - startTime, followups: [],
        tableSummary: null, comparison: null, cached: false,'''

if 'tableSummary: null, comparison: null, cached: false' not in content:
    content = content.replace(old_err1, new_err1)

# DB error return
old_err2 = '''translatedQuestion, responseTime: Date.now() - startTime, followups: [],
      });'''
# More specific anchor
old_err2b = 'translatedQuestion, responseTime: Date.now() - startTime, followups: [],\n      });'
if 'tableSummary: null' in content and old_err2b in content:
    # Find the specific occurrence that doesn't already have tableSummary
    parts = content.split(old_err2b)
    for i, part in enumerate(parts):
        if 'dbError' in part and 'tableSummary' not in part:
            parts[i] = part.replace(
                'translatedQuestion, responseTime: Date.now() - startTime, followups: [],\n      });',
                'translatedQuestion, responseTime: Date.now() - startTime, followups: [],\n        tableSummary: null, comparison: null, cached: false,\n      });'
            )
            break
    content = ''.join(parts)

# Internal error return
old_err3 = 'followups: [] },\n      { status: 500 }'
if 'tableSummary: null' not in old_err3.split('{ status: 500 }')[0] if '{ status: 500 }' in old_err3 else True:
    # Find the last error return (catch block)
    internal_err_pattern = "answer: `An internal error occurred"
    idx = content.find(internal_err_pattern)
    if idx > 0 and 'tableSummary: null' not in content[idx:idx+300]:
        content = content.replace(
            "answer: `An internal error occurred. Please try again.`, sql: null, results: [], error: \"Internal server error\", confidence: \"low\", responseTime: Date.now() - startTime, followups: [] }",
            "answer: `An internal error occurred. Please try again.`, sql: null, results: [], error: \"Internal server error\", confidence: \"low\", responseTime: Date.now() - startTime, followups: [], tableSummary: null, comparison: null, cached: false }"
        )

# === Also fix the comparison block's escaped unicode ===
content = content.replace('\\u2019s', "'s")

with open('/home/z/my-project/src/app/api/chat/route.ts', 'w') as f:
    f.write(content)

print("route.ts updated successfully")
