"use client";

import React, { useState, useEffect } from "react";
import { Bolt, Gauge, Clock1, SquareChartGantt, Sun, Grid2x2Check, RectangleEllipsis, MousePointer2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useConnectionStatus } from "@/hooks/use-api";

type PlantStatus = "online" | "offline" | "maintenance" | "warning";

export interface Plant {
  id: string;
  name: string;
  location: string;
  status: PlantStatus;
  capacityKw: number;
  currentPowerKw: number;
  dailyEnergyKwh: number;
  efficiency: number; // 0..1
  sparkline: number[]; // 0..1 normalized values
  updatedAt?: string;
}

export interface PlantsListFilters {
  location?: string;
  status?: PlantStatus | "all";
  capacity?: "lt100" | "100to500" | "gt500";
}

export interface PlantsListFilterOptions {
  locations?: string[];
  statuses?: (PlantStatus | "all")[];
  capacities?: { label: string; value: "lt100" | "100to500" | "gt500" }[];
}

export interface PlantsListProps {
  className?: string;
  plants: Plant[];
  loading?: boolean;
  selectedIds?: string[];
  searchValue?: string;
  filters?: PlantsListFilters;
  filterOptions?: PlantsListFilterOptions;
  page?: number;
  pageCount?: number;

  onSearchChange?: (value: string) => void;
  onFiltersChange?: (filters: PlantsListFilters) => void;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onToggleSelectAll?: (selected: boolean) => void;
  onBulkAction?: (action: "export" | "configure" | "maintenance" | "clear") => void;
  onCardAction?: (id: string, action: "view" | "configure" | "maintenance") => void;
  onPageChange?: (page: number) => void;

  emptyMessage?: string;
}

function statusBadge(status: PlantStatus) {
  switch (status) {
    case "online":
      return { 
        label: "Online", 
        className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
        iconColor: "text-emerald-500"
      };
    case "warning":
      return { 
        label: "Warning", 
        className: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
        iconColor: "text-amber-500"
      };
    case "maintenance":
      return { 
        label: "Maintenance", 
        className: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/30",
        iconColor: "text-blue-500"
      };
    case "offline":
    default:
      return { 
        label: "Offline", 
        className: "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/30",
        iconColor: "text-red-500"
      };
  }
}

function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
}

function Sparkline({ points, className, stroke = "var(--chart-1)" }: { points: number[]; className?: string; stroke?: string }) {
  const width = 100;
  const height = 32;
  const len = points.length;
  const d =
    len > 1
      ? points
          .map((p, i) => {
            const x = (i / (len - 1)) * width;
            const y = height - p * height;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
      : "";
  const area =
    len > 1
      ? `${d} L ${width} ${height} L 0 ${height} Z`
      : "";

  return (
    <svg className={cn("w-full h-8", className)} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Generation trend">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={d} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function PlantsToolbar({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  filterOptions,
  selectedCount,
  onToggleSelectAll,
  onBulkAction,
}: {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  filters?: PlantsListFilters;
  onFiltersChange?: (f: PlantsListFilters) => void;
  filterOptions?: PlantsListFilterOptions;
  selectedCount: number;
  onToggleSelectAll?: (selected: boolean) => void;
  onBulkAction?: (action: "export" | "configure" | "maintenance" | "clear") => void;
}) {
  const locations = filterOptions?.locations ?? [];
  const statuses = filterOptions?.statuses ?? ["all", "online", "warning", "maintenance", "offline"];
  const capacities =
    filterOptions?.capacities ??
    [
      { label: "< 100 kW", value: "lt100" as const },
      { label: "100 – 500 kW", value: "100to500" as const },
      { label: "> 500 kW", value: "gt500" as const },
    ];

  return (
    <div className="w-full bg-[--surface-1]/90 backdrop-blur supports-[backdrop-filter]:bg-[--surface-1]/70 border border-[--border] rounded-2xl p-4 lg:p-5">
      {/* Header with title and main actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[--chart-1]/10">
            <Sun className="size-5 text-[--chart-1]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-lg lg:text-xl font-bold tracking-tight">Solar Plants</h2>
            <p className="text-xs text-[--muted-foreground]">Manage your solar installations</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-[--border] bg-[--surface-2]/80 px-3 py-2">
              <Grid2x2Check className="size-4 text-[--chart-1]" aria-hidden="true" />
              <span className="text-sm font-medium">{selectedCount} selected</span>
              <Separator orientation="vertical" className="h-4 bg-[--border]" />
              <Button
                size="sm"
                variant="ghost"
                className="px-2 h-6 text-[--foreground]/80 hover:text-foreground hover:bg-[--surface-1]"
                onClick={() => onToggleSelectAll?.(false)}
              >
                Clear
              </Button>
              <Button
                size="sm"
                className="h-6 px-3 bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90"
                onClick={() => onBulkAction?.("export")}
              >
                Export
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-[--surface-2]/80 border-[--border] text-foreground hover:bg-[--surface-2]">
                  <RectangleEllipsis className="mr-2 size-4" aria-hidden="true" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[--popover] text-foreground border-[--border]">
                <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onBulkAction?.("export")}>Export data</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onBulkAction?.("configure")}>Bulk configure</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onBulkAction?.("maintenance")}>Schedule maintenance</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onBulkAction?.("clear")}>Clear all filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Search bar - full width on mobile */}
      <div className="mb-4">
        <div className="relative">
          <Input
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search plants by name or location..."
            aria-label="Search plants"
            className="h-11 bg-[--surface-2]/60 border-[--border] text-foreground placeholder:text-[--muted-foreground] focus-visible:ring-[--ring] pr-4"
          />
        </div>
      </div>

      {/* Filters - stack on mobile, inline on larger screens */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm font-medium text-[--foreground]/90">Filters:</div>
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <Select
            value={filters?.location || "all"}
            onValueChange={(v) => onFiltersChange?.({ ...(filters ?? {}), location: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="h-10 bg-[--surface-2]/60 border-[--border] min-w-[140px]">
              <SelectValue placeholder="Any location" />
            </SelectTrigger>
            <SelectContent className="bg-[--popover] border-[--border]">
              <SelectItem value="all">Any location</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters?.status || "all"}
            onValueChange={(v) => onFiltersChange?.({ ...(filters ?? {}), status: v as PlantsListFilters["status"] })}
          >
            <SelectTrigger className="h-10 bg-[--surface-2]/60 border-[--border] min-w-[120px]">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent className="bg-[--popover] border-[--border]">
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {typeof s === "string" ? s.charAt(0).toUpperCase() + s.slice(1) : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters?.capacity || "all"}
            onValueChange={(v) => onFiltersChange?.({ ...(filters ?? {}), capacity: v === "all" ? undefined : v as PlantsListFilters["capacity"] })}
          >
            <SelectTrigger className="h-10 bg-[--surface-2]/60 border-[--border] min-w-[140px]">
              <SelectValue placeholder="Any capacity" />
            </SelectTrigger>
            <SelectContent className="bg-[--popover] border-[--border]">
              <SelectItem value="all">Any capacity</SelectItem>
              {capacities.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function PlantCard({
  plant,
  selected,
  onSelectChange,
  onAction,
}: {
  plant: Plant;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onAction?: (action: "view" | "configure" | "maintenance") => void;
}) {
  const badge = statusBadge(plant.status);
  const efficiencyPct = Math.round(plant.efficiency * 100);

  return (
    <div className="group relative">
      <div className="relative overflow-hidden rounded-xl bg-[--card] border border-[--border] shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
        {/* Status indicator bar */}
        <div className={cn("h-1 w-full", 
          plant.status === "online" ? "bg-emerald-500" :
          plant.status === "warning" ? "bg-amber-500" :
          plant.status === "maintenance" ? "bg-blue-500" :
          "bg-red-500"
        )} />
        
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Checkbox
                checked={!!selected}
                onCheckedChange={(c) => onSelectChange?.(Boolean(c))}
                aria-label={`Select ${plant.name}`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-[--foreground] truncate text-sm">{plant.name}</h3>
                  <Badge className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.className)}>
                    {badge.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
                  <Sun className="size-3 text-amber-500" />
                  <span className="truncate">{plant.location}</span>
                  <span>•</span>
                  <span className="font-medium">{formatNumber(plant.capacityKw)} kW</span>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 opacity-60 hover:opacity-100">
                  <RectangleEllipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onSelect={() => onAction?.("view")}>
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction?.("configure")}>
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction?.("maintenance")}>
                  Maintenance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sparkline */}
          <div className="mb-3 p-2 rounded-lg bg-[--surface-2]/50">
            <Sparkline points={plant.sparkline} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Bolt className="size-3 text-emerald-500" />
                <span className="text-xs font-medium text-[--muted-foreground]">Power</span>
              </div>
              <div className="text-sm font-bold text-[--foreground]">{formatNumber(plant.currentPowerKw, 1)}</div>
              <div className="text-xs text-[--muted-foreground]">kW</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <SquareChartGantt className="size-3 text-blue-500" />
                <span className="text-xs font-medium text-[--muted-foreground]">Energy</span>
              </div>
              <div className="text-sm font-bold text-[--foreground]">{formatNumber(plant.dailyEnergyKwh, 0)}</div>
              <div className="text-xs text-[--muted-foreground]">kWh</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-lg p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Gauge className="size-3 text-purple-500" />
                <span className="text-xs font-medium text-[--muted-foreground]">Eff.</span>
              </div>
              <div className="text-sm font-bold text-[--foreground]">{efficiencyPct}</div>
              <div className="text-xs text-[--muted-foreground]">%</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
              <Clock1 className="size-3" />
              <span>Updated {plant.updatedAt ?? "just now"}</span>
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onAction?.("view")}>
                View
              </Button>
              <Button size="sm" className="h-7 px-2 text-xs bg-[--primary] hover:bg-[--primary]/90 text-[--primary-foreground]" onClick={() => onAction?.("configure")}>
                Config
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlantCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[--card] border border-[--border] shadow-sm">
      <div className="h-1 w-full bg-[--muted]" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <Skeleton className="h-4 w-4 rounded mt-1" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        
        <div className="mb-3">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-12 rounded" />
            <Skeleton className="h-7 w-14 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlantsList({
  className,
  plants,
  loading,
  selectedIds = [],
  searchValue,
  filters,
  filterOptions,
  page = 1,
  pageCount = 1,
  onSearchChange,
  onFiltersChange,
  onToggleSelect,
  onToggleSelectAll,
  onBulkAction,
  onCardAction,
  onPageChange,
  emptyMessage = "No plants found. Try adjusting your filters or add a new plant to get started.",
}: PlantsListProps) {
  const selectedCount = selectedIds.length;
  const allSelected = plants.length > 0 && selectedCount === plants.length;
  
  // Connection status and refresh functionality
  const connectionStatus = useConnectionStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(new Date());

  // Manual data refresh
  const refreshData = async () => {
    setIsRefreshing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setLastDataUpdate(new Date());
    setIsRefreshing(false);
    toast.success("Plants data refreshed");
  };

  // Auto-refresh every 5 minutes when connected
  useEffect(() => {
    if (!connectionStatus.connected) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [connectionStatus.connected]);

  const handleAction = (id: string, action: "view" | "configure" | "maintenance") => {
    if (onCardAction) {
      onCardAction(id, action);
    } else {
      toast.message(`${action} not implemented`, { description: "Connect the onCardAction prop to handle this action." });
    }
  };

  const handleBulk = (action: "export" | "configure" | "maintenance" | "clear") => {
    if (action === "clear") {
      onFiltersChange?.({});
      return;
    }
    if (onBulkAction) {
      onBulkAction(action);
    } else {
      toast.message(`${action} not implemented`, { description: "Connect the onBulkAction prop to handle this action." });
    }
  };

  return (
    <section className={cn("w-full", className)}>
      {/* Enhanced selection controls */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(c) => onToggleSelectAll?.(Boolean(c))}
            aria-label="Select all visible plants"
          />
          <div>
            <span className="text-sm font-medium text-[--foreground]">
              {selectedCount > 0 ? `${selectedCount} of ${plants.length} selected` : `${plants.length} plants`}
            </span>
            <p className="text-xs text-[--muted-foreground]">
              {selectedCount > 0 ? "Use bulk actions or clear selection" : "Select plants for bulk actions"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--surface-2]/60 border border-[--border]">
            {connectionStatus.connected ? (
              <Wifi className="size-3 text-emerald-500" />
            ) : (
              <WifiOff className="size-3 text-red-500" />
            )}
            <span className="text-xs text-[--muted-foreground]">
              {connectionStatus.connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="bg-[--surface-2]/60 border-[--border] hover:bg-[--surface-2] gap-2"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-[--surface-2]/60 border-[--border] hover:bg-[--surface-2]"
            onClick={() => onToggleSelectAll?.(!allSelected)}
          >
            <MousePointer2 className="mr-2 size-4" aria-hidden="true" />
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>
      </div>

      {/* Enhanced toolbar */}
      <PlantsToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filterOptions={filterOptions}
        selectedCount={selectedCount}
        onToggleSelectAll={onToggleSelectAll}
        onBulkAction={handleBulk}
      />

      {/* Improved plant grid with better responsive breakpoints */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <PlantCardSkeleton key={i} />)
          : plants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                selected={selectedIds.includes(plant.id)}
                onSelectChange={(checked) => onToggleSelect?.(plant.id, checked)}
                onAction={(a) => handleAction(plant.id, a)}
              />
            ))}
      </div>

      {/* Enhanced empty state */}
      {!loading && plants.length === 0 && (
        <div className="mt-12 rounded-3xl border border-[--border]/50 bg-gradient-to-br from-[--surface-1]/80 to-[--surface-2]/40 backdrop-blur-lg p-12 text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-[--chart-1]/10 ring-1 ring-[--chart-1]/20">
            <Sun className="size-10 text-[--chart-1]" aria-hidden="true" />
          </div>
          <h3 className="mb-2 font-heading text-xl font-bold text-[--foreground]">No plants found</h3>
          <p className="mb-6 text-[--muted-foreground] max-w-md mx-auto leading-relaxed">{emptyMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <Button className="bg-[--primary] text-[--primary-foreground] hover:bg-[--primary]/90 shadow-lg">
              <Sun className="mr-2 size-4" />
              Add new plant
            </Button>
            <Button variant="outline" className="bg-[--surface-2]/60 border-[--border] hover:bg-[--surface-2]">
              Import from file
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced pagination */}
      {!loading && plants.length > 0 && pageCount > 1 && (
        <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-[--border]/60 bg-[--surface-1]/60 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[--muted-foreground]">
            <span>Page</span>
            <span className="font-medium text-[--foreground]">{page}</span>
            <span>of</span>
            <span className="font-medium text-[--foreground]">{pageCount}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-[--surface-2]/60 border-[--border] hover:bg-[--surface-2]"
              disabled={page <= 1}
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-[--surface-2]/60 border-[--border] hover:bg-[--surface-2]"
              disabled={page >= pageCount}
              onClick={() => onPageChange?.(Math.min(pageCount, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}