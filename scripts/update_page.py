"""Update page.tsx to integrate all 5 new features."""
import re

with open('/home/z/my-project/src/app/page.tsx', 'r') as f:
    content = f.read()

# === 1. Add new imports (icons + dynamic import) ===
old_imports = "  BarChart3 as BarChartIcon, Keyboard, Timer, Lightbulb, Search, Table2, Terminal,"
new_imports = """  BarChart3 as BarChartIcon, Keyboard, Timer, Lightbulb, Search, Table2, Terminal,
  FileSpreadsheet, RotateCcw, GitCompare, MapPin, Zap, FileOutput,"""
if 'GitCompare' not in content:
    content = content.replace(old_imports, new_imports)

# === 2. Add dynamic import for components ===
old_recharts = """} from 'recharts'"""
new_recharts = """} from 'recharts'
import dynamic from 'next/dynamic'
const ComparisonPanel = dynamic(() => import('@/components/ComparisonPanel'), { ssr: false })
const CrimeMapView = dynamic(() => import('@/components/CrimeMapView'), { ssr: false })"""
if 'ComparisonPanel' not in content:
    content = content.replace(old_recharts, new_recharts)

# === 3. Extend Message interface ===
old_interface_end = """  insight?: string | null
}"""
new_interface_end = """  insight?: string | null
  comparison?: {
    entityA: string
    entityB: string
    resultsA: Record<string, unknown>[]
    resultsB: Record<string, unknown>[]
    sqlA: string
    sqlB: string
    summary: string
  } | null
  tableSummary?: string | null
  cached?: boolean
}"""
if 'comparison?' not in content:
    content = content.replace(old_interface_end, new_interface_end, 1)

# === 4. Add CacheHitBadge after SelfHealBadge ===
cache_badge = """
function CacheHitBadge() {
  return (
    <Badge className="gap-1 bg-cyan-500/15 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/25 font-normal">
      <Zap className="h-3 w-3" /> Cached
    </Badge>
  )
}

"""
if 'CacheHitBadge' not in content:
    content = content.replace('function TranslationNotice', cache_badge + 'function TranslationNotice')

# === 5. Add tableSummary display and comparison rendering in MessageBubble ===
# After the AI Insight Card, add TableSummary and ComparisonPanel
old_insight = """        {!isUser && message.insight && !message.streamedContent && (
          <div className="mt-2.5 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">AI Insight</span>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">{message.insight}</p>
          </div>
        )}"""

new_insight = """        {!isUser && message.insight && !message.streamedContent && (
          <div className="mt-2.5 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-primary">AI Insight</span>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">{message.insight}</p>
          </div>
        )}
        {/* Table Summary */}
        {!isUser && message.tableSummary && !message.streamedContent && message.results && message.results.length > 5 && (
          <div className="mt-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-3.5 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3 w-3 text-blue-400" />
              <span className="text-[11px] font-medium text-blue-400">Data Summary</span>
            </div>
            <p className="text-[11px] text-foreground/75 leading-relaxed">{message.tableSummary}</p>
          </div>
        )}
        {/* Comparison Panel */}
        {!isUser && message.comparison && !message.streamedContent && (
          <ComparisonPanel comparison={message.comparison} />
        )}"""

if 'Table Summary' not in content:
    content = content.replace(old_insight, new_insight)

# === 6. Add cache badge to the badges row ===
old_badges = """            {message.confidence && <ConfidenceBadge level={message.confidence} />}
            {message.selfHealed && message.retryCount && <SelfHealBadge count={message.retryCount} />}"""
new_badges = """            {message.cached ? <CacheHitBadge /> : message.confidence && <ConfidenceBadge level={message.confidence} />}
            {message.selfHealed && message.retryCount && <SelfHealBadge count={message.retryCount} />}"""
if 'message.cached ?' not in content:
    content = content.replace(old_badges, new_badges)

# === 7. Skip normal chart/table when comparison is active ===
old_results_render = """        {!isUser && message.results && message.results.length > 0 && !message.streamedContent && message.playgroundResult === undefined && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} onExportCsv={() => { if (message.results) exportCsv(message.results) }} />
          </>
        )}"""
new_results_render = """        {!isUser && message.results && message.results.length > 0 && !message.streamedContent && message.playgroundResult === undefined && !message.comparison && (
          <>
            <ChartPanel results={message.results} />
            <ResultsTable results={message.results} onExportCsv={() => { if (message.results) exportCsv(message.results) }} />
          </>
        )}"""
if '!message.comparison && (' not in content:
    content = content.replace(old_results_render, new_results_render)

# === 8. Add state variables in Home component ===
old_states = """  const [showDemo, setShowDemo] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)"""
new_states = """  const [showDemo, setShowDemo] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapData, setMapData] = useState<Array<{area: string; lat: number; lng: number; total: number; breakdown: Record<string, number>}>>([])
  const [isExportingBrief, setIsExportingBrief] = useState(false)"""
if 'showMap' not in content:
    content = content.replace(old_states, new_states)

# === 9. Add map data fetch and briefing export handler ===
old_clear_chat = "  const clearChat = useCallback(() => { setMessages([]) }, [])"
new_clear_chat = """  // Fetch map data on mount
  useEffect(() => { fetch('/api/map-data').then(r => r.json()).then(setMapData).catch(() => {}) }, [])

  const clearChat = useCallback(() => { setMessages([]) }, [])

  // Export full briefing PDF
  const handleExportBrief = useCallback(() => {
    setIsExportingBrief(true)
    const briefMessages = messages.filter(m => !m.isLoading && !m.streamedContent && m.content).map(m => ({
      role: m.role,
      content: m.content,
      sql: m.sql,
      results: m.results,
      confidence: m.confidence,
      responseTime: m.responseTime,
      insight: m.insight,
      tableSummary: m.tableSummary,
      comparison: m.comparison,
    }))
    fetch('/api/export-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: briefMessages }),
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ksp-briefing-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
    .catch(() => { window.print() })
    .finally(() => setIsExportingBrief(false))
  }, [messages])"""
if 'handleExportBrief' not in content:
    content = content.replace(old_clear_chat, new_clear_chat)

# === 10. Update sendMessage to handle new response fields ===
old_msg_data = """      const assistantMsg: Message = {
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
      }"""
new_msg_data = """      const assistantMsg: Message = {
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
        tableSummary: data.tableSummary || null,
        comparison: data.comparison || null,
        cached: data.cached || false,
      }"""
if 'tableSummary: data.tableSummary' not in content:
    content = content.replace(old_msg_data, new_msg_data)

# === 11. Add Map and Briefing buttons in header ===
old_header_btns = """              <div className="flex items-center gap-2">
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
                </Tooltip>"""
new_header_btns = """              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setShowMap(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50">
                      <MapPin className="h-3 w-3" />Map
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Crime heatmap</TooltipContent>
                </Tooltip>
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
                </Tooltip>"""
if 'Map' not in content.split('TooltipProvider')[1][:500] if 'TooltipProvider' in content else True:
    # More robust check
    if 'setShowMap(true)' not in content:
        content = content.replace(old_header_btns, new_header_btns)

# === 12. Add briefing export button next to Clear button ===
old_clear_btn = """                {messages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearChat}>
                        <X className="h-3 w-3" />Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                )}"""
new_clear_btn = """                {messages.length >= 2 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={handleExportBrief} disabled={isExportingBrief}>
                        <FileOutput className="h-3 w-3" />{isExportingBrief ? 'Exporting...' : 'Briefing'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export full session as PDF briefing</TooltipContent>
                  </Tooltip>
                )}
                {messages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={clearChat}>
                        <X className="h-3 w-3" />Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                )}"""
if 'handleExportBrief' not in content.split('return (')[1] if 'return (' in content else True:
    if 'FileOutput' not in content:
        content = content.replace(old_clear_btn, new_clear_btn)

# === 13. Add CrimeMapView render at the end ===
old_close_tooltip = """      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && ("""
new_close_tooltip = """      {/* Crime Map Overlay */}
      {showMap && mapData.length > 0 && <CrimeMapView data={mapData} onClose={() => setShowMap(false)} />}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && ("""
if 'showMap && mapData' not in content:
    content = content.replace(old_close_tooltip, new_close_tooltip)

# === 14. Add Feature Pills for new features ===
old_pills = """                    <FeaturePill icon={FileText} label="Report Export" />
                    <FeaturePill icon={Sparkles} label="Smart Follow-ups" />"""
new_pills = """                    <FeaturePill icon={FileText} label="Report Export" />
                    <FeaturePill icon={GitCompare} label="Compare Queries" />
                    <FeaturePill icon={MapPin} label="Crime Heatmap" />
                    <FeaturePill icon={Sparkles} label="Smart Follow-ups" />
                    <FeaturePill icon={Zap} label="Query Cache" />"""
if 'GitCompare' not in content.split('FeaturePill')[1][:200] if 'FeaturePill' in content else True:
    if 'Compare Queries' not in content:
        content = content.replace(old_pills, new_pills)

# === 15. Add "compare" sample question ===
old_samples = """  'Show resolved cases from Koramangala',
  'Which station has the highest resolution rate?',"""
new_samples = """  'Show resolved cases from Koramangala',
  'Compare Whitefield vs Koramangala crime rates',
  'Which station has the highest resolution rate?',"""
if 'Compare Whitefield' not in content:
    content = content.replace(old_samples, new_samples)

# Write the updated file
with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(content)

print("page.tsx updated successfully")