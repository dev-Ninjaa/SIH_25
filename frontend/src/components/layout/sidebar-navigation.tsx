"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Menu,
  PanelLeftOpen,
  PanelLeftClose,
  ChevronsLeft,
  ChevronRight,
  SquareMenu,
  ChevronDown,
  MapPin,
  Cloud,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
};

export type SidebarNavigationProps = {
  className?: string;
  style?: React.CSSProperties;
  items?: NavItem[];
  supportItems?: NavItem[];
  activeKey?: string;
  onItemSelect?: (key: string) => void;
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  layout?: "compact" | "full";
};

const baseSidebarWidth = 272; // expanded width on desktop
const railWidth = 80; // collapsed rail width

const defaultItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <SquareMenu className="h-5 w-5" aria-hidden="true" /> },
  { key: "plants", label: "Plants", icon: <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> },
  { key: "map", label: "Map", icon: <MapPin className="h-5 w-5" aria-hidden="true" /> },
  { key: "weather", label: "Weather", icon: <Cloud className="h-5 w-5" aria-hidden="true" /> },
  { key: "analytics", label: "Analytics", icon: <ChevronRight className="h-5 w-5" aria-hidden="true" /> },
  { key: "alerts", label: "Alerts", icon: <ChevronsLeft className="h-5 w-5 -rotate-90" aria-hidden="true" /> },
  { key: "reports", label: "Reports", icon: <ChevronDown className="h-5 w-5 -rotate-90" aria-hidden="true" /> },
];

const defaultSupport: NavItem[] = [
  { key: "support", label: "Support", icon: <PanelLeftClose className="h-5 w-5" aria-hidden="true" /> },
  { key: "settings", label: "Settings", icon: <Menu className="h-5 w-5" aria-hidden="true" /> },
];

function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}

export default function SidebarNavigation({
  className,
  style,
  items,
  supportItems,
  activeKey,
  onItemSelect,
  user,
  layout = "full",
}: SidebarNavigationProps) {
  const isClient = useIsClient();

  const [isCollapsed, setIsCollapsed] = useState(false);
  // Theme toggle
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    if (!isClient) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, isClient]);

  // Responsive hint: on md (>=768px and <1024px) we show rail only by CSS; labels hidden.
  // On lg (>=1024px), we respect isCollapsed to determine width.
  // On mobile (<768px), sidebar is hidden; bottom nav appears.

  const navItems = useMemo(() => items ?? defaultItems, [items]);
  const support = useMemo(() => supportItems ?? defaultSupport, [supportItems]);

  const currentUser = user ?? {
    name: "Ayush",
    email: "ayush@gmail.com",
    avatarUrl: undefined,
  };

  const handleSelect = (key: string) => {
    onItemSelect?.(key);
  };

  return (
    <>
      {/* Sidebar for md+ screens */}
      <aside
        className={[
          "group/sidebar relative hidden md:flex",
          "h-full min-h-0 w-full max-w-full",
          "flex-col justify-between",
          // Glassmorphism container with gradient border
          "rounded-xl",
          "bg-[var(--sidebar-background)]",
          "backdrop-blur-md",
          "border border-[var(--sidebar-border)]",
          "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
          // Gradient border accent using inset ring via pseudo effect
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:[background:linear-gradient(180deg,rgba(46,211,183,0.18),rgba(240,178,137,0.12)_60%,rgba(34,40,38,0.4))] before:opacity-50",
          "before:[mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] before:[mask-composite:exclude] before:p-px",
          // Width behavior
          // md: always rail; lg: switch via state
          "md:w-[80px]",
          isCollapsed ? "lg:w-[80px]" : "lg:w-[272px]",
          className ?? "",
        ].join(" ")}
        style={style}
        aria-label="Primary sidebar navigation"
      >
        {/* Inner content to create gradient border effect */}
        <div className="relative z-[1] flex h-full min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius)-2px)] bg-[var(--surface-1)]">
          {/* Top: Branding + collapse toggle (lg+) */}
          <div className="flex items-center gap-3 px-3 py-3 lg:px-4">
            <div
              className={[
                "flex items-center gap-3",
                "min-w-0",
                // md rail: center icon
                "md:mx-auto md:justify-center lg:mx-0",
              ].join(" ")}
            >
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(140deg,rgba(46,211,183,0.25),rgba(240,178,137,0.18))] ring-1 ring-white/10">
                <SquareMenu className="h-5 w-5 text-[var(--sidebar-foreground)]" aria-hidden="true" />
              </div>
              {/* Show brand text only when expanded on lg */}
              <div
                className={[
                  "hidden min-w-0 flex-col",
                  isCollapsed ? "lg:hidden" : "lg:flex",
                ].join(" ")}
              >
                <span className="truncate text-sm font-semibold tracking-tight text-[var(--sidebar-foreground)]">
                  SolGrid
                </span>
                <span className="truncate text-xs text-[var(--muted-foreground)]">
                  Energy Monitor
                </span>
              </div>
            </div>

            {/* Collapse toggle only on lg screens */}
            <button
              type="button"
              onClick={() => setIsCollapsed((c) => !c)}
              className={[
                "ml-auto hidden rounded-md p-2 text-[var(--sidebar-foreground)]/80 transition",
                "hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]",
                "lg:inline-flex",
              ].join(" ")}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={isCollapsed}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Scroll area for nav items */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <NavSection
              title="Main"
              items={navItems}
              activeKey={activeKey}
              onSelect={handleSelect}
              isCollapsedRail // labels hidden on md; on lg depend on isCollapsed
              showLabelsOnLg={!isCollapsed}
            />

            <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <NavSection
              title="Support"
              items={support}
              activeKey={activeKey}
              onSelect={handleSelect}
              isCollapsedRail
              showLabelsOnLg={!isCollapsed}
            />
          </div>

          {/* Bottom: Theme toggle and user */}
          {!isCollapsed && (
            <div className="hidden lg:block border-t border-white/5 bg-white/0 px-2 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="group inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]/80 ring-1 ring-white/10 transition hover:text-[var(--sidebar-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]"
                  aria-label="Toggle theme"
                >
                  {/* Simple glyph: switch between icons with subtle rotation */}
                  <div className="relative">
                    <ChevronsLeft
                      className={[
                        "absolute inset-0 m-auto h-5 w-5 transition-transform duration-300",
                        theme === "dark" ? "rotate-0 opacity-100" : "rotate-90 opacity-0",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <ChevronRight
                      className={[
                        "h-5 w-5 transition-transform duration-300",
                        theme === "dark" ? "-rotate-90 opacity-0" : "rotate-0 opacity-100",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                  </div>
                </button>

                {/* User preview; avatar removed per request */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-3">
                    {/* no avatar */}
                    <div className={["min-w-0", isCollapsed ? "lg:hidden" : "lg:block"].join(" ")}>
                      <p className="truncate text-sm font-medium text-[var(--sidebar-foreground)]">{currentUser.name}</p>
                      {currentUser.email ? (
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{currentUser.email}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Bottom navigation for mobile */}
      <nav
        className={[
          "md:hidden",
          "fixed inset-x-3 bottom-3 z-50",
          "rounded-xl",
          "bg-[var(--sidebar-background)] backdrop-blur-md",
          "border border-[var(--sidebar-border)]",
          "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
          "px-2 py-2",
        ].join(" ")}
        role="navigation"
        aria-label="Bottom navigation"
      >
        <ul className="flex items-center justify-between gap-1">
          {navItems.slice(0, 4).map((item) => {
            const active = activeKey === item.key;
            return (
              <li key={item.key} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleSelect(item.key)}
                  className={[
                    "group inline-flex w-full flex-col items-center justify-center gap-1 rounded-lg px-2 py-2",
                    active
                      ? "bg-[var(--sidebar-accent)]/80 text-[var(--sidebar-foreground)] ring-1 ring-[var(--sidebar-ring)]/50"
                      : "text-[var(--sidebar-foreground)]/70 hover:text-[var(--sidebar-foreground)] hover:bg-white/5",
                    "transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={[
                      "grid h-6 w-6 place-items-center rounded-md",
                      active ? "bg-white/10" : "bg-transparent group-hover:bg-white/5",
                      "transition-colors",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {item.icon ?? <SquareMenu className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="text-[11px] leading-none text-ellipsis break-words text-center text-[var(--sidebar-foreground)]/80">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function NavSection({
  title,
  items,
  activeKey,
  onSelect,
  isCollapsedRail,
  showLabelsOnLg,
}: {
  title: string;
  items: NavItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
  isCollapsedRail?: boolean;
  showLabelsOnLg?: boolean;
}) {
  return (
    <div className="w-full">
      <div
        className={[
          "px-3 pb-2 pt-1 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]/80",
          // Section header hidden on md rail; visible when labels shown on lg
          "hidden",
          showLabelsOnLg ? "lg:block" : "lg:hidden",
        ].join(" ")}
        aria-hidden={!showLabelsOnLg}
      >
        {title}
      </div>
      <ul className="flex flex-col gap-1 px-2">
        {items.map((item) => {
          const active = activeKey === item.key;
          return (
            <li key={item.key} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                className={[
                  "group relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-2 py-2",
                  "text-sm",
                  active
                    ? "bg-[var(--sidebar-accent)]/70 text-[var(--sidebar-foreground)] ring-1 ring-[var(--sidebar-ring)]/50"
                    : "text-[var(--sidebar-foreground)]/80 hover:bg-white/5 hover:text-[var(--sidebar-foreground)]",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                    active
                      ? "bg-white/10 text-[var(--sidebar-foreground)]"
                      : "bg-transparent text-[var(--sidebar-foreground)]/80 group-hover:bg-white/5 group-hover:text-[var(--sidebar-foreground)]",
                    "transition-colors",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {item.icon ?? <SquareMenu className="h-5 w-5" aria-hidden="true" />}
                </span>

                {/* Label behavior:
                   - md: hidden (rail)
                   - lg: shown if showLabelsOnLg
                */}
                <span
                  className={[
                    "min-w-0 flex-1 truncate text-left",
                    "hidden",
                    showLabelsOnLg ? "lg:inline" : "lg:hidden",
                  ].join(" ")}
                >
                  {item.label}
                </span>

                {/* Chevron indicator when labels visible */}
                <span
                  className={[
                    "ml-auto hidden text-[var(--sidebar-foreground)]/50 transition-transform",
                    showLabelsOnLg ? "lg:inline-block" : "lg:hidden",
                    active ? "translate-x-0" : "translate-x-1 group-hover:translate-x-0",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}