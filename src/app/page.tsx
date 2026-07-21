'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shield, Send, Database, MessageSquare, BarChart3, Bot, User,
  AlertTriangle, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Mic, MicOff, FileText, Clock, History, ArrowRight, Languages,
  ShieldCheck, ShieldAlert, ShieldQuestion, X, Download, PanelLeftClose, PanelLeft,
  TrendingUp, FolderOpen, MapPin, Activity, RefreshCw, Wrench, Zap, Play,
  BarChart3 as BarChartIcon, Keyboard, Timer, Lightbulb, Search, Table2, Terminal,
  FileSpreadsheet, RotateCcw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────

interface TimingBreakdown {
  translation?: number
  sqlGeneration?: number
  confidence?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  results?: Record<string, unknown>[]
  error?: string
  isLoading?: boolean
  confidence?: 'high' | 'medium' | 'low'
  translatedQuestion?: string | null
  responseTime?: number
  followups?: string[]
  selfHealed?: boolean
  retryCount?: number
  streamedContent?: string
  sqlExplanation?: string | null
  timing?: TimingBreakdown | null
  showExplanation?: boolean
  playgroundResult?: Record<string, unknown>[] | null
  playgroundError?: string | null
  playgroundLoading?: boolean
  insight?: string | null
}

interface HistoryItem {
  id: string
  question: string
  createdAt: string
}

interface Stats {
  totalCases: number
  openCases: number
  stations: number
  resolutionRate: number
  topCrime: { name: string; count: number } | null
}

// ─── Constants ─────────────────────────────────────────────

const SAMPLE_QUESTIONS = [
  'How many total cases are in the database?',
  'What are the top 5 most common crime types?',
  'How many cases were filed in Whitefield this year?',
  'Show all critical priority cases',
  'Which area has the most theft cases?',
  'How many open cases are assigned to Inspector Ravi Kumar?',
  'Show crime statistics by station area',
  'How many cases were filed last month?',
  'What is the gender distribution of victims?',
  'Show resolved cases from Koramangala',
  'Which station has the highest resolution rate?',
  'Show a breakdown of cases by priority',
]

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316',
]

const DEMO_QUERY = 'What are the top 5 most common crime types?'
const TYPING_PHRASES = [
  'ನೀವು ಕನ್ನಡದಲ್ಲಿ ಕೇಳಬಹುದು...',
  'Ask in English, Kannada, or Hindi...',
  'ಬೆಂಗಳೂರು ಕ್ರೈಮ್ ಡೇಟಾಬೇಸ್ ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಿ...',
  'Show me crime trends in your area...',
]

// ─── Sub-components ────────────────────────────────────────

function ConfidenceBadge({ level }: { level: string }) {
  if (level === 'high') return (
    <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 font-normal">
      <ShieldCheck className="h-3 w-3" /> High Confidence
    </Badge>
  )
  if (level === 'medium') return (
    <Badge className="gap-1 bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25 font-normal">
      <ShieldQuestion className="h-3 w-3" /> Medium Confidence
    </Badge>
  )
  return (
    <Badge className="gap-1 bg-red-500/15 text-red-400 border-red-500/20 hover:bg-red-500/25 font-normal">
      <ShieldAlert className="h-3 w-3" /> Low Confidence
    </Badge>
  )
}

function ResponseTimeBadge({ ms }: { ms: number }) {
  const color = ms < 3000 ? 'text-emerald-400' : ms < 8000 ? 'text-amber-400' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${color}`}>
      <Clock className="h-3 w-3" /> {(ms / 1000).toFixed(1)}s
    </span>
  )
}

function SelfHealBadge({ count }: { count: number }) {
  return (
    <Badge className="gap-1 bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25 font-normal">
      <Wrench className="h-3 w-3" /> Self-healed ({count}x)
    </Badge>
  )
}

function TranslationNotice({ original, translated }: { original: string; translated: string }) {
  if (!translated) return null
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5 w-fit">
      <Languages className="h-3 w-3 flex-shrink-0" />
      <span>Translated: <span className="italic text-foreground/70">{original}</span> → <span className="text-foreground/90">{translated}</span></span>
    </div>
  )
}

function exportCsv(results: Record<string, unknown>[]) {
  if (!results.length) return
  const cols = Object.keys(results[0])
  const header = cols.join(',')
  const rows = results.map(r => cols.map(c => {
    const v = String(r[c] ?? '')
    return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
  }).join(','))
  const csv = [header, ...rows].join('\n')
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
                  <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate text-xs">{String(row[col] ?? '—')}</td>
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
}

const tooltipStyle = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }

function ChartPanel({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])

  // ── Detect data shape ──
  const countCol = columns.find((c) => c.toLowerCase().includes('count') || c.toLowerCase().includes('total') || c.toLowerCase() === 'case_count' || c.toLowerCase() === 'total_cases')
  const labelCol = columns.find((c) => c !== countCol && typeof results[0][c] === 'string')

  // Detect multi-value columns (for stacked/grouped bars)
  const numericCols = columns.filter(c => c !== labelCol && typeof results[0][c] === 'number' || (typeof results[0][c] === 'bigint'))

  // Detect time-series data (label looks like a date/month/year)
  const isTimeSeries = labelCol && /^\d{4}[-\/]\d{1,2}/.test(String(results[0][labelCol] ?? ''))

  // Detect resolved/open split (for stacked area)
  const hasResolvedCol = columns.some(c => c.toLowerCase().includes('resolved'))
  const hasOpenCol = columns.some(c => c.toLowerCase().includes('open'))

  // Pie suitability
  const isPieSuitable = labelCol && countCol && !isTimeSeries && (
    labelCol.toLowerCase().includes('status') ||
    labelCol.toLowerCase().includes('category') ||
    labelCol.toLowerCase().includes('gender') ||
    labelCol.toLowerCase().includes('priority') ||
    results.length <= 6
  )

  if (!countCol || !labelCol) return null

  // ── Build chart data ──
  const chartData = results.map((row) => ({
    name: String(row[labelCol] ?? ''),
    value: Number(row[countCol] ?? 0),
    ...(hasResolvedCol ? { resolved: Number(row[columns.find(c => c.toLowerCase().includes('resolved'))!] ?? 0) } : {}),
    ...(hasOpenCol ? { open: Number(row[columns.find(c => c.toLowerCase().includes('open'))!] ?? 0) } : {}),
    ...Object.fromEntries(numericCols.filter(c => c !== countCol && c !== labelCol).map(c => [c, Number(row[c] ?? 0)])),
  }))

  // ── Stacked Area for time-series with resolved/open ──
  if (isTimeSeries && hasResolvedCol && results.length >= 4) {
    return (
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area type="monotone" dataKey="resolved" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Resolved" />
            <Area type="monotone" dataKey="open" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Open" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Line Chart for time-series ──
  if (isTimeSeries && results.length >= 4) {
    return (
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={countCol} />
            {hasResolvedCol && <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Resolved" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Pie Chart ──
  if (isPieSuitable) {
    return (
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine>
              {chartData.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
            </Pie>
            <Legend />
            <RechartsTooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Stacked/Grouped Bar for multi-metric data ──
  const extraMetrics = numericCols.filter(c => c !== countCol && c !== labelCol && chartData.some(d => (d as Record<string, number>)[c] > 0))
  if (extraMetrics.length > 0 && results.length <= 15) {
    return (
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={results.length > 6 ? -30 : 0} textAnchor={results.length > 6 ? "end" : "middle"} height={results.length > 6 ? 60 : 30} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} name={countCol} />
            {extraMetrics.map((col, i) => (
              <Bar key={col} dataKey={col} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} radius={[3, 3, 0, 0]} name={col.replace(/([A-Z])/g, ' $1').trim()} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // ── Default Bar Chart ──
  return (
    <div className="mt-3 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SqlBlock({ sql, explanation, timing, onToggleExplanation, showExplanation, onRerunSql }: {
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
                <span className="text-[11px] font-medium text-primary">SQL Playground — Edit & Re-run</span>
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

function MessageBubble({ message, userQuestion, onFollowup, onExport, onToggleExplanation, onRerunSql }: { message: Message; userQuestion: string; onFollowup: (q: string) => void; onExport: () => void; onToggleExplanation: (id: string) => void; onRerunSql: (msgId: string, sql: string) => void }) {
  const isUser = message.role === 'user'
  const displayContent = message.streamedContent ?? message.content

  if (message.isLoading) {
    return (
      <div className="flex gap-3 max-w-3xl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{message.selfHealed ? 'Self-healing query...' : 'Analyzing your query...'}</span>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }
  return (
    <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse ml-auto' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 space-y-1.5 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
          {displayContent}
          {message.error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {message.error}
            </div>
          )}
        </div>
        {!isUser && message.translatedQuestion && (
          <TranslationNotice original={message.translatedQuestion} translated={message.content} />
        )}
        {!isUser && !message.streamedContent && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {message.confidence && <ConfidenceBadge level={message.confidence} />}
            {message.selfHealed && message.retryCount && <SelfHealBadge count={message.retryCount} />}
            {message.responseTime != null && message.responseTime > 0 && <ResponseTimeBadge ms={message.responseTime} />}
            {message.results && message.results.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground gap-1 hover:text-foreground" onClick={onExport}>
                    <Download className="h-3 w-3" />Export Report
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download a formatted report</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        {!isUser && message.sql && !message.streamedContent && <SqlBlock sql={message.sql} explanation={message.sqlExplanation} timing={message.timing} showExplanation={message.showExplanation} onToggleExplanation={() => onToggleExplanation(message.id)} onRerunSql={(newSql) => onRerunSql(message.id, newSql)} />}
        {/* AI Insight Card */}
        {!isUser && message.insight && !message.streamedContent && (
          <div className="mt-2.5 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">AI Insight</span>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">{message.insight}</p>
          </div>
        )}
        {!isUser && message.playgroundResult !== undefined && !message.streamedContent && (
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
        )}
        {!isUser && message.followups && message.followups.length > 0 && !message.streamedContent && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.followups.map((fq) => (
              <button key={fq} onClick={() => onFollowup(fq)} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                <ArrowRight className="h-3 w-3" />{fq}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const hasAnimated = useRef(false)
  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return <span>{count.toLocaleString()}</span>
}

function DashboardStats({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Total Cases', value: stats.totalCases, icon: FolderOpen, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Open Cases', value: stats.openCases, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Resolution Rate', value: stats.resolutionRate, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', suffix: '%' },
    { label: 'Police Stations', value: stats.stations, icon: MapPin, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
      {cards.map((card, i) => (
        <Card key={card.label} className="border-border/50 bg-card/50 backdrop-blur animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}>
          <CardContent className="p-4 text-center">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mx-auto mb-2`}>
              <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold tracking-tight">
              <AnimatedCounter target={card.value} />
              {card.suffix && <span className="text-lg">{card.suffix}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function HistorySidebar({ history, onQuery, isOpen, onToggle }: { history: HistoryItem[]; onQuery: (q: string) => void; isOpen: boolean; onToggle: () => void }) {
  const timeAgo = (dateStr: string) => {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}
      <aside className={`fixed lg:relative z-50 lg:z-auto top-0 left-0 h-full w-72 flex-shrink-0 border-r bg-card/95 backdrop-blur-lg transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />Query History
            </h2>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onToggle}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground/50">No queries yet</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-1">Your past queries will appear here</p>
                </div>
              ) : (
                history.map((item) => (
                  <button key={item.id} onClick={() => { onQuery(item.question); if (window.innerWidth < 1024) onToggle() }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                    <p className="text-xs text-foreground/80 group-hover:text-foreground line-clamp-2 leading-relaxed">{item.question}</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />{timeAgo(item.createdAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          {history.length > 0 && (
            <div className="p-3 border-t">
              <p className="text-[10px] text-muted-foreground/40 text-center">{history.length} recent {history.length === 1 ? 'query' : 'queries'}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Feature Pills for Landing ────────────────────────────

function FeaturePill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 bg-muted/40 px-2.5 py-1 rounded-full">
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

// ─── Typing Animation Component ───────────────────────────

function TypingHero({ onComplete }: { onComplete?: () => void }) {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [display, setDisplay] = useState('')

  useEffect(() => {
    const currentPhrase = TYPING_PHRASES[phraseIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!isDeleting && charIdx < currentPhrase.length) {
      timeout = setTimeout(() => {
        setDisplay(currentPhrase.slice(0, charIdx + 1))
        setCharIdx(charIdx + 1)
      }, 50 + Math.random() * 40)
    } else if (!isDeleting && charIdx === currentPhrase.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplay(currentPhrase.slice(0, charIdx - 1))
        setCharIdx(charIdx - 1)
      }, 25)
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false)
      const nextIdx = (phraseIdx + 1) % TYPING_PHRASES.length
      setPhraseIdx(nextIdx)
    }

    return () => clearTimeout(timeout)
  }, [charIdx, isDeleting, phraseIdx])

  return (
    <div className="h-8 flex items-center justify-center">
      <span className="text-base text-primary/90 font-mono">
        {display}
        <span className="animate-pulse">|</span>
      </span>
    </div>
  )
}

// ─── Guided Demo Banner ──────────────────────────────────

function DemoBanner({ onPlay, onDismiss }: { onPlay: () => void; onDismiss: () => void }) {
  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
        <button onClick={onDismiss} className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted/50 transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Play className="h-4 w-4 text-primary ml-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/90">New here? Watch a quick demo</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">See the AI analyze: &ldquo;{DEMO_QUERY}&rdquo;</p>
          </div>
          <Button size="sm" onClick={onPlay} className="flex-shrink-0 rounded-xl gap-1.5 text-xs">
            <Zap className="h-3 w-3" />Try Demo
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showDemo, setShowDemo] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
    const hasVisited = localStorage.getItem('ksp-visited')
    if (!hasVisited) setShowDemo(true)
  }, [])
  const [voiceLang, setVoiceLang] = useState<'kn-IN' | 'hi-IN' | 'en-IN'>('kn-IN')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/history').then(r => r.json()).then(setHistory).catch(() => {}) }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  // Refresh history after each new assistant message
  const lastMsg = messages[messages.length - 1]
  useEffect(() => {
    if (messages.length > 0 && lastMsg?.role === 'assistant' && !lastMsg?.isLoading && !lastMsg?.streamedContent) {
      fetch('/api/history').then(r => r.json()).then(setHistory).catch(() => {})
    }
  }, [messages.length, lastMsg?.role, lastMsg?.isLoading, lastMsg?.streamedContent])

  // ── Stream text character-by-character for perceived speed ──
  const streamText = useCallback((msgId: string, text: string, finalMsg: Message) => {
    let idx = 0
    const speed = Math.max(8, Math.min(30, 1500 / text.length))
    const interval = setInterval(() => {
      idx += Math.ceil(text.length / 60)
      if (idx >= text.length) {
        idx = text.length
        clearInterval(interval)
        // Replace streamed message with full message (show charts, sql, etc.)
        setMessages((prev) => prev.map(m => m.id === msgId ? { ...finalMsg, streamedContent: undefined } : m))
      } else {
        setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, streamedContent: text.slice(0, idx) } : m))
      }
    }, speed)
    return () => clearInterval(interval)
  }, [])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isSending) return
    // Mark visited so demo banner doesn't show again
    localStorage.setItem('ksp-visited', '1')
    setShowDemo(false)

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question.trim() }
    const loadingMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', isLoading: true }
    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsSending(true)
    try {
      const contextPairs = messages.slice(-4).filter(m => !m.isLoading && !m.streamedContent).map(m => ({ role: m.role, content: m.content, sql: m.sql }))
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim(), context: contextPairs }) })
      const data = await res.json()
      const answer = data.answer || 'No response generated.'
      const assistantMsg: Message = {
        id: loadingMsg.id,
        role: 'assistant',
        content: answer,
        sql: data.sql || null,
        results: data.results || [],
        error: data.error,
        confidence: data.confidence || 'medium',
        translatedQuestion: data.translatedQuestion || null,
        responseTime: data.responseTime || 0,
        followups: data.followups || [],
        sqlExplanation: data.sqlExplanation || null,
        insight: data.insight || null,
        timing: data.timing || null,
        selfHealed: data.selfHealed || false,
        retryCount: data.retryCount || 0,
      }
      // Replace loading with streaming
      setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg, streamedContent: '' }])
      // Start streaming the text
      streamText(loadingMsg.id, answer, assistantMsg)
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Failed to connect to the server. Please check your connection and try again.',
        error: 'Network error',
      }])
    } finally { setIsSending(false) }
  }, [isSending, streamText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }, [input, sendMessage])

  // Voice input with language cycling
  const toggleVoice = useCallback(() => {
    if (typeof window === 'undefined' || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SR = (window as unknown as { SpeechRecognition: typeof SpeechRecognition; webkitSpeechRecognition: typeof SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = voiceLang
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening, voiceLang])

  const cycleVoiceLang = useCallback(() => {
    const langs: Array<'kn-IN' | 'hi-IN' | 'en-IN'> = ['kn-IN', 'hi-IN', 'en-IN']
    const idx = langs.indexOf(voiceLang)
    const next = langs[(idx + 1) % langs.length]
    setVoiceLang(next)
  }, [voiceLang])

  // PDF Export
  const handleExport = useCallback((msg: Message, question: string) => {
    fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        answer: msg.content,
        sql: msg.sql,
        results: msg.results,
        confidence: msg.confidence,
        responseTime: msg.responseTime,
        insight: msg.insight,
      }),
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ksp-crime-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
    .catch(() => { window.print() })
  }, [])

  const clearChat = useCallback(() => { setMessages([]) }, [])
  const handleDemo = useCallback(() => { sendMessage(DEMO_QUERY) }, [sendMessage])

  // Toggle SQL explanation for a message
  const toggleExplanation = useCallback((msgId: string) => {
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, showExplanation: !m.showExplanation } : m))
  }, [])

  // SQL Playground: re-run edited SQL directly
  const rerunSql = useCallback(async (msgId: string, newSql: string) => {
    const normalized = newSql.replace(/\s+/g, ' ').trim().toLowerCase()
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
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in textarea
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') { textareaRef.current?.blur(); return }
        return
      }
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault()
        textareaRef.current?.focus()
      }
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false)
      }
      if (e.key === '?' && !e.ctrlKey) {
        e.preventDefault()
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showShortcuts])

  const voiceLangLabel = { 'kn-IN': 'KN', 'hi-IN': 'HI', 'en-IN': 'EN' }[voiceLang]

  return (
    <TooltipProvider>
      <div className="h-screen flex bg-background overflow-hidden">
        {/* Sidebar */}
        <HistorySidebar
          history={history}
          onQuery={sendMessage}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="no-print flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(!sidebarOpen)}>
                  {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                </Button>
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                  <Shield className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold leading-tight">KSP Crime Intelligence</h1>
                  <p className="text-[10px] text-muted-foreground">Conversational AI for Crime Database</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50">
                      <FileText className="h-3 w-3" />About
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Architecture & features</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50">
                      <BarChartIcon className="h-3 w-3" />Dashboard
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Analytics dashboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowShortcuts(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50">
                      <Keyboard className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Keyboard shortcuts</TooltipContent>
                </Tooltip>
                {messages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearChat}>
                        <X className="h-3 w-3" />Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6">
                  {/* Animated Hero */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-in fade-in duration-500">
                      <MessageSquare className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in-50 duration-700 delay-300">
                      <Zap className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">Ask anything about crime data</h2>
                    {/* Typing Animation */}
                    <TypingHero />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto animate-in fade-in duration-700 delay-400">
                    Query the Karnataka State Police crime database using natural language.
                    Get instant answers with charts, confidence scores, and exportable reports.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 animate-in fade-in duration-700 delay-500">
                    <FeaturePill icon={ShieldCheck} label="Self-healing SQL" />
                    <FeaturePill icon={Languages} label="Multilingual (EN/KN/HI)" />
                    <FeaturePill icon={ShieldQuestion} label="Confidence Scoring" />
                    <FeaturePill icon={Mic} label="Voice Input" />
                    <FeaturePill icon={FileText} label="Report Export" />
                    <FeaturePill icon={Sparkles} label="Smart Follow-ups" />
                  </div>
                  {stats && <DashboardStats stats={stats} />}
                  {/* Demo Banner for first-time visitors */}
                  {showDemo && (
                    <DemoBanner onPlay={handleDemo} onDismiss={() => setShowDemo(false)} />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl mt-2">
                    {SAMPLE_QUESTIONS.slice(0, 6).map((q, i) => (
                      <button key={q} onClick={() => sendMessage(q)} className="text-left text-sm px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${600 + i * 50}ms`, animationFillMode: 'backwards' }}>
                        <span className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                          <span className="text-foreground/80 group-hover:text-foreground transition-colors">{q}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, idx) => {
                    const userQ = msg.role === 'assistant' && idx > 0 && messages[idx - 1]?.role === 'user'
                      ? messages[idx - 1].content : msg.content
                    return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      userQuestion={userQ}
                      onFollowup={sendMessage}
                      onExport={() => handleExport(msg, userQ)}
                      onToggleExplanation={toggleExplanation}
                      onRerunSql={rerunSql}
                    />
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Follow-up Quick Bar */}
          {messages.length > 0 && !lastMsg?.isLoading && lastMsg?.followups && lastMsg.followups!.length > 0 && !lastMsg?.streamedContent && (
            <div className="no-print px-4 sm:px-6 pb-1">
              <div className="max-w-3xl mx-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 pb-1">
                    {lastMsg.followups!.map((fq) => (
                      <button key={fq} onClick={() => sendMessage(fq)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />{fq}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Sample Questions Quick Bar (when in conversation) */}
          {messages.length > 0 && (
            <div className="no-print px-4 sm:px-6 pb-1">
              <div className="max-w-3xl mx-auto">
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 pb-1">
                    {SAMPLE_QUESTIONS.slice(0, 10).map((q) => (
                      <button key={q} onClick={() => sendMessage(q)} className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors whitespace-nowrap">{q}</button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="no-print flex-shrink-0 px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
            <div className="max-w-3xl mx-auto">
              <Card className="shadow-lg shadow-primary/5 border-border/50">
                <CardContent className="p-3">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask in English, Kannada, or Hindi..."
                      className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                      rows={1}
                      disabled={isSending}
                    />
                    <div className="flex flex-col gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isListening ? 'destructive' : 'ghost'}
                            size="icon"
                            onClick={toggleVoice}
                            disabled={isSending}
                            className="h-10 w-10 rounded-xl relative"
                          >
                            {isListening ? (
                              <><MicOff className="h-4 w-4" /><span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" /></>) : <Mic className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex flex-col gap-1">
                            <span>{isListening ? 'Stop listening' : 'Voice input'}</span>
                            <span className="text-[10px] text-muted-foreground">Click mic icon to cycle: KN → HI → EN</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cycleVoiceLang}
                            disabled={isSending}
                            className="h-5 px-1.5 text-[9px] text-muted-foreground/60 hover:text-foreground"
                          >
                            {voiceLangLabel}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Language: {voiceLang === 'kn-IN' ? 'Kannada' : voiceLang === 'hi-IN' ? 'Hindi' : 'English'}</TooltipContent>
                      </Tooltip>
                    </div>
                    <Button
                      size="icon"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isSending}
                      className="flex-shrink-0 h-10 w-10 rounded-xl"
                    >
                      {isSending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground/40">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Keyboard className="h-4 w-4 text-primary" />Keyboard Shortcuts</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowShortcuts(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              {[
                { keys: ['/'], desc: 'Focus search input' },
                { keys: ['Ctrl', 'K'], desc: 'Focus search input' },
                { keys: ['Enter'], desc: 'Send message' },
                { keys: ['Shift', 'Enter'], desc: 'New line in input' },
                { keys: ['Escape'], desc: 'Close overlay / unfocus' },
                { keys: ['?'], desc: 'Show this shortcuts panel' },
              ].map(s => (
                <div key={s.desc} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map(k => (
                      <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border text-foreground/70">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}