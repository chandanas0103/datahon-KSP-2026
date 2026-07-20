import { Shield, ArrowLeft, Bot, Database, Wrench, Languages, Mic, FileText, Sparkles, ShieldCheck, Brain, Zap, Lock } from 'lucide-react'
import Link from 'next/link'

const PIPELINE_STEPS = [
  {
    icon: Mic,
    title: 'Voice / Text Input',
    desc: 'Officers can type or speak queries in English, Kannada, or Hindi using the Web Speech API for voice recognition.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Languages,
    title: 'Language Detection & Translation',
    desc: 'An LLM-based translation layer detects Kannada and Hindi input and translates it to English before SQL generation.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: 'Text-to-SQL Generation',
    desc: 'A fine-tuned LLM prompt converts natural language to SQLite queries using the KSP crime database schema, with few-shot examples.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Wrench,
    title: 'Self-Healing SQL Engine',
    desc: 'If a generated query fails at the database level, the error is fed back to the LLM for automatic correction — up to 2 retries.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Database,
    title: 'SQLite Execution via Prisma',
    desc: 'Queries are validated (SELECT-only safety guardrail) and executed against the KSP crime database using Prisma ORM with raw SQL.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Confidence Scoring',
    desc: 'Each answer is evaluated by the LLM for confidence — High (clear match), Medium (partial/empty), or Low (mismatch/ambiguous).',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Sparkles,
    title: 'Smart Follow-ups',
    desc: 'The LLM generates 3 contextual follow-up questions after each answer to help officers dig deeper into the data.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    icon: FileText,
    title: 'Report Export',
    desc: 'One-click export of any query result as a formatted HTML report with tables, SQL, confidence badge, and branding.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
]

const FEATURES = [
  { icon: Lock, label: 'SELECT-only guardrail', desc: 'Only read queries are allowed — no INSERT, UPDATE, DELETE, or DDL operations' },
  { icon: Database, label: 'Full audit logging', desc: 'Every query is logged with timestamp, SQL, and results for accountability' },
  { icon: Zap, label: 'Sub-10s responses', desc: 'Optimized pipeline with parallel confidence scoring and follow-up generation' },
  { icon: Bot, label: 'Multi-turn conversation', desc: 'Session-based chat with context-aware follow-up suggestions' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />Back to Chat
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Architecture & Features</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            KSP Crime Intelligence uses a multi-stage AI pipeline to convert natural language questions
            into SQL queries, execute them safely, and return actionable insights.
          </p>
        </div>

        {/* Pipeline Diagram */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Query Pipeline
          </h2>
          <div className="relative">
            <div className="absolute left-[23px] top-8 bottom-8 w-px bg-border" />
            <div className="space-y-0">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                  <div className={`relative z-10 w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0 border border-border/50`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                    <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-background border border-border text-[10px] font-bold flex items-center justify-center text-muted-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-lg">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack & Safety */}
        <section className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />Safety & Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{f.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Database Schema Summary */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />Database Schema
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
              {[
                { name: 'PoliceStation', fields: '10 stations across Bangalore Urban', count: '10 records' },
                { name: 'Officer', fields: 'Inspectors & Sub-Inspectors per station', count: '20 records' },
                { name: 'CrimeType', fields: '15 types across 6 categories', count: '15 records' },
                { name: 'Case', fields: 'FIR, dates, victims, suspects, status, priority, location', count: '200 records' },
                { name: 'QueryLog', fields: 'Audit trail of all user queries', count: 'Auto-generated' },
              ].map((t) => (
                <div key={t.name} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-primary">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.fields}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {['Next.js 16', 'TypeScript', 'Tailwind CSS 4', 'shadcn/ui', 'Prisma ORM', 'SQLite', 'Recharts', 'Web Speech API', 'z-ai-web-dev-sdk'].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs font-medium">{t}</span>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground/50 pt-8 border-t">
          <p>KSP Datathon 2026 — Challenge 1: Conversational AI for Crime Database</p>
        </div>
      </main>
    </div>
  )
}
