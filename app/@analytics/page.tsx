'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'

interface SearchResult {
  id: string
  title: string
  score: number
}

export default function Analytics() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const response = await fetch(`/api/ai/search?text=${encodeURIComponent(query)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartData = results.map((result, index) => ({
    name: result.title.length > 20 ? result.title.substring(0, 20) + '...' : result.title,
    score: result.score * 100,
    fullTitle: result.title
  }))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Semantic Search Analytics</CardTitle>
          <CardDescription>
            Visualize search results from Redis vector database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results Visualization</CardTitle>
            <CardDescription>
              Bar chart showing similarity scores for top results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                score: {
                  label: 'Similarity Score (%)',
                  color: 'hsl(var(--chart-1))',
                },
              }}
              className="h-[400px]"
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="score" fill="var(--color-score)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.slice(0, 5).map((result, index) => (
                <div key={result.id} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{index + 1}. {result.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {(result.score * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
