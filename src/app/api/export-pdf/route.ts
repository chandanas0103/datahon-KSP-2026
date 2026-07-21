import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

const NAVY = "#1a237e";
const GOLD = "#f59e0b";
const DARK = "#1e1e2e";
const GRAY = "#666666";
const LIGHT_BG = "#f5f5ff";
const WHITE = "#ffffff";

function safeStr(val: unknown, maxLen = 40): string {
  const s = String(val ?? "—");
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, sql, results, confidence, responseTime, insight } = body;

    const doc = new PDFDocument({ size: "A4", margin: 40, info: {
      Title: "KSP Crime Intelligence Report",
      Author: "KSP Datathon 2026",
      Subject: question || "Crime Data Query",
    }});

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 90).fill(NAVY);
    doc.fontSize(22).fillColor(WHITE).font("Helvetica-Bold")
      .text("KSP Crime Intelligence Report", 40, 25);
    doc.fontSize(10).fillColor("rgba(255,255,255,0.8)").font("Helvetica")
      .text("Karnataka State Police — Datathon 2026", 40, 52);
    doc.fontSize(9).fillColor("rgba(255,255,255,0.6)")
      .text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, 40, 70);

    let y = 110;

    // ── Query Section ──
    doc.rect(40, y, doc.page.width - 80, 0).fill(LIGHT_BG);
    doc.moveTo(40, y).lineTo(40, y).lineWidth(4).strokeColor(GOLD).stroke();
    const queryH = doc.heightOfString(question || "N/A", { width: doc.page.width - 110, fontSize: 11 }) + 24;
    doc.rect(44, y, 4, queryH - 16).fill(GOLD);
    doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold").text("QUERY", 56, y + 4);
    doc.fontSize(11).fillColor("#1a1a2e").font("Helvetica")
      .text(question || "N/A", 56, y + 16, { width: doc.page.width - 110 });
    y += queryH + 16;

    // ── Answer Section ──
    if (answer) {
      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold").text("ANSWER", 40, y);
      y += 12;
      const cleanAnswer = (answer as string).replace(/\*\*/g, "");
      const answerH = doc.heightOfString(cleanAnswer, { width: doc.page.width - 80, fontSize: 10 }) + 8;
      doc.roundedRect(40, y, doc.page.width - 80, answerH, 4).fill("#f8f8f8");
      doc.fontSize(10).fillColor("#333").font("Helvetica")
        .text(cleanAnswer, 48, y + 4, { width: doc.page.width - 96 });
      y += answerH + 4;
      // Meta badges
      if (confidence || responseTime) {
        let metaLine = "";
        if (confidence) {
          const color = confidence === "high" ? "#2e7d32" : confidence === "medium" ? "#f57f17" : "#c62828";
          metaLine += `Confidence: ${confidence.toUpperCase()}`;
        }
        if (responseTime) metaLine += `  |  Response: ${(responseTime / 1000).toFixed(1)}s`;
        doc.fontSize(8).fillColor("#888").text(metaLine, 48, y + 2);
        y += 16;
      }
    }

    // ── AI Insight ──
    if (insight) {
      y += 8;
      const insightH = doc.heightOfString(insight as string, { width: doc.page.width - 110, fontSize: 10 }) + 28;
      doc.roundedRect(40, y, doc.page.width - 80, insightH, 6)
        .lineWidth(1).strokeColor("rgba(245,158,11,0.3)").stroke().fill("#fffbeb");
      doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text("✦ AI INSIGHT", 52, y + 8);
      doc.fontSize(10).fillColor("#444").font("Helvetica")
        .text(insight as string, 52, y + 20, { width: doc.page.width - 120 });
      y += insightH + 12;
    }

    // ── SQL Section ──
    if (sql) {
      if (y > 600) { doc.addPage(); y = 40; }
      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold").text("GENERATED SQL", 40, y);
      y += 12;
      const sqlH = doc.heightOfString(sql as string, { width: doc.page.width - 96, fontSize: 9 }) + 12;
      doc.roundedRect(40, y, doc.page.width - 80, sqlH, 4).fill(DARK);
      doc.fontSize(9).fillColor("#cdd6f4").font("Courier")
        .text(sql as string, 48, y + 6, { width: doc.page.width - 96 });
      y += sqlH + 16;
    }

    // ── Results Table ──
    if (results && results.length > 0) {
      if (y > 500) { doc.addPage(); y = 40; }
      const cols = Object.keys(results[0]);
      const displayRows = results.slice(0, 30);
      const colW = (doc.page.width - 80) / cols.length;

      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold")
        .text(`QUERY RESULTS (${results.length} rows)`, 40, y);
      y += 12;

      // Header row
      doc.rect(40, y, doc.page.width - 80, 18).fill(NAVY);
      cols.forEach((col: string, i: number) => {
        doc.fontSize(8).fillColor(WHITE).font("Helvetica-Bold")
          .text(col.replace(/([A-Z])/g, " $1").trim(), 44 + i * colW, y + 4, { width: colW - 8, ellipsis: true });
      });
      y += 18;

      // Data rows
      displayRows.forEach((row: Record<string, unknown>, ri: number) => {
        if (y > 740) { doc.addPage(); y = 40; }
        if (ri % 2 === 0) doc.rect(40, y, doc.page.width - 80, 16).fill("#f9f9ff");
        doc.moveTo(40, y + 16).lineTo(doc.page.width - 40, y + 16).lineWidth(0.5).strokeColor("#e0e0e0").stroke();
        cols.forEach((col: string, ci: number) => {
          doc.fontSize(8).fillColor("#333").font("Helvetica")
            .text(safeStr(row[col]), 44 + ci * colW, y + 3, { width: colW - 8, ellipsis: true });
        });
        y += 16;
      });

      if (results.length > 30) {
        y += 4;
        doc.fontSize(8).fillColor("#888").text(`Showing 30 of ${results.length} rows`, 40, y);
        y += 14;
      }
    }

    // ── Footer ──
    const footerY = doc.page.height - 40;
    doc.moveTo(40, footerY - 8).lineTo(doc.page.width - 40, footerY - 8).lineWidth(0.5).strokeColor("#ddd").stroke();
    doc.fontSize(8).fillColor("#aaa").font("Helvetica")
      .text("KSP Crime Intelligence — Karnataka State Police Datathon 2026 — Auto-generated report", 40, footerY, {
        align: "center", width: doc.page.width - 80,
      });

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ksp-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Export PDF error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}