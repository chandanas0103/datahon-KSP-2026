'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Shield, Send, Database, MessageSquare, BarChart3, Bot, User,
  AlertTriangle, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Mic, MicOff, FileText, Clock, History, ArrowRight, Languages,
  ShieldCheck, ShieldAlert, ShieldQuestion, X, Download, PanelLeftClose, PanelLeft,
  TrendingUp, FolderOpen, MapPin, Activity, RefreshCw, Wrench, Zap, Play,
  Volume2, VolumeX, Code2, Table as TableIcon, Flame, LayoutDashboard, HelpCircle,
  FileUp, Link2, Target, CheckCircle2, Award, AlertOctagon, Cpu, Layers
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { InvestigationSummary, RelatedCase, ExtractedFIRDetails } from '@/lib/catalyst/types'
import ExplainabilityPanel from '@/components/ExplainabilityPanel'

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
  sqlExplanation?: string | null
  timing?: TimingBreakdown | null
  activeTab?: 'answer' | 'sql' | 'table' | 'chart' | 'investigation' | 'related'
  investigationBriefing?: InvestigationSummary | null
  relatedCases?: RelatedCase[] | null
  circuitState?: any | null
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

// ─── Query Categories ─────────────────────────────────────────

const CATEGORIZED_QUESTIONS = [
  {
    category: '🚨 Priority & Urgency',
    questions: [
      'Show all critical priority cases',
      'How many high priority cases are open?',
      'Show open murder or robbery cases',
    ]
  },
  {
    category: '📍 Station Hotspots',
    questions: [
      'How many cases were filed in Whitefield this year?',
      'Which area has the most theft cases?',
      'Show crime statistics by station area',
    ]
  },
  {
    category: '👮 Officer Workload',
    questions: [
      'How many open cases are assigned to Inspector Ravi Kumar?',
      'Which station has the highest resolution rate?',
      'Show top investigating officers',
    ]
  },
  {
    category: '📈 Crime Analytics',
    questions: [
      'What are the top 5 most common crime types?',
      'How many total cases are in the database?',
      'What is the gender distribution of victims?',
    ]
  }
]

const CHART_COLORS = [
  '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#a855f7', '#64748b'
]

// ─── Sub-components ────────────────────────────────────────

function ConfidenceBadge({ level }: { level: string }) {
  if (level === 'high') return (
    <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold px-2.5 py-0.5">
      <ShieldCheck className="h-3.5 w-3.5" /> High Confidence
    </Badge>
  )
  if (level === 'medium') return (
    <Badge className="gap-1 bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold px-2.5 py-0.5">
      <ShieldQuestion className="h-3.5 w-3.5" /> Medium Confidence
    </Badge>
  )
  return (
    <Badge className="gap-1 bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold px-2.5 py-0.5">
      <ShieldAlert className="h-3.5 w-3.5" /> Low Confidence
    </Badge>
  )
}

function ResponseTimeBadge({ ms }: { ms: number }) {
  const color = ms < 3000 ? 'text-emerald-400' : ms < 8000 ? 'text-amber-400' : 'text-rose-400'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium ${color}`}>
      <Clock className="h-3 w-3" /> {(ms / 1000).toFixed(1)}s
    </span>
  )
}

function SelfHealBadge({ count }: { count: number }) {
  return (
    <Badge className="gap-1 bg-blue-500/15 text-blue-400 border-blue-500/30 font-normal text-[11px]">
      <Wrench className="h-3 w-3" /> Self-healed ({count}x)
    </Badge>
  )
}

function TranslationNotice({ original, translated }: { original: string; translated: string }) {
  if (!translated) return null
  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-300 bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-fit">
      <Languages className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
      <span>Translated via Catalyst Zia: <span className="italic text-slate-400">{original}</span> → <span className="font-semibold text-amber-300">{translated}</span></span>
    </div>
  )
}

function ResultsTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 glass-card">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-white/10 bg-slate-800/80 text-slate-300">
            {columns.map((col) => (
              <th key={col} className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-amber-400 whitespace-nowrap">
                {col.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {results.slice(0, 15).map((row, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              {columns.map((col) => (
                <td key={col} className="px-3.5 py-2.5 whitespace-nowrap max-w-[240px] truncate text-slate-200 font-mono text-[11px]">
                  {String(row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 15 && (
        <div className="px-3.5 py-2 text-[11px] text-slate-400 border-t border-white/5 bg-slate-900/40">
          Showing top 15 of {results.length} records from Catalyst Data Store
        </div>
      )}
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

  return (
    <div className="mt-3 h-64 w-full glass-card p-4 rounded-xl border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        {isPieSuitable ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
            />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" />
            <YAxis stroke="#64748b" fontSize={10} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="value" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceLang, setVoiceLang] = useState<'kn-IN' | 'hi-IN' | 'en-IN'>('kn-IN')
  const [activeCategory, setActiveCategory] = useState(0)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState<ExtractedFIRDetails | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch initial stats and history
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})

    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Speech recognition handler
  const toggleVoice = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

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
    setIsListening(true)
    recognition.start()
  }, [isListening, voiceLang])

  const cycleVoiceLang = () => {
    const langs: Array<'kn-IN' | 'hi-IN' | 'en-IN'> = ['kn-IN', 'hi-IN', 'en-IN']
    const nextIdx = (langs.indexOf(voiceLang) + 1) % langs.length
    setVoiceLang(langs[nextIdx])
  }

  // Speak text
  const speakText = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speakingId === id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const cleanStr = text.replace(/\*\*/g, '').replace(/```[\s\S]*?```/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanStr)
    utterance.lang = 'en-IN'
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  // Handle submit query
  const handleSubmit = async (questionText?: string) => {
    const query = (questionText || input).trim()
    if (!query || isLoading) return

    setInput('')
    const userMsgId = `user-${Date.now()}`
    const assistantMsgId = `asst-${Date.now()}`

    const userMsg: Message = { id: userMsgId, role: 'user', content: query }
    const loadingMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isLoading: true,
      activeTab: 'investigation',
    }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })
      const data = await res.json()

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoading: false,
                content: data.answer || 'No response generated.',
                sql: data.sql,
                results: data.results,
                error: data.error,
                confidence: data.confidence,
                translatedQuestion: data.translatedQuestion,
                responseTime: data.responseTime,
                followups: data.followups,
                selfHealed: data.selfHealed,
                retryCount: data.retryCount,
                sqlExplanation: data.sqlExplanation,
                investigationBriefing: data.investigationBriefing,
                relatedCases: data.relatedCases,
                circuitState: data.circuitState,
                timing: data.timing,
                activeTab: 'investigation',
              }
            : msg
        )
      )

      // Refresh history & stats
      fetch('/api/history')
        .then((r) => r.json())
        .then((d) => setHistory(Array.isArray(d) ? d : []))
        .catch(() => {})
      fetch('/api/stats')
        .then((r) => r.json())
        .then((d) => setStats(d))
        .catch(() => {})
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                isLoading: false,
                content: 'Failed to connect to Catalyst AI services. Please check Catalyst connection.',
                error: 'Network Error',
                confidence: 'low',
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle FIR PDF Upload via Catalyst Stratus + Catalyst Zia OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/fir/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.extractedData) {
        setOcrResult(data.extractedData)
      }
    } catch (err) {
      console.error('FIR Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const exportPDF = async (msg: Message) => {
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: msg.translatedQuestion || msg.content,
          answer: msg.content,
          sql: msg.sql,
          results: msg.results,
          confidence: msg.confidence,
          responseTime: msg.responseTime,
        }),
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KSP-Report-${Date.now()}.html`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
    }
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const setMsgActiveTab = (msgId: string, tab: 'answer' | 'sql' | 'table' | 'chart' | 'investigation' | 'related') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, activeTab: tab } : m))
    )
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* Top Tactical Command Header */}
      <header className="sticky top-0 z-30 glass-card border-b border-white/10 px-4 sm:px-6 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Toggle Query History Sidebar"
            >
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-amber-500/20 border border-amber-500/40">
                <Image
                  src="/ksp_logo.jpg"
                  alt="Karnataka State Police Emblem"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    KSP Crime Intelligence Copilot
                  </h1>
                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] gap-1 px-2 py-0.5 font-bold">
                    ZOHO CATALYST AI
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Karnataka State Police Datathon 2026 • Powered by QuickML, Zia, Data Store & Circuits
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="hidden lg:flex items-center gap-6 glass-card px-4 py-1.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-400">Total FIRs:</span>
              <span className="font-bold text-white font-mono">{stats?.totalCases ?? 800}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-slate-400">Active Open:</span>
              <span className="font-bold text-blue-400 font-mono">{stats?.openCases ?? 299}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">Clearance Rate:</span>
              <span className="font-bold text-emerald-400 font-mono">{stats?.resolutionRate ?? 41}%</span>
            </div>
          </div>

          {/* Action & Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setUploadModalOpen(true)}
              size="sm"
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs rounded-xl gap-1.5 font-semibold"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Smart FIR Upload</span>
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5 shadow-lg shadow-amber-500/20 text-xs rounded-xl">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Executive Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Command Body */}
      <div className="flex-1 flex overflow-hidden relative z-10 max-w-7xl w-full mx-auto">
        {/* Collapsible History Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 glass-card border-r border-white/10 flex flex-col flex-shrink-0 transition-all duration-300">
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <History className="h-4 w-4" />
                <span>Query Audit Log</span>
              </div>
              <Badge className="bg-slate-800 text-slate-400 border-white/10 text-[10px]">
                {history.length} Saved
              </Badge>
            </div>

            <ScrollArea className="flex-1 p-3">
              {history.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-500 text-xs">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No previous query logs found in Catalyst Data Store.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSubmit(item.question)}
                      className="w-full text-left p-2.5 rounded-xl text-xs glass-card-hover border border-white/5 hover:border-amber-500/30 transition-all group"
                    >
                      <p className="font-medium text-slate-200 group-hover:text-amber-400 truncate">
                        {item.question}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Catalyst Services Active Status Telemetry Box */}
            <div className="p-3 border-t border-white/10 bg-slate-950/40 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span>Catalyst Auth:</span>
                <span className="font-mono text-emerald-400 font-bold">SHO Duty Officer</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>QuickML Engine:</span>
                <span className="font-mono text-amber-400 font-bold">LLM + RAG Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Data Store DB:</span>
                <span className="font-mono text-slate-200">800 FIR Records</span>
              </div>
            </div>
          </aside>
        )}

        {/* Central Chat & Intelligence Container */}
        <main className="flex-1 flex flex-col h-[calc(100vh-65px)] min-w-0">
          {/* Scrollable Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto py-8 sm:py-12 space-y-8 text-center">
                {/* Hero Greeting Card */}
                <div className="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden glow-gold">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4 shadow-lg">
                    <Cpu className="h-8 w-8 text-amber-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Welcome to <span className="shimmer-text">KSP AI Investigation Copilot</span>
                  </h2>
                  <p className="text-sm text-slate-300 max-w-xl mx-auto mt-2 leading-relaxed">
                    Powered by <strong className="text-amber-400">Zoho Catalyst QuickML, Zia, Data Store, SmartBrowz & Circuits</strong>.
                    An enterprise AI copilot helping police officers investigate crime patterns, correlate FIRs, and deploy tactical patrols.
                  </p>
                </div>

                {/* Categorized Quick Action Builder */}
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-amber-400" /> Smart Investigation Tags
                    </span>
                    <span className="text-[11px] text-slate-500">Click any tag to query immediately</span>
                  </div>

                  {/* Category Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {CATEGORIZED_QUESTIONS.map((cat, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveCategory(idx)}
                        className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap border ${
                          activeCategory === idx
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'glass-card text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {cat.category}
                      </button>
                    ))}
                  </div>

                  {/* Questions Grid for Selected Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CATEGORIZED_QUESTIONS[activeCategory].questions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmit(q)}
                        className="glass-card glass-card-hover p-3.5 rounded-2xl border border-white/10 text-left text-xs font-medium text-slate-200 flex flex-col justify-between group"
                      >
                        <span>{q}</span>
                        <span className="text-amber-400 text-[10px] font-bold mt-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          Ask AI Copilot <ArrowRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    {msg.role === 'user' ? (
                      /* User Message Bubble */
                      <div className="flex items-start justify-end gap-3">
                        <div className="glass-card bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl max-w-xl text-sm font-medium text-white shadow-xl">
                          <p>{msg.content}</p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold flex-shrink-0 shadow-md">
                          <User className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      /* Assistant Response Card */
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 flex-shrink-0 shadow-lg shadow-amber-500/20 border border-amber-400/40">
                          <Bot className="h-5 w-5" />
                        </div>

                        <div className="flex-1 glass-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                          {msg.isLoading ? (
                            /* Loading Skeleton */
                            <div className="p-5 space-y-3">
                              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold animate-pulse">
                                <Sparkles className="h-4 w-4" /> Catalyst Circuits Workflow: Executing QuickML & Data Store Analysis...
                              </div>
                              <Skeleton className="h-4 w-3/4 bg-slate-800" />
                              <Skeleton className="h-4 w-1/2 bg-slate-800" />
                              <Skeleton className="h-20 w-full rounded-xl bg-slate-800/60" />
                            </div>
                          ) : (
                            <div>
                              {/* Response Header Bar */}
                              <div className="p-3.5 bg-slate-900/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {msg.confidence && <ConfidenceBadge level={msg.confidence} />}
                                  {msg.responseTime && <ResponseTimeBadge ms={msg.responseTime} />}
                                  {msg.selfHealed && <SelfHealBadge count={msg.retryCount || 1} />}
                                </div>

                                {/* Response Tab Controls */}
                                <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-white/10 text-xs">
                                  <button
                                    onClick={() => setMsgActiveTab(msg.id, 'investigation')}
                                    className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                      (msg.activeTab || 'investigation') === 'investigation'
                                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    <Target className="h-3 w-3" /> QuickML Investigation
                                  </button>
                                  <button
                                    onClick={() => setMsgActiveTab(msg.id, 'answer')}
                                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                      msg.activeTab === 'answer'
                                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Summary
                                  </button>
                                  {msg.relatedCases && msg.relatedCases.length > 0 && (
                                    <button
                                      onClick={() => setMsgActiveTab(msg.id, 'related')}
                                      className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                        msg.activeTab === 'related'
                                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      <Link2 className="h-3 w-3" /> Related FIRs ({msg.relatedCases.length})
                                    </button>
                                  )}
                                  {msg.sql && (
                                    <button
                                      onClick={() => setMsgActiveTab(msg.id, 'sql')}
                                      className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                        msg.activeTab === 'sql'
                                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                          : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      <Code2 className="h-3 w-3" /> SQL
                                    </button>
                                  )}
                                  {msg.results && msg.results.length > 0 && (
                                    <>
                                      <button
                                        onClick={() => setMsgActiveTab(msg.id, 'table')}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                          msg.activeTab === 'table'
                                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        <TableIcon className="h-3 w-3" /> Data ({msg.results.length})
                                      </button>
                                      <button
                                        onClick={() => setMsgActiveTab(msg.id, 'chart')}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                                          msg.activeTab === 'chart'
                                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        <BarChart3 className="h-3 w-3" /> Chart
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Translation Banner */}
                              {msg.translatedQuestion && (
                                <div className="px-5 pt-3">
                                  <TranslationNotice original={msg.content} translated={msg.translatedQuestion} />
                                </div>
                              )}

                              {/* Tab Contents */}
                              <div className="p-5 space-y-4">
                                {/* Module 2: AI Investigation Briefing Tab */}
                                {(msg.activeTab || 'investigation') === 'investigation' && (
                                  <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                                      <strong className="text-amber-400 text-sm block mb-1 font-extrabold flex items-center gap-1.5">
                                        <Award className="h-4 w-4" /> Catalyst QuickML Tactical Executive Briefing
                                      </strong>
                                      {msg.investigationBriefing?.summary || msg.content}
                                    </div>

                                    {/* Key Findings & Crime Trends */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="glass-card p-3.5 rounded-xl border border-white/10 space-y-2">
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Key Investigation Findings
                                        </span>
                                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                                          {(msg.investigationBriefing?.keyFindings || ["Analysis completed from returned Data Store records."]).map((f, i) => (
                                            <li key={i}>{f}</li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div className="glass-card p-3.5 rounded-xl border border-white/10 space-y-2">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                                          <TrendingUp className="h-3.5 w-3.5" /> Crime Pattern Trends
                                        </span>
                                        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                                          {(msg.investigationBriefing?.crimeTrends || ["Concentration observed during peak operational windows."]).map((t, i) => (
                                            <li key={i}>{t}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>

                                    {/* Module 6: Actionable Tactical Recommendations */}
                                    {msg.investigationBriefing?.recommendations && (
                                      <div className="space-y-2 pt-2">
                                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Target className="h-4 w-4" /> QuickML Actionable Recommendations
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          {msg.investigationBriefing.recommendations.map((rec, i) => (
                                            <div key={i} className="glass-card p-3 rounded-xl border border-amber-500/20 bg-slate-900/60 text-xs space-y-1">
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-white">{rec.title}</span>
                                                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                                                  {rec.priority}
                                                </Badge>
                                              </div>
                                              <p className="text-slate-300">{rec.description}</p>
                                              <p className="text-amber-400 font-mono text-[11px] pt-1">
                                                👉 Directive: {rec.actionableStep}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {msg.activeTab === 'answer' && (
                                  <div className="text-sm text-slate-200 leading-relaxed space-y-2">
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    {msg.sqlExplanation && (
                                      <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200/90">
                                        <strong className="text-amber-400 block mb-1">💡 Query Insight:</strong>
                                        {msg.sqlExplanation}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Module 3: Related Cases Carousel & Table */}
                                {msg.activeTab === 'related' && msg.relatedCases && (
                                  <div className="space-y-3">
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Link2 className="h-4 w-4" /> Correlated Related FIRs in Catalyst Data Store
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {msg.relatedCases.map((rc) => (
                                        <div key={rc.id} className="glass-card p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-amber-400">{rc.firNumber}</span>
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono text-[11px]">
                                              {rc.similarityScore}% Match
                                            </Badge>
                                          </div>
                                          <div className="text-slate-300 space-y-0.5">
                                            <p><strong>Offense:</strong> {rc.crimeType} ({rc.stationArea})</p>
                                            <p><strong>Suspect:</strong> {rc.accusedName || "Unknown"}</p>
                                            <p className="text-[11px] text-slate-400 italic mt-1">{rc.matchReason}</p>
                                          </div>
                                          <div className="flex flex-wrap gap-1 pt-1">
                                            {rc.matchingFactors.map((fact, idx) => (
                                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-white/5">
                                                {fact}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {msg.activeTab === 'sql' && msg.sql && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                      <span>Executed Catalyst Data Store SQL Query</span>
                                      <button
                                        onClick={() => copyToClipboard(msg.id, msg.sql!)}
                                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                                      >
                                        {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy SQL
                                      </button>
                                    </div>
                                    <pre className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-amber-300 overflow-x-auto">
                                      {msg.sql}
                                    </pre>
                                  </div>
                                )}

                                {msg.activeTab === 'table' && msg.results && (
                                  <ResultsTable results={msg.results} />
                                )}

                                {msg.activeTab === 'chart' && msg.results && (
                                  <ChartPanel results={msg.results} />
                                )}
                              </div>

                              {/* Action Footer Bar */}
                              <div className="p-3 bg-slate-950/40 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => speakText(msg.id, msg.content)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs flex items-center gap-1"
                                    title="Read response aloud via Catalyst Zia TTS"
                                  >
                                    {speakingId === msg.id ? <VolumeX className="h-3.5 w-3.5 text-amber-400" /> : <Volume2 className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => exportPDF(msg)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1.5 border border-white/10"
                                  >
                                    <Download className="h-3 w-3 text-amber-400" /> Export SmartBrowz PDF
                                  </button>
                                </div>

                                {/* Followup Suggestions Chips */}
                                {msg.followups && msg.followups.length > 0 && (
                                  <div className="flex items-center gap-1.5 overflow-x-auto">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Next:</span>
                                    {msg.followups.map((f, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handleSubmit(f)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors whitespace-nowrap"
                                      >
                                        {f}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* How AI Processed Your Query - Explainability Telemetry Panel */}
                              <div className="px-4 pb-3">
                                <ExplainabilityPanel
                                  userQuestion={
                                    messages[messages.findIndex((m) => m.id === msg.id) - 1]?.content ||
                                    msg.translatedQuestion ||
                                    msg.content
                                  }
                                  translatedQuestion={msg.translatedQuestion}
                                  sql={msg.sql}
                                  resultsCount={msg.results ? msg.results.length : 0}
                                  responseTime={msg.responseTime}
                                  confidence={msg.confidence}
                                  selfHealed={msg.selfHealed}
                                  retryCount={msg.retryCount}
                                  finalAnswer={msg.content}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Chat Input Form Bar */}
          <div className="p-4 glass-card border-t border-white/10">
            <div className="max-w-4xl mx-auto space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
                className="relative flex items-center glass-input rounded-2xl p-2 border border-white/10 shadow-2xl"
              >
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'
                  }`}
                  title="Voice Input via Catalyst Zia Speech-to-Text"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Voice Language Switcher */}
                <button
                  type="button"
                  onClick={cycleVoiceLang}
                  className="px-2 py-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors mr-2"
                >
                  {voiceLang.slice(0, 2).toUpperCase()}
                </button>

                {/* Input Textarea */}
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder={isListening ? 'Listening via Catalyst Zia (Kannada/Hindi/English)...' : 'Ask KSP Intelligence Copilot (e.g. "Show critical cases in Whitefield")...'}
                  className="w-full bg-transparent border-0 focus-visible:ring-0 text-sm text-slate-100 placeholder:text-slate-500 min-h-[44px] max-h-32 resize-none py-2 px-1"
                  rows={1}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-2.5 h-10 w-10 rounded-xl shadow-lg shadow-amber-500/20 flex-shrink-0 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
                <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Enter</kbd> to execute Catalyst QuickML query</span>
                <span>Supported by 26 Zoho Catalyst Cloud Services</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Module 7: Smart FIR Document Upload Modal (Catalyst Stratus + Catalyst Zia OCR) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <FileUp className="h-5 w-5" />
                <span>Catalyst Zia OCR — Smart FIR Analysis</span>
              </div>
              <button
                onClick={() => {
                  setUploadModalOpen(false)
                  setOcrResult(null)
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Upload an official FIR Document PDF / Image. The file will be stored in <strong className="text-amber-400">Catalyst Stratus</strong> object storage and processed by <strong className="text-amber-400">Catalyst Zia OCR</strong> to extract suspect details, IPC sections, and populate <strong className="text-amber-400">Catalyst Data Store</strong>.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-amber-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/5 hover:bg-white/10"
            >
              {isUploading ? (
                <div className="space-y-2 py-4">
                  <RefreshCw className="h-8 w-8 mx-auto text-amber-400 animate-spin" />
                  <p className="text-xs text-amber-300 font-bold">Scanning Document via Catalyst Zia OCR...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="h-8 w-8 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-white">Click to Select FIR PDF / Image</p>
                  <p className="text-[10px] text-slate-500">Supports PDF, PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>

            {/* OCR Extracted Result Preview */}
            {ocrResult && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-xs space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between text-amber-400 font-bold border-b border-white/10 pb-1.5">
                  <span>Extracted FIR: {ocrResult.firNumber}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Zia OCR Success</Badge>
                </div>
                <p><strong>Offense:</strong> {ocrResult.crimeType}</p>
                <p><strong>Location:</strong> {ocrResult.location}</p>
                <p><strong>Suspect:</strong> {ocrResult.accusedName}</p>
                <div>
                  <strong className="text-amber-300 block mb-1">Suggested BNS/IPC Sections:</strong>
                  <div className="flex flex-wrap gap-1">
                    {ocrResult.suggestedIPCSections.map((sec, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}