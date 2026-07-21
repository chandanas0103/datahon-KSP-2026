import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, sql, results, confidence, responseTime } = body;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KSP Crime Intelligence Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; background: #fff; }
  .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 32px 40px; }
  .header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .header p { font-size: 12px; opacity: 0.8; }
  .header .badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 3px 10px; border-radius: 12px; font-size: 11px; margin-top: 8px; }
  .body { padding: 32px 40px; max-width: 800px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #1a237e; display: inline-block; }
  .question-box { background: #f5f5ff; border-left: 4px solid #1a237e; padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.6; }
  .answer-box { background: #f8f8f8; padding: 14px 18px; border-radius: 8px; font-size: 13px; line-height: 1.7; }
  .sql-box { background: #1e1e2e; color: #cdd6f4; padding: 14px 18px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1a237e; color: white; padding: 10px 14px; text-align: left; font-weight: 600; }
  td { padding: 8px 14px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f9f9ff; }
  .meta { display: flex; gap: 24px; font-size: 11px; color: #888; margin-top: 4px; }
  .meta span { display: flex; align-items: center; gap: 4px; }
  .confidence-high { color: #2e7d32; font-weight: 600; }
  .confidence-medium { color: #f57f17; font-weight: 600; }
  .confidence-low { color: #c62828; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #aaa; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>KSP Crime Intelligence Report</h1>
    <p>Karnataka State Police — Datathon 2026</p>
    <div class="badge">Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">Query</div>
      <div class="question-box">${question || "N/A"}</div>
    </div>
    <div class="section">
      <div class="section-title">Answer</div>
      <div class="answer-box">${(answer || "N/A").replace(/\*\*/g, "")}</div>
      <div class="meta">
        ${confidence ? `<span>Confidence: <span class="confidence-${confidence}">${confidence.toUpperCase()}</span></span>` : ""}
        ${responseTime ? `<span>Response Time: ${(responseTime / 1000).toFixed(1)}s</span>` : ""}
      </div>
    </div>
    ${sql ? `
    <div class="section">
      <div class="section-title">Generated SQL</div>
      <div class="sql-box">${sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>` : ""}
    ${results && results.length > 0 ? `
    <div class="section">
      <div class="section-title">Query Results (${results.length} rows)</div>
      <table>
        <thead><tr>${Object.keys(results[0]).map(k => `<th>${k.replace(/([A-Z])/g, " $1").trim()}</th>`).join("")}</tr></thead>
        <tbody>${results.slice(0, 50).map(row => `<tr>${Object.values(row).map(v => `<td>${v ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      ${results.length > 50 ? `<p style="font-size:11px;color:#888;margin-top:8px;">Showing 50 of ${results.length} rows</p>` : ""}
    </div>` : ""}
  </div>
  <div class="footer">KSP Crime Intelligence — Karnataka State Police Datathon 2026 — Auto-generated report</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="ksp-report-${new Date().toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error("Export PDF error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}