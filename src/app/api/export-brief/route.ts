import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

const NAVY = "#1a237e";
const GOLD = "#f59e0b";
const DARK = "#1e1e2e";
const GRAY = "#666666";
const LIGHT_BG = "#f5f5ff";
const WHITE = "#ffffff";

interface BriefMessage {
  role: string;
  content: string;
  sql?: string | null;
  results?: Record<string, unknown>[];
  confidence?: string;
  responseTime?: number;
  insight?: string | null;
  tableSummary?: string | null;
  comparison?: {
    entityA: string;
    entityB: string;
    resultsA: Record<string, unknown>[];
    resultsB: Record<string, unknown>[];
    summary: string;
  } | null;
}

function safeStr(val: unknown, maxLen = 50): string {
  const s = String(val ?? "\u2014");
  return s.length > maxLen ? s.slice(0, maxLen) + "\u2026" : s;
}

function drawTable(doc: PDFKit.PDFDocument, results: Record<string, unknown>[], y: number, maxRows = 25): number {
  if (!results || results.length === 0) return y;
  if (y > 500) { doc.addPage(); y = 40; }

  const cols = Object.keys(results[0]);
  const displayRows = results.slice(0, maxRows);
  const colW = (doc.page.width - 80) / cols.length;

  doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold")
    .text(`Results (${results.length} rows)`, 40, y);
  y += 12;

  doc.rect(40, y, doc.page.width - 80, 18).fill(NAVY);
  cols.forEach((col: string, i: number) => {
    doc.fontSize(7).fillColor(WHITE).font("Helvetica-Bold")
      .text(col.replace(/([A-Z])/g, " $1").trim(), 44 + i * colW, y + 4, { width: colW - 8, ellipsis: true });
  });
  y += 18;

  displayRows.forEach((row: Record<string, unknown>, ri: number) => {
    if (y > 740) { doc.addPage(); y = 40; }
    if (ri % 2 === 0) doc.rect(40, y, doc.page.width - 80, 15).fill("#f9f9ff");
    doc.moveTo(40, y + 15).lineTo(doc.page.width - 40, y + 15).lineWidth(0.5).strokeColor("#e0e0e0").stroke();
    cols.forEach((col: string, ci: number) => {
      doc.fontSize(7).fillColor("#333").font("Helvetica")
        .text(safeStr(row[col]), 44 + ci * colW, y + 3, { width: colW - 8, ellipsis: true });
    });
    y += 15;
  });

  if (results.length > maxRows) {
    y += 4;
    doc.fontSize(7).fillColor("#888").text(`Showing ${maxRows} of ${results.length} rows`, 40, y);
    y += 12;
  }
  return y + 4;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, title } = body as { messages: BriefMessage[]; title?: string };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages to export" }, { status: 400 });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40, info: {
      Title: "KSP Crime Intelligence Briefing",
      Author: "KSP Datathon 2026",
      Subject: title || "Crime Data Analysis Briefing",
    }});

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    // ═══ COVER PAGE ═══
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
    doc.rect(0, doc.page.height * 0.4, doc.page.width, 3).fill(GOLD);

    doc.fontSize(28).fillColor(WHITE).font("Helvetica-Bold")
      .text("KSP Crime Intelligence", 40, doc.page.height * 0.25, { align: "center", width: doc.page.width - 80 });
    doc.fontSize(16).fillColor("rgba(255,255,255,0.85)").font("Helvetica")
      .text("Intelligence Briefing Report", 40, doc.page.height * 0.32, { align: "center", width: doc.page.width - 80 });

    doc.fontSize(11).fillColor("rgba(255,255,255,0.7)").font("Helvetica")
      .text("Karnataka State Police \u2014 Datathon 2026", 40, doc.page.height * 0.48, { align: "center", width: doc.page.width - 80 });
    doc.fontSize(10).fillColor("rgba(255,255,255,0.5)")
      .text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })}`, 40, doc.page.height * 0.52, { align: "center", width: doc.page.width - 80 });

    doc.fontSize(10).fillColor("rgba(255,255,255,0.6)")
      .text(`${messages.filter(m => m.role === "user").length} Queries Analyzed`, 40, doc.page.height * 0.60, { align: "center", width: doc.page.width - 80 });

    // ═══ TABLE OF CONTENTS ═══
    doc.addPage();
    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text("Table of Contents", 40, 40);
    doc.moveTo(40, 62).lineTo(200, 62).lineWidth(2).strokeColor(GOLD).stroke();
    let tocY = 80;

    const userMsgs = messages.filter(m => m.role === "user");
    userMsgs.forEach((msg, i) => {
      doc.fontSize(10).fillColor("#333").font("Helvetica")
        .text(`${i + 1}. ${safeStr(msg.content, 80)}`, 50, tocY, { width: doc.page.width - 120 });
      tocY += 20;
    });

    // ═══ EXECUTIVE SUMMARY ═══
    doc.addPage();
    let y = 40;
    doc.fontSize(18).fillColor(NAVY).font("Helvetica-Bold").text("Executive Summary", 40, y);
    doc.moveTo(40, y + 22).lineTo(220, y + 22).lineWidth(2).strokeColor(GOLD).stroke();
    y += 35;

    const allInsights = messages.filter(m => m.insight).map(m => m.insight).filter(Boolean);
    if (allInsights.length > 0) {
      doc.fontSize(9).fillColor("#444").font("Helvetica-Bold").text("Key Findings:", 40, y);
      y += 16;
      allInsights.forEach((insight) => {
        const h = doc.heightOfString(String(insight), { width: doc.page.width - 100, fontSize: 9 });
        if (y + h > 720) { doc.addPage(); y = 40; }
        doc.roundedRect(44, y, doc.page.width - 88, h + 14, 4).fill("#fffbeb");
        doc.fontSize(9).fillColor("#333").font("Helvetica")
          .text(`\u2726 ${String(insight)}`, 52, y + 7, { width: doc.page.width - 116 });
        y += h + 22;
      });
    } else {
      doc.fontSize(10).fillColor(GRAY).font("Helvetica")
        .text("No AI-generated insights available for this session.", 40, y);
      y += 20;
    }

    // ═══ QUERY SECTIONS ═══
    let queryIdx = 0;
    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.content) continue;
      queryIdx++;
      const userMsg = messages[messages.indexOf(msg) - 1];
      const question = userMsg?.role === "user" ? userMsg.content : "Unknown query";

      doc.addPage();
      y = 40;

      // Section header
      doc.rect(40, y, doc.page.width - 80, 30).fill(NAVY);
      doc.fontSize(12).fillColor(WHITE).font("Helvetica-Bold")
        .text(`Query ${queryIdx}`, 50, y + 8);
      y += 40;

      // Question
      const qH = doc.heightOfString(question, { width: doc.page.width - 100, fontSize: 11 }) + 20;
      doc.roundedRect(40, y, doc.page.width - 80, qH, 4).fill(LIGHT_BG);
      doc.rect(40, y, 4, qH).fill(GOLD);
      doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold").text("QUERY", 52, y + 4);
      doc.fontSize(11).fillColor("#1a1a2e").font("Helvetica")
        .text(question, 52, y + 16, { width: doc.page.width - 120 });
      y += qH + 12;

      // Answer
      const cleanAnswer = msg.content.replace(/\*\*/g, "");
      const aH = doc.heightOfString(cleanAnswer, { width: doc.page.width - 100, fontSize: 10 }) + 14;
      doc.roundedRect(40, y, doc.page.width - 80, aH, 4).fill("#f8f8f8");
      doc.fontSize(10).fillColor("#333").font("Helvetica")
        .text(cleanAnswer, 48, y + 7, { width: doc.page.width - 116 });
      y += aH + 8;

      // Confidence & timing
      if (msg.confidence || msg.responseTime) {
        const color = msg.confidence === "high" ? "#2e7d32" : msg.confidence === "medium" ? "#f57f17" : "#c62828";
        let meta = msg.confidence ? `Confidence: ${msg.confidence?.toUpperCase()}` : "";
        if (msg.responseTime) meta += `  |  Response: ${(msg.responseTime / 1000).toFixed(1)}s`;
        doc.fontSize(8).fillColor(color).font("Helvetica-Bold").text(meta, 48, y);
        y += 16;
      }

      // Table Summary
      if (msg.tableSummary) {
        const tsH = doc.heightOfString(msg.tableSummary, { width: doc.page.width - 110, fontSize: 10 }) + 18;
        doc.roundedRect(40, y, doc.page.width - 80, tsH, 4).fill("#f0f4ff");
        doc.fontSize(8).fillColor(NAVY).font("Helvetica-Bold").text("DATA SUMMARY", 52, y + 4);
        doc.fontSize(9).fillColor("#444").font("Helvetica")
          .text(msg.tableSummary, 52, y + 16, { width: doc.page.width - 120 });
        y += tsH + 10;
      }

      // Insight
      if (msg.insight) {
        const iH = doc.heightOfString(msg.insight, { width: doc.page.width - 110, fontSize: 10 }) + 22;
        doc.roundedRect(40, y, doc.page.width - 80, iH, 6)
          .lineWidth(1).strokeColor("rgba(245,158,11,0.3)").stroke().fill("#fffbeb");
        doc.fontSize(8).fillColor(GOLD).font("Helvetica-Bold").text("AI INSIGHT", 52, y + 8);
        doc.fontSize(9).fillColor("#444").font("Helvetica")
          .text(msg.insight, 52, y + 20, { width: doc.page.width - 120 });
        y += iH + 12;
      }

      // SQL
      if (msg.sql) {
        if (y > 550) { doc.addPage(); y = 40; }
        doc.fontSize(8).fillColor(GRAY).font("Helvetica-Bold").text("GENERATED SQL", 40, y);
        y += 12;
        const sH = doc.heightOfString(msg.sql, { width: doc.page.width - 96, fontSize: 8 }) + 12;
        doc.roundedRect(40, y, doc.page.width - 80, sH, 4).fill(DARK);
        doc.fontSize(8).fillColor("#cdd6f4").font("Courier")
          .text(msg.sql, 48, y + 6, { width: doc.page.width - 96 });
        y += sH + 12;
      }

      // Results table
      if (msg.results && msg.results.length > 0) {
        y = drawTable(doc, msg.results, y);
      }

      // Comparison data
      if (msg.comparison) {
        const comp = msg.comparison;
        if (y > 400) { doc.addPage(); y = 40; }

        doc.fontSize(10).fillColor(NAVY).font("Helvetica-Bold")
          .text(`Comparison: ${comp.entityA} vs ${comp.entityB}`, 40, y);
        y += 14;

        if (comp.summary) {
          const csH = doc.heightOfString(comp.summary, { width: doc.page.width - 110, fontSize: 9 }) + 14;
          doc.roundedRect(40, y, doc.page.width - 80, csH, 4).fill("#fffbeb");
          doc.fontSize(9).fillColor("#333").font("Helvetica")
            .text(comp.summary, 48, y + 7, { width: doc.page.width - 116 });
          y += csH + 10;
        }

        if (comp.resultsA && comp.resultsA.length > 0) {
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text(`${comp.entityA}:`, 40, y);
          y += 14;
          y = drawTable(doc, comp.resultsA, y, 15);
        }
        if (comp.resultsB && comp.resultsB.length > 0) {
          doc.fontSize(9).fillColor(NAVY).font("Helvetica-Bold").text(`${comp.entityB}:`, 40, y);
          y += 14;
          y = drawTable(doc, comp.resultsB, y, 15);
        }
      }
    }

    // ═══ FOOTER (on every page) ═══
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      if (i === 0) continue; // Skip cover
      const footerY = doc.page.height - 35;
      doc.moveTo(40, footerY - 6).lineTo(doc.page.width - 40, footerY - 6).lineWidth(0.5).strokeColor("#ddd").stroke();
      doc.fontSize(7).fillColor("#aaa").font("Helvetica")
        .text(`KSP Crime Intelligence \u2014 Page ${i + 1} of ${range.count}`, 40, footerY, {
          align: "center", width: doc.page.width - 80,
        });
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ksp-briefing-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Export brief error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}