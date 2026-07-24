export class CatalystSmartBrowzService {
  /**
   * Catalyst SmartBrowz PDF Generation Service
   */
  static async generateReportPDF(reportData: {
    question: string;
    answer: string;
    sql?: string | null;
    results?: Record<string, unknown>[];
    summary?: any;
  }): Promise<string> {
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const resultsCount = reportData.results ? reportData.results.length : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KSP Crime Intelligence Report</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; padding: 40px; }
  .header { border-bottom: 3px solid #f59e0b; padding-bottom: 16px; margin-bottom: 24px; }
  .title { font-size: 24px; font-weight: 800; color: #1e3a8a; }
  .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
  .box { background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 13px; }
  .sql-box { background: #0f172a; color: #f59e0b; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 11px; overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
  th { background: #1e3a8a; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="badge">ZOHO CATALYST SMARTBROWZ REPORT</div>
    <div class="title">Karnataka State Police — Crime Intelligence Briefing</div>
    <div class="subtitle">Generated on ${timestamp} IST | Ref: KSP-FIR-INTEL</div>
  </div>

  <div class="box">
    <strong>Query:</strong> ${reportData.question}
  </div>

  <div class="box" style="border-left-color: #3b82f6;">
    <strong>Executive Summary:</strong><br/>
    ${(reportData.answer || "").replace(/\*\*/g, "")}
  </div>

  ${
    reportData.sql
      ? `<div>
    <strong>Generated SQL Query:</strong>
    <div class="sql-box">${reportData.sql.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>`
      : ""
  }

  ${
    reportData.results && reportData.results.length > 0
      ? `<div>
    <strong style="margin-top: 20px; display: block;">Retrieved Database Records (${resultsCount} rows):</strong>
    <table>
      <thead>
        <tr>${Object.keys(reportData.results[0]).map((k) => `<th>${k}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${reportData.results
          .slice(0, 30)
          .map(
            (r) =>
              `<tr>${Object.values(r)
                .map((v) => `<td>${v ?? "—"}</td>`)
                .join("")}</tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>`
      : ""
  }

  <div class="footer">
    Karnataka State Police Datathon 2026 • Catalyst SmartBrowz PDF Service • Confidential Police Record
  </div>
</body>
</html>`;
  }
}
