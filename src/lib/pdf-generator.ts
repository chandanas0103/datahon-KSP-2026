import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PdfReportData {
  question: string
  answer: string
  sql?: string | null
  results?: Record<string, unknown>[]
  confidence?: 'high' | 'medium' | 'low' | string
  responseTime?: number
  timestamp?: string
}

export function generateKspPdfReport(data: PdfReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const navyColor: [number, number, number] = [26, 35, 126]      // #1A237E
  const accentGold: [number, number, number] = [245, 158, 11]    // #F59E0B
  const darkCodeBg: [number, number, number] = [30, 30, 46]      // #1E1E2E
  const codeTextColor: [number, number, number] = [205, 214, 244] // #CDD6F4
  const lightCardBg: [number, number, number] = [245, 246, 250]   // #F5F6FA
  const borderGray: [number, number, number] = [220, 224, 230]

  // Helper for adding new page if content overflows
  const checkNewPage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      doc.addPage()
      y = margin + 10
      return true
    }
    return false
  }

  // 1. Header Banner
  doc.setFillColor(...navyColor)
  doc.rect(0, 0, pageWidth, 32, 'F')

  // KSP Gold Accent Bar
  doc.setFillColor(...accentGold)
  doc.rect(0, 32, pageWidth, 1.5, 'F')

  // Header Title Text
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('KARNATAKA STATE POLICE', margin, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(220, 225, 255)
  doc.text('Crime Database Intelligence System — Datathon 2026', margin, 19)

  // Timestamp on top-right
  const formattedDate = data.timestamp || new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  doc.setFontSize(8)
  doc.setTextColor(200, 210, 245)
  doc.text(`Generated: ${formattedDate}`, pageWidth - margin, 19, { align: 'right' })

  y = 40

  // 2. Metadata / Query Block
  checkNewPage(40)
  doc.setFillColor(...lightCardBg)
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F')

  // Left accent line
  doc.setFillColor(...navyColor)
  doc.rect(margin, y, 2.5, 34, 'F')

  // Query Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 110, 130)
  doc.text('USER QUERY', margin + 6, y + 7)

  // Query Text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(20, 25, 40)
  const wrappedQuestion = doc.splitTextToSize(data.question || 'N/A', contentWidth - 12)
  doc.text(wrappedQuestion.slice(0, 2), margin + 6, y + 13)

  // Metadata Row (Confidence & Response Time)
  const metaY = y + 27
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 95, 110)

  // Confidence Badge
  const conf = (data.confidence || 'medium').toLowerCase()
  let confColor: [number, number, number] = [237, 108, 2] // Amber
  if (conf === 'high') confColor = [46, 125, 50] // Green
  if (conf === 'low') confColor = [211, 47, 47] // Red

  doc.text('Confidence: ', margin + 6, metaY)
  const confLabelWidth = doc.getTextWidth('Confidence: ')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...confColor)
  doc.text(conf.toUpperCase(), margin + 6 + confLabelWidth, metaY)

  // Execution Time
  if (data.responseTime) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 95, 110)
    const timeStr = `Execution Time: ${(data.responseTime / 1000).toFixed(2)}s`
    doc.text(timeStr, margin + 70, metaY)
  }

  y += 40

  // 3. AI Analysis & Summary Section
  checkNewPage(30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...navyColor)
  doc.text('AI EXECUTIVE SUMMARY', margin, y)
  y += 2

  doc.setDrawColor(...borderGray)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + 45, y)
  y += 5

  // Clean Markdown formatting (strip **)
  const cleanAnswer = (data.answer || 'No summary available.').replace(/\*\*/g, '')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(40, 45, 55)

  const splitAnswer = doc.splitTextToSize(cleanAnswer, contentWidth)
  for (const line of splitAnswer) {
    if (checkNewPage(6)) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(40, 45, 55)
    }
    doc.text(line, margin, y)
    y += 5
  }

  y += 4

  // 4. Generated SQL Section
  if (data.sql && data.sql.trim()) {
    checkNewPage(35)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...navyColor)
    doc.text('GENERATED SQL QUERY', margin, y)
    y += 2

    doc.line(margin, y, margin + 45, y)
    y += 5

    // Measure SQL box size
    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    const splitSql = doc.splitTextToSize(data.sql.trim(), contentWidth - 8)
    const sqlBoxHeight = Math.min(splitSql.length * 4.5 + 6, 60)

    checkNewPage(sqlBoxHeight + 5)
    doc.setFillColor(...darkCodeBg)
    doc.roundedRect(margin, y, contentWidth, sqlBoxHeight, 2, 2, 'F')

    doc.setTextColor(...codeTextColor)
    let sqlY = y + 5
    for (let i = 0; i < splitSql.length; i++) {
      if (sqlY + 4.5 > y + sqlBoxHeight - 2) break
      doc.text(splitSql[i], margin + 4, sqlY)
      sqlY += 4.5
    }

    y += sqlBoxHeight + 8
  }

  // 5. Results Table Section
  if (data.results && data.results.length > 0) {
    checkNewPage(40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...navyColor)
    const rowCountText = data.results.length > 50 ? `(Showing top 50 of ${data.results.length} rows)` : `(${data.results.length} rows)`
    doc.text(`QUERY RESULTS ${rowCountText}`, margin, y)
    y += 2

    doc.line(margin, y, margin + 45, y)
    y += 4

    const columns = Object.keys(data.results[0]).map((col) => ({
      header: col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase(),
      dataKey: col,
    }))

    const tableRows = data.results.slice(0, 50).map((row) => {
      const formattedRow: Record<string, string> = {}
      for (const key of Object.keys(row)) {
        formattedRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '—'
      }
      return formattedRow
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 18 },
      head: [columns.map((c) => c.header)],
      body: tableRows.map((row) => columns.map((c) => row[c.dataKey])),
      theme: 'grid',
      headStyles: {
        fillColor: navyColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 45, 55],
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 253],
      },
      styles: {
        overflow: 'linebreak',
        fontSize: 8,
      },
    })

    // Update y position after table
    y = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : y + 20
  }

  // 6. Page Numbers & Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Top border line for footer
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.3)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

    // Footer Text
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(130, 135, 150)
    doc.text(
      'KSP Crime Database Intelligence System — Karnataka State Police Datathon 2026',
      margin,
      pageHeight - 7
    )

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    )
  }

  // Save the PDF directly to client download
  const timestampStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)
  doc.save(`KSP_Crime_Report_${timestampStr}.pdf`)
}
