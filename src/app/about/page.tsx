import { Shield, Brain, Wrench, Languages, Mic, FileText, Sparkles, ShieldCheck, Database, BarChart3, Zap, ArrowLeft, GitCompare, MapPin, FileOutput, Bolt } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

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
    title: "KSP Branded Dark Theme",
    description: "A premium dark interface using oklch color space with police navy blue and gold accent colors. Animated stat counters, glassmorphism effects, and responsive design across all screen sizes.",
    tech: ["oklch color system", "Tailwind CSS 4", "Animated counters"],
  },
  {
    icon: GitCompare,
    title: "Comparison Query Engine",
    description: "Detects comparison patterns (e.g., 'Compare X vs Y') and automatically generates two parallel SQL queries. Results render side-by-side with dual charts, tables, and an AI-generated comparison summary.",
    tech: ["Pattern detection (3 regex)", "Parallel SQL execution", "AI comparison summary"],
  },
  {
    icon: MapPin,
    title: "Crime Location Heatmap",
    description: "An interactive Leaflet map visualizes crime data across 10 Bangalore areas. Circle markers are sized by case count and color-coded by primary crime type with click-through breakdowns.",
    tech: ["Leaflet + OpenStreetMap", "Dark CartoDB tiles", "Dynamic import (SSR-safe)"],
  },
  {
    icon: FileOutput,
    title: "Session Intelligence Briefing",
    description: "Export the entire conversation as a multi-page PDF with KSP-branded cover, table of contents, executive summary of all insights, and per-query sections with results.",
    tech: ["PDFKit", "Multi-page generation", "Cover + TOC + summary"],
  },
  {
    icon: Bolt,
    title: "Query Cache & Performance",
    description: "In-memory LRU cache (100 entries, 5-min TTL) returns identical re-queries in 0ms with a visible Cached badge.",
    tech: ["In-memory LRU Map", "5-minute TTL", "0ms cache-hit"],
  },
  {
    icon: Sparkles,
    title: "AI Table Summaries",
    description: "For results with 5+ rows, an LLM generates a 2-sentence natural language summary highlighting top entries and patterns.",
    tech: ["Conditional generation", "Parallel LLM call", "2-sentence output"],
  },
];

const architecture = [
  { layer: "Frontend", tech: "Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Recharts" },
  { layer: "API Layer", tech: "Next.js Route Handlers (GET /api/stats, GET /api/history, GET /api/map-data, POST /api/chat, POST /api/export-pdf, POST /api/export-brief)" },
  { layer: "AI Engine", tech: "z-ai-web-dev-sdk LLM — SQL generation, translation, confidence scoring, follow-up generation" },
  { layer: "Database", tech: "SQLite via Prisma ORM — 5 models (PoliceStation, Officer, CrimeType, Case, QueryLog)" },
  { layer: "Data", tech: "800 seeded crime cases across 10 Bangalore areas, 30 officers, 15 crime types, 2 years" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />Back to Chat
        </Link>

        <div className="space-y-2 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">KSP Crime Intelligence</h1>
              <p className="text-sm text-muted-foreground">Architecture & Features — KSP Datathon 2026</p>
            </div>
          </div>
        </div>

        {/* Architecture Stack */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />Architecture Stack
          </h2>
          <div className="space-y-2">
            {architecture.map((item) => (
              <div key={item.layer} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50">
                <span className="text-xs font-semibold text-primary min-w-[90px] pt-0.5">{item.layer}</span>
                <span className="text-sm text-muted-foreground">{item.tech}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />16 Competition Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50 bg-card/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{f.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.tech.map((t) => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground/50">
          KSP Crime Intelligence — Built for KSP Datathon 2026 Challenge 1
        </div>
      </div>
    </div>
  );
}