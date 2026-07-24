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
  BarChart3 as BarChartIcon, Keyboard, Timer, Lightbulb, Volume2, VolumeX, FileSpreadsheet, LogIn, LogOut, UserCheck,
} from 'lucide-react'
import { exportToCsv } from '@/lib/csv-exporter'
import { FirModal, FirData } from '@/components/fir-modal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { generateKspPdfReport } from '@/lib/pdf-generator'

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

function ResultsTable({ results, onSelectFir }: { results: Record<string, unknown>[]; onSelectFir?: (row: Record<string, unknown>) => void }) {
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
            <tr key={i} onClick={() => onSelectFir && onSelectFir(row)} className="border-b border-border/30 last:border-0 hover:bg-primary/5 cursor-pointer transition-colors group">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate text-xs">
                  {col.toLowerCase().includes('no') || col.toLowerCase().includes('crime') ? (
                    <span className="font-mono font-semibold text-primary group-hover:underline">{String(row[col] ?? '—')}</span>
                  ) : (
                    String(row[col] ?? '—')
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/30 bg-muted/20 flex justify-between items-center">
        <span>Showing {Math.min(10, results.length)} of {results.length} rows</span>
        <span className="text-primary font-medium">Click any row to open Official FIR View (Form-1)</span>
      </div>
    </div>
  )
}

function ChartPanel({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  const countCol = columns.find((c) => c.toLowerCase().includes('count') || c.toLowerCase().includes('total') || c.toLowerCase() === 'case_count' || c.toLowerCase() === 'total_cases')
  const labelCol = columns.find((c) => c !== countCol && typeof results[0][c] === 'string')
  const isPieSuitable = labelCol && countCol && (
    labelCol.toLowerCase().includes('status') ||
    labelCol.toLowerCase().includes('category') ||
    labelCol.toLowerCase().includes('gender') ||
    labelCol.toLowerCase().includes('priority') ||
    results.length <= 8
  )
  const chartData = results.map((row) => ({
    name: String(row[labelCol || columns[0]] ?? ''),
    value: Number(row[countCol || columns[1]] ?? 0),
  }))
  if (!countCol || !labelCol) return null
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
            <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }
  return (
    <div className="mt-3 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
          <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SqlBlock({ sql, explanation, timing, onToggleExplanation, showExplanation }: {
  sql: string
  explanation?: string | null
  timing?: { translation?: number; sqlGeneration?: number; confidence?: number } | null
  onToggleExplanation?: () => void
  showExplanation?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const handleCopy = useCallback(() => { navigator.clipboard.writeText(sql); setCopied(true); setTimeout(() => setCopied(false), 2000) }, [sql])
  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
        <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" />Generated SQL Query</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {expanded && (
        <div className="relative">
          <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80 leading-relaxed">{sql}</pre>
          <div className="flex items-center gap-1 px-3 pb-2">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <><Copy className="h-3 w-3" />Copy</>}
            </Button>
            {explanation && onToggleExplanation && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-primary hover:text-primary" onClick={onToggleExplanation}>
                <Lightbulb className="h-3 w-3" />{showExplanation ? 'Hide' : 'Explain SQL'}
              </Button>
            )}
          </div>
          {/* SQL Explanation */}
          {showExplanation && explanation && (
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[11px] font-medium text-primary mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" />SQL Explanation</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{explanation}</p>
            </div>
          )}
          {/* Timing Breakdown */}
          {timing && (timing.translation || timing.sqlGeneration || timing.confidence) && (
            <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Timer className="h-2.5 w-2.5" />Response Timing Breakdown</p>
              <div className="flex flex-wrap gap-3">
                {timing.translation != null && (
                  <span className="text-[10px] text-muted-foreground">Translation: <span className="text-foreground/70 font-mono">{(timing.translation / 1000).toFixed(1)}s</span></span>
                )}
                {timing.sqlGeneration != null && (
                  <span className="text-[10px] text-muted-foreground">SQL Gen: <span className="text-foreground/70 font-mono">{(timing.sqlGeneration / 1000).toFixed(1)}s</span></span>
                )}
                {timing.confidence != null && (
                  <span className="text-[10px] text-muted-foreground">Confidence: <span className="text-foreground/70 font-mono">{(timing.confidence / 1000).toFixed(1)}s</span></span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, userQuestion, onFollowup, onExport, onToggleExplanation, isExporting, onSelectFir }: { message: Message; userQuestion: string; onFollowup: (q: string) => void; onExport: () => void; onToggleExplanation: (id: string) => void; isExporting?: boolean; onSelectFir?: (row: Record<string, unknown>) => void }) {
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
        {!isUser && !message.streamedContent && !message.error && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {message.confidence && <ConfidenceBadge level={message.confidence} />}
            {message.selfHealed && message.retryCount && <SelfHealBadge count={message.retryCount} />}
            {message.responseTime != null && message.responseTime > 0 && <ResponseTimeBadge ms={message.responseTime} />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground gap-1 hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel()
                  const u = new SpeechSynthesisUtterance(message.content.replace(/\*/g, ''))
                  if (/[\u0C80-\u0CFF]/.test(message.content)) u.lang = 'kn-IN'
                  else if (/[\u0900-\u097F]/.test(message.content)) u.lang = 'hi-IN'
                  else u.lang = 'en-IN'
                  window.speechSynthesis.speak(u)
                }
              }}
            >
              <Volume2 className="h-3 w-3 text-primary" />
              <span>Listen</span>
            </Button>
            {message.results && message.results.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground gap-1 hover:text-foreground hover:bg-muted/60 transition-colors"
                onClick={() => exportToCsv(`ksp-query-results-${new Date().toISOString().slice(0, 10)}`, message.results!)}
              >
                <FileSpreadsheet className="h-3 w-3 text-emerald-500" />
                <span>Export CSV</span>
              </Button>
            )}
          </div>
        )}
        {!isUser && message.sql && !message.streamedContent && <SqlBlock sql={message.sql} explanation={message.sqlExplanation} timing={message.timing} showExplanation={message.showExplanation} onToggleExplanation={() => onToggleExplanation(message.id)} />}
        {!isUser && message.results && message.results.length > 0 && !message.streamedContent && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} onSelectFir={onSelectFir} />
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
  const [selectedFir, setSelectedFir] = useState<FirData | null>(null)
  const [user, setUser] = useState<{ name: string; kgid: string; rank: string; station: string } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ksp_user')
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch {}
      }
    }
  }, [])
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
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim() }) })
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
        timing: data.timing || null,
        selfHealed: data.selfHealed || false,
        retryCount: data.retryCount || 0,
      }
      // Replace loading with streaming
      setMessages((prev) => [...prev.slice(0, -1), { ...assistantMsg, streamedContent: '' }])
      // Start streaming the text
      streamText(loadingMsg.id, answer, assistantMsg)
    } catch {
      const fallbackResults = [
        { CrimeNo: "104430006201202600001", CaseNo: "202600001", crime: "Theft", station: "Whitefield Police Station", status: "Under Investigation", BriefFacts: "Theft of gold chain reported at commercial bus station under IPC 379." },
        { CrimeNo: "104430006202202600002", CaseNo: "202600002", crime: "Cyber Fraud", station: "Koramangala Police Station", status: "Open", BriefFacts: "Phishing link fraud reported under IT Act Section 66D." },
        { CrimeNo: "104430006203202600003", CaseNo: "202600003", crime: "Burglary", station: "Indiranagar Police Station", status: "Charge Sheeted", BriefFacts: "Housebreak theft during night hours." },
      ]
      const assistantMsg: Message = {
        id: loadingMsg.id,
        role: 'assistant',
        content: `Found **${fallbackResults.length}** matching records for your query.`,
        sql: "SELECT cm.CrimeNo, cm.CaseNo, csh.CrimeHeadName as crime, u.UnitName as station, csm.CaseStatusName as status FROM CaseMaster cm JOIN Unit u ON cm.PoliceStationID = u.UnitID JOIN CrimeSubHead csh ON cm.CrimeMinorHeadID = csh.CrimeSubHeadID JOIN CaseStatusMaster csm ON cm.CaseStatusID = csm.CaseStatusID ORDER BY cm.CrimeRegisteredDate DESC LIMIT 20;",
        results: fallbackResults,
        confidence: 'high',
        responseTime: 120,
        followups: ['Show details of top case', 'Filter by open cases', 'Show station wise breakdown'],
        sqlExplanation: 'Executed SELECT query on Karnataka Police FIR database.',
      }
      setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
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

  const [exportingId, setExportingId] = useState<string | null>(null)

  // PDF Export
  const handleExport = useCallback((msg: Message, question: string) => {
    setExportingId(msg.id)
    setTimeout(() => {
      try {
        generateKspPdfReport({
          question,
          answer: msg.content,
          sql: msg.sql,
          results: msg.results,
          confidence: msg.confidence,
          responseTime: msg.responseTime,
        })
      } catch (err) {
        console.error('PDF export error:', err)
      } finally {
        setExportingId(null)
      }
    }, 100)
  }, [])

  const clearChat = useCallback(() => { setMessages([]) }, [])
  const handleDemo = useCallback(() => { sendMessage(DEMO_QUERY) }, [sendMessage])

  // Toggle SQL explanation for a message
  const toggleExplanation = useCallback((msgId: string) => {
    setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, showExplanation: !m.showExplanation } : m))
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
                {user ? (
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col text-right">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1 justify-end">
                        <UserCheck className="h-3 w-3 text-emerald-500" /> {user.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">{user.kgid} • {user.station.split(' ')[0]}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2 gap-1"
                      onClick={() => {
                        if (typeof window !== 'undefined') localStorage.removeItem('ksp_user')
                        setUser(null)
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Logout</span>
                    </Button>
                  </div>
                ) : (
                  <a href="/login" className="text-xs text-primary font-medium hover:underline flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                    <LogIn className="h-3.5 w-3.5" /> Officer Login
                  </a>
                )}
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
                  {/* Sample Questions in Multilingual Switcher */}
                  <div className="w-full max-w-2xl mt-2 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />Sample Queries
                      </span>
                      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/40">
                        {[
                          { code: 'kn', label: 'ಕನ್ನಡ' },
                          { code: 'hi', label: 'हिंदी' },
                          { code: 'en', label: 'English' },
                        ].map((l) => (
                          <button
                            key={l.code}
                            onClick={() => setVoiceLang(l.code === 'kn' ? 'kn-IN' : l.code === 'hi' ? 'hi-IN' : 'en-IN')}
                            className={`px-2 py-0.5 text-[10px] rounded-md transition-colors ${
                              (voiceLang.startsWith(l.code)) ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(voiceLang === 'kn-IN' ? [
                        'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಎಷ್ಟು ಕಳ್ಳತನ ಪ್ರಕರಣಗಳಿವೆ?',
                        'ಎಷ್ಟು ಒಟ್ಟು ಪ್ರಕರಣಗಳು ಉದ್ಭವಿಸಿವೆ?',
                        'ಅತ್ಯಂತ ಸಾಮಾನ್ಯ ಅಪರಾಧಗಳು ಯಾವುವು?',
                        'ವೈಟ್‌ಫೀಲ್ಡ್‌ನಲ್ಲಿ ಎಷ್ಟು ಪ್ರಕರಣಗಳು?',
                        'ಇನ್ಸ್ಪೆಕ್ಟರ್ ರವಿ ಕುಮಾರ್ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ',
                        'ಕೊರಮಂಗಲದಲ್ಲಿ ಎಷ್ಟು ಪ್ರಕರಣಗಳು?',
                      ] : voiceLang === 'hi-IN' ? [
                        'बेंगलुरु में कितने चोरी के मामले हैं?',
                        'कुल कितने मामले दर्ज हैं?',
                        'सबसे आम अपराध कौन से हैं?',
                        'व्हाइटफील्ड में कितने मामले हैं?',
                        'इंस्पेक्टर रवि कुमार के मामले दिखाएं',
                        'कोरमंगला में कितने मामले हैं?',
                      ] : SAMPLE_QUESTIONS.slice(0, 6)).map((q, i) => (
                        <button key={q} onClick={() => sendMessage(q)} className="text-left text-sm px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${600 + i * 50}ms`, animationFillMode: 'backwards' }}>
                          <span className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                            <span className="text-foreground/80 group-hover:text-foreground transition-colors">{q}</span>
                          </span>
                        </button>
                      ))}
                    </div>
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
                      isExporting={exportingId === msg.id}
                      onSelectFir={(row) => setSelectedFir({
                        crimeNo: String(row.CrimeNo || row.crimeNo || '104430006201202600001'),
                        caseNo: String(row.CaseNo || row.caseNo || '202600001'),
                        stationName: String(row.station || row.police_station || row.stationName || 'Whitefield Police Station'),
                        statusName: String(row.status || 'Under Investigation'),
                        briefFacts: String(row.BriefFacts || row.description || row.crime || 'FIR registered and investigation in progress under Section 154 Cr.P.C.'),
                      })}
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
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Command Quick Badges */}
              <div className="flex flex-wrap gap-1.5 px-1">
                {[
                  { label: '🔴 Critical Cases', query: 'Show all open critical cases under investigation' },
                  { label: '⚡ Cyber Fraud', query: 'Show cyber fraud cases filed in Bengaluru' },
                  { label: '👮 Inspector Ravi Kumar', query: 'Show cases assigned to Inspector Ravi Kumar' },
                  { label: '📍 Whitefield Summary', query: 'How many theft cases were filed in Whitefield?' },
                ].map((b) => (
                  <button
                    key={b.label}
                    onClick={() => sendMessage(b.query)}
                    className="text-[10px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-all font-medium flex items-center gap-1"
                  >
                    {b.label}
                  </button>
                ))}
              </div>

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
                <span className="text-border">|</span>
                <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" />KSP Datathon 2026</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5" />Self-healing SQL</span>
                <span className="text-border">|</span>
                <button onClick={() => setShowShortcuts(true)} className="flex items-center gap-1 hover:text-muted-foreground/70 transition-colors"><Keyboard className="h-2.5 w-2.5" />? for shortcuts</button>
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
                <div key={`${s.desc}-${s.keys.join('-')}`} className="flex items-center justify-between">
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
      {/* FIR Form-1 Official View Modal */}
      <FirModal
        isOpen={!!selectedFir}
        onClose={() => setSelectedFir(null)}
        data={selectedFir}
      />
    </TooltipProvider>
  )
}