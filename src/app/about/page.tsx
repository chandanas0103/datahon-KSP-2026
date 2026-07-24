"use client";

import { Shield, Brain, Wrench, Languages, Mic, FileText, Sparkles, ShieldCheck, Database, BarChart3, Zap, ArrowLeft, Award, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: Brain,
    title: "Text-to-SQL Engine",
    description: "Natural language queries are converted to precise SQL using a fine-tuned LLM with comprehensive KSP crime database schema awareness. Supports complex JOINs, aggregations, date filtering, and spatial queries.",
    tech: ["z-ai-web-dev-sdk", "LLM Chat Completions", "Schema-grounded prompting"],
  },
  {
    icon: Wrench,
    title: "Self-Healing SQL Pipeline",
    description: "When generated SQL fails, the system automatically feeds the error back to the LLM and retries up to 2 times with corrected queries. A visible badge shows when self-healing was triggered, building user trust.",
    tech: ["Error-feedback loop", "Max 2 auto-retries", "Visual heal indicator"],
  },
  {
    icon: ShieldCheck,
    title: "Confidence Scoring",
    description: "Every response includes a high/medium/low confidence rating determined by a parallel LLM evaluation that checks if the SQL matches the question intent and whether results are non-empty and relevant.",
    tech: ["Parallel LLM evaluation", "Result relevance check", "Color-coded badges"],
  },
  {
    icon: Languages,
    title: "Multilingual Support (EN/KN/HI)",
    description: "Officers can ask questions in Kannada, Hindi, or English. A translation layer automatically detects the language, translates to English for SQL generation, and shows a translation notice to the user.",
    tech: ["Auto language detection", "Kannada default voice", "Translation notice UI"],
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Web Speech API enables hands-free querying with a microphone button. Supports Kannada (default), Hindi, and English with a single-click language cycler. Critical for field officers.",
    tech: ["Web Speech API", "KN/HI/EN cycling", "Visual recording indicator"],
  },
  {
    icon: Sparkles,
    title: "Smart Follow-up Suggestions",
    description: "After each answer, the LLM generates 3 contextual follow-up questions that a police officer would naturally ask next. These appear as clickable chips below the response and in a quick-access bar.",
    tech: ["Context-aware generation", "Parallel with confidence", "One-click re-query"],
  },
  {
    icon: BarChart3,
    title: "Auto-Detect Charts",
    description: "Query results are automatically analyzed to determine the best visualization. Categorical data (status, gender, priority) renders as donut charts; numerical comparisons render as bar charts.",
    tech: ["Recharts library", "Smart chart type detection", "Donut & bar charts"],
  },
  {
    icon: FileText,
    title: "Report Export",
    description: "Any query result can be exported as a professionally formatted HTML report with KSP branding, suitable for printing or sharing. Includes query, answer, SQL, results table, and metadata.",
    tech: ["HTML report generation", "KSP branded styling", "Print-optimized CSS"],
  },
  {
    icon: Database,
    title: "Query History & Logging",
    description: "Every query is logged to the database with the original question, generated SQL, results, and answer. A collapsible sidebar shows the last 20 queries with relative timestamps for quick re-access.",
    tech: ["QueryLog model", "Persistent storage", "Relative time display"],
  },
  {
    icon: Shield,
    title: "SQL Injection Protection",
    description: "A multi-layer validation system ensures only SELECT queries are executed. Forbidden patterns (INSERT, UPDATE, DELETE, DROP, ALTER, etc.) are blocked before execution. Raw SQL is never trusted.",
    tech: ["Regex-based validation", "SELECT-only enforcement", "Pre-execution safety check"],
  },
  {
    icon: Zap,
    title: "Tactical Dark Command Theme",
    description: "A premium glassmorphic interface built using Tailwind CSS 4 with KSP gold and electric blue accents, glowing status indicators, and responsive design across all screen sizes.",
    tech: ["Glassmorphism", "Tailwind CSS 4", "Custom Glow Effects"],
  },
];

const architecture = [
  { layer: "Frontend", tech: "Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts, Lucide Icons" },
  { layer: "API Layer", tech: "Next.js Route Handlers (GET /api/stats, GET /api/analytics, POST /api/chat, POST /api/export-pdf)" },
  { layer: "AI Engine", tech: "z-ai-web-dev-sdk LLM — Text-to-SQL conversion, translation, confidence scoring, follow-ups" },
  { layer: "Database", tech: "SQLite via Prisma ORM — 5 models (PoliceStation, Officer, CrimeType, Case, QueryLog)" },
  { layer: "Data", tech: "800 seeded crime cases across 10 Bangalore police stations, 20 officers, 15 crime categories, 2 years" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors px-3 py-1.5 rounded-xl glass-card border border-white/10 hover:border-amber-500/30"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Intelligence Hub
        </Link>

        {/* Hero Banner */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/20 border-2 border-amber-500/40 flex-shrink-0">
              <Image src="/ksp_logo.jpg" alt="KSP Emblem" fill className="object-cover" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">KSP Crime Intelligence AI</h1>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">v2.5</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Karnataka State Police Datathon 2026 • Challenge 1 Solution Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Architecture Stack */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-400" /> Technology Architecture Stack
          </h2>
          <div className="space-y-2">
            {architecture.map((item) => (
              <div key={item.layer} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3.5 rounded-xl glass-card border border-white/10">
                <span className="text-xs font-bold text-amber-400 min-w-[100px]">{item.layer}</span>
                <span className="text-xs text-slate-300 font-mono">{item.tech}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competition Features Grid */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" /> 11 Core Competition Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="glass-card glass-card-hover border border-white/10 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">{f.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tech.map((t) => (
                      <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300/90 border border-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-center text-xs text-slate-500">
          KSP Crime Intelligence AI • Karnataka State Police Datathon 2026
        </div>
      </div>
    </div>
  );
}