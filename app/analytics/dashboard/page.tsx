// components/PerformanceDashboard.jsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

const BLUE = "#378ADD";
const GREEN = "#1D9E75";
const RED = "#E24B4A";
const GRID = "rgba(128,128,128,0.12)";

function destroyChart(ref) {
    if (ref.current?.chartInstance) {
        ref.current.chartInstance.destroy();
        ref.current.chartInstance = null;
    }
}

function buildChart(canvasRef, config) {
    destroyChart(canvasRef);
    if (!canvasRef.current) return;
    canvasRef.current.chartInstance = new window.Chart(canvasRef.current, config);
}

const tickStyle = { color: "#888", font: { size: 11 } };
const gridStyle = { color: GRID };
const baseScales = {
    x: { grid: gridStyle, ticks: tickStyle },
    y: { grid: gridStyle, ticks: tickStyle },
};

export default function PerformanceDashboard() {
    const [query, setQuery] = useState("");
    const [genre, setGenre] = useState("");
    const [mustIncludeKeywords, setMustIncludeKeywords] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);

    const breakdownRef = useRef(null);
    const scaleRef = useRef(null);
    const stackedRef = useRef(null);
    const chartJsLoaded = useRef(false);

    // load Chart.js once
    useEffect(() => {
        if (window.Chart) { chartJsLoaded.current = true; return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        s.onload = () => { chartJsLoaded.current = true; };
        document.head.appendChild(s);
    }, []);

    const renderCharts = useCallback((breakdown, hist) => {
        if (!chartJsLoaded.current || !breakdown) return;

        // chart 1 — breakdown horizontal stacked
        buildChart(breakdownRef, {
            type: "bar",
            data: {
                labels: ["current query"],
                datasets: [
                    { label: "Embedding", data: [breakdown.embeddingTime], backgroundColor: BLUE, borderRadius: 4 },
                    { label: "Redis search", data: [breakdown.searchTime], backgroundColor: GREEN, borderRadius: 4 },
                ],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { stacked: true, grid: gridStyle, ticks: tickStyle, title: { display: true, text: "ms", color: "#888", font: { size: 11 } } },
                    y: { stacked: true, grid: gridStyle, ticks: tickStyle },
                },
            },
        });

        // chart 2 — resource usage over data size
        const sorted = [...hist].sort((a, b) => a.dataSizeGB - b.dataSizeGB);
        buildChart(scaleRef, {
            type: "line",
            data: {
                labels: sorted.map((d) => `${d.dataSizeGB} GB`),
                datasets: [
                    { label: "Response (ms)", data: sorted.map((d) => Math.round(d.responseTime)), borderColor: BLUE, backgroundColor: BLUE + "22", fill: true, tension: 0.3, pointRadius: 4 },
                    { label: "CPU (%)", data: sorted.map((d) => Math.round(d.cpu)), borderColor: RED, borderDash: [5, 3], tension: 0.3, pointRadius: 4, fill: false },
                    { label: "Memory (MB/10)", data: sorted.map((d) => Math.round(d.memoryMB / 10)), borderColor: GREEN, borderDash: [2, 3], tension: 0.3, pointRadius: 4, fill: false },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: baseScales,
            },
        });

        // chart 3 — embed vs search per query over history
        buildChart(stackedRef, {
            type: "bar",
            data: {
                labels: sorted.map((_, i) => `Q${i + 1}`),
                datasets: [
                    { label: "Embedding", data: sorted.map((d) => Math.round(d.embeddingTime ?? 0)), backgroundColor: BLUE, borderRadius: 3 },
                    { label: "Redis search", data: sorted.map((d) => Math.round(d.searchTime ?? 0)), backgroundColor: GREEN, borderRadius: 3 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { stacked: true, grid: gridStyle, ticks: tickStyle },
                    y: { stacked: true, grid: gridStyle, ticks: tickStyle, title: { display: true, text: "ms", color: "#888", font: { size: 11 } } },
                },
            },
        });
    }, []);

    useEffect(() => {
        if (data) {
            // small delay to ensure Chart.js is ready after script load
            const t = setTimeout(() => renderCharts(data.breakdown, history), 100);
            return () => clearTimeout(t);
        }
    }, [data, history, renderCharts]);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        // if (!query.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ text: query.trim() });

            if (genre.trim()) params.append("genre", genre.trim());
            if (mustIncludeKeywords.trim()) params.append("must_includes", mustIncludeKeywords.trim());

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_REDIS_SEMANTIC_URL}/api/ai/search?${params.toString()}`,
                { method: "GET" }
            );

            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const json = await res.json();
            console.log(json, "jsonjson");

            setData(json);
            setHistory((prev) => {
                const updated = [...prev, json.breakdown];
                return updated.slice(-8);
            });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }
    const bd = data?.breakdown;
    const cpuHigh = bd?.cpu > 80;
    const memHigh = bd?.memoryMB > 2000;

    return (
        <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>

            {/* search form */}
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginBottom: "1.5rem" }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter search query..."
                    disabled={loading}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14, outline: "none" }}
                />
                <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Genre (optional)"
                    disabled={loading}
                    style={{ width: 160, padding: "10px 14px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14, outline: "none" }}
                />
                <input
                    type="text"
                    value={mustIncludeKeywords}
                    onChange={(e) => setMustIncludeKeywords(e.target.value)}
                    placeholder="Must Match Keywords"
                    disabled={loading}
                    style={{ width: 220, padding: "10px 14px", borderRadius: 8, border: "0.5px solid #ccc", fontSize: 14, outline: "none" }}
                />
                <button
                    type="submit"
                    // disabled={loading || !query.trim()}
                    style={{ padding: "10px 20px", borderRadius: 8, border: "0.5px solid #ccc", background: "transparent", fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {error && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fff0f0", color: "#a32d2d", fontSize: 13, marginBottom: "1rem" }}>
                    {error}
                </div>
            )}

            {/* results */}
            {/* {data?.results?.length > 0 ? (
                <div style={{ marginBottom: "1.5rem", padding: "12px 16px", borderRadius: 8, border: "0.5px solid #e0e0e0", background: "#fafafa" }}>
                    <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>{data.results.length} result(s) for "{data.query}"</p>
                    {data.results.map((r) => {
                        const score = r.vector_score ?? r.value?.vector_score;
                        const scoreNum = typeof score === "number" ? score : parseFloat(score);
                        // cosine distance: lower = better match. 0–0.2 = strong, 0.2–0.4 = moderate, >0.4 = weak
                        const scoreColor = !isNaN(scoreNum)
                            ? scoreNum <= 0.5 ? "#1D9E75"
                                : scoreNum <= 0.7 ? "#BA7517"
                                    : "#E24B4A"
                            : "#bbb";
                        const scoreLabel = !isNaN(scoreNum)
                            ? scoreNum <= 0.5 ? "strong match"
                                : scoreNum <= 0.7 ? "moderate"
                                    : "weak"
                            : null;

                        return (
                            <div key={r.id} style={{ fontSize: 13, color: "#444", padding: "8px 0", borderTop: "0.5px solid #eee" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: "#aaa" }}>{r.id}</span>
                                    <span style={{ background: "#e8f4ff", color: "#185fa5", fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>
                                        {r.value?.genre}
                                    </span>
                                    {!isNaN(scoreNum) && (
                                        <span style={{
                                            fontSize: 11,
                                            color: scoreColor,
                                            background: scoreColor + "18",
                                            padding: "2px 7px",
                                            borderRadius: 4,
                                            fontVariantNumeric: "tabular-nums",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}>
                                            ⌖ {scoreNum.toFixed(4)}
                                            {scoreLabel && (
                                                <span style={{ opacity: 0.75 }}>· {scoreLabel}</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-black font-bold text-[20px]">{r.value?.title}</h3>
                                <div className="px-4 py-2 bg-gray-100 rounded-md mb-2">
                                    <Link className="text-blue-500 hover:underline" href={r.value?.link || "#"} target="_blank" rel="noopener noreferrer">
                                        {r.value?.link}
                                    </Link>
                                </div>
                                <span style={{ color: "#666" }}>{r.value?.content?.slice(0, 500)}...</span>
                            </div>
                        );
                    })}
                </div>
            ) : <div style={{ fontSize: 13, color: "#444", padding: "8px 0", borderTop: "0.5px solid #eee" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ background: "#e8f4ff", color: "#185fa5", fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>
                        NO Results
                    </span>
                </div>
            </div>} */}

            <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>{data?.results?.length} result(s) for "{data?.query}"</p>


            {data?.results?.length > 0 ? (
                <div style={{ marginBottom: "1.5rem", padding: "12px 16px", borderRadius: 8, border: "0.5px solid #e0e0e0", background: "#fafafa" }}>
                    {data.results.map((r) => {
                        const score = r.similarity ?? r.value?.similarity;
                        const scoreNum = typeof score === "number" ? score : parseFloat(score);

                        // similarity score: higher = better match. >0.6 = strong, 0.4–0.6 = moderate, <0.4 = weak
                        const scoreColor = !isNaN(scoreNum)
                            ? scoreNum >= 0.6 ? "#1D9E75"
                                : scoreNum >= 0.4 ? "#BA7517"
                                    : "#E24B4A"
                            : "#bbb";

                        const scoreLabel = !isNaN(scoreNum)
                            ? scoreNum >= 0.6 ? "strong match"
                                : scoreNum >= 0.4 ? "moderate"
                                    : "weak"
                            : null;

                        return (
                            <div key={r.id} style={{ fontSize: 13, color: "#444", padding: "8px 0", borderTop: "0.5px solid #eee" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: "#aaa" }}>{r.id}</span>
                                    <span style={{ background: "#e8f4ff", color: "#185fa5", fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>
                                        {r.value?.genre}
                                    </span>
                                    {!isNaN(scoreNum) && (
                                        <span style={{
                                            fontSize: 11,
                                            color: scoreColor,
                                            background: scoreColor + "18",
                                            padding: "2px 7px",
                                            borderRadius: 4,
                                            fontVariantNumeric: "tabular-nums",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}>
                                            ◎ {(scoreNum * 100).toFixed(1)}% match
                                            {scoreLabel && (
                                                <span style={{ opacity: 0.75 }}>· {scoreLabel}</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-black font-bold text-[20px]">{r.value?.title}</h3>
                                <div className="px-4 py-2 bg-gray-100 rounded-md mb-2">
                                    <Link className="text-blue-500 hover:underline" href={r.value?.link || "#"} target="_blank" rel="noopener noreferrer">
                                        {r.value?.link}
                                    </Link>
                                </div>
                                <span style={{ color: "#666" }}>{r.value?.content?.slice(0, 500)}...</span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ fontSize: 13, color: "#444", padding: "8px 0", borderTop: "0.5px solid #eee" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ background: "#e8f4ff", color: "#185fa5", fontSize: 11, padding: "2px 7px", borderRadius: 4 }}>
                            NO Results
                        </span>
                    </div>
                </div>
            )}

            {/* metric cards */}
            {bd && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginBottom: "1.5rem" }}>
                        {[
                            { label: "Total Response Time", value: `${bd.responseTime} ms` },
                            { label: "Embed time", value: `${bd.embeddingTime} ms` },
                            { label: "Redis search", value: `${bd.searchTime} ms` },
                            { label: "Index size", value: `${bd.dataSizeGB} GB` },
                            { label: "Total Index Size", value: `${data.total_embeddings}` },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ background: "#f5f5f5", borderRadius: 8, padding: "14px 16px" }}>
                                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>{label}</p>
                                <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: "#111" }}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginBottom: "1.5rem" }}>
                        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "14px 16px" }}>
                            <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>CPU usage</p>
                            <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: cpuHigh ? RED : "#111" }}>{bd.cpu}%</p>
                            {cpuHigh && <p style={{ fontSize: 11, color: RED, margin: "4px 0 0" }}>High — add embedding cache</p>}
                        </div>
                        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "14px 16px" }}>
                            <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>Node memory</p>
                            <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: memHigh ? "#BA7517" : "#111" }}>{Math.round(bd.memoryMB)} MB</p>
                            {memHigh && <p style={{ fontSize: 11, color: "#BA7517", margin: "4px 0 0" }}>Above 2 GB threshold</p>}
                        </div>
                    </div>

                    {/* bottleneck bar */}
                    {/* <div style={{ marginBottom: "1.5rem", padding: "14px 16px", borderRadius: 8, border: "0.5px solid #e0e0e0" }}>
                        <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>Bottleneck breakdown</p>
                        {[
                            { label: "Embedding (CPU bound)", pct: Math.round((bd.embeddingTime / bd.responseTime) * 100), color: BLUE },
                            { label: "Redis KNN search", pct: Math.round((bd.searchTime / bd.responseTime) * 100), color: GREEN },
                        ].map(({ label, pct, color }) => (
                            <div key={label} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 4 }}>
                                    <span>{label}</span><span>{pct}%</span>
                                </div>
                                <div style={{ height: 7, background: "#e8e8e8", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                                </div>
                            </div>
                        ))}
                    </div> */}

                    {/* charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                        <div>
                            <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12, color: "#888" }}>
                                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: BLUE, marginRight: 4 }} />Embedding</span>
                                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: GREEN, marginRight: 4 }} />Redis search</span>
                            </div>
                            <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>Response breakdown</p>
                            <div style={{ position: "relative", height: 140 }}>
                                <canvas ref={breakdownRef} role="img" aria-label="Horizontal stacked bar showing embedding vs Redis search time" />
                            </div>
                        </div>
                        <div>
                            <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12, color: "#888" }}>
                                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: BLUE, marginRight: 4 }} />Response ms</span>
                                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: RED, marginRight: 4 }} />CPU %</span>
                                <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: GREEN, marginRight: 4 }} />Mem/10</span>
                            </div>
                            <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>Resources as data grows</p>
                            <div style={{ position: "relative", height: 140 }}>
                                <canvas ref={scaleRef} role="img" aria-label="Line chart of resource usage vs data size" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12, color: "#888" }}>
                            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: BLUE, marginRight: 4 }} />Embedding</span>
                            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: GREEN, marginRight: 4 }} />Redis search</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>Embedding vs search per query</p>
                        <div style={{ position: "relative", height: 180 }}>
                            <canvas ref={stackedRef} role="img" aria-label="Stacked bar chart of embedding and search time per query" />
                        </div>
                    </div>
                </>
            )}

            {!data && !loading && (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "#aaa", fontSize: 14 }}>
                    Enter a query above to see performance metrics
                </div>
            )}
        </div>
    );
}