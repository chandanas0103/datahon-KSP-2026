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
  TrendingUp, FolderOpen, MapPin, Activity,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

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

// ─── Sub-components ───────────────────────────────────────────

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

function TranslationNotice({ original, translated }: { original: string; translated: string }) {
  if (!translated) return null
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Languages className="h-3 w-3" />
      <span>Translated from: <span className="italic">{original}</span></span>
    </div>
  )
}

function ResultsTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">{String(row[col] ?? '—')}</td>
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
}

function ChartPanel({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  const countCol = columns.find((c) => c.toLowerCase().includes('count') || c.toLowerCase().includes('total') || c.toLowerCase() === 'case_count' || c.toLowerCase() === 'total_cases')
  const labelCol = columns.find((c) => c !== countCol && typeof results[0][c] === 'string')
  const isPieSuitable = labelCol && countCol && (labelCol.toLowerCase().includes('status') || labelCol.toLowerCase().includes('category') || labelCol.toLowerCase().includes('gender') || labelCol.toLowerCase().includes('priority') || results.length <= 8)
  const chartData = results.map((row) => ({ name: String(row[labelCol || columns[0]] ?? ''), value: Number(row[countCol || columns[1]] ?? 0) }))
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
            <Legend /><RechartsTooltip />
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

function SqlBlock({ sql }: { sql: string }) {
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
          <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80">{sql}</pre>
          <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, onFollowup, onExport }: { message: Message; onFollowup: (q: string) => void; onExport: () => void }) {
  const isUser = message.role === 'user'
  if (message.isLoading) {
    return (
      <div className="flex gap-3 max-w-3xl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>
      </div>
    )
  }
  return (
    <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse ml-auto' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 space-y-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
          {message.content}
          {message.error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{message.error}</div>
          )}
        </div>
        {!isUser && message.translatedQuestion && <TranslationNotice original={message.content} translated={message.translatedQuestion} />}
        {!isUser && (
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {message.confidence && <ConfidenceBadge level={message.confidence} />}
            {message.responseTime != null && message.responseTime > 0 && <ResponseTimeBadge ms={message.responseTime} />}
            {message.results && message.results.length > 0 && (
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground gap-1" onClick={onExport}><Download className="h-3 w-3" />Export PDF</Button></TooltipTrigger><TooltipContent>Export this result as PDF</TooltipContent></Tooltip>
            )}
          </div>
        )}
        {!isUser && message.sql && <SqlBlock sql={message.sql} />}
        {!isUser && message.results && message.results.length > 0 && (<><ChartPanel results={message.results} /><ResultsTable results={message.results} /></>)}
        {!isUser && message.followups && message.followups.length > 0 && (
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
  const ref = useRef<HTMLSpanElement>(null)
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
  return <span ref={ref}>{count.toLocaleString()}</span>
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
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50 bg-card/50 backdrop-blur">
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

// ─── Main Component ──────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => { fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/history').then(r => r.json()).then(setHistory).catch(() => {}) }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages])

  // Refresh history after each new message
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.isLoading) {
      fetch('/api/history').then(r => r.json()).then(setHistory).catch(() => {})
    }
  }, [messages.length])

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isSending) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: question.trim() }
    const loadingMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', isLoading: true }
    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsSending(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim() }) })
      const data = await res.json()
      const assistantMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant',
        content: data.answer || 'No response generated.',
        sql: data.sql || null, results: data.results || [],
        error: data.error, confidence: data.confidence || 'medium',
        translatedQuestion: data.translatedQuestion || null,
        responseTime: data.responseTime || 0,
        followups: data.followups || [],
      }
      setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), { id: crypto.randomUUID(), role: 'assistant', content: 'Failed to connect. Please check your connection and try again.', error: 'Network error' }])
    } finally { setIsSending(false) }
  }, [isSending])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }, [input, sendMessage])

  // Voice input
  const toggleVoice = useCallback(() => {
    if (typeof window === 'undefined' || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'kn-IN'
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
  }, [isListening])

  // PDF Export via print
  const handleExport = useCallback(() => {
    window.print()
  }, [])

  const clearChat = useCallback(() => { setMessages([]) }, [])

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <header className="no-print flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold leading-tight">KSP Crime Intelligence</h1>
                <p className="text-[10px] text-muted-foreground">Conversational AI for Crime Database</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearChat}><X className="h-3 w-3" />Clear</Button></TooltipTrigger><TooltipContent>Clear conversation</TooltipContent></Tooltip>
              )}
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><History className="h-3 w-3" />History</Button></TooltipTrigger><TooltipContent>Query history</TooltipContent></Tooltip>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - History */}
          {sidebarOpen && (
            <aside className="no-print hidden lg:flex flex-col w-64 flex-shrink-0 border-r bg-card/50 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Recent Queries</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-8">No query history yet</p>
                  ) : history.map((item) => (
                    <button key={item.id} onClick={() => sendMessage(item.question)} className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground line-clamp-2">
                      {item.question}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[65vh] text-center space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-7 w-7 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">Ask anything about crime data</h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Powered by Text-to-SQL AI with self-healing queries, multilingual support, and confidence scoring. Supports Kannada, Hindi, and English.
                      </p>
                    </div>
                    {stats && <DashboardStats stats={stats} />}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl mt-2">
                      {SAMPLE_QUESTIONS.slice(0, 6).map((q) => (
                        <button key={q} onClick={() => sendMessage(q)} className="text-left text-sm px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 group">
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
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} onFollowup={sendMessage} onExport={handleExport} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Quick Bar */}
            {messages.length > 0 && !messages[messages.length - 1]?.isLoading && messages[messages.length - 1]?.followups && messages[messages.length - 1]?.followups!.length > 0 && (
              <div className="no-print px-4 sm:px-6 pb-1">
                <div className="max-w-3xl mx-auto">
                  <ScrollArea className="w-full">
                    <div className="flex gap-1.5 pb-1">
                      {messages[messages.length - 1].followups!.map((fq) => (
                        <button key={fq} onClick={() => sendMessage(fq)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors whitespace-nowrap flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />{fq}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Sample Questions Quick Bar */}
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
                <Card className="shadow-lg border-border/50">
                  <CardContent className="p-3">
                    <div className="flex gap-2 items-end">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask in English, Kannada, or Hindi... (or click 🎤 to speak)"
                        className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                        rows={1}
                        disabled={isSending}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isListening ? 'destructive' : 'ghost'}
                            size="icon"
                            onClick={toggleVoice}
                            disabled={isSending}
                            className="flex-shrink-0 h-10 w-10 rounded-xl"
                          >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isListening ? 'Stop listening' : 'Voice input (Kannada/Hindi/English)'}</TooltipContent>
                      </Tooltip>
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
                <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground/50">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" />KSP Datathon 2026</span>
                  <span>&middot;</span>
                  <span>Self-healing SQL</span>
                  <span>&middot;</span>
                  <span>All queries logged</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}