'use client'

import { useState } from 'react'
import {
  Languages, Globe, Code2, Database, Bot, ChevronDown, ChevronUp,
  Copy, Check, Wrench, ShieldCheck, ShieldAlert, ShieldQuestion, ArrowDown,
  Terminal, Activity
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ExplainabilityPanelProps {
  userQuestion: string
  translatedQuestion?: string | null
  sql?: string | null
  resultsCount: number
  responseTime?: number
  confidence?: 'high' | 'medium' | 'low'
  selfHealed?: boolean
  retryCount?: number
  finalAnswer: string
}

function detectLanguage(text: string): { code: string; label: string; native: string } {
  if (!text) return { code: 'EN', label: 'English', native: 'English' }
  // Kannada script range: \u0C80-\u0CFF
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return { code: 'KN', label: 'Kannada', native: 'ಕನ್ನಡ' }
  }
  // Devanagari (Hindi) script range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return { code: 'HI', label: 'Hindi', native: 'ಹಿन्दी' }
  }
  return { code: 'EN', label: 'English', native: 'English' }
}

export default function ExplainabilityPanel({
  userQuestion,
  translatedQuestion,
  sql,
  resultsCount,
  responseTime,
  confidence = 'high',
  selfHealed = false,
  retryCount = 0,
  finalAnswer,
}: ExplainabilityPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const langInfo = detectLanguage(userQuestion)
  const isTranslated = Boolean(translatedQuestion && translatedQuestion.trim().toLowerCase() !== userQuestion.trim().toLowerCase())

  const handleCopySQL = () => {
    if (!sql) return
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-3 border border-white/10 rounded-xl glass-card overflow-hidden transition-all duration-300">
      {/* Header Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-900/60 hover:bg-slate-800/80 transition-colors text-left group"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 group-hover:text-amber-400">
          <Terminal className="h-4 w-4 text-amber-400" />
          <span>How AI Processed Your Query</span>
          <Badge className="bg-slate-800 border-white/10 text-[10px] text-slate-400 font-normal px-2">
            Telemetry Pipeline
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {isOpen ? 'Collapse' : 'Expand'}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Workflow Body */}
      {isOpen && (
        <div className="p-4 bg-slate-950/70 border-t border-white/5 space-y-3.5 text-xs">
          
          {/* Step 1: Officer Query */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-blue-400">1</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Officer Query</span>
                <Badge className="bg-slate-800 text-slate-300 border-white/10 text-[10px] px-2 py-0.5 font-mono">
                  [{langInfo.code}] {langInfo.native}
                </Badge>
              </div>
              <p className="text-slate-300 bg-slate-900/80 border border-white/5 rounded-lg px-3 py-2 font-mono text-[11px]">
                "{userQuestion}"
              </p>
            </div>
          </div>

          <div className="pl-3 text-slate-600">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>

          {/* Step 2: Language Detection */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Globe className="h-3 w-3 text-cyan-400" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-semibold text-slate-200">Language Detection</span>
              <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                <span>Detected Language:</span>
                <span className="font-semibold text-cyan-400">{langInfo.label} ({langInfo.native})</span>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0">
                  Verified Script
                </Badge>
              </div>
            </div>
          </div>

          {/* Step 3: Translation (Conditional) */}
          {isTranslated && translatedQuestion && (
            <>
              <div className="pl-3 text-slate-600">
                <ArrowDown className="h-3.5 w-3.5" />
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Languages className="h-3 w-3 text-purple-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <span className="font-semibold text-slate-200">Translation to English</span>
                  <p className="text-purple-300 bg-purple-950/40 border border-purple-500/20 rounded-lg px-3 py-2 font-mono text-[11px]">
                    "{translatedQuestion}"
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="pl-3 text-slate-600">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>

          {/* Step 4: AI Text-to-SQL */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Code2 className="h-3 w-3 text-amber-400" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">AI Text-to-SQL Generation</span>
                  {selfHealed && (
                    <Badge className="gap-1 bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] px-2 py-0">
                      <Wrench className="h-2.5 w-2.5" /> Self-Healed SQL ({retryCount}x Retry)
                    </Badge>
                  )}
                </div>
                {sql && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySQL}
                    className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-white/10 gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy SQL
                      </>
                    )}
                  </Button>
                )}
              </div>
              {sql ? (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/90 p-2.5 font-mono text-[11px] text-amber-300">
                  <code>{sql}</code>
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">No SQL generated.</p>
              )}
            </div>
          </div>

          <div className="pl-3 text-slate-600">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>

          {/* Step 5: Database Execution */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Database className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="flex-1 space-y-1.5">
              <span className="font-semibold text-slate-200">Database Execution Telemetry</span>
              <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-white/5 rounded-lg p-2.5 text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Records</span>
                  <span className="font-mono font-semibold text-emerald-400">{resultsCount} Rows</span>
                </div>
                <div className="space-y-0.5 border-x border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Execution Time</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {responseTime ? `${responseTime} ms` : '< 50 ms'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Confidence</span>
                  <span className="inline-flex items-center justify-center gap-1 font-semibold text-emerald-400 capitalize">
                    {confidence === 'high' && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                    {confidence === 'medium' && <ShieldQuestion className="h-3 w-3 text-amber-400" />}
                    {confidence === 'low' && <ShieldAlert className="h-3 w-3 text-rose-400" />}
                    {confidence}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pl-3 text-slate-600">
            <ArrowDown className="h-3.5 w-3.5" />
          </div>

          {/* Step 6: Final AI Response */}
          <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-3 w-3 text-indigo-400" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="font-semibold text-slate-200">Final Response Output</span>
              <p className="text-slate-300 bg-slate-900/80 border border-white/5 rounded-lg px-3 py-2 text-[11px] line-clamp-3">
                {finalAnswer}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
