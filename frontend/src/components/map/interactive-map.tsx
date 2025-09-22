"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { toast } from "sonner";
import { useConnectionStatus } from "@/hooks/use-api";
import {
  ZoomIn,
  Map as MapIcon,
  MapPin,
  CircleDot,
  CircleSmall,
  PanelsLeftBottom,
  PanelTop,
  MapPlus,
  MapPinMinus,
  MapPinOff,
  ChartNoAxesCombined,
  MapPinX,
  RefreshCw,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

type PlantStatus = "online" | "maintenance" | "offline";

export interface SolarPlant {
  id: string;
  name: string;
  lat: number; // -90..90
  lng: number; // -180..180
  capacityMW: number;
  performancePR: number; // 0..1
  status: PlantStatus;
  irradianceWm2?: number; // optional site-level irradiance
}

interface InteractiveMapProps {
  plants: SolarPlant[];
  initialView?: "satellite" | "terrain";
  className?: string;
  style?: React.CSSProperties;
  showHeader?: boolean;
  showLegend?: boolean;
}

const SATELLITE_IMG =
  "https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=1920&auto=format&fit=crop";
const TERRAIN_IMG =
  "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?q=80&w=1920&auto=format&fit=crop";

function latLngToPercent(lat: number, lng: number) {
  const x = (lng + 180) / 360; // 0..1
  const y = 1 - (lat + 90) / 180; // invert y for top-left origin
  return { x: x * 100, y: y * 100 };
}

function statusColor(status: PlantStatus) {
  switch (status) {
    case "online":
      return "bg-[var(--success)]";
    case "maintenance":
      return "bg-[var(--warning)]";
    case "offline":
      return "bg-[var(--danger)]";
    default:
      return "bg-[var(--chart-1)]";
  }
}

function statusTextColor(status: PlantStatus) {
  switch (status) {
    case "online":
      return "text-[var(--success)]";
    case "maintenance":
      return "text-[var(--warning)]";
    case "offline":
      return "text-[var(--danger)]";
    default:
      return "text-[var(--chart-1)]";
  }
}

type Cluster = {
  id: string;
  x: number; // percentage
  y: number; // percentage
  totalCapacity: number;
  count: number;
  statusMix: Record<PlantStatus, number>;
  plants: SolarPlant[];
  avgPR: number;
};

function buildClusters(plants: SolarPlant[], zoomLevel: number): Cluster[] {
  // Simple grid-based clustering; cell size shrinks as zoom increases
  const cell = Math.max(2, 14 - zoomLevel * 2); // percentage cell size
  const map = new Map<string, Cluster>();
  for (const p of plants) {
    const { x, y } = latLngToPercent(p.lat, p.lng);
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    const key = `${gx}-${gy}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: key,
        x: gx * cell + cell / 2,
        y: gy * cell + cell / 2,
        totalCapacity: p.capacityMW,
        count: 1,
        statusMix: { online: p.status === "online" ? 1 : 0, maintenance: p.status === "maintenance" ? 1 : 0, offline: p.status === "offline" ? 1 : 0 },
        plants: [p],
        avgPR: p.performancePR,
      });
    } else {
      existing.totalCapacity += p.capacityMW;
      existing.count += 1;
      existing.statusMix[p.status] += 1;
      existing.plants.push(p);
      existing.avgPR = (existing.avgPR * (existing.count - 1) + p.performancePR) / existing.count;
    }
  }
  return Array.from(map.values());
}

export default function InteractiveMap({
  plants,
  initialView = "satellite",
  className,
  style,
  showHeader = true,
  showLegend = true,
}: InteractiveMapProps) {
  const [view, setView] = useState<"satellite" | "terrain">(initialView);
  const [zoom, setZoom] = useState<number>(3);
  const [heatmapOn, setHeatmapOn] = useState<boolean>(true);
  const [selected, setSelected] = useState<SolarPlant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date>(new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connection status
  const connectionStatus = useConnectionStatus();

  // Manual refresh functionality
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    
    // Simulate data refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLastDataUpdate(new Date());
    setIsRefreshing(false);
    toast.success("Map data refreshed");
  }, []);

  // Auto-refresh every 2 minutes when connected
  useEffect(() => {
    if (!connectionStatus.connected) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [connectionStatus.connected, refreshData]);

  const clusters = useMemo(() => buildClusters(plants, zoom), [plants, zoom]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(8, z + 1));
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(1, z - 1));
  }, []);

  const bgImage = view === "satellite" ? SATELLITE_IMG : TERRAIN_IMG;

  // Heatmap drawing
  useEffect(() => {
    if (!heatmapOn) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.5;
    // Soft radial gradients per plant scaled by irradiance
    for (const p of plants) {
      const { x, y } = latLngToPercent(p.lat, p.lng);
      const cx = (x / 100) * canvas.width;
      const cy = (y / 100) * canvas.height;
      const irr = p.irradianceWm2 ?? 600; // default moderate
      const intensity = Math.min(1, Math.max(0.2, irr / 1000));
      const radius = Math.max(40, 140 * intensity * (zoom / 3)) * (dpr * 0.9);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      // Chart/brand tones for heat
      grad.addColorStop(0, "rgba(46, 211, 183, 0.55)");
      grad.addColorStop(0.5, "rgba(240, 178, 137, 0.35)");
      grad.addColorStop(1, "rgba(18, 23, 21, 0.0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [plants, zoom, heatmapOn, view]);

  // Resize observer for canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      // retrigger drawing by toggling heatmap state quickly if on
      if (heatmapOn) {
        // force effect by updating a noop state; simpler: re-run effect by changing dependency using a timestamp
        // we'll just call the effect logic indirectly by flipping boolean and back in microtask
        // To ensure redraw, manually dispatch event
        const canvas = canvasRef.current;
        if (canvas) {
          const evt = new Event("redraw");
          canvas.dispatchEvent(evt);
        }
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [heatmapOn]);

  // Touch gestures: pinch-zoom (basic)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startDist = 0;
    let pinchActive = false;

    function distance(t1: Touch, t2: Touch) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchActive = true;
        startDist = distance(e.touches[0], e.touches[1]);
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (pinchActive && e.touches.length === 2) {
        const dist = distance(e.touches[0], e.touches[1]);
        const delta = dist - startDist;
        if (Math.abs(delta) > 10) {
          setZoom((z) => {
            const next = delta > 0 ? Math.min(8, z + 1) : Math.max(1, z - 1);
            return next;
          });
          startDist = dist;
        }
      }
    }
    function onTouchEnd() {
      pinchActive = false;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Sidebar open when plant selected (desktop) or toggle on mobile
  useEffect(() => {
    if (selected) setSidebarOpen(true);
  }, [selected]);

  const headerControls = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 items-center rounded-full bg-[var(--surface-1)]/70 backdrop-blur-sm ring-1 ring-black/40 px-2">
          <MapIcon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden />
          <span className="ml-2 text-sm font-medium text-[var(--foreground)] truncate">Solar Plants Map</span>
          <span className="mx-2 h-4 w-px bg-[var(--border)]" aria-hidden />
          <Badge variant="secondary" className="bg-[var(--surface-2)] text-[var(--sidebar-foreground)]">
            {plants.length} sites
          </Badge>
          <span className="mx-2 h-4 w-px bg-[var(--border)]" aria-hidden />
          <div className="flex items-center gap-1.5">
            {connectionStatus.connected ? (
              <Wifi className="h-3 w-3 text-emerald-500" aria-hidden />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" aria-hidden />
            )}
            <span className="text-xs text-[var(--muted-foreground)]">
              {connectionStatus.connected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]"
                onClick={refreshData}
                disabled={isRefreshing}
                aria-label="Refresh map data"
              >
                <RefreshCw className={cn("h-4 w-4 text-[var(--muted-foreground)]", isRefreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Refresh data • Last: {lastDataUpdate.toLocaleTimeString()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="hidden sm:flex items-center rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 p-1">
          <Tabs value={view} onValueChange={(v) => setView(v as "satellite" | "terrain")} className="w-auto">
            <TabsList className="flex bg-transparent p-0 gap-1 w-auto">
              <TabsTrigger
                value="satellite"
                className={cn(
                  "rounded-full data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--foreground)]",
                  "text-xs px-3 py-1.5 text-[var(--muted-foreground)] min-w-0 whitespace-nowrap"
                )}
                aria-label="Satellite view"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5 shrink-0" />
                  <span>Satellite</span>
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="terrain"
                className={cn(
                  "rounded-full data-[state=active]:bg-[var(--surface-2)] data-[state=active]:text-[var(--foreground)]",
                  "text-xs px-3 py-1.5 text-[var(--muted-foreground)] min-w-0 whitespace-nowrap"
                )}
                aria-label="Terrain view"
              >
                <span className="inline-flex items-center gap-1.5">
                  <CircleSmall className="h-3.5 w-3.5 shrink-0" />
                  <span>Terrain</span>
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="flex items-center rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-[var(--surface-2)]"
                  onClick={() => setHeatmapOn((v) => !v)}
                  aria-pressed={heatmapOn}
                  aria-label="Toggle irradiance heatmap"
                >
                  <PanelTop className={cn("h-4 w-4", heatmapOn ? "text-[var(--chart-2)]" : "text-[var(--muted-foreground)]")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle irradiance overlay</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border)]" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomOut}
                  className="h-8 w-8 rounded-full hover:bg-[var(--surface-2)]"
                  aria-label="Zoom out"
                >
                  <MapPinMinus className="h-4 w-4 text-[var(--muted-foreground)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleZoomIn}
                  className="h-8 w-8 rounded-full hover:bg-[var(--surface-2)]"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4 text-[var(--muted-foreground)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Zoom in</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border)]" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSidebarOpen((s) => !s)}
                  className="h-8 w-8 rounded-full hover:bg-[var(--surface-2)]"
                  aria-label="Toggle details panel"
                >
                  <PanelsLeftBottom className="h-4 w-4 text-[var(--muted-foreground)]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Toggle details</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className={cn("relative w-full max-w-full", className)} style={style}>
      {showHeader && (
        <div className="mb-3">
          {headerControls}
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative w-full min-h-[420px] sm:min-h-[520px] rounded-xl overflow-hidden",
          "bg-[var(--surface-1)] ring-1 ring-[var(--border)]"
        )}
        aria-label="Interactive solar plants map"
        role="region"
      >
        {/* Map base layer */}
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out will-change-transform",
            "bg-black"
          )}
          style={{
            backgroundImage: `url("${bgImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${1 + (zoom - 3) * 0.08})`,
          }}
          aria-hidden
        />

        {/* Subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" aria-hidden />

        {/* Heatmap overlay */}
        {heatmapOn && (
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 mix-blend-screen"
            aria-hidden
          />
        )}

        {/* Clusters/Markers */}
        <div className="absolute inset-0">
          {clusters.map((c) => {
            const size =
              c.count === 1
                ? Math.min(24 + Math.sqrt(c.totalCapacity) * 0.8, 42)
                : Math.min(30 + Math.sqrt(c.totalCapacity) * 1.2 + c.count * 0.8, 62);
            const onlineRatio = c.statusMix.online / c.count;
            const statusClass =
              onlineRatio > 0.7
                ? "ring-[var(--success)]"
                : c.statusMix.offline / c.count > 0.4
                ? "ring-[var(--danger)]"
                : "ring-[var(--warning)]";

            return (
              <Popover key={c.id}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "group absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                      "bg-[var(--surface-2)]/70 backdrop-blur-md ring-2",
                      statusClass,
                      "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                      "hover:scale-105 transition-transform duration-200"
                    )}
                    style={{
                      left: `${c.x}%`,
                      top: `${c.y}%`,
                      width: size,
                      height: size,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // If single plant, set selected directly
                      if (c.count === 1) setSelected(c.plants[0]);
                    }}
                    aria-label={c.count === 1 ? `Plant ${c.plants[0].name}` : `${c.count} plants cluster`}
                  >
                    <div className="absolute inset-0 grid place-items-center">
                      {c.count > 1 ? (
                        <span className="text-[10px] sm:text-xs font-semibold text-[var(--foreground)]">
                          {c.count}
                        </span>
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-[var(--foreground)] opacity-90" />
                      )}
                    </div>
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[10px] leading-none bg-black/40 text-white"
                      aria-hidden
                    >
                      {Math.round(c.totalCapacity)} MW
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className={cn(
                    "w-72 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/85 backdrop-blur-lg p-0"
                  )}
                >
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {c.count > 1 ? `${c.count} plants` : c.plants[0].name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-[var(--border)] text-[var(--muted-foreground)]">
                          {Math.round(c.totalCapacity)} MW
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            c.avgPR > 0.85
                              ? "bg-[color-mix(in_oklab,var(--chart-1)_70%,black)]"
                              : c.avgPR > 0.7
                              ? "bg-[color-mix(in_oklab,var(--chart-2)_70%,black)]"
                              : "bg-[color-mix(in_oklab,var(--danger)_60%,black)]",
                            "text-[var(--primary-foreground)]"
                          )}
                        >
                          PR {Math.round(c.avgPR * 100)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {c.count > 1 ? (
                        <ScrollArea className="h-28">
                          <div className="space-y-2 pr-2">
                            {c.plants.slice(0, 6).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setSelected(p);
                                  toast.success(`Selected ${p.name}`);
                                }}
                                className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-[var(--surface-2)]/80 transition"
                              >
                                <div className="min-w-0 flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "h-2.5 w-2.5 rounded-full",
                                      statusColor(p.status)
                                    )}
                                    aria-hidden
                                  />
                                  <span className="text-sm truncate">{p.name}</span>
                                </div>
                                <span className="text-xs text-[var(--muted-foreground)]">{Math.round(p.capacityMW)} MW</span>
                              </button>
                            ))}
                            {c.plants.length > 6 && (
                              <div className="text-xs text-[var(--muted-foreground)] px-2">+{c.plants.length - 6} more in cluster</div>
                            )}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-[var(--muted-foreground)] text-xs">Status</Label>
                            <div className={cn("mt-0.5 text-sm font-medium", statusTextColor(c.plants[0].status))}>
                              {c.plants[0].status}
                            </div>
                          </div>
                          <div>
                            <Label className="text-[var(--muted-foreground)] text-xs">Capacity</Label>
                            <div className="mt-0.5 text-sm font-medium">{Math.round(c.plants[0].capacityMW)} MW</div>
                          </div>
                          <div>
                            <Label className="text-[var(--muted-foreground)] text-xs">PR</Label>
                            <div className="mt-0.5 text-sm font-medium">{Math.round(c.plants[0].performancePR * 100)}%</div>
                          </div>
                          <div>
                            <Label className="text-[var(--muted-foreground)] text-xs">Irradiance</Label>
                            <div className="mt-0.5 text-sm font-medium">{Math.round(c.plants[0].irradianceWm2 ?? 0)} W/m²</div>
                          </div>
                          <div className="col-span-2">
                            <Button
                              size="sm"
                              className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                              onClick={() => {
                                setSelected(c.plants[0]);
                                toast.message("Plant opened", { description: c.plants[0].name });
                              }}
                            >
                              <ChartNoAxesCombined className="mr-2 h-4 w-4" />
                              View details
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        {/* HUD: floating bottom controls (mobile) */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 sm:hidden">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]"
              onClick={() => setView(view === "satellite" ? "terrain" : "satellite")}
              aria-label="Toggle map layer"
            >
              <MapIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-10 w-10 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]",
                heatmapOn && "ring-2 ring-[var(--chart-2)]"
              )}
              onClick={() => setHeatmapOn((v) => !v)}
              aria-label="Toggle irradiance overlay"
            >
              <PanelTop className="h-5 w-5 text-[var(--muted-foreground)]" />
            </Button>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]"
              onClick={handleZoomOut}
              aria-label="Zoom out"
            >
              <MapPinMinus className="h-5 w-5 text-[var(--muted-foreground)]" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]"
              onClick={handleZoomIn}
              aria-label="Zoom in"
            >
              <MapPlus className="h-5 w-5 text-[var(--muted-foreground)]" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full bg-[var(--surface-1)]/70 backdrop-blur-md ring-1 ring-black/40 hover:bg-[var(--surface-2)]"
              onClick={() => setSidebarOpen((s) => !s)}
              aria-label="Toggle details panel"
            >
              <PanelsLeftBottom className="h-5 w-5 text-[var(--muted-foreground)]" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="absolute left-3 bottom-3 hidden sm:flex flex-col gap-2 rounded-xl bg-[var(--surface-1)]/75 backdrop-blur-md ring-1 ring-black/40 p-3">
            <div className="text-xs font-medium text-[var(--muted-foreground)]">Legend</div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
              <span className="text-xs">Online</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]" />
              <span className="text-xs">Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
              <span className="text-xs">Offline</span>
            </div>
            <Separator className="bg-[var(--border)]" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">Marker size ~ capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-6 bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-transparent rounded-full" />
              <span className="text-xs">Irradiance heatmap</span>
            </div>
          </div>
        )}

        {/* Right sidebar details */}
        <aside
          className={cn(
            "absolute top-3 right-3 bottom-3 w-[360px] max-w-[85vw] transform-gpu transition-all duration-300",
            "rounded-xl bg-[var(--surface-1)]/80 backdrop-blur-xl ring-1 ring-black/40 overflow-hidden",
            sidebarOpen ? "translate-x-0 opacity-100" : "translate-x-[110%] opacity-0"
          )}
          aria-label="Selected plant details"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]/80">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
              <h3 className="text-sm font-semibold truncate">
                {selected ? selected.name : "No plant selected"}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-[var(--surface-2)]"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close details"
              >
                <MapPinOff className="h-4 w-4 text-[var(--muted-foreground)]" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!selected ? (
                <Card className="bg-[var(--surface-2)]/60 border-[var(--border)]">
                  <CardContent className="py-6 text-center">
                    <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-[var(--surface-1)] grid place-items-center">
                      <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">Select a marker to view plant details.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="bg-transparent border-[var(--border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{selected.name}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-[var(--border)] text-[var(--muted-foreground)]">
                          {Math.round(selected.capacityMW)} MW
                        </Badge>
                        <Badge className={cn("text-xs",
                          selected.status === "online" ? "bg-[var(--success)] text-black" :
                          selected.status === "maintenance" ? "bg-[var(--warning)] text-black" :
                          "bg-[var(--danger)] text-white"
                        )}>
                          {selected.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[var(--muted-foreground)] text-xs">Performance Ratio</Label>
                        <div className="mt-0.5 text-sm font-medium">{Math.round(selected.performancePR * 100)}%</div>
                      </div>
                      <div>
                        <Label className="text-[var(--muted-foreground)] text-xs">Irradiance</Label>
                        <div className="mt-0.5 text-sm font-medium">{Math.round(selected.irradianceWm2 ?? 0)} W/m²</div>
                      </div>
                      <div>
                        <Label className="text-[var(--muted-foreground)] text-xs">Latitude</Label>
                        <div className="mt-0.5 text-sm font-medium">{selected.lat.toFixed(3)}</div>
                      </div>
                      <div>
                        <Label className="text-[var(--muted-foreground)] text-xs">Longitude</Label>
                        <div className="mt-0.5 text-sm font-medium">{selected.lng.toFixed(3)}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-transparent border-[var(--border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Quick actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-2)]/80"
                        onClick={() => toast.info("Opening analytics", { description: selected.name })}
                      >
                        <ChartNoAxesCombined className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-2)]/80"
                        onClick={() => toast.message("Centering map", { description: selected.name })}
                      >
                        <MapIcon className="mr-2 h-4 w-4" />
                        Center
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-2)]/80"
                        onClick={() => {
                          setSelected(null);
                          toast.success("Cleared selection");
                        }}
                      >
                        <MapPinX className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-2)]/80"
                        onClick={() => toast.success("Editing not implemented")}
                      >
                        <PanelsLeftBottom className="mr-2 h-4 w-4" />
                        More
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Footer micro info */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <span>Zoom: {zoom}x</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Layer: {view}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{heatmapOn ? "Heatmap on" : "Heatmap off"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Imagery</span>
          <a
            href="https://unsplash.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2"
          >
            Unsplash
          </a>
        </div>
      </div>
    </div>
  );
}