
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface SearchResult {
    id: string
    value: {
        vector_score: string
        content: string
        genre: string
    }
    rerank_score: number
}

interface GraphDataset {
    label: string
    data?: number[]
}

interface GraphData {
    labels: number[]
    datasets: GraphDataset[]
}

interface GraphResponse {
    type: string
    data: GraphData
    options?: {
        scales?: Record<string, Record<string, unknown>>
    }
}

interface MetricPoint {
    dataSizeGB: number
    responseTimeMs: number
    cpuPercent: number
    memoryMB: number
}

interface SearchApiResponse {
    query: string
    total_embeddings: number
    results: SearchResult[]
    graph: GraphResponse
    metrics?: MetricPoint[]
}

const formatChartData = (graph: GraphResponse | null) => {
    if (!graph?.data?.labels?.length || !graph.data.datasets?.[0]?.data?.length) {
        return []
    }

    const responseDataset = graph.data.datasets[0]?.data ?? []
    const cpuDataset = graph.data.datasets[1]?.data ?? []
    const memoryDataset = graph.data.datasets[2]?.data ?? []

    return graph.data.labels.map((label, index) => {
        const memoryMB = Number(memoryDataset[index] ?? 0)
        return {
            sizeGB: Number(label),
            responseTimeMs: Number(responseDataset[index] ?? 0),
            cpuUsage: Number(cpuDataset[index] ?? 0),
            memoryMB,
            memoryGB: Number((memoryMB / 1024).toFixed(2)),
        }
    })
}

export default function Analytics() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiResponse, setApiResponse] = useState<SearchApiResponse | null>(null)
    const [errorMessage, setErrorMessage] = useState('')
    console.log(apiResponse, 'apiResponse')
    const chartData = formatChartData(apiResponse?.graph ?? null)
    const topResult = apiResponse?.results?.at(-1)

    const latestMemoryMB = chartData[chartData.length - 1]?.memoryMB ?? 0
    const latestMemoryGB = chartData[chartData.length - 1]?.memoryGB ?? 0
    const averageMemoryMB = chartData.length
        ? Math.round(chartData.reduce((sum, point) => sum + point.memoryMB, 0) / chartData.length)
        : 0
    const averageMemoryGB = Number((averageMemoryMB / 1024).toFixed(2))

    const handleSearch = async () => {
        if (!query.trim()) return

        setLoading(true)
        setErrorMessage('')

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_REDIS_SEMANTIC_URL}/api/ai/search?text=${encodeURIComponent(query)}`)
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`)
            }

            const data = (await response.json()) as SearchApiResponse
            setApiResponse(data)
        } catch (error) {
            console.error('Search failed:', error)
            setErrorMessage('Unable to load search results. Please try again.')
            setApiResponse(null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Search and Response Time</CardTitle>
                    <CardDescription>
                        Enter a query and visualize the API response graph for response time by data size.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            placeholder="Search query"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? 'Searching…' : 'Search'}
                        </Button>
                    </div>

                    {errorMessage ? (
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    ) : apiResponse ? (
                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                            <div className="rounded-xl border border-border p-4 bg-card">
                                <p className="text-sm text-muted-foreground">Query</p>
                                <p className="mt-2 text-lg font-semibold">{apiResponse.query}</p>
                                <p className="mt-1 text-sm text-muted-foreground">Total embeddings: {apiResponse.total_embeddings}</p>
                            </div>
                            <div className="rounded-xl border border-border p-4 bg-card">
                                <p className="text-sm text-muted-foreground">Top result genre</p>
                                <p className="mt-2 text-lg font-semibold">{topResult?.value.genre ?? 'N/A'}</p>
                                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{topResult?.value.content ?? 'No result content available.'}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Search to load the graph and top result summary.</p>
                    )}

                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-4">
                            <p className="text-sm font-semibold">Performance Graph</p>
                            <p className="text-xs text-muted-foreground">Response time vs data size from API graph data.</p>
                        </div>
                        {chartData.length > 0 && (
                            <div className="grid gap-4 sm:grid-cols-2 mb-4">
                                <div className="rounded-lg border border-border p-3 bg-background">
                                    <p className="text-xs text-muted-foreground">Latest RAM</p>
                                    <p className="mt-2 text-lg font-semibold">{latestMemoryMB} MB</p>
                                    <p className="text-xs text-muted-foreground">({latestMemoryGB} GB)</p>
                                </div>
                                <div className="rounded-lg border border-border p-3 bg-background">
                                    <p className="text-xs text-muted-foreground">Average RAM</p>
                                    <p className="mt-2 text-lg font-semibold">{averageMemoryMB} MB</p>
                                    <p className="text-xs text-muted-foreground">({averageMemoryGB} GB)</p>
                                </div>
                            </div>
                        )}
                        <div className="rounded-xl border border-border bg-slate-50 p-3 mb-4">
                            <p className="text-sm font-semibold">How this page works</p>
                            <ul className="mt-2 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                                <li>Type a search query and click Search to fetch data from the API.</li>
                                <li>The API response must include a <code>graph</code> payload with labels and datasets.</li>
                                <li>The chart displays response time, CPU usage, and memory usage together.</li>
                                <li>RAM is calculated from the memory dataset and shown in both MB and GB.</li>
                            </ul>
                        </div>

                        {chartData.length > 0 ? (
                            <ChartContainer
                                config={{
                                    responseTimeMs: { label: 'Response Time (ms)', color: '#2563eb' },
                                    cpuUsage: { label: 'CPU Usage (%)', color: '#ef4444' },
                                    memoryMB: { label: 'Memory Usage (MB)', color: '#16a34a' },
                                }}
                                className="h-[360px]"
                            >
                                <LineChart data={chartData} margin={{ top: 16, right: 20, left: 20, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="sizeGB"
                                        tickFormatter={(value) => Number(value).toFixed(2)}
                                        label={{ value: 'Data Size (GB)', position: 'insideBottom', offset: -5 }}
                                    />
                                    <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft', offset: 0 }} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="responseTimeMs" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="cpuUsage" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="memoryMB" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ChartContainer>
                        ) : apiResponse ? (
                            <p className="text-sm text-muted-foreground">Graph data is not available for this response.</p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Search to display the performance graph here.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

