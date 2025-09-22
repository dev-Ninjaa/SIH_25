"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import SidebarNavigation from "@/components/layout/sidebar-navigation";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import PlantsList, {
  type Plant as PlantItem,
  type PlantsListFilters,
  type PlantsListFilterOptions,
} from "@/components/plants/plants-list";
import PlantDetail from "@/components/plants/plant-detail";
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard";
import AlarmsManagement from "@/components/alarms/alarms-management";
import InteractiveMap, { type SolarPlant } from "@/components/map/interactive-map";
import SettingsDashboard from "@/components/settings/settings-dashboard";
import HelpCenter from "@/components/help/help-center";
import DeviceDetail from "@/components/devices/device-detail";
import WeatherDashboard from "@/components/weather/weather-dashboard";
import { Toaster } from "sonner";
import { useWebSocket, useConnectionStatus } from "@/hooks/use-api";

type RouteKey =
  | "dashboard"
  | "plants"
  | "map"
  | "weather"
  | "analytics"
  | "alerts"
  | "reports"
  | "support"
  | "settings";

export default function Page() {
  const [active, setActive] = useState<RouteKey>("dashboard");

  // WebSocket and connection management
  const { isConnected, connect } = useWebSocket();
  const connectionStatus = useConnectionStatus();

  // Initialize WebSocket connection on mount
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true') {
      connect();
    }
  }, [connect]);

  // Plants domain state
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState<PlantsListFilters>({ status: "all" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount] = useState(5);
  const [viewMode, setViewMode] = useState<"list" | "map" | "detail" | "device">("list");
  const [currentPlantId, setCurrentPlantId] = useState<string | null>(null);
  const [currentDevice, setCurrentDevice] = useState<{ id: string; name: string } | null>(null);

  // Demo plants data
  const plantsData = useMemo<PlantItem[]>(
    () => [
      {
        id: "p-001",
        name: "North Ridge",
        location: "Bakersfield, CA",
        status: "online",
        capacityKw: 520,
        currentPowerKw: 410.3,
        dailyEnergyKwh: 1860,
        efficiency: 0.92,
        sparkline: [0.1, 0.2, 0.25, 0.4, 0.65, 0.8, 0.85, 0.82, 0.78, 0.6, 0.35, 0.2],
        updatedAt: "5 min ago",
      },
      {
        id: "p-002",
        name: "Coastal Array",
        location: "Santa Barbara, CA",
        status: "maintenance",
        capacityKw: 380,
        currentPowerKw: 215.7,
        dailyEnergyKwh: 1243,
        efficiency: 0.81,
        sparkline: [0.05, 0.1, 0.12, 0.3, 0.55, 0.7, 0.72, 0.6, 0.5, 0.4, 0.25, 0.1],
        updatedAt: "12 min ago",
      },
      {
        id: "p-003",
        name: "Desert Peak",
        location: "Palm Springs, CA",
        status: "warning",
        capacityKw: 640,
        currentPowerKw: 322.1,
        dailyEnergyKwh: 1684,
        efficiency: 0.76,
        sparkline: [0.08, 0.12, 0.2, 0.35, 0.62, 0.75, 0.7, 0.66, 0.58, 0.36, 0.18, 0.12],
        updatedAt: "2 min ago",
      },
      {
        id: "p-004",
        name: "South Ridge",
        location: "Yuma, AZ",
        status: "offline",
        capacityKw: 300,
        currentPowerKw: 0.0,
        dailyEnergyKwh: 0,
        efficiency: 0.0,
        sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        updatedAt: "—",
      },
      {
        id: "p-005",
        name: "City Rooftop A",
        location: "Los Angeles, CA",
        status: "online",
        capacityKw: 220,
        currentPowerKw: 160.4,
        dailyEnergyKwh: 802,
        efficiency: 0.88,
        sparkline: [0.06, 0.1, 0.2, 0.34, 0.56, 0.72, 0.79, 0.76, 0.68, 0.5, 0.3, 0.16],
        updatedAt: "just now",
      },
    ],
    []
  );

  const filterOptions = useMemo<PlantsListFilterOptions>(
    () => ({
      locations: Array.from(new Set(plantsData.map((p) => p.location))),
      statuses: ["all", "online", "warning", "maintenance", "offline"],
      capacities: [
        { label: "< 100 kW", value: "lt100" },
        { label: "100 – 500 kW", value: "100to500" },
        { label: "> 500 kW", value: "gt500" },
      ],
    }),
    [plantsData]
  );

  // Interactive map demo plants
  const mapPlants = useMemo<SolarPlant[]>(
    () => [
      {
        id: "m-001",
        name: "North Ridge",
        lat: 35.3733,
        lng: -119.0187,
        capacityMW: 0.52,
        performancePR: 0.92,
        status: "online",
        irradianceWm2: 820,
      },
      {
        id: "m-002",
        name: "Coastal Array",
        lat: 34.4208,
        lng: -119.6982,
        capacityMW: 0.38,
        performancePR: 0.81,
        status: "maintenance",
        irradianceWm2: 720,
      },
      {
        id: "m-003",
        name: "Desert Peak",
        lat: 33.8303,
        lng: -116.5453,
        capacityMW: 0.64,
        performancePR: 0.76,
        status: "online",
        irradianceWm2: 900,
      },
      {
        id: "m-004",
        name: "South Ridge",
        lat: 32.6927,
        lng: -114.6277,
        capacityMW: 0.3,
        performancePR: 0.0,
        status: "offline",
        irradianceWm2: 0,
      },
      {
        id: "m-005",
        name: "City Rooftop A",
        lat: 34.0522,
        lng: -118.2437,
        capacityMW: 0.22,
        performancePR: 0.88,
        status: "online",
        irradianceWm2: 760,
      },
    ],
    []
  );

  const handleNavSelect = useCallback((key: string) => {
    const known = ["dashboard", "plants", "map", "weather", "analytics", "alerts", "reports", "support", "settings"] as const;
    if (known.includes(key as any)) {
      setActive(key as RouteKey);
      // Reset contextual subviews when switching main section
      if (key !== "plants") {
        setViewMode("list");
        setCurrentPlantId(null);
        setCurrentDevice(null);
      }
    }
  }, []);

  // Plants interactions
  const onToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => (selected ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  }, []);

  const onToggleSelectAll = useCallback((selected: boolean) => {
    setSelectedIds(selected ? plantsData.map((p) => p.id) : []);
  }, [plantsData]);

  const onCardAction = useCallback(
    (id: string, action: "view" | "configure" | "maintenance") => {
      setCurrentPlantId(id);
      setViewMode("detail");
      // In a real app, you might route or open a drawer; here we switch view.
    },
    []
  );

  // Derived filtered list (client-side, simple demo)
  const displayedPlants = useMemo(() => {
    let out = plantsData.filter((p) => {
      const q = searchValue.trim().toLowerCase();
      const bySearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q);
      const byStatus =
        !filters.status || filters.status === "all" ? true : p.status === filters.status;
      const byLocation =
        !filters.location ? true : p.location === filters.location;
      const byCapacity =
        !filters.capacity
          ? true
          : filters.capacity === "lt100"
          ? p.capacityKw < 100
          : filters.capacity === "100to500"
          ? p.capacityKw >= 100 && p.capacityKw <= 500
          : p.capacityKw > 500;
      return bySearch && byStatus && byLocation && byCapacity;
    });
    // naive paging for demo
    const start = (page - 1) * 8;
    out = out.slice(start, start + 8);
    return out;
  }, [plantsData, searchValue, filters, page]);

  // Main content renderer
  const renderContent = () => {
    if (active === "dashboard") {
      return (
        <div className="flex flex-col gap-6">
          <DashboardOverview className="w-full" />
          <InteractiveMap plants={mapPlants} showHeader showLegend className="w-full" />
        </div>
      );
    }

    if (active === "map") {
      return (
        <div className="h-full flex flex-col">
          <InteractiveMap plants={mapPlants} showHeader showLegend className="flex-1 min-h-0" />
        </div>
      );
    }

    if (active === "weather") {
      return <WeatherDashboard />;
    }

    if (active === "plants") {
      return (
        <div className="w-full">
          {viewMode === "list" && (
            <PlantsList
              plants={displayedPlants}
              selectedIds={selectedIds}
              searchValue={searchValue}
              filters={filters}
              filterOptions={filterOptions}
              page={page}
              pageCount={pageCount}
              onSearchChange={setSearchValue}
              onFiltersChange={(f) => {
                setFilters(f);
                setPage(1);
              }}
              onToggleSelect={onToggleSelect}
              onToggleSelectAll={onToggleSelectAll}
              onCardAction={onCardAction}
              onBulkAction={() => {}}
              onPageChange={setPage}
            />
          )}
          {viewMode === "detail" && currentPlantId && (
            <PlantDetail
              className="w-full"
              name={plantsData.find((p) => p.id === currentPlantId)?.name}
              location={plantsData.find((p) => p.id === currentPlantId)?.location}
              status={
                (plantsData.find((p) => p.id === currentPlantId)?.status as
                  | "online"
                  | "maintenance"
                  | "warning"
                  | "offline") ?? "online"
              }
            />
          )}
          {viewMode === "device" && currentDevice && (
            <DeviceDetail
              className="w-full"
              deviceId={currentDevice.id}
              name={currentDevice.name}
              status="online"
              live
            />
          )}
          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-md px-3 py-1.5 text-sm ring-1 transition ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-[var(--primary)]/60"
                  : "bg-muted text-foreground ring-border/60 hover:bg-muted/80"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("detail")}
              className={`rounded-md px-3 py-1.5 text-sm ring-1 transition ${
                viewMode === "detail"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-[var(--primary)]/60"
                  : "bg-muted text-foreground ring-border/60 hover:bg-muted/80"
              }`}
            >
              Detail
            </button>
            <button
              type="button"
              onClick={() => setViewMode("device")}
              className={`rounded-md px-3 py-1.5 text-sm ring-1 transition ${
                viewMode === "device"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-[var(--primary)]/60"
                  : "bg-muted text-foreground ring-border/60 hover:bg-muted/80"
              }`}
            >
              Device
            </button>
          </div>
        </div>
      );
    }

    if (active === "analytics" || active === "reports") {
      return <AnalyticsDashboard className="w-full" />;
    }

    if (active === "alerts") {
      return <AlarmsManagement className="w-full" />;
    }

    if (active === "support") {
      return <HelpCenter className="w-full" />;
    }

    if (active === "settings") {
      return <SettingsDashboard className="w-full" />;
    }

    return null;
  };

  return (
    <main className="min-h-dvh w-full bg-[radial-gradient(1200px_600px_at_0%_0%,rgba(46,211,183,0.06),transparent_60%)]">
      <div className="mx-auto max-w-[1400px] px-3 py-3 sm:px-4 sm:py-4">
        <div
          className={[
            "grid h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2rem)]",
            "grid-cols-1 gap-3 md:grid-cols-[80px_1fr] lg:grid-cols-[auto_1fr]",
          ].join(" ")}
        >
          <SidebarNavigation
            className="h-full"
            activeKey={active}
            onItemSelect={handleNavSelect}
          />
          <section
            className={[
              "relative flex h-full min-h-0 flex-col",
              "rounded-xl border border-border bg-[var(--surface-1)]",
              "backdrop-blur-md shadow-[0_8px_24px_-12px_rgba(0,0,0,0.12)]",
              "p-3 sm:p-4 overflow-hidden",
            ].join(" ")}
          >
            <div className="relative z-[1] h-full overflow-auto">
              <div className="mx-auto max-w-[1200px]">
                {renderContent()}
              </div>
            </div>
          </section>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}