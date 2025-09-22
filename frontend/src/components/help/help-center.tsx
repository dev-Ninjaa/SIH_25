"use client"

import * as React from "react"
import {
  BookMarked,
  Bookmark,
  Search,
  TextSearch,
  Info,
  MessageCircleQuestionMark,
  CircleQuestionMark,
  FileQuestionMark,
  WifiLow,
  LaptopMinimal,
  Speech,
  SearchCode,
  LibraryBig,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

type HelpCenterProps = {
  className?: string
  initialTab?: string
}

type Article = {
  id: string
  title: string
  excerpt: string
  category: "docs" | "kb" | "troubleshooting" | "faq" | "tutorials"
  content: string
  steps?: string[]
  videoUrl?: string
  tags?: string[]
}

const ARTICLES: Article[] = [
  {
    id: "getting-started",
    title: "Getting Started with the Solar Dashboard",
    excerpt: "Learn the fundamentals: connecting plants, reading charts, and setting alerts.",
    category: "docs",
    content:
      "This guide walks through the initial setup: account verification, connecting your first plant, and understanding the main dashboard metrics.",
    tags: ["setup", "onboarding", "plants"],
  },
  {
    id: "connect-inverter",
    title: "Connect an Inverter via Wi‑Fi",
    excerpt: "Step-by-step to connect your inverter to the platform using Wi‑Fi.",
    category: "troubleshooting",
    content:
      "Follow these steps to connect your inverter to the platform. Ensure stable Wi‑Fi and correct plant selection.",
    steps: [
      "Open the dashboard and navigate to Plants.",
      "Tap Add Device and choose Inverter.",
      "Press the pair button on the inverter for 3 seconds.",
      "Select your inverter from the device list.",
      "Enter the Wi‑Fi password and confirm.",
      "Wait for the status LED to turn solid green.",
    ],
    tags: ["wifi", "hardware", "inverter"],
  },
  {
    id: "alerts-config",
    title: "Configure Performance Alerts",
    excerpt: "Set thresholds for underperformance and fault conditions.",
    category: "docs",
    content:
      "Alerts notify you about anomalies. Configure thresholds per plant and choose delivery channels such as email or SMS.",
    tags: ["alerts", "notifications"],
  },
  {
    id: "api-access",
    title: "API Access and Tokens",
    excerpt: "Generate API tokens and query plant metrics programmatically.",
    category: "kb",
    content:
      "Create and manage API tokens under Settings > Developer. Use tokens to authenticate requests to the /v1 endpoints.",
    tags: ["api", "developer"],
  },
  {
    id: "no-data",
    title: "Why am I not seeing any data?",
    excerpt: "Common causes for zero or stale data and how to fix them.",
    category: "faq",
    content:
      "Check device power, network connectivity, and plant assignment. Confirm time zone settings and data polling windows.",
    tags: ["data", "troubleshooting"],
  },
  {
    id: "video-tour",
    title: "Video: Dashboard Tour (3 min)",
    excerpt: "A quick walkthrough of key features in the dashboard.",
    category: "tutorials",
    content:
      "Watch this short video to learn navigation patterns and key metrics.",
    videoUrl:
      "https://player.vimeo.com/external/310749178.sd.mp4?s=9f7e7b6df9c9b4c0d0c3ec3a0e7d3a5a917f86f7&profile_id=164&oauth2_token_id=57447761",
    tags: ["video", "overview"],
  },
]

const FAQ: { q: string; a: string; id: string }[] = [
  {
    id: "faq-1",
    q: "How often is data refreshed?",
    a: "Most devices report every 5 minutes. You can see last updated timestamps in the plant header.",
  },
  {
    id: "faq-2",
    q: "Can I export data to CSV?",
    a: "Yes, go to Analytics > Exports. Choose the plant, metrics, and range, then generate the CSV.",
  },
  {
    id: "faq-3",
    q: "How do I invite teammates?",
    a: "Navigate to Settings > Team and send an invitation by email. Assign roles for access control.",
  },
]

const ONBOARDING_STEPS: { id: string; label: string; helper?: string }[] = [
  { id: "acc-verify", label: "Verify your account email" },
  { id: "add-plant", label: "Create your first plant" },
  { id: "connect-device", label: "Connect a device (inverter or meter)" },
  { id: "alert", label: "Set an underperformance alert", helper: "Recommended" },
  { id: "share", label: "Invite a teammate (optional)" },
]

const SEARCH_INDEX = ARTICLES.map((a) => ({
  id: a.id,
  title: a.title,
  body: `${a.excerpt} ${a.content} ${(a.tags || []).join(" ")}`,
  category: a.category,
}))

function highlight(text: string, query: string) {
  if (!query) return text
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(`(${escaped})`, "ig")
    const parts = text.split(re)
    return parts.map((part, i) =>
      re.test(part) ? (
        <mark
          key={i}
          className="rounded-sm bg-primary/20 px-0.5 text-primary"
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )
  } catch {
    return text
  }
}

export default function HelpCenter({
  className,
  initialTab = "docs",
}: HelpCenterProps) {
  const [tab, setTab] = React.useState<string>(initialTab)
  const [query, setQuery] = React.useState("")
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false)
  const [bookmarks, setBookmarks] = React.useState<Set<string>>(new Set())
  const [onboarding, setOnboarding] = React.useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(ONBOARDING_STEPS.map((s) => [s.id, false])) as Record<
        string,
        boolean
      >
  )
  const [ratings, setRatings] = React.useState<Record<string, "up" | "down" | undefined>>({})

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem("help_bookmarks")
      if (stored) {
        setBookmarks(new Set(JSON.parse(stored)))
      }
      const onboardStored = window.localStorage.getItem("help_onboarding")
      if (onboardStored) {
        const parsed = JSON.parse(onboardStored)
        setOnboarding((prev) => ({ ...prev, ...parsed }))
      }
      const rateStored = window.localStorage.getItem("help_ratings")
      if (rateStored) {
        setRatings(JSON.parse(rateStored))
      }
    } catch {
      // ignore
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        "help_bookmarks",
        JSON.stringify(Array.from(bookmarks))
      )
    } catch {
      // ignore
    }
  }, [bookmarks])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem("help_onboarding", JSON.stringify(onboarding))
    } catch {
      // ignore
    }
  }, [onboarding])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem("help_ratings", JSON.stringify(ratings))
    } catch {
      // ignore
    }
  }, [ratings])

  const matched = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return SEARCH_INDEX.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.body.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [query])

  const progress =
    (Object.values(onboarding).filter(Boolean).length / ONBOARDING_STEPS.length) * 100

  function toggleBookmark(id: string, title?: string) {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast.message("Removed bookmark", { description: title })
      } else {
        next.add(id)
        toast.success("Saved to bookmarks", { description: title })
      }
      return next
    })
  }

  function handleRate(id: string, val: "up" | "down") {
    setRatings((prev) => {
      const next = { ...prev, [id]: prev[id] === val ? undefined : val }
      toast.message("Thanks for your feedback")
      return next
    })
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  return (
    <section
      className={cn(
        "w-full max-w-full rounded-xl bg-surface-1/80 p-4 shadow-sm ring-1 ring-border backdrop-blur supports-[backdrop-filter]:bg-surface-1/60 sm:p-6 print:bg-white print:text-black",
        className
      )}
      aria-label="Help and documentation center"
    >
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Help Center
              </h2>
              <p className="text-muted-foreground text-sm">
                Search docs, watch tutorials, troubleshoot, and contact support.
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 print:hidden sm:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      onClick={handlePrint}
                    >
                      <LibraryBig className="mr-2 h-4 w-4" aria-hidden />
                      Print
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print-friendly view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 ring-0 focus-within:ring-1 focus-within:ring-primary">
              <Search aria-hidden className="h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search help articles"
                placeholder="Search guides, FAQs, and tutorials..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSuggestionsOpen(true)
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                className="border-0 bg-transparent p-0 focus-visible:ring-0"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  Clear
                </Button>
              )}
            </div>

            {suggestionsOpen && matched.length > 0 && (
              <div
                role="listbox"
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
              >
                <ul className="max-h-72 w-full divide-y divide-border overflow-auto">
                  {matched.map((m) => (
                    <li key={m.id}>
                      <button
                        className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-muted focus:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setTab(m.category)
                          // move focus out
                          setSuggestionsOpen(false)
                          setQuery(m.title)
                        }}
                        aria-label={`Open ${m.title}`}
                      >
                        <TextSearch className="mt-0.5 h-4 w-4 text-primary" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {highlight(m.title, query)}
                          </div>
                          <div className="text-muted-foreground line-clamp-2 text-xs">
                            in {m.category}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-secondary/50 p-1">
              <TabsTrigger value="docs" className="data-[state=active]:bg-card">
                <BookMarked className="mr-2 h-4 w-4" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="tutorials" className="data-[state=active]:bg-card">
                <LaptopMinimal className="mr-2 h-4 w-4" />
                Tutorials
              </TabsTrigger>
              <TabsTrigger value="faq" className="data-[state=active]:bg-card">
                <CircleQuestionMark className="mr-2 h-4 w-4" />
                FAQ
              </TabsTrigger>
              <TabsTrigger value="troubleshooting" className="data-[state=active]:bg-card">
                <WifiLow className="mr-2 h-4 w-4" />
                Troubleshoot
              </TabsTrigger>
              <TabsTrigger value="kb" className="data-[state=active]:bg-card">
                <SearchCode className="mr-2 h-4 w-4" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="data-[state=active]:bg-card">
                <Info className="mr-2 h-4 w-4" />
                Onboarding
              </TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-card">
                <MessageCircleQuestionMark className="mr-2 h-4 w-4" />
                Support
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docs" className="mt-4">
              <DocsSection
                articles={ARTICLES.filter((a) => a.category === "docs")}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                query={query}
              />
            </TabsContent>

            <TabsContent value="tutorials" className="mt-4">
              <TutorialsSection
                articles={ARTICLES.filter((a) => a.category === "tutorials")}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                query={query}
              />
            </TabsContent>

            <TabsContent value="faq" className="mt-4">
              <FAQSection items={FAQ} query={query} />
            </TabsContent>

            <TabsContent value="troubleshooting" className="mt-4">
              <TroubleshootSection
                articles={ARTICLES.filter((a) => a.category === "troubleshooting")}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                query={query}
              />
            </TabsContent>

            <TabsContent value="kb" className="mt-4">
              <KnowledgeBaseSection
                articles={ARTICLES.filter((a) => a.category === "kb")}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                onRate={handleRate}
                ratings={ratings}
                query={query}
              />
            </TabsContent>

            <TabsContent value="onboarding" className="mt-4">
              <OnboardingSection
                steps={ONBOARDING_STEPS}
                state={onboarding}
                setState={setOnboarding}
                progress={progress}
              />
            </TabsContent>

            <TabsContent value="support" className="mt-4">
              <SupportSection />
            </TabsContent>
          </Tabs>
        </div>

        {bookmarks.size > 0 && (
          <Card className="border-border bg-surface-2/60 print:hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Bookmarks</CardTitle>
                <CardDescription>Your saved articles</CardDescription>
              </div>
              <LibraryBig className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Array.from(bookmarks).map((id) => {
                  const a = ARTICLES.find((x) => x.id === id)
                  if (!a) return null
                  return (
                    <button
                      key={id}
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm hover:bg-muted"
                      onClick={() => toast.message(a.title)}
                      aria-label={`Open ${a.title}`}
                    >
                      <BookMarked className="h-4 w-4 text-primary" />
                      <span className="truncate">{a.title}</span>
                      <span className="text-muted-foreground">• {a.category}</span>
                      <span className="ml-1 hidden text-primary group-hover:inline">
                        View
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

function DocsSection({
  articles,
  onBookmark,
  bookmarks,
  query,
}: {
  articles: Article[]
  onBookmark: (id: string, title?: string) => void
  bookmarks: Set<string>
  query: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {articles.map((a) => (
        <Card
          key={a.id}
          className="border-border bg-card/70 transition-colors hover:bg-card"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {highlight(a.title, query)}
              </CardTitle>
              <CardDescription className="break-words">
                {highlight(a.excerpt, query)}
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={bookmarks.has(a.id) ? "Remove bookmark" : "Add bookmark"}
                    size="icon"
                    variant="ghost"
                    onClick={() => onBookmark(a.id, a.title)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {bookmarks.has(a.id) ? (
                      <BookMarked className="h-5 w-5 text-primary" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {bookmarks.has(a.id) ? "Bookmarked" : "Bookmark"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value={`read-${a.id}`} className="border-b-0">
                <AccordionTrigger className="hover:no-underline">
                  Read more
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm leading-relaxed">
                    <p className="break-words">{highlight(a.content, query)}</p>
                    {a.tags && a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TutorialsSection({
  articles,
  onBookmark,
  bookmarks,
  query,
}: {
  articles: Article[]
  onBookmark: (id: string, title?: string) => void
  bookmarks: Set<string>
  query: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {articles.map((a) => (
        <Card key={a.id} className="border-border bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                <span className="mr-2 inline-flex align-middle">
                  <LaptopMinimal className="h-4 w-4 text-primary" />
                </span>
                {highlight(a.title, query)}
              </CardTitle>
              <CardDescription>{highlight(a.excerpt, query)}</CardDescription>
            </div>
            <Button
              aria-label={bookmarks.has(a.id) ? "Remove bookmark" : "Add bookmark"}
              size="icon"
              variant="ghost"
              onClick={() => onBookmark(a.id, a.title)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {bookmarks.has(a.id) ? (
                <BookMarked className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {a.videoUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-border">
                <video
                  controls
                  preload="metadata"
                  className="h-auto w-full"
                  poster="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop"
                >
                  <source src={a.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No video available.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FAQSection({ items, query }: { items: { q: string; a: string; id: string }[]; query: string }) {
  return (
    <Card className="border-border bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileQuestionMark className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </CardTitle>
        <CardDescription>Expand to see answers</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {items.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="text-left">
                <span className="min-w-0 break-words">
                  {highlight(f.q, query)}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm leading-relaxed">{highlight(f.a, query)}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

function TroubleshootSection({
  articles,
  onBookmark,
  bookmarks,
  query,
}: {
  articles: Article[]
  onBookmark: (id: string, title?: string) => void
  bookmarks: Set<string>
  query: string
}) {
  return (
    <div className="space-y-4">
      {articles.map((a) => (
        <Card key={a.id} className="border-border bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                <WifiLow className="mr-2 inline h-4 w-4 text-primary" />
                {highlight(a.title, query)}
              </CardTitle>
              <CardDescription>{highlight(a.excerpt, query)}</CardDescription>
            </div>
            <Button
              aria-label={bookmarks.has(a.id) ? "Remove bookmark" : "Add bookmark"}
              size="icon"
              variant="ghost"
              onClick={() => onBookmark(a.id, a.title)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {bookmarks.has(a.id) ? (
                <BookMarked className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {a.steps && a.steps.length > 0 ? (
              <ol className="space-y-3">
                {a.steps.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-medium text-primary">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{highlight(s, query)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No steps available.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function KnowledgeBaseSection({
  articles,
  onBookmark,
  bookmarks,
  onRate,
  ratings,
  query,
}: {
  articles: Article[]
  onBookmark: (id: string, title?: string) => void
  bookmarks: Set<string>
  onRate: (id: string, val: "up" | "down") => void
  ratings: Record<string, "up" | "down" | undefined>
  query: string
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {articles.map((a) => (
        <Card key={a.id} className="border-border bg-card/70">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">
                <LibraryBig className="mr-2 inline h-4 w-4 text-primary" />
                {highlight(a.title, query)}
              </CardTitle>
              <CardDescription>{highlight(a.excerpt, query)}</CardDescription>
            </div>
            <Button
              aria-label={bookmarks.has(a.id) ? "Remove bookmark" : "Add bookmark"}
              size="icon"
              variant="ghost"
              onClick={() => onBookmark(a.id, a.title)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {bookmarks.has(a.id) ? (
                <BookMarked className="h-5 w-5 text-primary" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{highlight(a.content, query)}</p>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Was this helpful?</div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={ratings[a.id] === "up" ? "default" : "secondary"}
                onClick={() => onRate(a.id, "up")}
                className={cn(
                  ratings[a.id] === "up"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                Helpful
              </Button>
              <Button
                size="sm"
                variant={ratings[a.id] === "down" ? "default" : "secondary"}
                onClick={() => onRate(a.id, "down")}
                className={cn(
                  ratings[a.id] === "down"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                Not really
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function OnboardingSection({
  steps,
  state,
  setState,
  progress,
}: {
  steps: { id: string; label: string; helper?: string }[]
  state: Record<string, boolean>
  setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  progress: number
}) {
  return (
    <Card className="border-border bg-card/70">
      <CardHeader>
        <CardTitle className="text-base">Onboarding Checklist</CardTitle>
        <CardDescription>
          Complete steps to set up your solar monitoring workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
          <div className="w-2/3">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
        <ul className="space-y-3">
          {steps.map((s) => (
            <li key={s.id} className="flex items-start gap-3">
              <Checkbox
                id={s.id}
                checked={state[s.id] || false}
                onCheckedChange={(v) =>
                  setState((prev) => ({ ...prev, [s.id]: Boolean(v) }))
                }
                aria-describedby={`${s.id}-label`}
              />
              <div className="min-w-0">
                <Label
                  id={`${s.id}-label`}
                  htmlFor={s.id}
                  className="cursor-pointer"
                >
                  {s.label}
                </Label>
                {s.helper && (
                  <div className="text-xs text-muted-foreground">{s.helper}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function SupportSection() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="border-border bg-card/70 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Speech className="h-5 w-5 text-primary" />
            Contact Support
          </CardTitle>
          <CardDescription>
            We typically respond within 1 business day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success("Message sent")
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-name">Name</Label>
                <Input id="support-name" placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Email</Label>
                <Input id="support-email" type="email" placeholder="you@company.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" placeholder="Brief summary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                placeholder="Describe the issue or question..."
                className="min-h-[120px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Include device IDs or plant names for faster resolution.
              </span>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/70 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Live Chat</CardTitle>
          <CardDescription>
            Chat widget placeholder. Your live chat will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Integrate your chat provider here. For now, use the contact form to
            reach us.
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full">
                Open sample conversation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Sample Support Chat</DialogTitle>
                <DialogDescription>
                  This is a non-interactive preview of how your chat could look.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="max-h-80 space-y-3 overflow-auto">
                <div className="flex items-start gap-2">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    Hi! How can we help you today?
                  </div>
                </div>
                <div className="flex items-start justify-end gap-2">
                  <div className="rounded-lg bg-primary/20 px-3 py-2 text-primary">
                    I can’t see data for Plant A.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    Please confirm the device is online and check Wi‑Fi strength.
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}