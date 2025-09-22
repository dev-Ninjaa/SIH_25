"use client";

import React from "react";
import {
  Bell,
  BellRing,
  Siren,
  ListFilter,
  CalendarDays,
  Kanban,
  AlarmClock,
  AlarmClockPlus,
  AlarmClockOff,
  Webhook,
  PanelsLeftBottom,
  ListFilterPlus,
  Clock2,
  TabletSmartphone,
  CalendarSearch,
  BadgeAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Checkbox,
} from "@/components/ui/checkbox";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Calendar,
} from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Severity = "critical" | "warning" | "info";
type Status = "new" | "acknowledged" | "resolved";

export interface AlarmTimelineEntry {
  id: string;
  timestamp: Date;
  message: string;
}

export interface Alarm {
  id: string;
  title: string;
  severity: Severity;
  plant: string;
  device: string;
  timestamp: Date;
  status: Status;
  description?: string;
  components?: string[];
  timeline?: AlarmTimelineEntry[];
  acknowledgedBy?: string;
  comments?: { id: string; author: string; text: string; timestamp: Date }[];
}

interface AlarmsManagementProps {
  className?: string;
  style?: React.CSSProperties;
  initialAlarms?: Alarm[];
  enableRealtime?: boolean;
  onAcknowledge?: (alarms: { id: string; comment?: string }[]) => void;
  onResolve?: (alarms: { id: string; comment?: string }[]) => void;
  layout?: "full" | "compact";
}

type DateRange = {
  from?: Date;
  to?: Date;
};

const severityStyles: Record<
  Severity,
  {
    dot: string;
    badge: string;
    text: string;
    ring: string;
  }
> = {
  critical: {
    dot: "bg-destructive",
    badge:
      "bg-destructive/20 text-destructive border-destructive/30",
    text: "text-destructive",
    ring: "focus-visible:ring-destructive/50",
  },
  warning: {
    dot: "bg-warning",
    badge:
      "bg-warning/20 text-warning border-warning/30",
    text: "text-warning",
    ring: "focus-visible:ring-warning/40",
  },
  info: {
    dot: "bg-chart-4",
    badge:
      "bg-chart-4/20 text-chart-4 border-chart-4/30",
    text: "text-chart-4",
    ring: "focus-visible:ring-chart-4/40",
  },
};

const statusBadge: Record<Status, string> = {
  new: "bg-secondary text-secondary-foreground",
  acknowledged: "bg-muted text-foreground",
  resolved: "bg-primary text-primary-foreground",
};

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function generateMockAlarm(id: number): Alarm {
  const severities: Severity[] = ["critical", "warning", "info"];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const now = new Date();
  const titleMap: Record<Severity, string[]> = {
    critical: [
      "Inverter Overheat",
      "Grid Disconnect",
      "String Overcurrent",
      "Battery Fault",
    ],
    warning: [
      "High DC Voltage",
      "Irradiance Drop",
      "Temperature Spike",
      "Low State of Charge",
    ],
    info: ["Maintenance Due", "Firmware Update", "Heartbeat", "Diagnostics"],
  };
  const titleArr = titleMap[severity];
  const title = titleArr[Math.floor(Math.random() * titleArr.length)];
  return {
    id: `AL-${Date.now()}-${id}`,
    title,
    severity,
    plant: `Plant ${Math.floor(Math.random() * 12) + 1}`,
    device: `INV-${Math.floor(Math.random() * 20) + 100}`,
    timestamp: new Date(now.getTime() - Math.floor(Math.random() * 3600_000)),
    status: "new",
    description:
      "Automated alert detected by monitoring system. Review the timeline and acknowledge if appropriate.",
    components: ["Inverter", "Combiner Box", "String 3"].slice(
      0,
      Math.floor(Math.random() * 3) + 1
    ),
    timeline: [
      {
        id: "t1",
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        message: "Anomaly detected by ML predictor.",
      },
      {
        id: "t2",
        timestamp: new Date(now.getTime() - 30 * 60 * 1000),
        message: "Threshold exceeded; alert created.",
      },
    ],
    comments: [],
  };
}

export default function AlarmsManagement({
  className,
  style,
  initialAlarms,
  enableRealtime = true,
  onAcknowledge,
  onResolve,
  layout = "full",
}: AlarmsManagementProps) {
  const [alarms, setAlarms] = React.useState<Alarm[]>(
    () =>
      initialAlarms ??
      Array.from({ length: 8 }, (_, i) => generateMockAlarm(i + 1))
  );
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [search, setSearch] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity | "all">("all");
  const [status, setStatus] = React.useState<Status | "all">("all");
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [commentDrafts, setCommentDrafts] = React.useState<
    Record<string, string>
  >({});
  const [isFiltering, setIsFiltering] = React.useState(false);

  // Realtime mock updates
  React.useEffect(() => {
    if (!enableRealtime) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      const newAlarm = generateMockAlarm(i);
      setAlarms((prev) => [newAlarm, ...prev].slice(0, 50));
      toast.custom(
        (t) => (
          <div
            className="rounded-lg bg-card border border-border shadow-lg px-4 py-3 text-sm"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-medium">New alarm received</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              {newAlarm.title} • {newAlarm.device} • {newAlarm.plant}
            </div>
          </div>
        ),
        { duration: 3000 }
      );
    }, 14_000);
    return () => clearInterval(interval);
  }, [enableRealtime]);

  const allSelectedIds = React.useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const filtered = React.useMemo(() => {
    setIsFiltering(true);
    const s = search.trim().toLowerCase();
    const out = alarms.filter((a) => {
      if (severity !== "all" && a.severity !== severity) return false;
      if (status !== "all" && a.status !== status) return false;
      if (dateRange.from && a.timestamp < startOfDay(dateRange.from)) {
        return false;
      }
      if (dateRange.to && a.timestamp > endOfDay(dateRange.to)) {
        return false;
      }
      if (!s) return true;
      const hay =
        `${a.title} ${a.device} ${a.plant} ${a.description ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
    // small debounce feel
    const id = setTimeout(() => setIsFiltering(false), 80);
    return out;
  }, [alarms, search, severity, status, dateRange]);

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      const map: Record<string, boolean> = {};
      filtered.forEach((a) => (map[a.id] = true));
      setSelected(map);
    } else {
      setSelected({});
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  function handleAcknowledge(ids: string[], note?: string) {
    if (ids.length === 0) return;
    setAlarms((prev) =>
      prev.map((a) =>
        ids.includes(a.id) && a.status === "new"
          ? {
              ...a,
              status: "acknowledged",
              acknowledgedBy: "You",
              comments:
                note && note.length > 0
                  ? [
                      ...(a.comments ?? []),
                      {
                        id: `${a.id}-c${Date.now()}`,
                        author: "You",
                        text: note,
                        timestamp: new Date(),
                      },
                    ]
                  : a.comments,
            }
          : a
      )
    );
    setSelected((prev) => {
      const n = { ...prev };
      ids.forEach((id) => delete n[id]);
      return n;
    });
    onAcknowledge?.(ids.map((id) => ({ id, comment: note })));
    toast.success(
      ids.length > 1
        ? `Acknowledged ${ids.length} alarms`
        : "Alarm acknowledged"
    );
  }

  function handleResolve(ids: string[], note?: string) {
    if (ids.length === 0) return;
    setAlarms((prev) =>
      prev.map((a) =>
        ids.includes(a.id)
          ? {
              ...a,
              status: "resolved",
              comments:
                note && note.length > 0
                  ? [
                      ...(a.comments ?? []),
                      {
                        id: `${a.id}-c${Date.now()}`,
                        author: "You",
                        text: note,
                        timestamp: new Date(),
                      },
                    ]
                  : a.comments,
            }
          : a
      )
    );
    setSelected((prev) => {
      const n = { ...prev };
      ids.forEach((id) => delete n[id]);
      return n;
    });
    onResolve?.(ids.map((id) => ({ id, comment: note })));
    toast.success(
      ids.length > 1 ? `Resolved ${ids.length} alarms` : "Alarm resolved"
    );
  }

  function addComment(alarmId: string, text: string) {
    if (!text.trim()) return;
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === alarmId
          ? {
              ...a,
              comments: [
                ...(a.comments ?? []),
                {
                  id: `${alarmId}-c${Date.now()}`,
                  author: "You",
                  text: text.trim(),
                  timestamp: new Date(),
                },
              ],
            }
          : a
      )
    );
    setCommentDrafts((d) => ({ ...d, [alarmId]: "" }));
  }

  return (
    <section
      className={cn(
        "w-full bg-surface-1 rounded-lg border border-border/60 shadow-sm",
        "backdrop-blur supports-[backdrop-filter]:bg-surface-1/90",
        className
      )}
      style={style}
      aria-label="Alarms and notifications management"
    >
      <div className={cn("p-4 sm:p-6")}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/20">
              <Bell className="h-3.5 w-3.5 mr-1" />
              Alarms
            </Badge>
            <span className="text-sm text-muted-foreground">
              {alarms.length} total
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full">
                    <PanelsLeftBottom className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Layout presets</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 bg-surface-2 hover:bg-muted/50 border-border"
                >
                  <Webhook className="h-4 w-4" />
                  Notification settings
                </Button>
              </SheetTrigger>
              <NotificationSettingsSheet />
            </Sheet>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-3",
            layout === "compact"
              ? "grid-cols-1"
              : "grid-cols-1 md:grid-cols-12"
          )}
        >
          <div className={cn(layout === "compact" ? "" : "md:col-span-4")}>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search alarms, devices, plants..."
                  aria-label="Search alarms"
                  className={cn(
                    "pl-9 bg-secondary/50 border-input placeholder:text-muted-foreground/70",
                    "focus-visible:ring-1 focus-visible:ring-primary"
                  )}
                />
                <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ListFilterPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Saved filters</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className={cn("flex gap-2 flex-wrap", layout === "compact" ? "" : "md:col-span-8 justify-end")}>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as Severity | "all")}
            >
              <SelectTrigger
                className="w-[160px] bg-secondary/50 border-input data-[state=open]:ring-1 data-[state=open]:ring-primary"
                aria-label="Severity filter"
              >
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">
                  Critical
                </SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
              <SelectTrigger
                className="w-[160px] bg-secondary/50 border-input"
                aria-label="Status filter"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal w-[220px] bg-secondary/50 border-input",
                    !dateRange.from && !dateRange.to ? "text-muted-foreground" : ""
                  )}
                  aria-label="Select date range"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {formatShort(dateRange.from)} - {formatShort(dateRange.to)}
                      </>
                    ) : (
                      formatShort(dateRange.from)
                    )
                  ) : (
                    <span>Date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="end">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={dateRange as any}
                  onSelect={(r: any) => {
                    setDateRange(r ?? { from: undefined, to: undefined });
                  }}
                  initialFocus
                />
                <div className="flex items-center justify-between gap-2 p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: startOfDay(new Date()),
                        to: endOfDay(new Date()),
                      })
                    }
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        from: startOfDay(addDays(new Date(), -7)),
                        to: endOfDay(new Date()),
                      })
                    }
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {allSelectedIds.length > 0 && (
          <div
            className={cn(
              "mt-4 rounded-md border border-border bg-surface-2/90 px-3 py-2",
              "flex items-center justify-between gap-2"
            )}
            role="region"
            aria-label="Bulk actions"
          >
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSelectedIds.length === filtered.length}
                onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                aria-label="Select all"
              />
              <span>
                {allSelectedIds.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => handleAcknowledge(allSelectedIds)}
              >
                <AlarmClockPlus className="h-4 w-4" />
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2"
                onClick={() => handleResolve(allSelectedIds)}
              >
                <Kanban className="h-4 w-4" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setSelected({});
                }}
              >
                <AlarmClockOff className="h-4 w-4" />
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2 text-xs text-muted-foreground">
            <div className="pl-1">Select</div>
            <div>Alarm</div>
            <div>Severity</div>
            <div>Status</div>
            <div>Time</div>
          </div>
          <Separator className="hidden sm:block bg-border/60" />

          <div className="divide-y divide-border/60">
            {isFiltering && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Filtering…
              </div>
            )}
            {!isFiltering && filtered.length === 0 && (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                No alarms match your filters.
              </div>
            )}
            {!isFiltering &&
              filtered.map((a) => (
                <AlarmRow
                  key={a.id}
                  alarm={a}
                  selected={Boolean(selected[a.id])}
                  onToggleSelected={(v) => toggleSelect(a.id, v)}
                  onAcknowledge={(note) => handleAcknowledge([a.id], note)}
                  onResolve={(note) => handleResolve([a.id], note)}
                  commentDraft={commentDrafts[a.id] ?? ""}
                  setCommentDraft={(t) =>
                    setCommentDrafts((d) => ({ ...d, [a.id]: t }))
                  }
                  addComment={addComment}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlarmRow({
  alarm,
  selected,
  onToggleSelected,
  onAcknowledge,
  onResolve,
  commentDraft,
  setCommentDraft,
  addComment,
}: {
  alarm: Alarm;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onAcknowledge: (note?: string) => void;
  onResolve: (note?: string) => void;
  commentDraft: string;
  setCommentDraft: (t: string) => void;
  addComment: (alarmId: string, text: string) => void;
}) {
  const sev = severityStyles[alarm.severity];
  const isMobile = useIsMobile();

  return (
    <div className="group">
      <Accordion type="single" collapsible>
        <AccordionItem
          value={`item-${alarm.id}`}
          className="border-none"
        >
          <div
            className={cn(
              "w-full flex items-center gap-3 px-3 sm:px-3 py-2 sm:py-3",
              "hover:bg-secondary/30 transition-colors"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Checkbox
                checked={selected}
                onCheckedChange={(v) => onToggleSelected(Boolean(v))}
                aria-label={`Select alarm ${alarm.id}`}
              />
              <span
                className={cn(
                  "h-2 w-2 rounded-full ring-2 ring-offset-0",
                  sev.dot
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("text-sm font-medium truncate", "break-words")}>
                    {alarm.title}
                  </span>
                  <Badge variant="outline" className={cn("hidden sm:inline-flex", sev.badge)}>
                    {alarm.severity}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2 min-w-0">
                  <span className="truncate min-w-0">
                    {alarm.plant} • {alarm.device}
                  </span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    •
                  </span>
                  <span className="hidden sm:inline">
                    <Clock2 className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                    {formatRelative(alarm.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {!isMobile && (
              <>
                <div className="hidden sm:block">
                  <Badge variant="outline" className={sev.badge}>
                    {alarm.severity}
                  </Badge>
                </div>
                <div className="hidden sm:block">
                  <Badge className={statusBadge[alarm.status]}>
                    {alarm.status}
                  </Badge>
                </div>
                <div className="hidden sm:block text-sm text-muted-foreground tabular-nums">
                  {formatTime(alarm.timestamp)}
                </div>
              </>
            )}

            <AccordionTrigger
              className={cn(
                "ml-auto shrink-0 px-2 py-1 rounded-md data-[state=open]:bg-secondary/40",
                "hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              )}
              aria-label={`Toggle details for ${alarm.title}`}
            />
          </div>

          <AccordionContent className="animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="px-4 sm:px-6 pb-4">
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="timeline" className="gap-2">
                    <AlarmClock className="h-4 w-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="details" className="gap-2">
                    <Siren className="h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="workflow" className="gap-2">
                    <Kanban className="h-4 w-4" />
                    Workflow
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="mt-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <ScrollArea className="h-[180px]">
                      <div className="space-y-4">
                        {alarm.timeline?.map((t) => (
                          <div key={t.id} className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-1 h-2 w-2 rounded-full",
                                severityStyles[alarm.severity].dot
                              )}
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground">
                                {formatTime(t.timestamp)}
                              </div>
                              <div className="text-sm leading-snug break-words">
                                {t.message}
                              </div>
                            </div>
                          </div>
                        ))}

                        {!alarm.timeline?.length && (
                          <div className="text-sm text-muted-foreground">
                            No timeline entries.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-3">
                  <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeAlert className={cn("h-4 w-4", sev.text)} />
                      <span className="font-medium">{alarm.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {alarm.description ?? "No description provided."}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <InfoPill label="Plant" value={alarm.plant} />
                      <InfoPill label="Device" value={alarm.device} />
                      <InfoPill label="Raised" value={formatTime(alarm.timestamp)} />
                      <InfoPill label="Status" value={alarm.status} />
                      <InfoPill label="Severity" value={alarm.severity} />
                    </div>
                    {alarm.components && alarm.components.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Affected components
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {alarm.components.map((c) => (
                              <Badge key={c} variant="outline" className="bg-secondary/40 border-border">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="workflow" className="mt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Acknowledgment
                      </div>
                      <Textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Add a comment (optional)…"
                        className="bg-secondary/40 border-input"
                        rows={3}
                        aria-label="Acknowledgment comment"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          className="gap-2"
                          onClick={() => onAcknowledge(commentDraft)}
                        >
                          <AlarmClockPlus className="h-4 w-4" />
                          Acknowledge
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={() => onResolve(commentDraft)}
                        >
                          <Kanban className="h-4 w-4" />
                          Resolve
                        </Button>
                      </div>
                      {alarm.acknowledgedBy && (
                        <div className="text-xs text-muted-foreground">
                          Acknowledged by {alarm.acknowledgedBy}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <BellRing className="h-4 w-4" />
                        Comments
                      </div>
                      <div className="space-y-3">
                        {alarm.comments?.length ? (
                          alarm.comments.map((c) => (
                            <div key={c.id} className="text-sm">
                              <div className="text-xs text-muted-foreground">
                                {c.author} • {formatRelative(c.timestamp)}
                              </div>
                              <div className="mt-0.5 break-words">{c.text}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No comments yet.
                          </div>
                        )}
                      </div>
                      <QuickComment
                        onSubmit={(text) => addComment(alarm.id, text)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

function QuickComment({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [val, setVal] = React.useState("");
  return (
    <div className="flex items-center gap-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Write a quick comment…"
        className="bg-secondary/40 border-input"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (val.trim()) {
              onSubmit(val);
              setVal("");
            }
          }
        }}
        aria-label="Quick comment"
      />
      <Button
        variant="outline"
        className="bg-secondary/50"
        onClick={() => {
          if (val.trim()) {
            onSubmit(val);
            setVal("");
          }
        }}
      >
        Send
      </Button>
    </div>
  );
}

function NotificationSettingsSheet() {
  const [email, setEmail] = React.useState(true);
  const [sms, setSms] = React.useState(false);
  const [push, setPush] = React.useState(true);
  const [critOnly, setCritOnly] = React.useState(false);

  return (
    <SheetContent side="right" className="bg-popover">
      <SheetHeader>
        <SheetTitle>Notification settings</SheetTitle>
        <SheetDescription>
          Choose how you want to be notified about new alarms.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Email</div>
              <div className="text-xs text-muted-foreground">
                Send alerts to your inbox.
              </div>
            </div>
          </div>
          <Switch checked={email} onCheckedChange={setEmail} aria-label="Email alerts" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <TabletSmartphone className="h-4 w-4 text-chart-4" />
            <div>
              <div className="text-sm font-medium">SMS</div>
              <div className="text-xs text-muted-foreground">
                Receive text messages.
              </div>
            </div>
          </div>
          <Switch checked={sms} onCheckedChange={setSms} aria-label="SMS alerts" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <Siren className="h-4 w-4 text-warning" />
            <div>
              <div className="text-sm font-medium">Push</div>
              <div className="text-xs text-muted-foreground">
                In-app notifications for new alarms.
              </div>
            </div>
          </div>
          <Switch checked={push} onCheckedChange={setPush} aria-label="Push alerts" />
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Critical only</div>
              <div className="text-xs text-muted-foreground">
                Limit notifications to critical severity.
              </div>
            </div>
          </div>
          <Switch checked={critOnly} onCheckedChange={setCritOnly} aria-label="Critical only" />
        </div>
      </div>
      <SheetFooter className="mt-6">
        <SheetClose asChild>
          <Button
            className="w-full"
            onClick={() =>
              toast.success("Notification preferences saved")
            }
          >
            Save preferences
          </Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const onResize = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 640);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

// Utils
function formatRelative(date: Date) {
  const now = new Date().getTime();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} min${m > 1 ? "s" : ""} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hr${h > 1 ? "s" : ""} ago`;
  }
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function formatShort(date?: Date) {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}