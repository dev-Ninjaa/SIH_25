"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ChartSpline,
  TrendingUp,
  LayoutDashboard,
  ChevronUp,
  ChartPie,
  TableOfContents,
  FileChartColumn,
  TabletSmartphone,
  Columns2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

type DataPoint = { x: number; y: number };

type Series = {
  id: string;
  name: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  data: DataPoint[];
  yAxisLabel?: string;
};

type DeviceRow = {
  id: string;
  name: string;
  type: string;
  status: "online" | "warning" | "offline";
  powerKw: number;
  performanceRatio: number; // 0-1
  temperatureC: number;
};

type WeatherNow = {
  condition: string;
  tempC: number;
  windKph: number;
  humidity: number;
};

type WeatherForecastItem = {
  day: string; // Mon, Tue...
  highC: number;
  lowC: number;
  condition: string;
};

export interface PlantDetailProps {
  className?: string;
  name?: string;
  location?: string;
  status?: "online" | "maintenance" | "warning" | "offline";
  capacityMw?: number;
  kpis?: Array<{ label: string; value: string; delta?: number; helpText?: string }>;
  series?: Series[];
  weather?: {
    now: WeatherNow;
    forecast: WeatherForecastItem[];
  };
  devices?: DeviceRow[];
  defaultTimeWindow?: "1h" | "24h" | "7d" | "30d";
}

function formatStatusColor(status: PlantDetailProps["status"]) {
  switch (status) {
    case "online":
      return "bg-[--success]/20 text-[--success] ring-1 ring-[--success]/30";
    case "maintenance":
      return "bg-[--warning]/20 text-[--warning] ring-1 ring-[--warning]/30";
    case "warning":
      return "bg-[--danger]/20 text-[--danger] ring-1 ring-[--danger]/30";
    case "offline":
      return "bg-muted text-muted-foreground ring-1 ring-border/60";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-border/60";
  }
}

function useSortedData<T>(rows: T[], initial: { key: keyof T; dir: "asc" | "desc" }) {
  const [sort, setSort] = React.useState(initial);
  const sorted = React.useMemo(() => {
    const copy = [...rows];
    copy.sort((a: any, b: any) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sort]);
  return {
    sorted,
    sort,
    requestSort: (key: keyof T) =>
      setSort((prev) => {
        if (prev.key === key) {
          return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
        }
        return { key, dir: "desc" };
      }),
  };
}

function compactNumber(n: number, digits = 1) {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: digits }).format(n);
}

function formatYAxis(value: number) {
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + "k";
  return String(value);
}

function getTimeWindowPoints(data: DataPoint[], win: "1h" | "24h" | "7d" | "30d") {
  if (data.length === 0) return data;
  const end = data[data.length - 1].x;
  const oneHour = 3600_000;
  const ranges: Record<typeof win, number> = {
    "1h": oneHour,
    "24h": oneHour * 24,
    "7d": oneHour * 24 * 7,
    "30d": oneHour * 24 * 30,
  };
  const start = end - ranges[win];
  return data.filter((d) => d.x >= start);
}

type LineChartProps = {
  ariaLabel?: string;
  series: Series[];
  height?: number;
  timeWindow: "1h" | "24h" | "7d" | "30d";
  onTimeWindowChange?: (w: LineChartProps["timeWindow"]) => void;
};

function LineChart({
  ariaLabel,
  series,
  height = 220,
  timeWindow,
  onTimeWindowChange,
}: LineChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = React.useState<{
    x: number;
    y: number;
    value?: number;
    label?: string;
    seriesValues?: Array<{ id: string; name: string; color: string; value: number; yAxisLabel?: string }>;
  } | null>(null);

  const filtered = React.useMemo(() => {
    return series.map((s) => ({
      ...s,
      data: getTimeWindowPoints(s.data, timeWindow),
    }));
  }, [series, timeWindow]);

  const flat = filtered.flatMap((s) => s.data);
  const minX = flat.length ? Math.min(...flat.map((d) => d.x)) : 0;
  const maxX = flat.length ? Math.max(...flat.map((d) => d.x)) : 1;
  const minY = flat.length ? Math.min(...flat.map((d) => d.y)) : 0;
  const maxY = flat.length ? Math.max(...flat.map((d) => d.y)) : 1;

  const padding = { top: 16, right: 16, bottom: 26, left: 40 };
  const width = 800; // SVG viewBox; will scale to container
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  function xScale(x: number) {
    if (maxX === minX) return padding.left;
    return padding.left + ((x - minX) / (maxX - minX)) * innerW;
  }
  function yScale(y: number) {
    if (maxY === minY) return padding.top + innerH;
    return padding.top + innerH - ((y - minY) / (maxY - minY)) * innerH;
  }

  function pathFor(data: DataPoint[]) {
    if (!data.length) return "";
    const d = data
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
      .join(" ");
    return d;
  }

  function gridY() {
    const ticks = 4;
    const out: { y: number; label: string }[] = [];
    for (let i = 0; i <= ticks; i++) {
      const v = minY + (i * (maxY - minY)) / ticks;
      out.push({ y: yScale(v), label: formatYAxis(v) });
    }
    return out;
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const pt = e.currentTarget.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const relX = local.x;
    // Find nearest point across first series for tooltip anchor
    const s0 = filtered[0]?.data ?? [];
    if (!s0.length) return setHover(null);
    let nearest = s0[0];
    let minDist = Math.abs(xScale(nearest.x) - relX);
    for (const p of s0) {
      const d = Math.abs(xScale(p.x) - relX);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    // Collect values for each series at nearest x (by closest point)
    const seriesValues = filtered.map((s) => {
      let closest = s.data[0];
      let closestDist = Math.abs(closest.x - nearest.x);
      for (const p of s.data) {
        const d = Math.abs(p.x - nearest.x);
        if (d < closestDist) {
          closest = p;
          closestDist = d;
        }
      }
      return { id: s.id, name: s.name, color: s.color, value: closest?.y ?? 0, yAxisLabel: s.yAxisLabel };
    });
    setHover({
      x: xScale(nearest.x),
      y: yScale(nearest.y),
      value: nearest.y,
      label: new Date(nearest.x).toLocaleString(),
      seriesValues,
    });
  }

  function handleMouseLeave() {
    setHover(null);
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg bg-card ring-1 ring-border/60 shadow-sm"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartSpline className="h-4 w-4 text-[--chart-1]" aria-hidden />
          <span className="text-sm font-medium text-foreground">Time-series</span>
        </div>
        <div className="flex items-center gap-1">
          {(["1h", "24h", "7d", "30d"] as const).map((w) => (
            <Button
              key={w}
              size="sm"
              variant={timeWindow === w ? "default" : "ghost"}
              className={cn(
                "h-8",
                timeWindow === w
                  ? "bg-[--surface-2] text-foreground hover:bg-[--surface-2]"
                  : "text-muted-foreground"
              )}
              onClick={() => onTimeWindowChange?.(w)}
              aria-pressed={timeWindow === w}
            >
              {w}
            </Button>
          ))}
        </div>
      </div>
      <Separator className="bg-border/60" />
      <div className="relative">
        <svg
          role="img"
          aria-label={ariaLabel}
          width="100%"
          height={height}
          viewBox={`0 0 ${800} ${height}`}
          className="block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {filtered.map((s) => (
              <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.gradientFrom} stopOpacity="0.38" />
                <stop offset="100%" stopColor={s.gradientTo} stopOpacity="0.05" />
              </linearGradient>
            ))}
          </defs>

          {/* Y grid */}
          {gridY().map((g, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={g.y}
                y2={g.y}
                stroke="hsl(var(--border))"
                strokeOpacity="0.35"
                shapeRendering="crispEdges"
              />
              <text
                x={padding.left - 8}
                y={g.y}
                fill="hsl(var(--muted-foreground))"
                fontSize="10"
                textAnchor="end"
                dominantBaseline="central"
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* Paths and areas */}
          {filtered.map((s) => {
            const d = pathFor(s.data);
            const area =
              s.data.length > 1
                ? `${d} L ${xScale(s.data[s.data.length - 1].x)} ${yScale(minY)} L ${xScale(s.data[0].x)} ${yScale(
                    minY
                  )} Z`
                : "";
            return (
              <g key={s.id}>
                <path
                  d={area}
                  fill={`url(#grad-${s.id})`}
                  opacity={0.9}
                  className="transition-all duration-500 ease-out"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  className="drop-shadow-[0_0_6px_rgba(46,211,183,0.15)]"
                  style={{ filter: "drop-shadow(0 0 2px rgba(46,211,183,0.15))" }}
                />
              </g>
            );
          })}

          {/* Hover marker */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x}
                x2={hover.x}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="hsl(var(--border))"
                strokeDasharray="4 3"
              />
              <circle cx={hover.x} cy={hover.y} r={3.5} fill="hsl(var(--primary))" />
            </g>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md bg-[--surface-1]/60 px-2 py-1 ring-1 ring-border/60">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              <span className="text-xs text-foreground">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs text-foreground ring-1 ring-border/60 shadow"
            style={{ left: hover.x, top: 8 }}
            role="tooltip"
          >
            <div className="text-[11px] text-muted-foreground">{hover.label}</div>
            {/* Show all series values */}
            <div className="mt-1 flex flex-col gap-0.5">
              {hover.seriesValues?.map((sv) => (
                <div key={sv.id} className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: sv.color }} aria-hidden />
                  <span className="font-medium">{sv.name}:</span>
                  <span>
                    {sv.value}
                    {sv.yAxisLabel ? ` ${sv.yAxisLabel}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WeatherWidget({
  now,
  forecast,
}: {
  now: WeatherNow;
  forecast: WeatherForecastItem[];
}) {
  return (
    <Card className="w-full bg-card ring-1 ring-border/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-[--chart-2]" aria-hidden />
          <span className="text-sm font-medium">Weather</span>
        </div>
        <Badge variant="outline" className="border-border/60 bg-[--surface-2] text-xs">
          Live
        </Badge>
      </div>
      <Separator className="bg-border/60" />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
        <div className="col-span-1 rounded-lg bg-[--surface-1] p-4 ring-1 ring-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Condition</p>
              <p className="text-sm font-medium">{now.condition}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-[--chart-3]" aria-hidden />
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-3xl font-semibold leading-none">{Math.round(now.tempC)}°C</span>
            <span className="text-xs text-muted-foreground">Feels like ~{Math.round(now.tempC)}°C</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-[--surface-2] p-2 ring-1 ring-border/60">
              <p className="text-muted-foreground">Wind</p>
              <p className="font-medium">{now.windKph} km/h</p>
            </div>
            <div className="rounded-md bg-[--surface-2] p-2 ring-1 ring-border/60">
              <p className="text-muted-foreground">Humidity</p>
              <p className="font-medium">{now.humidity}%</p>
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 rounded-lg bg-[--surface-1] p-4 ring-1 ring-border/60">
          <p className="mb-3 text-xs text-muted-foreground">Forecast</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {forecast.slice(0, 5).map((f) => (
              <div
                key={f.day}
                className="flex flex-col rounded-md bg-[--surface-2] p-3 ring-1 ring-border/60"
                aria-label={`${f.day} forecast`}
              >
                <span className="text-xs text-muted-foreground">{f.day}</span>
                <span className="mt-1 text-sm">{f.condition}</span>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="rounded bg-[--success]/15 px-2 py-0.5 text-[--success] ring-1 ring-[--success]/30">
                    {Math.round(f.highC)}°
                  </span>
                  <span className="rounded bg-[--muted]/40 px-2 py-0.5 text-muted-foreground ring-1 ring-border/60">
                    {Math.round(f.lowC)}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function PlantDetail({
  className,
  name = "North Ridge Solar Farm",
  location = "Bakersfield, CA",
  status = "online",
  capacityMw = 120.4,
  kpis = [
    { label: "Current Power", value: "89.6 MW", delta: 2.3 },
    { label: "Daily Energy", value: "324 MWh", delta: 5.1 },
    { label: "PR", value: "82%", delta: -1.2 },
    { label: "Irradiance", value: "820 W/m²" },
  ],
  series,
  weather,
  devices,
  defaultTimeWindow = "24h",
}: PlantDetailProps) {
  const [timeWindow, setTimeWindow] = React.useState<typeof defaultTimeWindow>(defaultTimeWindow);

  // Demo data fallbacks for charts
  const now = Date.now();
  const mkData = (len: number, base: number, variance: number) =>
    Array.from({ length: len }, (_, i) => {
      const x = now - (len - 1 - i) * 15 * 60 * 1000; // 15-min intervals
      const y = base + Math.sin(i / 6) * variance + (Math.random() - 0.5) * variance * 0.6;
      return { x, y: Math.max(0, Math.round(y * 100) / 100) };
    });

  const chartSeries: Series[] =
    series ??
    [
      {
        id: "power",
        name: "Power (MW)",
        color: "var(--chart-1)",
        gradientFrom: "var(--chart-1)",
        gradientTo: "var(--chart-1)",
        data: mkData(96, 80, 18).map((d) => ({ x: d.x, y: d.y })), // 24h at 15min
        yAxisLabel: "MW",
      },
      {
        id: "irr",
        name: "Irradiance (W/m²)",
        color: "var(--chart-2)",
        gradientFrom: "var(--chart-2)",
        gradientTo: "var(--chart-2)",
        data: mkData(96, 700, 200),
        yAxisLabel: "W/m²",
      },
      {
        id: "temp",
        name: "Module Temp (°C)",
        color: "var(--chart-3)",
        gradientFrom: "var(--chart-3)",
        gradientTo: "var(--chart-3)",
        data: mkData(96, 40, 6),
        yAxisLabel: "°C",
      },
    ];

  const weatherData =
    weather ??
    ({
      now: { condition: "Sunny", tempC: 29, windKph: 12, humidity: 38 },
      forecast: [
        { day: "Mon", highC: 31, lowC: 18, condition: "Sunny" },
        { day: "Tue", highC: 30, lowC: 17, condition: "Sunny" },
        { day: "Wed", highC: 28, lowC: 16, condition: "Cloudy" },
        { day: "Thu", highC: 27, lowC: 15, condition: "Cloudy" },
        { day: "Fri", highC: 29, lowC: 17, condition: "Sunny" },
        { day: "Sat", highC: 32, lowC: 19, condition: "Hot" },
        { day: "Sun", highC: 33, lowC: 20, condition: "Hot" },
      ],
    } as const);

  const deviceRows: DeviceRow[] =
    devices ??
    [
      { id: "INV-01", name: "Inverter 01", type: "Inverter", status: "online", powerKw: 950.2, performanceRatio: 0.89, temperatureC: 46.2 },
      { id: "INV-02", name: "Inverter 02", type: "Inverter", status: "warning", powerKw: 721.4, performanceRatio: 0.73, temperatureC: 58.1 },
      { id: "STR-07", name: "String 07", type: "String", status: "online", powerKw: 112.9, performanceRatio: 0.92, temperatureC: 44.6 },
      { id: "STR-12", name: "String 12", type: "String", status: "offline", powerKw: 0, performanceRatio: 0.0, temperatureC: 0 },
      { id: "INV-10", name: "Inverter 10", type: "Inverter", status: "online", powerKw: 1012.4, performanceRatio: 0.95, temperatureC: 48.3 },
    ];

  const { sorted, requestSort, sort } = useSortedData<DeviceRow>(deviceRows, {
    key: "powerKw",
    dir: "desc",
  });

  function onAction(action: "view" | "restart", row: DeviceRow) {
    if (action === "view") {
      toast.info(`Opening details for ${row.name}`);
    } else {
      toast.success(`Restart sequence sent to ${row.name}`);
    }
  }

  return (
    <section className={cn("w-full max-w-full", className)} aria-label="Plant detail">
      {/* Header */}
      <Card className="w-full bg-card ring-1 ring-border/60">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold leading-tight sm:text-2xl">{name}</h1>
              <Badge className={cn("rounded-md text-[11px]", formatStatusColor(status))}>
                {status === "online" ? "Online" : status === "maintenance" ? "Maintenance" : status === "warning" ? "Attention" : "Offline"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {/* Map indicator using Columns2 icon to hint location (limited icon set) */}
              <Columns2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate">{location}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[--surface-1] px-3 py-2 ring-1 ring-border/60">
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-sm font-medium">{capacityMw.toFixed(1)} MW</p>
            </div>
            <div className="hidden h-10 w-px bg-border/60 sm:block" aria-hidden />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="border-border/60 bg-[--surface-1]">
                <ChartPie className="mr-2 h-4 w-4" />
                Analytics
              </Button>
              <Button size="sm" className="bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90">
                <TableOfContents className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </div>
          </div>
        </div>

        {/* KPI chips */}
        <div className="flex flex-wrap gap-3 border-t border-border/60 px-4 py-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="flex items-center gap-3 rounded-lg bg-[--surface-1] px-3 py-2 ring-1 ring-border/60"
            >
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">{k.label}</span>
                <span className="text-sm font-medium">{k.value}</span>
              </div>
              {typeof k.delta === "number" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ring-1",
                    k.delta >= 0
                      ? "bg-[--success]/15 text-[--success] ring-[--success]/30"
                      : "bg-[--danger]/15 text-[--danger] ring-[--danger]/30"
                  )}
                >
                  <ChevronUp
                    className={cn("h-3.5 w-3.5", k.delta < 0 && "rotate-180")}
                    aria-hidden
                  />
                  {Math.abs(k.delta)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main content: charts + weather + tabs/table */}
      <div className="mt-4 grid w-full grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Charts area */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Overview charts */}
          <LineChart
            ariaLabel="Plant overview charts"
            series={chartSeries}
            timeWindow={timeWindow}
            onTimeWindowChange={setTimeWindow}
            height={260}
          />

          {/* Secondary small chart for power focus */}
          <Card className="w-full bg-card ring-1 ring-border/60">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <ChartSpline className="h-4 w-4 text-[--chart-1]" aria-hidden />
                <span className="text-sm font-medium">Power Generation</span>
              </div>
              <Badge variant="outline" className="border-border/60 bg-[--surface-2] text-xs">
                Zoom: {timeWindow}
              </Badge>
            </div>
            <Separator className="bg-border/60" />
            <div className="p-2">
              <LineChart
                ariaLabel="Power generation focus"
                series={chartSeries.slice(0, 1)}
                timeWindow={timeWindow}
                onTimeWindowChange={setTimeWindow}
                height={200}
              />
            </div>
          </Card>
        </div>

        {/* Weather */}
        <div className="xl:col-span-1">
          <WeatherWidget now={weatherData.now} forecast={weatherData.forecast} />
        </div>
      </div>

      {/* Tabs and devices table */}
      <Card className="mt-4 w-full bg-card ring-1 ring-border/60">
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TabletSmartphone className="h-4 w-4 text-[--chart-4]" aria-hidden />
            <h2 className="text-base font-semibold">Devices & Operations</h2>
          </div>
          <div className="text-xs text-muted-foreground">Top performing / attention required devices</div>
        </div>
        <Separator className="bg-border/60" />
        <div className="p-4">
          <Tabs defaultValue="devices" className="w-full">
            <TabsList className="bg-[--surface-1]">
              <TabsTrigger value="devices" className="data-[state=active]:bg-[--surface-2]">
                <TabletSmartphone className="mr-2 h-4 w-4" />
                Devices
              </TabsTrigger>
              <TabsTrigger value="alarms" className="data-[state=active]:bg-[--surface-2]">
                <TableOfContents className="mr-2 h-4 w-4" />
                Alarms
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-[--surface-2]">
                <FileChartColumn className="mr-2 h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="devices" className="mt-4">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">
                        <button
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => requestSort("name")}
                          aria-label="Sort by name"
                        >
                          Name
                          {sort.key === "name" && (
                            <ChevronUp className={cn("h-3.5 w-3.5", sort.dir === "asc" ? "" : "rotate-180")} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => requestSort("type")}
                          aria-label="Sort by type"
                        >
                          Type
                          {sort.key === "type" && (
                            <ChevronUp className={cn("h-3.5 w-3.5", sort.dir === "asc" ? "" : "rotate-180")} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[120px]">
                        <button
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => requestSort("powerKw")}
                          aria-label="Sort by power"
                        >
                          Power
                          {sort.key === "powerKw" && (
                            <ChevronUp className={cn("h-3.5 w-3.5", sort.dir === "asc" ? "" : "rotate-180")} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => requestSort("performanceRatio")}
                          aria-label="Sort by PR"
                        >
                          PR
                          {sort.key === "performanceRatio" && (
                            <ChevronUp className={cn("h-3.5 w-3.5", sort.dir === "asc" ? "" : "rotate-180")} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <button
                          className="inline-flex items-center gap-1 text-left"
                          onClick={() => requestSort("temperatureC")}
                          aria-label="Sort by temperature"
                        >
                          Temp
                          {sort.key === "temperatureC" && (
                            <ChevronUp className={cn("h-3.5 w-3.5", sort.dir === "asc" ? "" : "rotate-180")} />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((row) => (
                      <TableRow key={row.id} className="hover:bg-[--surface-1]">
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.type}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs ring-1",
                              row.status === "online" && "bg-[--success]/15 text-[--success] ring-[--success]/30",
                              row.status === "warning" && "bg-[--warning]/15 text-[--warning] ring-[--warning]/30",
                              row.status === "offline" && "bg-muted text-muted-foreground ring-border/60"
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell>{compactNumber(row.powerKw, 1)} kW</TableCell>
                        <TableCell>{Math.round(row.performanceRatio * 100)}%</TableCell>
                        <TableCell>{Math.round(row.temperatureC)}°C</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="hover:bg-[--surface-2]">
                                Manage
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover ring-1 ring-border/60">
                              <DropdownMenuItem onClick={() => onAction("view", row)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onAction("restart", row)}>Restart</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="alarms" className="mt-4">
              <div className="rounded-lg bg-[--surface-1] p-6 text-sm ring-1 ring-border/60">
                <div className="mb-2 flex items-center gap-2">
                  <TableOfContents className="h-4 w-4 text-[--danger]" />
                  <span className="font-medium">Active Alarms</span>
                </div>
                <p className="text-muted-foreground">
                  No critical alarms at this time. Historical alerts can be filtered in the Analytics module.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <div className="rounded-lg bg-[--surface-1] p-6 text-sm ring-1 ring-border/60">
                <div className="mb-2 flex items-center gap-2">
                  <FileChartColumn className="h-4 w-4 text-[--chart-2]" />
                  <span className="font-medium">Reports</span>
                </div>
                <p className="text-muted-foreground">
                  Generate performance, availability, and loss analysis reports from the Analytics section.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-border/60">
                    Daily Report
                  </Button>
                  <Button size="sm" variant="outline" className="border-border/60">
                    Weekly Report
                  </Button>
                  <Button size="sm" className="bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90">
                    Monthly Summary
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </section>
  );
}