'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Shield,
  Send,
  Database,
  MessageSquare,
  BarChart3,
  Bot,
  User,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  results?: Record<string, unknown>[]
  error?: string
  isLoading?: boolean
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
]

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
]

function ResultsTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 10).map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                  {String(row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 10 && (
        <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border/30 bg-muted/20">
          Showing 10 of {results.length} rows
        </div>
      )}
    </div>
  )
}

function ChartPanel({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const columns = Object.keys(results[0])

  // Detect if this is a count/aggregation query suitable for charting
  const countCol = columns.find(
    (c) =>
      c.toLowerCase().includes('count') ||
      c.toLowerCase().includes('total') ||
      c.toLowerCase() === 'case_count' ||
      c.toLowerCase() === 'total_cases'
  )
  const labelCol = columns.find(
    (c) =>
      c !== countCol &&
      typeof results[0][c] === 'string'
  )

  // Check if pie chart suitable (status, category, gender distributions)
  const isPieSuitable =
    labelCol &&
    countCol &&
    (labelCol.toLowerCase().includes('status') ||
      labelCol.toLowerCase().includes('category') ||
      labelCol.toLowerCase().includes('gender') ||
      labelCol.toLowerCase().includes('priority') ||
      results.length <= 8)

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
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={true}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Legend />
            <RechartsTooltip />
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
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="value"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [sql])

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />
          Generated SQL Query
        </span>
        <span className="flex items-center gap-1">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="relative">
          <pre className="px-3 py-2 text-xs font-mono overflow-x-auto text-foreground/80">
            {sql}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-1 right-1 h-7 w-7 p-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  if (message.isLoading) {
    return (
      <div className="flex gap-3 max-w-3xl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 max-w-3xl ${isUser ? 'flex-row-reverse ml-auto' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary/10 text-primary'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 space-y-1 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          }`}
        >
          {message.content}
          {message.error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {message.error}
            </div>
          )}
        </div>

        {!isUser && message.sql && <SqlBlock sql={message.sql} />}

        {!isUser && message.results && message.results.length > 0 && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} />
          </>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isSending) return

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question.trim(),
      }

      const loadingMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        isLoading: true,
      }

      setMessages((prev) => [...prev, userMsg, loadingMsg])
      setInput('')
      setIsSending(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: question.trim() }),
        })

        const data = await res.json()

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.answer || 'No response generated.',
          sql: data.sql || null,
          results: data.results || [],
          error: data.error,
        }

        setMessages((prev) => [...prev.slice(0, -1), assistantMsg])
      } catch {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Failed to connect to the server. Please check your connection and try again.',
          error: 'Network error',
        }
        setMessages((prev) => [...prev.slice(0, -1), errorMsg])
      } finally {
        setIsSending(false)
      }
    },
    [isSending]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">
                  KSP Crime Intelligence
                </h1>
                <p className="text-xs text-muted-foreground">
                  Conversational AI for Crime Database
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <BarChart3 className="h-3 w-3" />
                    200 Cases
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Sample crime records in database</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <Database className="h-3 w-3" />
                    10 Stations
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Police stations across Bangalore</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6">
          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 py-6 space-y-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">
                    Ask anything about crime data
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Powered by Text-to-SQL AI. Ask questions in natural
                    language and get instant answers from the KSP Crime
                    Database.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-4">
                  {SAMPLE_QUESTIONS.slice(0, 6).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-sm px-4 py-3 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all duration-200 group"
                    >
                      <span className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                        <span className="text-foreground/80 group-hover:text-foreground transition-colors">
                          {q}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            )}
          </div>

          {/* Sample Questions Quick Bar (shown when messages exist) */}
          {messages.length > 0 && (
            <div className="pb-2">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {SAMPLE_QUESTIONS.slice(0, 8).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors whitespace-nowrap"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Input Area */}
          <div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-3">
                <div className="flex gap-2 items-end">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about the crime database..."
                    className="min-h-[44px] max-h-[120px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm"
                    rows={1}
                    disabled={isSending}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isSending}
                    className="flex-shrink-0 h-10 w-10 rounded-xl"
                  >
                    {isSending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <p className="text-[10px] text-center text-muted-foreground/60 mt-2">
              KSP Datathon 2026 &middot; Challenge 1 &middot; Text-to-SQL
              with guardrails &middot; All queries are logged
            </p>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}