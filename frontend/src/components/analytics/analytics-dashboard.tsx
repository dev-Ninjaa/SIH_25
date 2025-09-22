"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ChartLine,
  ChartBar,
  ChartScatter,
  ChartArea,
  FileChartColumn,
  FileChartLine,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react"
import clsx from "clsx"

type TimePreset = "7d" | "30d" | "90d" | "ytd"

interface AnalyticsDashboardProps {
  className?: string
  initialPlantId?: string
  initialMetric?: "output" | "efficiency" | "irradiance"
  initialPreset?: TimePreset
}

type Point = { x: number; y: number }
type HeatCell = { x: number; y: number; v: number }

const plants = [
  { id: "plant-01", name: "North Ridge Solar" },
  { id: "plant-02", name: "Coastal Array" },
  { id: "plant-03", name: "Desert Peak" },
]

const metrics = [
  { id: "output", name: "Energy Output (kWh)" },
  { id: "efficiency", name: "Module Efficiency (%)" },
  { id: "irradiance", name: "Irradiance (W/m²)" },
]

function useDemoData() {
  // Generate deterministic demo data
  const base = React.useMemo(() => {
    const rng = (seed: number) => () => (seed = (seed * 9301 + 49297) % 233280) / 233280
    const rand = rng(42)
    const scatter: Point[] = Array.from({ length: 120 }, (_, i) => {
      const x = i + 1
      const y = 30 + Math.sin(i / 8) * 8 + rand() * 8
      return { x, y: Number(y.toFixed(2)) }
    })
    const seriesA: Point[] = Array.from({ length: 120 }, (_, i) => ({
      x: i + 1,
      y: Number((60 + Math.sin(i / 6) * 12 + (rand() - 0.5) * 10).toFixed(2)),
    }))
    const seriesB: Point[] = Array.from({ length: 120 }, (_, i) => ({
      x: i + 1,
      y: Number((55 + Math.cos(i / 9) * 10 + (rand() - 0.5) * 9).toFixed(2)),
    }))
    const heat: HeatCell[] = []
    for (let h = 0; h < 24; h++) {
      for (let d = 0; d < 7; d++) {
        const v =
          10 +
          Math.max(0, 100 * Math.exp(-((h - 12) ** 2) / 60)) * (0.6 + 0.4 * Math.cos((d / 7) * Math.PI * 2)) +
          rand() * 12
        heat.push({ x: d, y: h, v: Number(v.toFixed(1)) })
      }
    }
    const boxGroups = ["String A", "String B", "String C", "String D"].map((g, gi) => {
      const values = Array.from({ length: 40 }, () => 50 + gi * 3 + (rand() - 0.5) * 18)
        .map((v) => Number(v.toFixed(2)))
        .sort((a, b) => a - b)
      return { label: g, values }
    })
    return { scatter, seriesA, seriesB, heat, boxGroups }
  }, [])
  return base
}

function numberToCSV(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => r[h]).join(","))]
  return lines.join("\n")
}

function useZoom(initial: { min: number; max: number }) {
  const [range, setRange] = React.useState<{ min: number; max: number }>(initial)
  return {
    range,
    setRange,
    reset: () => setRange(initial),
  }
}

export default function AnalyticsDashboard({
  className,
  initialPlantId = plants[0].id,
  initialMetric = "output",
  initialPreset = "30d",
}: AnalyticsDashboardProps) {
  const data = useDemoData()
  const [plantId, setPlantId] = React.useState(initialPlantId)
  const [metric, setMetric] = React.useState<typeof initialMetric>(initialMetric)
  const [preset, setPreset] = React.useState<TimePreset>(initialPreset)
  const [from, setFrom] = React.useState<string>("")
  const [to, setTo] = React.useState<string>("")
  const [openCSV, setOpenCSV] = React.useState(false)
  const [openPDF, setOpenPDF] = React.useState(false)
  const zoom = useZoom({ min: 1, max: 120 })

  const filteredSeriesA = React.useMemo(
    () => data.seriesA.filter((p) => p.x >= zoom.range.min && p.x <= zoom.range.max),
    [data.seriesA, zoom.range],
  )
  const filteredSeriesB = React.useMemo(
    () => data.seriesB.filter((p) => p.x >= zoom.range.min && p.x <= zoom.range.max),
    [data.seriesB, zoom.range],
  )
  const filteredScatter = React.useMemo(
    () => data.scatter.filter((p) => p.x >= zoom.range.min && p.x <= zoom.range.max),
    [data.scatter, zoom.range],
  )

  const csvRows = React.useMemo(() => {
    return filteredSeriesA.map((p, i) => ({
      index: p.x,
      seriesA: p.y,
      seriesB: filteredSeriesB[i]?.y ?? "",
      metric,
      plant: plants.find((pl) => pl.id === plantId)?.name ?? "",
    }))
  }, [filteredSeriesA, filteredSeriesB, metric, plantId])

  const csvText = React.useMemo(() => numberToCSV(csvRows as any), [csvRows])

  function handleExportCSV() {
    try {
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "analytics-export.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("CSV exported")
      setOpenCSV(false)
    } catch {
      toast.error("Failed to export CSV")
    }
  }

  function handleExportPDF() {
    // Simulated export: in real app, generate server-side PDF
    try {
      const blob = new Blob([`PDF Report\nPlant: ${plantId}\nMetric: ${metric}\nRange: ${preset}`], {
        type: "application/pdf",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "analytics-report.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("PDF exported")
      setOpenPDF(false)
    } catch {
      toast.error("Failed to export PDF")
    }
  }

  return (
    <section
      className={clsx(
        "w-full max-w-full rounded-xl bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        "border border-border shadow-sm",
        "text-foreground",
        className,
      )}
      aria-label="Analytics and Reporting"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Analytics & Reports</h2>
              <p className="text-sm text-muted-foreground">
                Explore performance patterns, compare metrics, and export formatted reports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={openCSV} onOpenChange={setOpenCSV}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-secondary hover:bg-secondary/80">
                    <FileChartColumn className="mr-2 h-4 w-4" aria-hidden="true" />
                    Export CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl bg-popover text-popover-foreground">
                  <DialogHeader>
                    <DialogTitle>Export CSV Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Review the CSV data before exporting. The export respects filters and zoom range.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border border-border bg-surface-1 p-3">
                    <div className="max-h-64 overflow-auto">
                      <pre className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                        {csvText}
                      </pre>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpenCSV(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleExportCSV}>
                      <FileChartColumn className="mr-2 h-4 w-4" aria-hidden="true" />
                      Download CSV
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={openPDF} onOpenChange={setOpenPDF}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:opacity-90">
                    <FileChartLine className="mr-2 h-4 w-4" aria-hidden="true" />
                    Export PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl bg-popover text-popover-foreground">
                  <DialogHeader>
                    <DialogTitle>PDF Report Preview</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      A formatted report including charts and summary will be exported.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-lg border border-border bg-surface-1 p-4">
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <h3 className="font-semibold">Plant Performance Report</h3>
                        <p className="text-xs text-muted-foreground">
                          {plants.find((p) => p.id === plantId)?.name} • Metric:{" "}
                          {metrics.find((m) => m.id === metric)?.name} • Range: {preset.toUpperCase()}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                        Healthy Trend
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <MiniSpark title="Series A" data={data.seriesA} color="var(--chart-1)" />
                      <MiniSpark title="Series B" data={data.seriesB} color="var(--chart-2)" />
                    </div>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      This preview is indicative. Final PDF will include high-resolution charts and tables.
                    </p>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setOpenPDF(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleExportPDF}>
                      <FileChartLine className="mr-2 h-4 w-4" aria-hidden="true" />
                      Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-surface-1/80 border-border">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="plant">Plant</Label>
                    <Select value={plantId} onValueChange={setPlantId}>
                      <SelectTrigger id="plant" className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Select plant" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {plants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="metric">Metric</Label>
                    <Select value={metric} onValueChange={(v) => setMetric(v as any)}>
                      <SelectTrigger id="metric" className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {metrics.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="preset">Time range</Label>
                    <Select value={preset} onValueChange={(v) => setPreset(v as TimePreset)}>
                      <SelectTrigger id="preset" className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Preset" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="ytd">Year to date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="from">From</Label>
                    <Input
                      id="from"
                      type="date"
                      className="bg-secondary/50 border-border"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="to">To</Label>
                    <Input
                      id="to"
                      type="date"
                      className="bg-secondary/50 border-border"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Adjust filters to refine charts. All exports reflect the current view.
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="zoom-min" className="text-xs text-muted-foreground">
                      Zoom
                    </Label>
                    <input
                      id="zoom-min"
                      type="range"
                      min={1}
                      max={zoom.range.max}
                      value={zoom.range.min}
                      onChange={(e) =>
                        zoom.setRange((r) => ({ ...r, min: Math.min(Number(e.target.value), r.max - 1) }))
                      }
                      className="h-1 w-28 cursor-pointer appearance-none rounded bg-muted accent-[var(--chart-1)]"
                      aria-label="Zoom range start"
                    />
                    <input
                      id="zoom-max"
                      type="range"
                      min={zoom.range.min + 1}
                      max={120}
                      value={zoom.range.max}
                      onChange={(e) =>
                        zoom.setRange((r) => ({ ...r, max: Math.max(Number(e.target.value), r.min + 1) }))
                      }
                      className="h-1 w-28 cursor-pointer appearance-none rounded bg-muted accent-[var(--chart-2)]"
                      aria-label="Zoom range end"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={zoom.reset} className="hover:bg-secondary/50">
                    Reset zoom
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4 bg-secondary/50">
            <TabsTrigger value="performance" className="data-[state=active]:bg-primary/20">
              <ChartLine className="mr-2 h-4 w-4" aria-hidden="true" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="correlation" className="data-[state=active]:bg-primary/20">
              <ChartScatter className="mr-2 h-4 w-4" aria-hidden="true" />
              Correlation
            </TabsTrigger>
            <TabsTrigger value="distribution" className="data-[state=active]:bg-primary/20">
              <ChartBar className="mr-2 h-4 w-4" aria-hidden="true" />
              Box Plots
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="data-[state=active]:bg-primary/20">
              <ChartArea className="mr-2 h-4 w-4" aria-hidden="true" />
              Heatmap
            </TabsTrigger>
          </TabsList>

          {/* Performance comparison line/area */}
          <TabsContent value="performance" className="mt-4">
            <Card className="bg-surface-1/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Performance Comparison</CardTitle>
                <CardDescription>Compare two series across time with gradient area.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveLineArea
                  series={[
                    { name: "Series A", color: "var(--chart-1)", data: filteredSeriesA },
                    { name: "Series B", color: "var(--chart-2)", data: filteredSeriesB },
                  ]}
                  height={260}
                  tooltipFormatter={(p) => `${p.series}: ${p.y.toFixed(2)} @ ${p.x}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scatter plot */}
          <TabsContent value="correlation" className="mt-4">
            <Card className="bg-surface-1/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Correlation Scatter</CardTitle>
                <CardDescription>Explore correlation between metrics.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveScatter
                  points={filteredScatter}
                  height={260}
                  color="var(--chart-3)"
                  tooltipFormatter={(p) => `x: ${p.x}, y: ${p.y.toFixed(2)}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Box plots */}
          <TabsContent value="distribution" className="mt-4">
            <Card className="bg-surface-1/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Statistical Distribution</CardTitle>
                <CardDescription>Box plots for group variability and outliers.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveBoxPlot groups={data.boxGroups} height={260} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heatmap */}
          <TabsContent value="heatmap" className="mt-4">
            <Card className="bg-surface-1/80 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Weekly Heatmap</CardTitle>
                <CardDescription>Intensity by hour and weekday.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveHeatmap cells={data.heat} height={260} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

/* ---------- Charts ---------- */

function ResponsiveLineArea({
  series,
  height = 240,
  tooltipFormatter,
}: {
  series: { name: string; color: string; data: Point[] }[]
  height?: number
  tooltipFormatter?: (p: { x: number; y: number; series: string }) => string
}) {
  const padding = { left: 36, right: 16, top: 12, bottom: 28 }
  const width = 800 // will scale 100% via viewBox
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const xMax = Math.max(...series.flatMap((s) => s.data.map((d) => d.x)), 1)
  const yMax = Math.max(...series.flatMap((s) => s.data.map((d) => d.y)), 1)
  const yMin = Math.min(...series.flatMap((s) => s.data.map((d) => d.y)), 0)

  const xScale = (x: number) => (x / xMax) * innerW + padding.left
  const yScale = (y: number) => height - padding.bottom - ((y - yMin) / (yMax - yMin || 1)) * innerH

  const [hover, setHover] = React.useState<{ x: number; y: number; sx: number; sy: number; label: string } | null>(
    null,
  )

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface-2/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {/* Gradients */}
        {series.map((s, i) => (
          <defs key={i}>
            <linearGradient id={`grad-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          </defs>
        ))}
        {/* Grid */}
        <g stroke="var(--border)" opacity="0.6">
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (i / 4) * innerH
            return <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
          })}
        </g>
        {/* Axes */}
        <g fontSize="10" fill="var(--color-muted-foreground)">
          <text x={padding.left} y={height - 8}>
            0
          </text>
          <text x={width - padding.right - 8} y={height - 8}>
            {xMax}
          </text>
        </g>
        {/* Areas and lines */}
        {series.map((s, i) => {
          const path = s.data
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xScale(p.x)} ${yScale(p.y)}`)
            .join(" ")
          const area = `M ${xScale(s.data[0]?.x || 0)} ${yScale(s.data[0]?.y || 0)} ${s.data
            .map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`)
            .join(" ")} L ${xScale(s.data.at(-1)?.x || 0)} ${height - padding.bottom} L ${xScale(
            s.data[0]?.x || 0,
          )} ${height - padding.bottom} Z`
          return (
            <g key={i}>
              <path d={area} fill={`url(#grad-${i})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth={2} />
            </g>
          )
        })}
        {/* Hover capture */}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = (e.target as SVGRectElement).getBoundingClientRect()
            const sx = e.clientX - rect.left
            const rel = Math.max(0, Math.min(1, (sx - padding.left) / innerW))
            const xVal = Math.round(rel * xMax)
            const s0 = series[0]
            const nearest = s0?.data.reduce(
              (acc, p) => (Math.abs(p.x - xVal) < Math.abs(acc.x - xVal) ? p : acc),
              s0?.data[0] || { x: 0, y: 0 },
            )
            if (!nearest) return
            const sy = yScale(nearest.y)
            setHover({
              x: xVal,
              y: nearest.y,
              sx: xScale(nearest.x),
              sy,
              label: tooltipFormatter
                ? tooltipFormatter({ x: nearest.x, y: nearest.y, series: series[0]?.name })
                : `${nearest.y}`,
            })
          }}
          onMouseLeave={() => setHover(null)}
        />
        {hover && (
          <g pointerEvents="none">
            <line
              x1={hover.sx}
              x2={hover.sx}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="var(--chart-4)"
              strokeDasharray="4,4"
              opacity="0.7"
            />
            <circle cx={hover.sx} cy={hover.sy} r={3} fill="var(--chart-1)" />
          </g>
        )}
      </svg>
      {hover && (
        <div
          role="tooltip"
          aria-hidden={false}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
          style={{ left: hover.sx, top: hover.sy }}
        >
          {hover.label}
        </div>
      )}
    </div>
  )
}

function ResponsiveScatter({
  points,
  height = 240,
  color = "var(--chart-3)",
  tooltipFormatter,
}: {
  points: Point[]
  height?: number
  color?: string
  tooltipFormatter?: (p: Point) => string
}) {
  const padding = { left: 36, right: 16, top: 12, bottom: 28 }
  const width = 800
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const xMax = Math.max(...points.map((p) => p.x), 1)
  const yMax = Math.max(...points.map((p) => p.y), 1)
  const yMin = Math.min(...points.map((p) => p.y), 0)
  const xScale = (x: number) => (x / xMax) * innerW + padding.left
  const yScale = (y: number) => height - padding.bottom - ((y - yMin) / (yMax - yMin || 1)) * innerH
  const [hover, setHover] = React.useState<{ sx: number; sy: number; text: string } | null>(null)

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface-2/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        <g stroke="var(--border)" opacity="0.6">
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (i / 4) * innerH
            return <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
          })}
        </g>
        <g>
          {points.map((p, i) => {
            const sx = xScale(p.x)
            const sy = yScale(p.y)
            return (
              <circle
                key={i}
                cx={sx}
                cy={sy}
                r={3}
                fill={color}
                opacity={0.85}
                onMouseEnter={() =>
                  setHover({
                    sx,
                    sy,
                    text: tooltipFormatter ? tooltipFormatter(p) : `(${p.x}, ${p.y.toFixed(2)})`,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            )
          })}
        </g>
      </svg>
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
          style={{ left: hover.sx, top: hover.sy }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}

function ResponsiveBoxPlot({
  groups,
  height = 240,
}: {
  groups: { label: string; values: number[] }[]
  height?: number
}) {
  const padding = { left: 40, right: 16, top: 16, bottom: 36 }
  const width = 800
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const allValues = groups.flatMap((g) => g.values)
  const vMin = Math.min(...allValues)
  const vMax = Math.max(...allValues)
  const yScale = (v: number) => height - padding.bottom - ((v - vMin) / (vMax - vMin || 1)) * innerH
  const xScale = (i: number) => padding.left + ((i + 0.5) / groups.length) * innerW
  function quartiles(values: number[]) {
    const q = (p: number) => {
      const pos = (values.length - 1) * p
      const base = Math.floor(pos)
      const rest = pos - base
      return values[base] + (values[base + 1] - values[base]) * rest
    }
    return { q1: q(0.25), q2: q(0.5), q3: q(0.75), min: values[0], max: values[values.length - 1] }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface-2/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        <g stroke="var(--border)" opacity="0.6">
          {Array.from({ length: 5 }).map((_, i) => {
            const y = padding.top + (i / 4) * innerH
            return <line key={i} x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
          })}
        </g>
        {groups.map((g, i) => {
          const { q1, q2, q3, min, max } = quartiles(g.values)
          const cx = xScale(i)
          const boxW = innerW / groups.length / 3
          const yq1 = yScale(q1)
          const yq3 = yScale(q3)
          const yq2 = yScale(q2)
          const ymin = yScale(min)
          const ymax = yScale(max)
          return (
            <g key={g.label}>
              {/* whiskers */}
              <line x1={cx} x2={cx} y1={ymax} y2={yq3} stroke="var(--chart-4)" />
              <line x1={cx} x2={cx} y1={yq1} y2={ymin} stroke="var(--chart-4)" />
              {/* box */}
              <rect
                x={cx - boxW / 2}
                y={yq3}
                width={boxW}
                height={Math.max(1, yq1 - yq3)}
                fill="var(--chart-2)"
                opacity={0.25}
                stroke="var(--chart-2)"
              />
              {/* median */}
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={yq2} y2={yq2} stroke="var(--chart-2)" />
              {/* caps */}
              <line x1={cx - boxW / 3} x2={cx + boxW / 3} y1={ymin} y2={ymin} stroke="var(--chart-4)" />
              <line x1={cx - boxW / 3} x2={cx + boxW / 3} y1={ymax} y2={ymax} stroke="var(--chart-4)" />
              {/* labels */}
              <text x={cx} y={height - 12} fill="var(--color-muted-foreground)" fontSize="10" textAnchor="middle">
                {g.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ResponsiveHeatmap({ cells, height = 240 }: { cells: HeatCell[]; height?: number }) {
  const padding = { left: 44, right: 16, top: 16, bottom: 28 }
  const width = 800
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const cols = 7
  const rows = 24
  const cw = innerW / cols
  const ch = innerH / rows
  const vMin = Math.min(...cells.map((c) => c.v))
  const vMax = Math.max(...cells.map((c) => c.v))
  const scale = (v: number) => {
    const t = (v - vMin) / (vMax - vMin || 1)
    return `hsl(168, 60%, ${Math.round(18 + t * 42)}%)`
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const [hover, setHover] = React.useState<{ sx: number; sy: number; text: string } | null>(null)

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface-2/40">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
        {/* grid rects */}
        {cells.map((c, i) => {
          const x = padding.left + c.x * cw
          const y = padding.top + c.y * ch
          const sx = x + cw / 2
          const sy = y + ch / 2
          return (
            <rect
              key={i}
              x={x + 1}
              y={y + 1}
              width={Math.max(0, cw - 2)}
              height={Math.max(0, ch - 2)}
              fill={scale(c.v)}
              rx={2}
              onMouseEnter={() => setHover({ sx, sy, text: `${weekdays[c.x]} ${c.y}:00 • ${c.v}` })}
              onMouseLeave={() => setHover(null)}
            />
          )
        })}
        {/* axes labels */}
        {weekdays.map((d, i) => (
          <text
            key={d}
            x={padding.left + i * cw + cw / 2}
            y={height - 8}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-muted-foreground)"
          >
            {d}
          </text>
        ))}
        {Array.from({ length: rows }).map((_, h) => (
          <text
            key={h}
            x={8}
            y={padding.top + h * ch + ch / 2 + 3}
            fontSize="9"
            fill="var(--color-muted-foreground)"
          >
            {h.toString().padStart(2, "0")}
          </text>
        ))}
      </svg>
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow"
          style={{ left: hover.sx, top: hover.sy }}
        >
          {hover.text}
        </div>
      )}
    </div>
  )
}

/* ---------- Mini spark for PDF preview ---------- */

function MiniSpark({ title, data, color }: { title: string; data: Point[]; color: string }) {
  const width = 360
  const height = 80
  const padding = { left: 4, right: 4, top: 8, bottom: 8 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const yMax = Math.max(...data.map((d) => d.y), 1)
  const yMin = Math.min(...data.map((d) => d.y), 0)
  const xScale = (i: number) => (i / (data.length - 1)) * innerW + padding.left
  const yScale = (v: number) => height - padding.bottom - ((v - yMin) / (yMax - yMin || 1)) * innerH
  const path = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.y)}`)
    .join(" ")
  return (
    <div className="rounded-md border border-border bg-surface-2/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{title}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full">
        <defs>
          <linearGradient id={`spark-${title}-grad`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} />
      </svg>
    </div>
  )
}