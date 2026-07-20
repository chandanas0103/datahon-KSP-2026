import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, sql, results, confidence, responseTime } = body;

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const confidenceLabel =
      confidence === "high" ? "HIGH" : confidence === "medium" ? "MEDIUM" : "LOW";
    const confidenceColor =
      confidence === "high" ? "#16a34a" : confidence === "medium" ? "#d97706" : "#dc2626";

    const tableRows =
      results && results.length > 0
        ? (() => {
            const cols = Object.keys(results[0]);
            const headerCells = cols
              .map(
                (c) =>
                  `<th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;border-bottom:2px solid #1e3a5f;background:#f0f4f8;color:#1e3a5f;">${c.replace(/([A-Z])/g, " $1").trim()}</th>`
              )
              .join("");
            const dataRows = results
              .slice(0, 50)
              .map(
                (row: Record<string, unknown>, i: number) => {
                  const cells = cols
                    .map(
                      (c) =>
                        `<td style="padding:6px 12px;font-size:11px;border-bottom:1px solid #e2e8f0;color:#334155;">${String(row[c] ?? "—")}</td>`
                    )
                    .join("");
                  return `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">${cells}</tr>`;
                }
              )
              .join("");
            const footer =
              results.length > 50
                ? `<tr><td colspan="${cols.length}" style="padding:8px 12px;font-size:11px;color:#64748b;text-align:center;">Showing 50 of ${results.length} rows</td></tr>`
                : "";
            return `
              <div style="margin-top:20px;overflow:hidden;border:1px solid #e2e8f0;border-radius:8px;">
                <table style="width:100%;border-collapse:collapse;"><thead><tr>${headerCells}</tr></thead><tbody>${dataRows}${footer}</tbody></table>
              </div>`;
          })()
        : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KSP Crime Intelligence - Query Report</title>
  <style>
    @page { margin: 15mm; size: A4; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.5; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <div style="width:40px;height:40px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">K</div>
        <div>
          <h1 style="font-size:20px;font-weight:700;color:#1e3a5f;margin:0;">KSP Crime Intelligence</h1>
          <p style="font-size:11px;color:#64748b;margin:0;">Conversational AI for Crime Database</p>
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <p style="font-size:11px;color:#64748b;margin:0;">Report generated: ${dateStr}</p>
      <p style="font-size:11px;color:#64748b;margin:0;">Response time: ${responseTime ? (responseTime / 1000).toFixed(1) + "s" : "N/A"}</p>
    </div>
  </div>
  <div style="background:#f0f4f8;border-radius:8px;padding:16px;margin-bottom:20px;border-left:4px solid #1e3a5f;">
    <p style="font-size:11px;color:#64748b;margin:0 0 4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Query</p>
    <p style="font-size:14px;font-weight:500;margin:0;color:#1e293b;">${question.replace(/</g, "&lt;")}</p>
  </div>
  <div style="margin-bottom:20px;">
    <p style="font-size:11px;color:#64748b;margin:0 0 8px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">AI Response</p>
    <p style="font-size:13px;margin:0;color:#334155;">${answer.replace(/\*\*/g, "").replace(/\n/g, "<br>")}</p>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
      <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${confidenceColor}15;color:${confidenceColor};border:1px solid ${confidenceColor}30;">Confidence: ${confidenceLabel}</span>
    </div>
  </div>
  ${sql ? `
  <div style="margin-bottom:20px;">
    <p style="font-size:11px;color:#64748b;margin:0 0 8px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Generated SQL</p>
    <pre style="background:#1e293b;color:#e2e8f0;padding:14px;border-radius:8px;font-size:11px;font-family:'Courier New',monospace;overflow-x:auto;white-space:pre-wrap;word-break:break-all;line-height:1.6;">${sql.replace(/</g, "&lt;")}</pre>
  </div>` : ""}
  ${tableRows}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
    <p style="font-size:10px;color:#94a3b8;margin:0;">KSP Datathon 2026 — Challenge 1: Conversational AI for Crime Database</p>
    <p style="font-size:10px;color:#94a3b8;margin:0;">Generated by KSP Crime Intelligence System</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition":
          "attachment; filename=ksp-crime-report-" +
          now.toISOString().slice(0, 10) +
          ".html",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
