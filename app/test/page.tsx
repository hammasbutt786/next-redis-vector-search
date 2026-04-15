'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  value: {
    vector_score: string
    content: string
    genre: string
  }
}

interface Timings {
  embeddingMs: number
  redisSearchMs: number
  totalMs: number
}

interface Metrics {
  embeddingMs: number
  redisSearchMs: number
  totalMs: number
  peakCpu: number
  avgCpu: number
  peakMemoryMB: number
  avgMemoryMB: number
  dataSizeGB: number
  numDocs: number
}

interface GraphDataset {
  label: string
  data: number[]
  borderColor: string
  yAxisID?: string
}

interface GraphData {
  labels: string[]
  datasets: GraphDataset[]
}

interface GraphResponse {
  type: string
  data: GraphData
}

interface SearchApiResponse {
  query: string
  total_embeddings: number
  results: SearchResult[]
  graph: GraphResponse
  metrics: Metrics
}

// ─── Chart data formatter ─────────────────────────────────────────────────────

function formatChartData(graph: GraphResponse | null) {
  if (!graph?.data?.labels?.length) return []

  const ds = graph.data.datasets
  // Match dataset by label since order may vary
  const get = (label: string) => ds.find(d => d.label === label)?.data ?? []

  const totalMs     = get('Total Response (ms)')
  const embedMs     = get('Embedding Time (ms)')
  const redisMs     = get('Redis Search (ms)')
  const peakCpu     = get('Peak CPU (%)')
  const avgCpu      = get('Avg CPU (%)')
  const peakMemory  = get('Peak Memory (MB)')
  const avgMemory   = get('Avg Memory (MB)')

  return graph.data.labels.map((label, i) => ({
    label,
    totalMs:      Number(totalMs[i]    ?? 0),
    embeddingMs:  Number(embedMs[i]    ?? 0),
    redisSearchMs: Number(redisMs[i]   ?? 0),
    peakCpu:      Number(peakCpu[i]    ?? 0),
    avgCpu:       Number(avgCpu[i]     ?? 0),
    peakMemoryMB: Number(peakMemory[i] ?? 0),
    avgMemoryMB:  Number(avgMemory[i]  ?? 0),
  }))
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'text-foreground'
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [query, setQuery]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [apiResponse, setApiResponse] = useState<SearchApiResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const chartData = formatChartData(apiResponse?.graph ?? null)
  const metrics   = apiResponse?.metrics
  const topResult = apiResponse?.results?.[0]

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setErrorMessage('')

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_REDIS_SEMANTIC_URL}/api/ai/search?text=${encodeURIComponent(query)}`
      )
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = (await res.json()) as SearchApiResponse
      setApiResponse(data)
    } catch (err) {
      console.error('Search failed:', err)
      setErrorMessage('Unable to load search results. Please try again.')
      setApiResponse(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* ── Search bar ── */}
      <Card>
        <CardHeader>
          <CardTitle>Vector Search Benchmark</CardTitle>
          <CardDescription>
            Run a semantic search and visualise response time, CPU, and memory usage as your index grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Enter a search query…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="sm:w-28">
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
          )}
        </CardContent>
      </Card>

      {apiResponse && (
        <>
          {/* ── Query summary ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Query</p>
              <p className="text-base font-semibold">{apiResponse.query}</p>
              <p className="text-xs text-muted-foreground">
                {apiResponse.total_embeddings.toLocaleString()} embeddings indexed
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Top result</p>
              <p className="text-sm font-semibold">{topResult?.value.genre ?? 'N/A'}</p>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {topResult?.value.content ?? 'No content available.'}
              </p>
            </div>
          </div>

          {/* ── Live metrics from latest query ── */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latest query metrics</CardTitle>
                <CardDescription>
                  Index size: {metrics.dataSizeGB.toFixed(4)} GB &nbsp;·&nbsp;
                  {metrics.numDocs.toLocaleString()} documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard
                    label="Total time"
                    value={`${metrics.totalMs} ms`}
                    color="text-blue-600"
                  />
                  <StatCard
                    label="Embedding"
                    value={`${metrics.embeddingMs} ms`}
                    color="text-purple-600"
                  />
                  <StatCard
                    label="Redis search"
                    value={`${metrics.redisSearchMs} ms`}
                    color="text-orange-500"
                  />
                  <StatCard
                    label="Peak CPU"
                    value={`${metrics.peakCpu}%`}
                    sub={`avg ${metrics.avgCpu}%`}
                    color={metrics.peakCpu > 70 ? 'text-red-500' : 'text-foreground'}
                  />
                  <StatCard
                    label="Peak RAM"
                    value={`${metrics.peakMemoryMB} MB`}
                    sub={`avg ${metrics.avgMemoryMB} MB`}
                    color={metrics.peakMemoryMB > 1500 ? 'text-red-500' : 'text-foreground'}
                  />
                  <StatCard
                    label="Index size"
                    value={`${metrics.dataSizeGB.toFixed(4)} GB`}
                    sub={`${metrics.numDocs.toLocaleString()} docs`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Timing chart ── */}
          {chartData.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Response time vs index size</CardTitle>
                  <CardDescription>
                    How each stage of the pipeline grows as you add more data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      totalMs:       { label: 'Total (ms)',         color: '#2563eb' },
                      embeddingMs:   { label: 'Embedding (ms)',     color: '#9333ea' },
                      redisSearchMs: { label: 'Redis search (ms)',  color: '#f97316' },
                    }}
                    className="h-[300px]"
                  >
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Index size', position: 'insideBottom', offset: -16, fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        label={{ value: 'ms', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" />
                      <Line type="monotone" dataKey="totalMs"       stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="embeddingMs"   stroke="#9333ea" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="redisSearchMs" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* ── CPU chart ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CPU usage vs index size</CardTitle>
                  <CardDescription>
                    Dashed = peak spike · Solid = average. High peak with low average means short bursts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      peakCpu: { label: 'Peak CPU (%)',  color: '#ef4444' },
                      avgCpu:  { label: 'Avg CPU (%)',   color: '#fca5a5' },
                    }}
                    className="h-[260px]"
                  >
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Index size', position: 'insideBottom', offset: -16, fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        label={{ value: '%', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" />
                      <Line type="monotone" dataKey="peakCpu" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="avgCpu"  stroke="#ef4444" strokeWidth={2} strokeOpacity={0.45} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* ── Memory chart ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Memory usage vs index size</CardTitle>
                  <CardDescription>
                    Dashed = peak · Solid = average. Watch for steady growth — it signals memory pressure.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      peakMemoryMB: { label: 'Peak RAM (MB)',  color: '#16a34a' },
                      avgMemoryMB:  { label: 'Avg RAM (MB)',   color: '#86efac' },
                    }}
                    className="h-[260px]"
                  >
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Index size', position: 'insideBottom', offset: -16, fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        label={{ value: 'MB', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" />
                      <Line type="monotone" dataKey="peakMemoryMB" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="avgMemoryMB"  stroke="#16a34a" strokeWidth={2} strokeOpacity={0.45} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Search results list ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Search results
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({apiResponse.results.length} returned)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiResponse.results.map((result, i) => (
                <div
                  key={result.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{i + 1} · {result.value.genre}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      score {Number(result.value.vector_score).toFixed(4)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{result.value.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!apiResponse && !errorMessage && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Run a search to see performance metrics and results.
        </p>
      )}
    </div>
  )
}