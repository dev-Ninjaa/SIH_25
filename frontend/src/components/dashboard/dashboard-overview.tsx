"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import {
  Sun,
  ChartBarIncreasing,
  ChartColumnBig,
  ChartPie,
  Plug,
  SquarePower,
  ThermometerSun,
  PlugZap,
  Battery,
  Dam,
  Wifi,
  WifiOff,
  RefreshCw,
  Activity,
  Clock,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useConnectionStatus, useSystemHealth, useWebSocket } from "@/hooks/use-api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type KPI = {
  id: string
  label: string
  value: number
  suffix?: string
  delta?: number
  icon: React.ReactNode
  series: number[]
}

type PowerPoint = { t: string; v: number }

type PlantEnergy = { name: string; value: number }

type HealthSlice = { label: string; value: number; colorVar: string }

type Alert = {
  id: string
  timestamp: string
  title: string
  description?: string
  severity: "low" | "medium" | "high"
}

export interface DashboardOverviewProps {
  className?: string
  style?: React.CSSProperties
  username?: string
  date?: Date
  kpis?: KPI[]
  powerCurve?: PowerPoint[]
  energyByPlant?: PlantEnergy[]
  deviceHealth?: HealthSlice[]
  alerts?: Alert[]
  onAddPlant?: () => void
  onViewReports?: () => void
  onManageDevices?: () => void
  onCreateAlertRule?: () => void
}

/**
 * Utility: safe clamp
 */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * CountUp animation hook + component
 */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    start.current = null
    const from = val
    const delta = target - from

    const step = (ts: number) => {
      if (!start.current) start.current = ts
      const progress = clamp((ts - start.current) / duration, 0, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(from + delta * eased)
      if (progress < 1) {
        raf.current = requestAnimationFrame(step)
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])

  return val
}

function CountUp({
  value,
  suffix,
  precision = 0,
  className,
  "aria-label": ariaLabel,
}: {
  value: number
  suffix?: string
  precision?: number
  className?: string
  "aria-label"?: string
}) {
  const animated = useCountUp(value)
  const formatted = useMemo(() => animated.toFixed(precision), [animated, precision])
  return (
    <span className={className} aria-label={ariaLabel}>
      {formatted}
      {suffix ? <span className="text-muted-foreground ml-1">{suffix}</span> : null}
    </span>
  )
}

/**
 * Sparkline chart (inline SVG) with hover tooltips
 */
function Sparkline({
  series,
  strokeVar = "--chart-1",
  height = 36,
  "aria-label": ariaLabel,
}: {
  series: number[]
  strokeVar?: string
  height?: number
  "aria-label"?: string
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const w = Math.max(64, series.length * 8)
  const h = height
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1
  
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1 || 1)) * (w - 8) + 4
    const y = h - ((v - min) / range) * (h - 8) - 4
    return { x, y, value: v }
  })
  
  const path = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || series.length === 0) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * w
    
    // Find closest point
    let closestIndex = 0
    let minDistance = Math.abs(svgX - points[0].x)
    
    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs(svgX - points[i].x)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
    
    setHoveredPoint({
      index: closestIndex,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div className="relative inline-block">
      <svg
        ref={svgRef}
        className="block"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="sparkGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke={`color-mix(in oklab, var(${strokeVar}) 80%, transparent)`}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {/* Hover indicator */}
        {hoveredPoint && (
          <circle
            cx={points[hoveredPoint.index].x}
            cy={points[hoveredPoint.index].y}
            r="3"
            fill={`var(${strokeVar})`}
            stroke="var(--background)"
            strokeWidth="2"
          />
        )}
      </svg>
      
      {/* Tooltip */}
      {hoveredPoint && (
        <div 
          className="fixed z-20 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: Math.min(hoveredPoint.x + 10, window.innerWidth - 100),
            top: hoveredPoint.y - 50,
            transform: hoveredPoint.x > window.innerWidth - 100 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-xs text-muted-foreground">
            Value: {series[hoveredPoint.index].toFixed(1)}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Area chart for 24-hour power curve with hover tooltips
 */
function AreaChart({
  data,
  height = 220,
  strokeVar = "--chart-1",
  fillVar = "--chart-1",
  "aria-label": ariaLabel,
}: {
  data: PowerPoint[]
  height?: number
  strokeVar?: string
  fillVar?: string
  "aria-label"?: string
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const w = 720
  const h = height
  const values = data.map((d) => d.v)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (w - 16) + 8
    const y = h - ((d.v - min) / range) * (h - 28) - 8
    return [x, y] as const
  })

  const dPath =
    pts.length > 1 ? `M ${pts[0][0]},${pts[0][1]} L ${pts.slice(1).map((p) => `${p[0]},${p[1]}`).join(" ")}` : ""

  const areaPath =
    pts.length > 1
      ? `M ${pts[0][0]},${h - 8} L ${pts.map((p) => `${p[0]},${p[1]}`).join(" ")} L ${pts[pts.length - 1][0]},${
          h - 8
        } Z`
      : ""

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * w
    
    // Find closest point
    let closestIndex = 0
    let minDistance = Math.abs(svgX - pts[0][0])
    
    for (let i = 1; i < pts.length; i++) {
      const distance = Math.abs(svgX - pts[i][0])
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }
    
    setHoveredPoint({
      index: closestIndex,
      x: mouseX,
      y: e.clientY - rect.top
    })
  }

  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }

  return (
    <div className="relative w-full">
      <svg 
        ref={svgRef}
        className="w-full h-auto max-w-full" 
        viewBox={`0 0 ${w} ${h}`} 
        role="img" 
        aria-label={ariaLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.05" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g>
          <path d={areaPath} fill="url(#areaGradient)" />
          <path
            d={dPath}
            fill="none"
            stroke={`color-mix(in oklab, var(${strokeVar}) 88%, transparent)`}
            strokeWidth="2"
            filter="url(#softGlow)"
          />
          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              <line
                x1={pts[hoveredPoint.index][0]}
                y1={8}
                x2={pts[hoveredPoint.index][0]}
                y2={h - 8}
                stroke="var(--chart-1)"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.6"
              />
              <circle
                cx={pts[hoveredPoint.index][0]}
                cy={pts[hoveredPoint.index][1]}
                r="4"
                fill="var(--chart-1)"
                stroke="var(--background)"
                strokeWidth="2"
              />
            </>
          )}
        </g>
      </svg>
      
      {/* Tooltip */}
      {hoveredPoint && (
        <div 
          className="absolute z-10 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: Math.min(hoveredPoint.x, window.innerWidth - 150),
            top: hoveredPoint.y - 60,
            transform: hoveredPoint.x > window.innerWidth - 150 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-sm font-medium text-foreground">
            {data[hoveredPoint.index].t}
          </div>
          <div className="text-xs text-muted-foreground">
            {data[hoveredPoint.index].v.toFixed(1)} kW
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Bar chart vertical with hover tooltips
 */
function BarChart({
  data,
  height = 200,
  colorVar = "--chart-2",
  "aria-label": ariaLabel,
}: {
  data: PlantEnergy[]
  height?: number
  colorVar?: string
  "aria-label"?: string
}) {
  const [hoveredBar, setHoveredBar] = useState<{ index: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const w = Math.max(280, data.length * 64)
  const h = height
  const max = Math.max(...data.map((d) => d.value), 1)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * w
    
    // Find which bar we're hovering over
    const bw = 32
    const gap = 32
    
    for (let i = 0; i < data.length; i++) {
      const barX = 16 + i * (bw + gap)
      if (svgX >= barX && svgX <= barX + bw) {
        setHoveredBar({
          index: i,
          x: mouseX,
          y: e.clientY - rect.top
        })
        return
      }
    }
    
    setHoveredBar(null)
  }

  const handleMouseLeave = () => {
    setHoveredBar(null)
  }

  return (
    <div className="relative w-full">
      <svg 
        ref={svgRef}
        className="w-full h-auto max-w-full" 
        viewBox={`0 0 ${w} ${h + 28}`} 
        role="img" 
        aria-label={ariaLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {data.map((d, i) => {
          const bw = 32
          const gap = 32
          const x = 16 + i * (bw + gap)
          const barH = (d.value / max) * (h - 16)
          const y = h - barH
          const isHovered = hoveredBar?.index === i
          
          return (
            <g key={d.name}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={barH}
                rx="6"
                fill={`color-mix(in oklab, var(${colorVar}) ${isHovered ? '90%' : '80%'}, transparent)`}
                stroke={isHovered ? `var(${colorVar})` : 'transparent'}
                strokeWidth="2"
                className="transition-all duration-200"
              />
              <text
                x={x + bw / 2}
                y={h + 18}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted-foreground)"
              >
                {d.name}
              </text>
            </g>
          )
        })}
      </svg>
      
      {/* Tooltip */}
      {hoveredBar && (
        <div 
          className="absolute z-10 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: Math.min(hoveredBar.x, window.innerWidth - 120),
            top: hoveredBar.y - 60,
            transform: hoveredBar.x > window.innerWidth - 120 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-sm font-medium text-foreground">
            {data[hoveredBar.index].name} Plant
          </div>
          <div className="text-xs text-muted-foreground">
            {data[hoveredBar.index].value.toFixed(1)} MWh today
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Donut chart with hover tooltips
 */
function DonutChart({
  data,
  size = 180,
  strokeWidth = 18,
  "aria-label": ariaLabel,
}: {
  data: HealthSlice[]
  size?: number
  strokeWidth?: number
  "aria-label"?: string
}) {
  const [hoveredSlice, setHoveredSlice] = useState<{ index: number; x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((s, d) => s + d.value, 0) || 1

  let offsetAcc = 0
  const slices = data.map((s, index) => {
    const length = (s.value / total) * circumference
    const startAngle = (offsetAcc / circumference) * 360
    const endAngle = ((offsetAcc + length) / circumference) * 360
    const midAngle = (startAngle + endAngle) / 2
    const segment = { 
      ...s, 
      length, 
      offset: offsetAcc, 
      startAngle, 
      endAngle, 
      midAngle,
      index 
    }
    offsetAcc += length
    return segment
  })

  const center = size / 2

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return
    
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Convert mouse position to angle
    const dx = mouseX - center
    const dy = mouseY - center
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Check if mouse is within the donut ring
    const innerRadius = radius - strokeWidth / 2
    const outerRadius = radius + strokeWidth / 2
    
    if (distance >= innerRadius && distance <= outerRadius) {
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI
      angle = (angle + 360 + 90) % 360 // Adjust for SVG coordinate system and start at top
      
      // Find which slice the angle falls into
      for (const slice of slices) {
        if (angle >= slice.startAngle && angle <= slice.endAngle) {
          setHoveredSlice({
            index: slice.index,
            x: e.clientX,
            y: e.clientY
          })
          return
        }
      }
    }
    
    setHoveredSlice(null)
  }

  const handleMouseLeave = () => {
    setHoveredSlice(null)
  }

  return (
    <div className="relative">
      <svg 
        ref={svgRef}
        width={size} 
        height={size} 
        role="img" 
        aria-label={ariaLabel} 
        className="max-w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          {slices.map((s) => (
            <circle
              key={s.label}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={`var(${s.colorVar})`}
              strokeOpacity={hoveredSlice?.index === s.index ? "1" : "0.9"}
              strokeWidth={hoveredSlice?.index === s.index ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={`${s.length} ${circumference}`}
              strokeDashoffset={circumference - s.offset}
              className="transition-all duration-200"
            />
          ))}
        </g>
        <g transform={`translate(${center}, ${center})`}>
          <circle r={radius - strokeWidth / 2} fill="transparent" />
          <text
            x="0"
            y="-4"
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill="var(--foreground)"
          >
            {Math.round((data[0]?.value ?? 0) / total * 100)}%
          </text>
          <text x="0" y="16" textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
            Healthy
          </text>
        </g>
      </svg>
      
      {/* Tooltip */}
      {hoveredSlice && (
        <div 
          className="fixed z-20 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none"
          style={{
            left: Math.min(hoveredSlice.x + 10, window.innerWidth - 120),
            top: hoveredSlice.y - 60,
            transform: hoveredSlice.x > window.innerWidth - 120 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="text-sm font-medium text-foreground">
            {data[hoveredSlice.index].label}
          </div>
          <div className="text-xs text-muted-foreground">
            {data[hoveredSlice.index].value} devices ({Math.round((data[hoveredSlice.index].value / total) * 100)}%)
          </div>
        </div>
      )}
    </div>
  )
}

function HeaderRow({
  username,
  date,
}: {
  username: string
  date: Date
}) {
  const connectionStatus = useConnectionStatus();
  const { isConnected } = useWebSocket();
  const [currentTime, setCurrentTime] = useState(date);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatted = useMemo(
    () =>
      currentTime.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [currentTime]
  )

  const getConnectionIcon = () => {
    if (isConnected && connectionStatus.connected) {
      return <Wifi className="size-3.5 text-emerald-500" aria-hidden />;
    }
    return <WifiOff className="size-3.5 text-red-500" aria-hidden />;
  };

  const getConnectionStatus = () => {
    if (isConnected && connectionStatus.connected) {
      return `Connected${connectionStatus.latency ? ` • ${connectionStatus.latency}ms` : ''}`;
    }
    return 'Disconnected';
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading truncate">
            Welcome back, {username}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">{formatted}</p>
            <span className="text-muted-foreground text-xs">•</span>
            <div className="flex items-center gap-1.5">
              {getConnectionIcon()}
              <span className="text-xs text-muted-foreground">
                {getConnectionStatus()}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="bg-secondary/50 border-border rounded-full">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" aria-hidden />
              Real-time
            </span>
          </Badge>
          <Badge variant="outline" className="bg-secondary/50 border-border rounded-full">
            <span className="inline-flex items-center gap-1.5">
              <ThermometerSun className="size-3.5 text-primary" aria-hidden />
              Live
            </span>
          </Badge>
        </div>
      </div>
    </div>
  )
}

function KPIItem({ kpi }: { kpi: KPI }) {
  const positive = (kpi.delta ?? 0) >= 0
  return (
    <Card
      className={cn(
        "relative min-w-[240px] sm:min-w-[260px] bg-card/70 border border-border backdrop-blur-md transition-all",
        "hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(46,211,183,0.15),0_8px_24px_rgba(0,0,0,0.35)]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg"
        style={{
          background:
            "radial-gradient(120% 120% at 0% 0%, color-mix(in oklab, var(--chart-1) 10%, transparent) 0%, transparent 50%)",
        }}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
            <span className="text-primary">{kpi.icon}</span>
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
        </div>
        {typeof kpi.delta === "number" ? (
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full border",
              positive
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                : "border-destructive/30 text-destructive bg-destructive/10"
            )}
            aria-label={`Change ${positive ? "up" : "down"} ${Math.abs(kpi.delta)}%`}
          >
            {positive ? "+" : "-"}
            {Math.abs(kpi.delta)}%
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <CountUp
              value={kpi.value}
              suffix={kpi.suffix}
              precision={kpi.value < 10 ? 2 : 0}
              className="text-2xl sm:text-3xl font-semibold"
              aria-label={`${kpi.label} ${kpi.value}${kpi.suffix ?? ""}`}
            />
          </div>
          <div className="overflow-hidden">
            <Sparkline series={kpi.series} aria-label={`${kpi.label} sparkline`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardOverview({
  className,
  style,
  username = "Operator",
  date = new Date(),
  kpis,
  powerCurve,
  energyByPlant,
  deviceHealth,
  alerts,
  onAddPlant,
  onViewReports,
  onManageDevices,
  onCreateAlertRule,
}: DashboardOverviewProps) {
  // Real-time data hooks
  const systemHealth = useSystemHealth(30000); // Refresh every 30 seconds
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(new Date());

  // Refresh data manually
  const refreshData = useCallback(async () => {
    setIsLoadingData(true);
    await systemHealth.refetch();
    setLastDataUpdate(new Date());
    setIsLoadingData(false);
    toast.success("Data refreshed successfully");
  }, [systemHealth]);

  // Update KPIs from real-time data
  const realTimeKPIs = useMemo(() => {
    if (systemHealth.data) {
      return [
        {
          id: "power",
          label: "Total Power",
          value: systemHealth.data.currentGenerationMW * 1000, // Convert to kW
          suffix: "kW",
          delta: 3.2,
          icon: <Sun className="size-4" />,
          series: [3, 6, 4, 7, 8, 12, 9, 11, 10, 14, 16, 15].map((v) => v + 6),
        },
        {
          id: "plants",
          label: "Active Plants",
          value: systemHealth.data.onlineCount,
          delta: 0.0,
          icon: <Dam className="size-4" />,
          series: [18, 18, 18, 18, 18, 18, 18],
        },
        {
          id: "energy",
          label: "Energy Today",
          value: systemHealth.data.currentGenerationMW * 24 / 1000, // Rough estimate
          suffix: "MWh",
          delta: 5.1,
          icon: <ChartBarIncreasing className="size-4" />,
          series: [1, 2, 4, 6, 9, 12, 13, 12, 14, 17, 18, 19],
        },
        {
          id: "eff",
          label: "System Efficiency",
          value: systemHealth.data.systemEfficiency * 100,
          suffix: "%",
          delta: -0.6,
          icon: <ChartPie className="size-4" />,
          series: [92, 93, 95, 94, 94.5, 94.2, 94.1],
        },
      ];
    }
    return null;
  }, [systemHealth.data]);

  // Defaults (sample data)
  const defaultKPIs: KPI[] = [
    {
      id: "power",
      label: "Total Power",
      value: 5120,
      suffix: "kW",
      delta: 3.2,
      icon: <Sun className="size-4" />,
      series: [3, 6, 4, 7, 8, 12, 9, 11, 10, 14, 16, 15].map((v) => v + 6),
    },
    {
      id: "plants",
      label: "Active Plants",
      value: 18,
      delta: 0.0,
      icon: <Dam className="size-4" />,
      series: [18, 18, 18, 18, 18, 18, 18],
    },
    {
      id: "energy",
      label: "Energy Today",
      value: 27.4,
      suffix: "MWh",
      delta: 5.1,
      icon: <ChartBarIncreasing className="size-4" />,
      series: [1, 2, 4, 6, 9, 12, 13, 12, 14, 17, 18, 19],
    },
    {
      id: "eff",
      label: "System Efficiency",
      value: 94.2,
      suffix: "%",
      delta: -0.6,
      icon: <ChartPie className="size-4" />,
      series: [92, 93, 95, 94, 94.5, 94.2, 94.1],
    },
  ]

  const defaultPower: PowerPoint[] = Array.from({ length: 24 }).map((_, i) => {
    const v = Math.max(0, Math.sin((Math.PI * (i - 6)) / 18) * 100 + (i > 18 ? -20 : 0)) + Math.random() * 8
    return { t: `${String(i).padStart(2, "0")}:00`, v: Math.round(v) }
  })

  const defaultPlantEnergy: PlantEnergy[] = [
    { name: "North", value: 6.2 },
    { name: "East", value: 5.7 },
    { name: "West", value: 7.1 },
    { name: "South", value: 4.9 },
    { name: "HQ", value: 3.8 },
  ]

  const defaultHealth: HealthSlice[] = [
    { label: "Healthy", value: 78, colorVar: "--chart-3" },
    { label: "Warning", value: 18, colorVar: "--warning" },
    { label: "Critical", value: 4, colorVar: "--destructive" },
  ]

  const defaultAlerts: Alert[] = [
    {
      id: "a1",
      timestamp: "09:32",
      title: "Inverter temperature high",
      description: "String-12 at Plant West",
      severity: "medium",
    },
    {
      id: "a2",
      timestamp: "08:47",
      title: "Grid fluctuation detected",
      description: "Voltage transient resolved",
      severity: "low",
    },
    {
      id: "a3",
      timestamp: "07:15",
      title: "String outage",
      description: "Panel row 4 offline",
      severity: "high",
    },
  ]

  const listKPIs = kpis ?? realTimeKPIs ?? defaultKPIs
  const curve = powerCurve ?? defaultPower
  const plants = energyByPlant ?? defaultPlantEnergy
  const health = deviceHealth ?? defaultHealth
  const alertList = alerts ?? defaultAlerts

  const handle = (fn?: () => void, fallbackMsg?: string) => () => {
    if (fn) {
      fn()
    } else {
      toast.message(fallbackMsg ?? "Action triggered")
    }
  }

  return (
    <section className={cn("w-full max-w-full", className)} style={style} aria-label="Dashboard overview">
      <div className="w-full flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <HeaderRow username={username} date={date} />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoadingData || systemHealth.loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", (isLoadingData || systemHealth.loading) && "animate-spin")} />
              Refresh
            </Button>
            {systemHealth.error && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
              >
                <AlertCircle className="h-4 w-4" />
                Error
              </Button>
            )}
          </div>
        </div>

        {/* KPI Rail */}
        <div className="w-full">
          <div className="w-full overflow-x-auto overscroll-x-contain">
            <div className="flex items-stretch gap-4 min-w-max pr-1">
              {listKPIs.map((k) => (
                <KPIItem key={k.id} kpi={k} />
              ))}
            </div>
          </div>
        </div>

        {/* Charts + Panels */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 24h Power Curve */}
          <Card
            className={cn(
              "relative md:col-span-3 bg-card/70 border border-border backdrop-blur-md",
              "hover:border-primary/40 transition-colors"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 0%, color-mix(in oklab, var(--chart-1) 10%, transparent) 0%, transparent 50%)",
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
                    <SquarePower className="size-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">24h Power Curve</CardTitle>
                    <CardDescription>kW over the last 24 hours</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="w-full max-w-full overflow-hidden">
                <AreaChart data={curve} aria-label="24-hour power curve" />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {curve.filter((_, i) => i % 8 === 0).map((d) => (
                  <div key={d.t} className="text-xs text-muted-foreground">{d.t}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Energy by Plant */}
          <Card
            className={cn(
              "relative md:col-span-2 bg-card/70 border border-border backdrop-blur-md",
              "hover:border-primary/40 transition-colors"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background:
                  "radial-gradient(120% 120% at 100% 0%, color-mix(in oklab, var(--chart-2) 10%, transparent) 0%, transparent 50%)",
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
                  <ChartColumnBig className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Energy by Plant</CardTitle>
                  <CardDescription>MWh today</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[360px]">
                  <BarChart data={plants} aria-label="Energy by plant bar chart" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Health */}
          <Card
            className={cn(
              "relative md:col-span-2 bg-card/70 border border-border backdrop-blur-md",
              "hover:border-primary/40 transition-colors"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 100%, color-mix(in oklab, var(--chart-3) 10%, transparent) 0%, transparent 50%)",
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
                  <Plug className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Device Health</CardTitle>
                  <CardDescription>Status across all devices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-6">
                <DonutChart data={health} aria-label="Device health donut chart" />
                <div className="grid gap-2 text-sm min-w-0">
                  {health.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block size-2.5 rounded-full"
                        style={{ backgroundColor: `var(${s.colorVar})` }}
                      />
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="ml-auto font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card
            className={cn(
              "relative md:col-span-3 bg-card/70 border border-border backdrop-blur-md",
              "hover:border-primary/40 transition-colors"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background:
                  "radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--destructive) 8%, transparent) 0%, transparent 50%)",
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
                    <PlugZap className="size-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Recent Alerts</CardTitle>
                    <CardDescription>Latest system events</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handle(onCreateAlertRule, "Open alert rules")}
                >
                  Create rule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-border">
                {alertList.map((a) => {
                  const color =
                    a.severity === "high"
                      ? "text-destructive bg-destructive/10 border-destructive/30"
                      : a.severity === "medium"
                      ? "text-amber-400 bg-amber-500/10 border-amber-400/30"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-400/30"
                  return (
                    <li key={a.id} className="py-3 flex items-start gap-3">
                      <span
                        className={cn("mt-1 size-2.5 rounded-full border", color)}
                        aria-label={`${a.severity} severity`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium leading-tight truncate">{a.title}</p>
                          <span className="text-xs text-muted-foreground ml-auto">{a.timestamp}</span>
                        </div>
                        {a.description ? (
                          <p className="text-sm text-muted-foreground mt-0.5 break-words">{a.description}</p>
                        ) : null}
                        <div className="mt-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs border",
                              color
                            )}
                          >
                            {a.severity.charAt(0).toUpperCase() + a.severity.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card
            className={cn(
              "relative md:col-span-5 bg-card/70 border border-border backdrop-blur-md",
              "hover:border-primary/40 transition-colors"
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 50%, color-mix(in oklab, var(--chart-4) 10%, transparent) 0%, transparent 60%)",
              }}
            />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-secondary/60 border border-border grid place-items-center">
                  <Battery className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                  <CardDescription>Common tasks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={handle(onAddPlant, "Add plant")}
                >
                  <Dam className="size-4 mr-2" />
                  Add plant
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={handle(onManageDevices, "Manage devices")}
                >
                  <Plug className="size-4 mr-2" />
                  Manage devices
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={handle(onViewReports, "View reports")}
                >
                  <ChartBarIncreasing className="size-4 mr-2" />
                  View reports
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => toast.message("Export started")}
                >
                  <ChartColumnBig className="size-4 mr-2" />
                  Export data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}