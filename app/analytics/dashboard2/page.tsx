"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
} from "react";
import {
  Chart,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Title,
  type ChartConfiguration,
} from "chart.js";

Chart.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Title
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Breakdown {
  responseTime: number;
  embeddingTime: number;
  searchTime: number;
  dataSizeGB: number;
  cpu: number;
  memoryMB: number;
}

interface SearchResult {
  id: string;
  vector_score?: number;
  value?: {
    genre?: string;
    content?: string;
    vector_score?: number;
  };
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  breakdown: Breakdown;
  total_embeddings: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  blue: "#378ADD",
  green: "#1D9E75",
  red: "#E24B4A",
  grid: "rgba(128,128,128,0.12)",
} as const;

const SCORE_THRESHOLDS = {
  strong: 0.5,
  moderate: 0.7,
} as const;

const MAX_HISTORY = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreMeta(score: number): { color: string; label: string } {
  if (score <= SCORE_THRESHOLDS.strong) return { color: "#1D9E75", label: "strong match" };
  if (score <= SCORE_THRESHOLDS.moderate) return { color: "#BA7517", label: "moderate" };
  return { color: "#E24B4A", label: "weak" };
}

function resolveScore(result: SearchResult): number | null {
  const raw = result.vector_score ?? result.value?.vector_score;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const tickStyle = { color: "#888", font: { size: 11 } } as const;
const gridStyle = { color: CHART_COLORS.grid } as const;

const baseScales = {
  x: { grid: gridStyle, ticks: tickStyle },
  y: { grid: gridStyle, ticks: tickStyle },
} as const;

function useChart(ref: React.RefObject<HTMLCanvasElement>) {
  const instanceRef = useRef<Chart | null>(null);

  const build = useCallback((config: ChartConfiguration) => {
    instanceRef.current?.destroy();
    if (!ref.current) return;
    instanceRef.current = new Chart(ref.current, config);
  }, [ref]);

  useEffect(() => () => { instanceRef.current?.destroy(); }, []);

  return build;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      background: "var(--color-background-secondary, #f5f5f5)",
      borderRadius: 8,
      padding: "14px 16px",
    }}>
      <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 4px" }}>{label}</p>
      <p style={{
        fontSize: 20,
        fontWeight: 500,
        margin: 0,
        color: accent ? CHART_COLORS.red : "var(--color-text-primary, #111)",
      }}>
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const { color, label } = getScoreMeta(score);
  return (
    <span style={{
      fontSize: 11,
      color,
      background: `${color}18`,
      padding: "2px 7px",
      borderRadius: 4,
      fontVariantNumeric: "tabular-nums",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}>
      ⌖ {score.toFixed(4)}
      <span style={{ opacity: 0.75 }}>· {label}</span>
    </span>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const score = resolveScore(result);
  return (
    <div style={{
      fontSize: 13,
      color: "var(--color-text-secondary, #444)",
      padding: "8px 0",
      borderTop: "0.5px solid var(--color-border-tertiary, #eee)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary, #aaa)" }}>{result.id}</span>
        {result.value?.genre && (
          <span style={{
            background: "#e8f4ff",
            color: "#185fa5",
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 4,
          }}>
            {result.value.genre}
          </span>
        )}
        {score != null && <ScoreBadge score={score} />}
      </div>
      <span style={{ color: "var(--color-text-secondary, #666)" }}>
        {result.value?.content?.slice(0, 500)}…
      </span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--color-text-secondary, #888)" }}>
      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PerformanceDashboard() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [history, setHistory] = useState<Breakdown[]>([]);

  const breakdownRef = useRef<HTMLCanvasElement>(null!);
  const scaleRef = useRef<HTMLCanvasElement>(null!);
  const stackedRef = useRef<HTMLCanvasElement>(null!);

  const buildBreakdown = useChart(breakdownRef);
  const buildScale = useChart(scaleRef);
  const buildStacked = useChart(stackedRef);

  const renderCharts = useCallback((breakdown: Breakdown, hist: Breakdown[]) => {
    const sorted = [...hist].sort((a, b) => a.dataSizeGB - b.dataSizeGB);

    buildBreakdown({
      type: "bar",
      data: {
        labels: ["current query"],
        datasets: [
          { label: "Embedding", data: [breakdown.embeddingTime], backgroundColor: CHART_COLORS.blue, borderRadius: 4 },
          { label: "Redis search", data: [breakdown.searchTime], backgroundColor: CHART_COLORS.green, borderRadius: 4 },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            stacked: true,
            grid: gridStyle,
            ticks: tickStyle,
            title: { display: true, text: "ms", color: "#888", font: { size: 11 } },
          },
          y: { stacked: true, grid: gridStyle, ticks: tickStyle },
        },
      },
    });

    buildScale({
      type: "line",
      data: {
        labels: sorted.map((d) => `${d.dataSizeGB} GB`),
        datasets: [
          {
            label: "Response (ms)",
            data: sorted.map((d) => Math.round(d.responseTime)),
            borderColor: CHART_COLORS.blue,
            backgroundColor: `${CHART_COLORS.blue}22`,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: "CPU (%)",
            data: sorted.map((d) => Math.round(d.cpu)),
            borderColor: CHART_COLORS.red,
            borderDash: [5, 3],
            tension: 0.3,
            pointRadius: 4,
            fill: false,
          },
          {
            label: "Memory (MB/10)",
            data: sorted.map((d) => Math.round(d.memoryMB / 10)),
            borderColor: CHART_COLORS.green,
            borderDash: [2, 3],
            tension: 0.3,
            pointRadius: 4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: baseScales,
      },
    });

    buildStacked({
      type: "bar",
      data: {
        labels: sorted.map((_, i) => `Q${i + 1}`),
        datasets: [
          {
            label: "Embedding",
            data: sorted.map((d) => Math.round(d.embeddingTime ?? 0)),
            backgroundColor: CHART_COLORS.blue,
            borderRadius: 3,
          },
          {
            label: "Redis search",
            data: sorted.map((d) => Math.round(d.searchTime ?? 0)),
            backgroundColor: CHART_COLORS.green,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true, grid: gridStyle, ticks: tickStyle },
          y: {
            stacked: true,
            grid: gridStyle,
            ticks: tickStyle,
            title: { display: true, text: "ms", color: "#888", font: { size: 11 } },
          },
        },
      },
    });
  }, [buildBreakdown, buildScale, buildStacked]);

  useEffect(() => {
    if (data) renderCharts(data.breakdown, history);
  }, [data, history, renderCharts]);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ text: query.trim() });
      if (genre.trim()) params.append("genre", genre.trim());

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_REDIS_SEMANTIC_URL}/api/ai/search?${params}`,
        { method: "GET" }
      );

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json: SearchResponse = await res.json();

      setData(json);
      setHistory((prev) => [...prev, json.breakdown].slice(-MAX_HISTORY));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const bd = data?.breakdown;
  const cpuHigh = (bd?.cpu ?? 0) > 80;
  const memHigh = (bd?.memoryMB ?? 0) > 2000;

  return (
    <div style={{
      padding: "1.5rem",
      fontFamily: "system-ui, sans-serif",
      maxWidth: 900,
      margin: "0 auto",
      color: "var(--color-text-primary, #111)",
    }}>
      {/* Search form */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query…"
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: "0.5px solid var(--color-border-primary, #ccc)",
            fontSize: 14,
            outline: "none",
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #111)",
          }}
        />
        <input
          type="text"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Genre (optional)"
          disabled={loading}
          style={{
            width: 160,
            padding: "10px 14px",
            borderRadius: 8,
            border: "0.5px solid var(--color-border-primary, #ccc)",
            fontSize: 14,
            outline: "none",
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #111)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "0.5px solid var(--color-border-primary, #ccc)",
            background: "transparent",
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading || !query.trim() ? 0.5 : 1,
            color: "var(--color-text-primary, #111)",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--color-background-danger, #fff0f0)",
          color: "var(--color-text-danger, #a32d2d)",
          fontSize: 13,
          marginBottom: "1rem",
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {data && (
        <div style={{
          marginBottom: "1.5rem",
          padding: "12px 16px",
          borderRadius: 8,
          border: "0.5px solid var(--color-border-tertiary, #e0e0e0)",
          background: "var(--color-background-secondary, #fafafa)",
        }}>
          {data.results.length > 0 ? (
            <>
              <p style={{ fontSize: 12, color: "var(--color-text-tertiary, #888)", margin: "0 0 8px" }}>
                {data.results.length} result(s) for "{data.query}"
              </p>
              {data.results.map((r) => <ResultRow key={r.id} result={r} />)}
            </>
          ) : (
            <span style={{
              background: "#e8f4ff",
              color: "#185fa5",
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 4,
            }}>
              No results
            </span>
          )}
        </div>
      )}

      {/* Metric cards */}
      {bd && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: "1rem",
          }}>
            <MetricCard label="Total response time" value={`${bd.responseTime} ms`} />
            <MetricCard label="Embed time" value={`${bd.embeddingTime} ms`} />
            <MetricCard label="Redis search" value={`${bd.searchTime} ms`} />
            <MetricCard label="Index size" value={`${bd.dataSizeGB} GB`} />
            <MetricCard label="Total index size" value={String(data!.total_embeddings)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: "1.5rem" }}>
            <div style={{ background: "var(--color-background-secondary, #f5f5f5)", borderRadius: 8, padding: "14px 16px" }}>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 4px" }}>CPU usage</p>
              <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: cpuHigh ? CHART_COLORS.red : "var(--color-text-primary, #111)" }}>
                {bd.cpu}%
              </p>
              {cpuHigh && (
                <p style={{ fontSize: 11, color: CHART_COLORS.red, margin: "4px 0 0" }}>High — add embedding cache</p>
              )}
            </div>
            <div style={{ background: "var(--color-background-secondary, #f5f5f5)", borderRadius: 8, padding: "14px 16px" }}>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 4px" }}>Node memory</p>
              <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: memHigh ? "#BA7517" : "var(--color-text-primary, #111)" }}>
                {Math.round(bd.memoryMB)} MB
              </p>
              {memHigh && (
                <p style={{ fontSize: 11, color: "#BA7517", margin: "4px 0 0" }}>Above 2 GB threshold</p>
              )}
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <LegendDot color={CHART_COLORS.blue} label="Embedding" />
                <LegendDot color={CHART_COLORS.green} label="Redis search" />
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 8px" }}>Response breakdown</p>
              <div style={{ position: "relative", height: 140 }}>
                <canvas ref={breakdownRef} aria-label="Horizontal stacked bar showing embedding vs Redis search time" />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                <LegendDot color={CHART_COLORS.blue} label="Response ms" />
                <LegendDot color={CHART_COLORS.red} label="CPU %" />
                <LegendDot color={CHART_COLORS.green} label="Mem/10" />
              </div>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 8px" }}>Resources as data grows</p>
              <div style={{ position: "relative", height: 140 }}>
                <canvas ref={scaleRef} aria-label="Line chart of resource usage vs data size" />
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <LegendDot color={CHART_COLORS.blue} label="Embedding" />
              <LegendDot color={CHART_COLORS.green} label="Redis search" />
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary, #888)", margin: "0 0 8px" }}>Embedding vs search per query</p>
            <div style={{ position: "relative", height: 180 }}>
              <canvas ref={stackedRef} aria-label="Stacked bar chart of embedding and search time per query" />
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--color-text-tertiary, #aaa)", fontSize: 14 }}>
          Enter a query above to see performance metrics
        </div>
      )}
    </div>
  );
}