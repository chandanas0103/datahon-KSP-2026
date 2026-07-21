#!/usr/bin/env python3
"""Build the enhanced page.tsx with 6 new features."""
import re

with open("/home/z/my-project/src/app/page.tsx", "r") as f:
    content = f.read()

# ─── 1. Add new fields to Message interface ───
content = content.replace(
    "  showExplanation?: boolean\n}",
    "  showExplanation?: boolean\n  playgroundResult?: Record<string, unknown>[] | null\n  playgroundError?: string | null\n  playgroundLoading?: boolean\n}"
)

# ─── 2. Replace ResultsTable with searchable + CSV export version ───
old_results_table = '''function ResultsTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">{col.replace(/([A-Z])/g, ' $1').trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate text-xs">{String(row[col] ?? '\u2014')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 10 && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/30 bg-muted/20">Showing 10 of {results.length} rows</div>
      )}
    </div>
  )
}'''

new_results_table = '''function exportCsv(results: Record<string, unknown>[]) {
  if (!results.length) return
  const cols = Object.keys(results[0])
  const header = cols.join(',')
  const rows = results.map(r => cols.map(c => {
    const v = String(r[c] ?? '')
    return v.includes(',') || v.includes('"') || v.includes('\\n') ? `"${v.replace(/"/g, '""')}"` : v
  }).join(','))
  const csv = [header, ...rows].join('\\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `ksp-crime-data-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ResultsTable({ results, onExportCsv }: { results: Record<string, unknown>[]; onExportCsv?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAll, setShowAll] = useState(false)
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  const filtered = searchTerm
    ? results.filter(row => columns.some(col => String(row[col] ?? '').toLowerCase().includes(searchTerm.toLowerCase())))
    : results
  const displayRows = showAll ? filtered : filtered.slice(0, 10)
  return (
    <div className="mt-3 rounded-lg border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/30">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Filter results..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowAll(false) }}
            className="w-full h-7 pl-7 pr-2 text-xs bg-muted/50 border border-border/30 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/40"
          />
        </div>
        {onExportCsv && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground flex-shrink-0" onClick={onExportCsv}>
            <FileSpreadsheet className="h-3 w-3" />CSV
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap">
          {searchTerm ? `${filtered.length} of ${results.length}` : `${results.length} rows`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-left text-[10px] font-medium text-muted-foreground/60 w-8">#</th>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">{col.replace(/([A-Z])/g, ' $1').trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-xs text-muted-foreground/50">No matching rows</td></tr>
            ) : displayRows.map((row, i) => (
              <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-2 py-2 text-[10px] text-muted-foreground/40 font-mono">{i + 1}</td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate text-xs">{String(row[col] ?? '\u2014')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > 10 && !showAll && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/30 bg-muted/20 flex items-center justify-between">
          <span>Showing 10 of {filtered.length} rows</span>
          <button onClick={() => setShowAll(true)} className="text-primary hover:text-primary/80 text-[11px]">Show all {filtered.length}</button>
        </div>
      )}
    </div>
  )
}'''

content = content.replace(old_results_table, new_results_table)

# ─── 3. Replace SqlBlock with playground + timing bar version ───
old_sql_start = "function SqlBlock({ sql, explanation, timing, onToggleExplanation, showExplanation }: {"
sql_start = content.index(old_sql_start)
sql_end_marker = "\nfunction MessageBubble"
sql_end = content.index(sql_end_marker, sql_start)
old_sql_block = content[sql_start:sql_end]
print(f"Old SqlBlock length: {len(old_sql_block)} chars, found at {sql_start}-{sql_end}")

new_sql_block = '''function SqlBlock({ sql, explanation, timing, onToggleExplanation, showExplanation, onRerunSql }: {
  sql: string
  explanation?: string | null
  timing?: { translation?: number; sqlGeneration?: number; confidence?: number } | null
  onToggleExplanation?: () => void
  showExplanation?: boolean
  onRerunSql?: (newSql: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSql, setEditSql] = useState(sql)
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [sql])
  const startEdit = useCallback(() => { setEditSql(sql); setEditing(true); setExpanded(true) }, [sql])
  const runEdited = useCallback(() => { if (editSql.trim() && onRerunSql) { setEditing(false); onRerunSql(editSql.trim()) } }, [editSql, onRerunSql])
  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />Generated SQL Query</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="relative">
          {editing ? (
            <div className="px-3 py-2 space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Terminal className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-medium text-primary">SQL Playground \u2014 Edit & Re-run</span>
              </div>
              <textarea
                value={editSql}
                onChange={(e) => setEditSql(e.target.value)}
                className="w-full min-h-[80px] p-3 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 text-foreground leading-relaxed resize-y"
                spellCheck={false}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 px-3 text-[11px] gap-1.5" onClick={runEdited}>
                  <Play className="h-3 w-3" />Run Query
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => setEditSql(sql)}>
                  <RotateCcw className="h-3 w-3" />Reset
                </Button>
              </div>
            </div>
          ) : (
            <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80 leading-relaxed">{sql}</pre>
          )}
          <div className="flex items-center gap-1 px-3 pb-2">
            {!editing && (
              <>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <><Copy className="h-3 w-3" />Copy</>}
                </Button>
                {onRerunSql && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary" onClick={startEdit}>
                    <Terminal className="h-3 w-3" />Edit & Run
                  </Button>
                )}
                {explanation && onToggleExplanation && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary" onClick={onToggleExplanation}>
                    <Lightbulb className="h-3 w-3" />{showExplanation ? 'Hide' : 'Explain SQL'}
                  </Button>
                )}
              </>
            )}
          </div>
          {showExplanation && explanation && (
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[11px] font-medium text-primary mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" />SQL Explanation</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{explanation}</p>
            </div>
          )}
          {timing && (timing.translation || timing.sqlGeneration || timing.confidence) && (
            <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/30">
              <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1"><Timer className="h-2.5 w-2.5" />Response Timing</p>
              <TimingBar timing={timing} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TimingBar({ timing }: { timing: { translation?: number; sqlGeneration?: number; confidence?: number } }) {
  const segments: { label: string; ms: number; color: string }[] = []
  if (timing.translation) segments.push({ label: 'Translation', ms: timing.translation, color: 'bg-blue-500' })
  if (timing.sqlGeneration) segments.push({ label: 'SQL Gen + Exec', ms: timing.sqlGeneration, color: 'bg-amber-500' })
  if (timing.confidence) segments.push({ label: 'Confidence', ms: timing.confidence, color: 'bg-emerald-500' })
  if (segments.length === 0) return null
  const total = segments.reduce((s, seg) => s + seg.ms, 0)
  return (
    <div className="space-y-1.5">
      <div className="flex rounded-full overflow-hidden h-2 bg-border/50">
        {segments.map((seg) => (
          <div key={seg.label} className={`${seg.color} transition-all duration-500`} style={{ width: `${(seg.ms / total) * 100}%` }} title={`${seg.label}: ${(seg.ms / 1000).toFixed(1)}s`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
            {seg.label}: <span className="text-foreground/70 font-mono">{(seg.ms / 1000).toFixed(1)}s</span>
            <span className="text-muted-foreground/40">({Math.round((seg.ms / total) * 100)}%)</span>
          </span>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">Total: {(total / 1000).toFixed(1)}s</span>
      </div>
    </div>
  )
}
'''

content = content[:sql_start] + new_sql_block + content[sql_end:]

# ─── 4. Update MessageBubble to pass new props ───
content = content.replace(
    "function MessageBubble({ message, userQuestion, onFollowup, onExport, onToggleExplanation }: { message: Message; userQuestion: string; onFollowup: (q: string) => void; onExport: () => void; onToggleExplanation: (id: string) => void }) {",
    "function MessageBubble({ message, userQuestion, onFollowup, onExport, onToggleExplanation, onRerunSql }: { message: Message; userQuestion: string; onFollowup: (q: string) => void; onExport: () => void; onToggleExplanation: (id: string) => void; onRerunSql: (msgId: string, sql: string) => void }) {"
)

# Update ResultsTable usage in MessageBubble
content = content.replace(
    "<ResultsTable results={message.results} />",
    "<ResultsTable results={message.results} onExportCsv={() => { if (message.results) exportCsv(message.results) }} />"
)

# Update SqlBlock usage in MessageBubble
content = content.replace(
    "<SqlBlock sql={message.sql} explanation={message.sqlExplanation} timing={message.timing} showExplanation={message.showExplanation} onToggleExplanation={() => onToggleExplanation(message.id)} />",
    "<SqlBlock sql={message.sql} explanation={message.sqlExplanation} timing={message.timing} showExplanation={message.showExplanation} onToggleExplanation={() => onToggleExplanation(message.id)} onRerunSql={(newSql) => onRerunSql(message.id, newSql)} />"
)

# ─── 5. Add playground result display after SqlBlock ───
old_results_chart = """        {!isUser && message.results && message.results.length > 0 && !message.streamedContent && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} onExportCsv={() => { if (message.results) exportCsv(message.results) }} />
          </>
        )}"""

new_results_chart = """        {!isUser && message.playgroundResult !== undefined && !message.streamedContent && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Terminal className="h-3 w-3 text-primary" />
              <span className="text-[11px] font-medium text-primary">Playground Result</span>
              {message.playgroundLoading && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />Running...</span>}
            </div>
            {message.playgroundError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2 border border-destructive/10">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[11px]">{message.playgroundError}</span>
              </div>
            )}
            {message.playgroundResult && message.playgroundResult.length > 0 && (
              <>
                <ChartPanel results={message.playgroundResult} />
                <ResultsTable results={message.playgroundResult} onExportCsv={() => exportCsv(message.playgroundResult!)} />
              </>
            )}
            {message.playgroundResult && message.playgroundResult.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">Query returned 0 rows.</p>
            )}
          </div>
        )}
        {!isUser && message.results && message.results.length > 0 && !message.streamedContent && message.playgroundResult === undefined && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} onExportCsv={() => { if (message.results) exportCsv(message.results) }} />
          </>
        )}"""
content = content.replace(old_results_chart, new_results_chart)

# ─── 6. Add rerunSql callback after toggleExplanation ───
old_toggle = """  const toggleExplanation = useCallback((msgId: string) => {
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, showExplanation: !m.showExplanation } : m))
  }, [])"""

new_toggle = """  const toggleExplanation = useCallback((msgId: string) => {
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, showExplanation: !m.showExplanation } : m))
  }, [])

  // SQL Playground: re-run edited SQL directly
  const rerunSql = useCallback(async (msgId: string, newSql: string) => {
    const normalized = newSql.replace(/\\s+/g, ' ').trim().toLowerCase()
    if (!normalized.startsWith('select')) {
      setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, playgroundError: 'Only SELECT queries are allowed.', playgroundLoading: false } : m))
      return
    }
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, playgroundLoading: true, playgroundResult: null, playgroundError: null } : m))
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: '__playground__', sql: newSql }),
      })
      const data = await res.json()
      if (data.results) {
        setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, playgroundResult: data.results, playgroundLoading: false } : m))
      } else if (data.error) {
        setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, playgroundError: data.error, playgroundLoading: false } : m))
      }
    } catch {
      setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, playgroundError: 'Network error', playgroundLoading: false } : m))
    }
  }, [])"""
content = content.replace(old_toggle, new_toggle)

# ─── 7. Multi-turn context: pass conversation context to the API ───
old_send = """      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim() }) })"""
new_send = """      const contextPairs = messages.slice(-4).filter(m => !m.isLoading && !m.streamedContent).map(m => ({ role: m.role, content: m.content, sql: m.sql }))
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim(), context: contextPairs }) })"""
content = content.replace(old_send, new_send)

# ─── 8. Pass rerunSql to MessageBubble ───
content = content.replace(
    """                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      userQuestion={userQ}
                      onFollowup={sendMessage}
                      onExport={() => handleExport(msg, userQ)}
                      onToggleExplanation={toggleExplanation}
                    />""",
    """                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      userQuestion={userQ}
                      onFollowup={sendMessage}
                      onExport={() => handleExport(msg, userQ)}
                      onToggleExplanation={toggleExplanation}
                      onRerunSql={rerunSql}
                    />"""
)

# ─── 9. Mobile bottom nav ───
old_footer = """              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground/40">
                <a href="/dashboard" className="flex items-center gap-1 hover:text-muted-foreground/70 transition-colors"><BarChartIcon className="h-2.5 w-2.5" />Analytics</a>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" />KSP Datathon 2026</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5" />Self-healing SQL</span>
                <span className="text-border">|</span>
                <button onClick={() => setShowShortcuts(true)} className="flex items-center gap-1 hover:text-muted-foreground/70 transition-colors"><Keyboard className="h-2.5 w-2.5" />? for shortcuts</button>
              </div>"""

new_footer = """              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground/40">
                <a href="/dashboard" className="flex items-center gap-1 hover:text-muted-foreground/70 transition-colors"><BarChartIcon className="h-2.5 w-2.5" />Analytics</a>
                <span className="text-border hidden sm:inline">|</span>
                <span className="hidden sm:flex items-center gap-1"><Shield className="h-2.5 w-2.5" />KSP Datathon 2026</span>
                <span className="text-border hidden sm:inline">|</span>
                <span className="hidden sm:flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5" />Self-healing SQL</span>
                <span className="text-border hidden sm:inline">|</span>
                <button onClick={() => setShowShortcuts(true)} className="flex items-center gap-1 hover:text-muted-foreground/70 transition-colors"><Keyboard className="h-2.5 w-2.5" />?</button>
              </div>
              {/* Mobile Bottom Nav */}
              <div className="flex sm:hidden items-center justify-around pt-2 border-t border-border/30 mt-2">
                <a href="/" className="flex flex-col items-center gap-0.5 text-[10px] text-primary"><MessageSquare className="h-4 w-4" />Chat</a>
                <a href="/dashboard" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"><BarChartIcon className="h-4 w-4" />Analytics</a>
                <a href="/about" className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground"><FileText className="h-4 w-4" />About</a>
              </div>"""
content = content.replace(old_footer, new_footer)

with open("/home/z/my-project/src/app/page.tsx", "w") as f:
    f.write(content)

print("All features injected successfully!")
print(f"Final file size: {len(content)} chars, {content.count(chr(10))} lines")