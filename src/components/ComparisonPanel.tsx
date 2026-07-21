'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316',
]

const tooltipStyle = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }

function MiniChart({ results, accent }: { results: Record<string, unknown>[]; accent?: boolean }) {
  if (!results || results.length === 0) return <p className="text-xs text-muted-foreground/50 text-center py-4">No data</p>
  const columns = Object.keys(results[0])
  const countCol = columns.find((c) => c.toLowerCase().includes('count') || c.toLowerCase().includes('total') || c.toLowerCase() === 'case_count' || c.toLowerCase() === 'total_cases')
  const labelCol = columns.find((c) => c !== countCol && typeof results[0][c] === 'string')

  if (!countCol || !labelCol) return <p className="text-xs text-muted-foreground/50 text-center py-2">No chartable data</p>

  const isTimeSeries = /^\d{4}[-\/]\d{1,2}/.test(String(results[0][labelCol] ?? ''))
  const chartData = results.map((row) => ({
    name: String(row[labelCol] ?? '').length > 12 ? String(row[labelCol]).slice(0, 12) + '...' : String(row[labelCol] ?? ''),
    value: Number(row[countCol] ?? 0),
  }))

  const isPie = !isTimeSeries && results.length <= 6 && (
    labelCol.toLowerCase().includes('status') || labelCol.toLowerCase().includes('category') || labelCol.toLowerCase().includes('priority')
  )

  if (isPie) {
    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={2} dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine>
              {chartData.map((_, i) => <Cell key={i} fill={accent ? CHART_COLORS[(i + 3) % CHART_COLORS.length] : CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (isTimeSeries && results.length >= 3) {
    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <RechartsTooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={accent ? CHART_COLORS[3] : CHART_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={45} />
          <YAxis tick={{ fontSize: 9 }} />
          <RechartsTooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={accent ? CHART_COLORS[3] : CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function MiniTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null
  const cols = Object.keys(results[0])
  const display = results.slice(0, 5)
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/30">
            {cols.map((col) => (
              <th key={col} className="px-2 py-1.5 text-left text-[10px] font-medium text-muted-foreground whitespace-nowrap">{col.replace(/([A-Z])/g, ' $1').trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((row, i) => (
            <tr key={i} className="border-b border-border/10 last:border-0">
              {cols.map((col) => (
                <td key={col} className="px-2 py-1 whitespace-nowrap max-w-[150px] truncate text-[11px]">{String(row[col] ?? '\u2014')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 5 && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">+{results.length - 5} more rows</p>
      )}
    </div>
  )
}

export default function ComparisonPanel({ comparison }: {
  comparison: {
    entityA: string
    entityB: string
    resultsA: Record<string, unknown>[]
    resultsB: Record<string, unknown>[]
    sqlA: string
    sqlB: string
    summary: string
  }
}) {
  return (
    <div className="mt-3 space-y-3">
      {/* Comparison Summary */}
      {comparison.summary && (
        <div className="rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 via-primary/[0.03] to-transparent px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-primary">Comparison Insight</span>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">{comparison.summary}</p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Entity A */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{comparison.entityA}</span>
            <span className="text-[10px] text-muted-foreground">{comparison.resultsA.length} rows</span>
          </div>
          <div className="p-2">
            <MiniChart results={comparison.resultsA} accent={false} />
            <MiniTable results={comparison.resultsA} />
          </div>
        </div>

        {/* Entity B */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{comparison.entityB}</span>
            <span className="text-[10px] text-muted-foreground">{comparison.resultsB.length} rows</span>
          </div>
          <div className="p-2">
            <MiniChart results={comparison.resultsB} accent={true} />
            <MiniTable results={comparison.resultsB} />
          </div>
        </div>
      </div>

      {/* SQL toggle */}
      <details className="rounded-lg border border-border/50 overflow-hidden">
        <summary className="px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
          View Generated SQL Queries
        </summary>
        <div className="px-3 py-2 space-y-2 border-t border-border/30">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">{comparison.entityA}:</p>
            <pre className="text-[10px] font-mono text-foreground/70 bg-muted/50 rounded p-2 overflow-x-auto">{comparison.sqlA}</pre>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1">{comparison.entityB}:</p>
            <pre className="text-[10px] font-mono text-foreground/70 bg-muted/50 rounded p-2 overflow-x-auto">{comparison.sqlB}</pre>
          </div>
        </div>
      </details>
    </div>
  )
}