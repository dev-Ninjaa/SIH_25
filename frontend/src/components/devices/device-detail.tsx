"use client"

import * as React from "react"
import { Gauge as GaugeIcon, ChartSpline, SlidersVertical, BatteryCharging, Clock3, ListFilter, Radar, Webhook } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

type DeviceStatus = "online" | "offline" | "warning" | "maintenance"

type TelemetryPoint = {
  t: number // epoch ms
  power: number // kW
  voltage: number // V
  temperature: number // °C
  frequency: number // Hz
  soc: number // %
}

type EventLog = {
  id: string
  ts: number
  level: "info" | "warning" | "error"
  message: string
  code?: string
}

export type DeviceDetailProps = {
  className?: string
  deviceId: string
  name: string
  model?: string
  firmware?: string
  status: DeviceStatus
  location?: string
  initialTelemetry?: TelemetryPoint[]
  initialLogs?: EventLog[]
  live?: boolean
  onReboot?: (deviceId: string) => Promise<void> | void
  onSaveConfig?: (deviceId: string, config: Record<string, string>) => Promise<void> | void
}

type GaugeProps = {
  label: string
  value: number
  unit?: string
  min: number
  max: number
  zones?: { from: number; to: number; color: string }[] // colors should be Tailwind token hex or currentColor
  icon?: React.ReactNode
  gradientFrom?: string
  gradientTo?: string
  precision?: number
  loading?: boolean
}

function formatNumber(value: number, precision = 0) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  }).format(value)
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

// Semi-circle gauge with animated needle
const SemicircleGauge: React.FC<GaugeProps> = ({
  label,
  value,
  unit,
  min,
  max,
  zones = [
    { from: min, to: min + (max - min) * 0.6, color: "var(--success)" },
    { from: min + (max - min) * 0.6, to: min + (max - min) * 0.85, color: "var(--warning)" },
    { from: min + (max - min) * 0.85, to: max, color: "var(--danger)" },
  ],
  icon,
  gradientFrom = "rgba(46, 211, 183, 0.25)",
  gradientTo = "rgba(240, 178, 137, 0.15)",
  precision = 0,
  loading,
}) => {
  const [displayValue, setDisplayValue] = React.useState(value)
  const prevRef = React.useRef(value)

  React.useEffect(() => {
    // Smoothly animate the displayed value
    const start = prevRef.current
    const end = value
    const duration = 600
    const startTime = performance.now()
    let raf = 0
    const step = (now: number) => {
      const p = clamp((now - startTime) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayValue(start + (end - start) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else prevRef.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const size = 180
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 12
  const startAngle = Math.PI // 180 deg
  const endAngle = 0

  const valNorm = (clamp(displayValue, min, max) - min) / (max - min)
  const angle = startAngle + (endAngle - startAngle) * valNorm

  const polarToCartesian = (angleRad: number, radius: number) => ({
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  })

  const arcPath = (from: number, to: number, radius: number) => {
    const start = polarToCartesian(startAngle + (endAngle - startAngle) * ((from - min) / (max - min)), radius)
    const end = polarToCartesian(startAngle + (endAngle - startAngle) * ((to - min) / (max - min)), radius)
    const largeArcFlag = to - from > (max - min) / 2 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  }

  return (
    <Card className="bg-[--surface-1] border-border/60 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface-1)/.85]">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <div className="text-[--chart-1]">{icon}</div>
          <CardTitle className="text-sm font-medium text-foreground/90">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="relative">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            width="100%"
            height="auto"
            role="img"
            aria-label={`${label} gauge`}
            className="max-w-full"
          >
            <defs>
              <linearGradient id="gaugeFill" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={gradientFrom} />
                <stop offset="100%" stopColor={gradientTo} />
              </linearGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background arc */}
            <path
              d={arcPath(min, max, r)}
              stroke="url(#gaugeFill)"
              strokeWidth="12"
              fill="none"
              opacity="0.25"
            />

            {/* Zones */}
            {zones.map((z, i) => (
              <path
                key={i}
                d={arcPath(z.from, z.to, r)}
                stroke={z.color}
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
            ))}

            {/* Tick marks */}
            {Array.from({ length: 11 }).map((_, i) => {
              const a = startAngle + (endAngle - startAngle) * (i / 10)
              const p1 = polarToCartesian(a, r - 2)
              const p2 = polarToCartesian(a, r - (i % 5 === 0 ? 18 : 12))
              return (
                <line
                  key={i}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                  strokeWidth={i % 5 === 0 ? 2 : 1}
                />
              )
            })}

            {/* Needle */}
            <g
              transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`}
              className="transition-transform duration-500 ease-out"
              style={{ filter: "url(#softGlow)" }}
            >
              <line
                x1={cx}
                y1={cy}
                x2={cx + (r - 22)}
                y2={cy}
                stroke="var(--chart-1)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="5" fill="var(--chart-1)" />
            </g>
          </svg>

          {/* Readout */}
          <div className="absolute inset-x-0 -bottom-1 flex flex-col items-center">
            {loading ? (
              <Skeleton className="h-8 w-28 rounded-md bg-[--surface-2]" />
            ) : (
              <div className="text-xl font-semibold font-heading tracking-tight">
                {formatNumber(displayValue, precision)}
                {unit ? <span className="text-foreground/70 text-sm ml-1">{unit}</span> : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const AreaChart: React.FC<{
  data: { t: number; v: number }[]
  color?: string
  height?: number
  loading?: boolean
}> = ({ data, color = "var(--chart-1)", height = 180, loading }) => {
  const width = 640
  const padding = 16

  if (loading) {
    return <Skeleton className="w-full h-[180px] rounded-lg bg-[--surface-2]" />
  }

  if (!data.length) {
    return (
      <div className="h-[180px] w-full grid place-items-center text-sm text-muted-foreground bg-[--surface-1] rounded-lg border border-border/60">
        No data
      </div>
    )
  }

  const xs = data.map((d) => d.t)
  const ys = data.map((d) => d.v)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scaleX = (t: number) =>
    padding + ((t - minX) / (maxX - minX || 1)) * (width - padding * 2)
  const scaleY = (v: number) =>
    height - padding - ((v - minY) / (maxY - minY || 1)) * (height - padding * 2)

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(d.t)} ${scaleY(d.v)}`)
    .join(" ")

  const area = `${path} L ${scaleX(maxX)} ${height - padding} L ${scaleX(minX)} ${height - padding} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Telemetry chart"
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gridStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = padding + (i / 3) * (height - padding * 2)
        return (
          <line
            key={i}
            x1={padding}
            x2={width - padding}
            y1={y}
            y2={y}
            stroke="url(#gridStroke)"
            strokeWidth="1"
          />
        )
      })}
      {/* Area */}
      <path d={area} fill="url(#chartFill)" />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function DeviceDetail({
  className,
  deviceId,
  name,
  model = "HX-500 Inverter",
  firmware = "v3.4.2",
  status,
  location,
  initialTelemetry = [],
  initialLogs = [],
  live = true,
  onReboot,
  onSaveConfig,
}: DeviceDetailProps) {
  const [range, setRange] = React.useState<"1h" | "6h" | "24h" | "7d">("6h")
  const [search, setSearch] = React.useState("")
  const [level, setLevel] = React.useState<"all" | "info" | "warning" | "error">("all")
  const [telemetry, setTelemetry] = React.useState<TelemetryPoint[]>(
    initialTelemetry.length ? initialTelemetry : generateMockTelemetry(Date.now())
  )
  const [logs, setLogs] = React.useState<EventLog[]>(initialLogs.length ? initialLogs : generateMockLogs(Date.now()))
  const [busy, setBusy] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)

  // Live updates simulation (replace with real-time subscription)
  React.useEffect(() => {
    if (!live) return
    let interval: number | undefined
    const update = () => {
      setUpdating(true)
      setTelemetry((prev) => {
        const next = produceNextTelemetry(prev)
        return next
      })
      // occasionally add a log
      if (Math.random() < 0.25) {
        setLogs((prev) => [generateRandomLog(), ...prev].slice(0, 200))
      }
      const t = setTimeout(() => setUpdating(false), 500)
      return () => clearTimeout(t)
    }
    interval = window.setInterval(update, 4000)
    return () => clearInterval(interval)
  }, [live])

  const latest = telemetry[telemetry.length - 1]

  const filteredLogs = logs.filter((l) => {
    const matchesLevel = level === "all" ? true : l.level === level
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      l.message.toLowerCase().includes(q) ||
      l.code?.toLowerCase().includes(q) ||
      new Date(l.ts).toLocaleString().toLowerCase().includes(q)
    return matchesLevel && matchesSearch
  })

  const chartData = React.useMemo(() => {
    const now = Date.now()
    const rangeMs =
      range === "1h" ? 3600_000 :
      range === "6h" ? 6 * 3600_000 :
      range === "24h" ? 24 * 3600_000 :
      7 * 24 * 3600_000
    const start = now - rangeMs
    const pts = telemetry.filter((p) => p.t >= start)
    const map = (key: keyof TelemetryPoint) => pts.map((p) => ({ t: p.t, v: Number(p[key]) }))
    return {
      power: map("power"),
      voltage: map("voltage"),
      temperature: map("temperature"),
      frequency: map("frequency"),
      soc: map("soc"),
    }
  }, [telemetry, range])

  const statusBadge = (
    <Badge
      variant="outline"
      className={cn(
        "border-0 bg-[--surface-2] text-xs",
        status === "online" && "text-[--success]",
        status === "offline" && "text-[--danger]",
        status === "warning" && "text-[--warning]",
        status === "maintenance" && "text-[--chart-2]",
      )}
    >
      <span className="inline-block mr-1 h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: statusColor(status) }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )

  async function handleReboot() {
    setBusy(true)
    try {
      await Promise.resolve(onReboot?.(deviceId))
      toast.success("Device reboot initiated")
    } catch (e) {
      toast.error("Failed to initiate reboot")
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveConfig(formData: FormData) {
    const cfg = Object.fromEntries(formData.entries()) as Record<string, string>
    setBusy(true)
    try {
      await Promise.resolve(onSaveConfig?.(deviceId, cfg))
      toast.success("Configuration updated")
    } catch (e) {
      toast.error("Failed to save configuration")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={cn("w-full max-w-full", className)}>
      {/* Header */}
      <Card className="bg-[--surface-1] border-border/60 mb-4">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Radar className="size-4 text-[--chart-1]" aria-hidden="true" />
              <CardTitle className="text-base sm:text-lg md:text-xl truncate">{name}</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm break-words">
              <span className="text-muted-foreground">ID:</span> {deviceId}{" "}
              {location ? <span className="text-muted-foreground">• {location}</span> : null}{" "}
              <span className="text-muted-foreground">• {model}</span>{" "}
              <span className="text-muted-foreground">• {firmware}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              <span>Last update {updating ? "..." : timeAgo(telemetry[telemetry.length - 1]?.t)}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <SemicircleGauge
          label="Power Output"
          value={latest?.power ?? 0}
          unit="kW"
          min={0}
          max={10}
          precision={2}
          zones={[
            { from: 0, to: 6, color: "var(--success)" },
            { from: 6, to: 8.5, color: "var(--warning)" },
            { from: 8.5, to: 10, color: "var(--danger)" },
          ]}
          icon={<GaugeIcon className="size-4" />}
          gradientFrom="rgba(46,211,183,0.3)"
          gradientTo="rgba(240,178,137,0.15)"
          loading={updating}
        />
        <SemicircleGauge
          label="Voltage"
          value={latest?.voltage ?? 0}
          unit="V"
          min={300}
          max={450}
          precision={0}
          zones={[
            { from: 300, to: 360, color: "var(--warning)" },
            { from: 360, to: 420, color: "var(--success)" },
            { from: 420, to: 450, color: "var(--danger)" },
          ]}
          icon={<SlidersVertical className="size-4" />}
          gradientFrom="rgba(100,215,194,0.3)"
          gradientTo="rgba(46,211,183,0.1)"
          loading={updating}
        />
        <SemicircleGauge
          label="Temperature"
          value={latest?.temperature ?? 0}
          unit="°C"
          min={-10}
          max={90}
          precision={0}
          zones={[
            { from: -10, to: 60, color: "var(--success)" },
            { from: 60, to: 80, color: "var(--warning)" },
            { from: 80, to: 90, color: "var(--danger)" },
          ]}
          icon={<Webhook className="size-4" />}
          gradientFrom="rgba(240,178,137,0.35)"
          gradientTo="rgba(239,90,122,0.15)"
          loading={updating}
        />
        <SemicircleGauge
          label="Frequency"
          value={latest?.frequency ?? 0}
          unit="Hz"
          min={45}
          max={65}
          precision={2}
          zones={[
            { from: 45, to: 58.5, color: "var(--warning)" },
            { from: 58.5, to: 61.5, color: "var(--success)" },
            { from: 61.5, to: 65, color: "var(--warning)" },
          ]}
          icon={<ChartSpline className="size-4" />}
          gradientFrom="rgba(46,211,183,0.3)"
          gradientTo="rgba(100,215,194,0.15)"
          loading={updating}
        />
        <SemicircleGauge
          label="Battery SOC"
          value={latest?.soc ?? 0}
          unit="%"
          min={0}
          max={100}
          precision={0}
          zones={[
            { from: 0, to: 20, color: "var(--danger)" },
            { from: 20, to: 60, color: "var(--warning)" },
            { from: 60, to: 100, color: "var(--success)" },
          ]}
          icon={<BatteryCharging className="size-4" />}
          gradientFrom="rgba(34,197,94,0.3)"
          gradientTo="rgba(46,211,183,0.12)"
          loading={updating}
        />
      </div>

      {/* Telemetry Charts */}
      <Card className="mt-4 bg-[--surface-1] border-border/60">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ChartSpline className="size-4 text-[--chart-1]" aria-hidden="true" />
            <div>
              <CardTitle className="text-base">Telemetry</CardTitle>
              <CardDescription className="text-xs">Historical metrics by time range</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="range" className="sr-only">Range</Label>
            <Select value={range} onValueChange={(v: "1h" | "6h" | "24h" | "7d") => setRange(v)}>
              <SelectTrigger id="range" className="w-[120px] bg-[--surface-2] border-border/60">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent align="end" className="bg-[--surface-1]">
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="6h">Last 6h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="power" className="w-full">
            <TabsList className="bg-[--surface-2]">
              <TabsTrigger value="power">Power</TabsTrigger>
              <TabsTrigger value="voltage">Voltage</TabsTrigger>
              <TabsTrigger value="temperature">Temperature</TabsTrigger>
              <TabsTrigger value="frequency">Frequency</TabsTrigger>
              <TabsTrigger value="soc">Battery</TabsTrigger>
            </TabsList>
            <div className="mt-4">
              <TabsContent value="power" className="m-0">
                <AreaChart data={chartData.power} color="var(--chart-1)" loading={updating} />
              </TabsContent>
              <TabsContent value="voltage" className="m-0">
                <AreaChart data={chartData.voltage} color="var(--chart-4)" loading={updating} />
              </TabsContent>
              <TabsContent value="temperature" className="m-0">
                <AreaChart data={chartData.temperature} color="var(--chart-2)" loading={updating} />
              </TabsContent>
              <TabsContent value="frequency" className="m-0">
                <AreaChart data={chartData.frequency} color="var(--chart-3)" loading={updating} />
              </TabsContent>
              <TabsContent value="soc" className="m-0">
                <AreaChart data={chartData.soc} color="var(--chart-3)" loading={updating} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Event Logs */}
      <Card className="mt-4 bg-[--surface-1] border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListFilter className="size-4 text-[--chart-1]" aria-hidden="true" />
              <CardTitle className="text-base">Event Logs</CardTitle>
            </div>
            <div className="flex gap-2">
              <Select
                value={level}
                onValueChange={(v: "all" | "info" | "warning" | "error") => setLevel(v)}
              >
                <SelectTrigger className="w-[130px] bg-[--surface-2] border-border/60">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent align="end" className="bg-[--surface-1]">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="bg-[--surface-2] border-border/60"
              aria-label="Search logs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[120px]">Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.slice(0, 50).map((log) => (
                    <TableRow key={log.id} className="hover:bg-[--surface-2]/60">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.ts).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-0 bg-[--surface-2]",
                            log.level === "info" && "text-[--chart-4]",
                            log.level === "warning" && "text-[--warning]",
                            log.level === "error" && "text-[--danger]"
                          )}
                        >
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm break-words">{log.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.code ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!filteredLogs.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        No events found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card className="mt-4 bg-[--surface-1] border-border/60">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersVertical className="size-4 text-[--chart-1]" aria-hidden="true" />
            <CardTitle className="text-base">Controls</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Perform safe management actions for this device
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          {/* Reboot */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="min-w-[140px]"
                disabled={busy}
              >
                Reboot Device
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[--surface-1] border-border/60">
              <DialogHeader>
                <DialogTitle>Confirm reboot</DialogTitle>
                <DialogDescription>
                  This will restart the device. Telemetry may be unavailable during reboot.
                </DialogDescription>
              </DialogHeader>
              <Separator className="my-2 bg-border/60" />
              <div className="text-sm text-muted-foreground">
                Device: <span className="text-foreground">{name}</span>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleReboot}
                  disabled={busy}
                >
                  {busy ? "Rebooting..." : "Confirm Reboot"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Configure */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="min-w-[140px]"
                disabled={busy}
              >
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[--surface-1] border-border/60">
              <DialogHeader>
                <DialogTitle>Update Configuration</DialogTitle>
                <DialogDescription>
                  Adjust key parameters. Changes apply immediately after saving.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget as HTMLFormElement)
                  await handleSaveConfig(fd)
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_power_kw">Max Power (kW)</Label>
                    <Input
                      id="max_power_kw"
                      name="max_power_kw"
                      inputMode="decimal"
                      placeholder="e.g. 9.5"
                      className="bg-[--surface-2] border-border/60"
                      defaultValue="9.5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="voltage_setpoint">Voltage Setpoint (V)</Label>
                    <Input
                      id="voltage_setpoint"
                      name="voltage_setpoint"
                      inputMode="numeric"
                      placeholder="e.g. 400"
                      className="bg-[--surface-2] border-border/60"
                      defaultValue="400"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freq_min">Min Frequency (Hz)</Label>
                    <Input
                      id="freq_min"
                      name="freq_min"
                      inputMode="decimal"
                      placeholder="e.g. 59.0"
                      className="bg-[--surface-2] border-border/60"
                      defaultValue="59.2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freq_max">Max Frequency (Hz)</Label>
                    <Input
                      id="freq_max"
                      name="freq_max"
                      inputMode="decimal"
                      placeholder="e.g. 60.5"
                      className="bg-[--surface-2] border-border/60"
                      defaultValue="60.8"
                      required
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Saving..." : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </section>
  )
}

/* Utilities */

function statusColor(s: DeviceStatus) {
  switch (s) {
    case "online":
      return "var(--success)"
    case "offline":
      return "var(--danger)"
    case "warning":
      return "var(--warning)"
    case "maintenance":
      return "var(--chart-2)"
    default:
      return "var(--muted-foreground)"
  }
}

function timeAgo(ts?: number) {
  if (!ts) return "—"
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  const diff = ts - Date.now()
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute")
  const hours = Math.round(diff / 3600000)
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour")
  const days = Math.round(diff / 86400000)
  return rtf.format(days, "day")
}

function generateMockTelemetry(now: number): TelemetryPoint[] {
  const pts: TelemetryPoint[] = []
  const start = now - 6 * 3600_000
  let power = 4 + Math.random() * 2
  let voltage = 390 + Math.random() * 20
  let temp = 35 + Math.random() * 10
  let freq = 60 + (Math.random() * 0.3 - 0.15)
  let soc = 65 + Math.random() * 20
  for (let t = start; t <= now; t += 60_000) {
    power = clamp(power + (Math.random() - 0.5) * 0.4, 0, 10)
    voltage = clamp(voltage + (Math.random() - 0.5) * 3, 300, 450)
    temp = clamp(temp + (Math.random() - 0.5) * 0.6, -10, 90)
    freq = clamp(freq + (Math.random() - 0.5) * 0.05, 59, 61)
    soc = clamp(soc + (Math.random() - 0.5) * 0.15, 0, 100)
    pts.push({ t, power, voltage, temperature: temp, frequency: freq, soc })
  }
  return pts
}

function produceNextTelemetry(prev: TelemetryPoint[]): TelemetryPoint[] {
  const last = prev[prev.length - 1]
  const t = Date.now()
  const next: TelemetryPoint = {
    t,
    power: clamp(last.power + (Math.random() - 0.5) * 0.6, 0, 10),
    voltage: clamp(last.voltage + (Math.random() - 0.5) * 4, 300, 450),
    temperature: clamp(last.temperature + (Math.random() - 0.5) * 0.8, -10, 90),
    frequency: clamp(last.frequency + (Math.random() - 0.5) * 0.06, 59, 61),
    soc: clamp(last.soc + (Math.random() - 0.5) * 0.2, 0, 100),
  }
  const nextArr = [...prev, next]
  // keep last 24h at 1-min resolution
  const cutoff = t - 24 * 3600_000
  return nextArr.filter((p) => p.t >= cutoff)
}

function generateMockLogs(now: number): EventLog[] {
  const samples: Omit<EventLog, "id" | "ts">[] = [
    { level: "info", message: "Device started successfully", code: "BOOT_OK" },
    { level: "warning", message: "Temperature approaching threshold", code: "TEMP_WARN" },
    { level: "info", message: "Grid frequency stabilized", code: "FREQ_OK" },
    { level: "error", message: "DC overvoltage detected briefly", code: "OVERVOLT" },
    { level: "info", message: "New configuration applied", code: "CFG_APPLY" },
  ]
  const logs: EventLog[] = []
  for (let i = 0; i < 30; i++) {
    const s = samples[Math.floor(Math.random() * samples.length)]
    logs.push({
      id: `${now - i * 600000}-${i}`,
      ts: now - i * 600000 - Math.floor(Math.random() * 300000),
      level: s.level,
      message: s.message,
      code: s.code,
    })
  }
  return logs
}

function generateRandomLog(): EventLog {
  const now = Date.now()
  const choices: EventLog[] = [
    { id: `${now}-1`, ts: now, level: "info", message: "Meter sync complete", code: "SYNC_OK" },
    { id: `${now}-2`, ts: now, level: "warning", message: "Battery SOC low", code: "SOC_LOW" },
    { id: `${now}-3`, ts: now, level: "error", message: "Communication timeout", code: "COMMS_TIMEOUT" },
    { id: `${now}-4`, ts: now, level: "info", message: "Inverter output limited due to high temperature", code: "DERATE_TEMP" },
  ]
  return choices[Math.floor(Math.random() * choices.length)]
}