"use client"

import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PanelsTopLeft, UsersRound, Webhook, LaptopMinimal, KeyRound, FileJson, PanelRight } from "lucide-react"

type Props = {
  className?: string
}

type Location = { id: string; name: string; latitude?: string; longitude?: string }
type TeamMember = { id: string; email: string; role: "admin" | "editor" | "viewer"; status: "active" | "invited" }
type ApiKey = { id: string; label: string; lastUsed?: string; createdAt: string; masked: string }
type WebhookCfg = { id: string; url: string; secret: string; events: Record<string, boolean>; active: boolean }
type PaymentMethod = { id: string; brand: string; last4: string; exp: string; default: boolean }

function CardShell({
  children,
  className,
  title,
  description,
  action,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "w-full rounded-lg border border-border/60 bg-[color:var(--surface-1)]/70 backdrop-blur-md",
        "relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(1200px_400px_at_-10%_-20%,rgba(46,211,183,0.08),transparent_60%)]",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-[calc(var(--radius)-1px)] after:bg-gradient-to-br after:from-white/5 after:to-white/0",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 p-4 sm:p-6">
          <div className="min-w-0">
            {title && <h3 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h3>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground break-words">{description}</p>
            )}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={cn(title ? "px-4 pb-4 sm:px-6 sm:pb-6" : "p-4 sm:p-6")}>{children}</div>
    </section>
  )
}

export default function SettingsDashboard({ className }: Props) {
  // Plant: device provisioning
  const [deviceForm, setDeviceForm] = React.useState({
    deviceId: "",
    deviceSecret: "",
    locationId: "",
  })
  const [capacityKw, setCapacityKw] = React.useState<string>("500")
  const [locations, setLocations] = React.useState<Location[]>([
    { id: "loc-1", name: "North Field", latitude: "37.7749", longitude: "-122.4194" },
    { id: "loc-2", name: "Rooftop A", latitude: "34.0522", longitude: "-118.2437" },
  ])
  const [newLocation, setNewLocation] = React.useState<Location>({
    id: "",
    name: "",
    latitude: "",
    longitude: "",
  })
  const [removeLocationId, setRemoveLocationId] = React.useState<string | null>(null)

  // Users & Roles
  const [members, setMembers] = React.useState<TeamMember[]>([
    { id: "m1", email: "admin@gridco.io", role: "admin", status: "active" },
    { id: "m2", email: "ops@gridco.io", role: "editor", status: "active" },
  ])
  const [invite, setInvite] = React.useState<{ email: string; role?: TeamMember["role"] }>({ email: "", role: undefined })
  const [permissions, setPermissions] = React.useState<Record<string, boolean>>({
    "plants:read": true,
    "plants:write": true,
    "users:manage": false,
    "billing:view": true,
    "billing:manage": false,
    "integrations:write": true,
  })

  // Integrations
  const [connected, setConnected] = React.useState<{ id: string; name: string; status: "connected" | "disconnected"; type: "webhook" | "api" | "other" }[]>([
    { id: "int-1", name: "Slack Alerts", status: "connected", type: "webhook" },
    { id: "int-2", name: "Data Export S3", status: "connected", type: "api" },
  ])
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([
    { id: "k1", label: "Server Key", masked: "sk_live_****4F9C", createdAt: "2025-06-12", lastUsed: "2025-09-01" },
  ])
  const [revokeKeyId, setRevokeKeyId] = React.useState<string | null>(null)
  const [newKeyLabel, setNewKeyLabel] = React.useState<string>("")
  const [webhooks, setWebhooks] = React.useState<WebhookCfg[]>([
    {
      id: "wh_1",
      url: "https://hooks.slack.com/services/XXXX/XXXX",
      secret: "whsec_****1234",
      active: true,
      events: { "plant.updated": true, "device.alert": true, "billing.invoice.created": false },
    },
  ])

  // Billing
  const [subscription, setSubscription] = React.useState({
    plan: "Pro",
    seats: 10,
    renewsOn: "2025-10-01",
    status: "active",
  })
  const [usage, setUsage] = React.useState({ apiCalls: 64213, apiLimit: 100000, dataRetentionDays: 90 })
  const [methods, setMethods] = React.useState<PaymentMethod[]>([
    { id: "pm_1", brand: "visa", last4: "4242", exp: "04/27", default: true },
  ])
  const [showCancelSubscription, setShowCancelSubscription] = React.useState(false)

  // Handlers
  function handleProvisionDevice(e: React.FormEvent) {
    e.preventDefault()
    if (!deviceForm.deviceId || !deviceForm.deviceSecret || !deviceForm.locationId) {
      toast.error("Please fill out all provisioning fields.")
      return
    }
    toast.success("Device provisioned successfully")
    setDeviceForm({ deviceId: "", deviceSecret: "", locationId: "" })
  }

  function handleAddLocation(e: React.FormEvent) {
    e.preventDefault()
    if (!newLocation.name || !newLocation.latitude || !newLocation.longitude) {
      toast.error("Please provide name, latitude, and longitude.")
      return
    }
    const id = `loc-${Math.random().toString(36).slice(2, 8)}`
    setLocations(prev => [...prev, { ...newLocation, id }])
    setNewLocation({ id: "", name: "", latitude: "", longitude: "" })
    toast.success("Location added")
  }

  function confirmRemoveLocation() {
    if (!removeLocationId) return
    setLocations(prev => prev.filter(l => l.id !== removeLocationId))
    toast.success("Location removed")
    setRemoveLocationId(null)
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!invite.email || !invite.role) {
      toast.error("Enter an email and select a role.")
      return
    }
    const id = `mem-${Math.random().toString(36).slice(2, 8)}`
    setMembers(prev => [...prev, { id, email: invite.email, role: invite.role!, status: "invited" }])
    setInvite({ email: "", role: undefined })
    toast.success("Invitation sent")
  }

  function togglePermission(key: string, val: boolean) {
    setPermissions(prev => ({ ...prev, [key]: val }))
  }

  function createApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyLabel.trim()) {
      toast.error("Provide a label for the API key.")
      return
    }
    const id = `key_${Math.random().toString(36).slice(2, 8)}`
    const key: ApiKey = {
      id,
      label: newKeyLabel.trim(),
      masked: "sk_live_****" + Math.random().toString(16).slice(2, 6).toUpperCase(),
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsed: undefined,
    }
    setApiKeys(prev => [key, ...prev])
    setNewKeyLabel("")
    toast.success("API key created")
  }

  function copyMasked(masked: string) {
    if (typeof window === "undefined") return
    navigator.clipboard.writeText(masked).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed")
    )
  }

  function toggleWebhookActive(id: string, val: boolean) {
    setWebhooks(prev => prev.map(w => (w.id === id ? { ...w, active: val } : w)))
    toast.message(val ? "Webhook enabled" : "Webhook disabled")
  }

  function saveWebhook(id: string, patch: Partial<WebhookCfg>) {
    setWebhooks(prev => prev.map(w => (w.id === id ? { ...w, ...patch } : w)))
    toast.success("Webhook settings saved")
  }

  function addWebhook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const url = String(fd.get("url") || "")
    const secret = String(fd.get("secret") || "")
    if (!url || !secret) {
      toast.error("Provide both URL and Secret")
      return
    }
    const id = `wh_${Math.random().toString(36).slice(2, 8)}`
    setWebhooks(prev => [
      { id, url, secret, active: true, events: { "plant.updated": true, "device.alert": true, "billing.invoice.created": false } },
      ...prev,
    ])
    e.currentTarget.reset()
    toast.success("Webhook added")
  }

  function setDefaultMethod(id: string) {
    setMethods(prev => prev.map(m => ({ ...m, default: m.id === id })))
    toast.success("Default payment method updated")
  }

  function cancelSubscription() {
    setSubscription(s => ({ ...s, status: "cancelling" }))
    toast.message("Subscription will cancel at period end.")
    setShowCancelSubscription(false)
  }

  const apiUsagePct = Math.min(100, Math.round((usage.apiCalls / usage.apiLimit) * 100))

  return (
    <div className={cn("w-full max-w-full", className)}>
      <Tabs defaultValue="plant" className="w-full">
        <div className="sticky top-0 z-10 mb-4 sm:mb-6 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-lg">
          <CardShell className="p-0 border-border/50">
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Settings</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage plants, users, integrations, and billing</p>
              </div>
            </div>
            <Separator className="opacity-40" />
            <div className="p-2 sm:p-3">
              <TabsList className="w-full justify-start gap-1 overflow-x-auto">
                <TabsTrigger value="plant" className="data-[state=active]:bg-primary/20">
                  <PanelsTopLeft className="h-4 w-4 sm:mr-2" aria-hidden />
                  <span className="hidden sm:inline">Plant</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-primary/20">
                  <UsersRound className="h-4 w-4 sm:mr-2" aria-hidden />
                  <span className="hidden sm:inline">Users & Roles</span>
                </TabsTrigger>
                <TabsTrigger value="integrations" className="data-[state=active]:bg-primary/20">
                  <Webhook className="h-4 w-4 sm:mr-2" aria-hidden />
                  <span className="hidden sm:inline">Integrations</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-primary/20">
                  <LaptopMinimal className="h-4 w-4 sm:mr-2" aria-hidden />
                  <span className="hidden sm:inline">Billing</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </CardShell>
        </div>

        {/* Plant */}
        <TabsContent value="plant" className="space-y-6">
          <CardShell
            title="Device provisioning"
            description="Register new devices to your plant with secure credentials."
            action={
              <Badge variant="outline" className="bg-secondary/40 border-border/60 text-xs">
                Secure
              </Badge>
            }
          >
            <form onSubmit={handleProvisionDevice} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  placeholder="e.g., INV-7C3A29"
                  value={deviceForm.deviceId}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceId: e.target.value.trim() }))}
                  required
                  className="bg-[color:var(--surface-2)]/70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceSecret">Device Secret</Label>
                <Input
                  id="deviceSecret"
                  type="password"
                  placeholder="••••••••"
                  value={deviceForm.deviceSecret}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, deviceSecret: e.target.value }))}
                  required
                  className="bg-[color:var(--surface-2)]/70"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  onValueChange={(v) => setDeviceForm((p) => ({ ...p, locationId: v }))}
                  value={deviceForm.locationId || undefined}
                >
                  <SelectTrigger className="bg-[color:var(--surface-2)]/70">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto">Provision device</Button>
              </div>
            </form>
          </CardShell>

          <CardShell title="Capacity settings" description="Configure nominal capacity and thresholds.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacityKw">Plant capacity (kW)</Label>
                <Input
                  id="capacityKw"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={capacityKw}
                  onChange={(e) => setCapacityKw(e.target.value)}
                  className="bg-[color:var(--surface-2)]/70"
                />
                <p className="text-xs text-muted-foreground">Used in performance and forecast models.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="curtail">Curtailment limit (%)</Label>
                <Input id="curtail" type="number" min={0} max={100} defaultValue={10} className="bg-[color:var(--surface-2)]/70" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-threshold">Alert threshold (kW)</Label>
                <Input id="alert-threshold" type="number" min={0} defaultValue={25} className="bg-[color:var(--surface-2)]/70" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => toast.success("Capacity settings saved")}
              >
                Save changes
              </Button>
              <Button
                variant="secondary"
                className="bg-secondary/60"
                onClick={() => toast.message("Reverted to last saved")}
              >
                Reset
              </Button>
            </div>
          </CardShell>

          <CardShell
            title="Locations"
            description="Manage plant locations for device grouping and geo analytics."
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead>Latitude</TableHead>
                      <TableHead>Longitude</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="min-w-0">
                          <div className="truncate">{l.name}</div>
                        </TableCell>
                        <TableCell>{l.latitude}</TableCell>
                        <TableCell>{l.longitude}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoveLocationId(l.id)}
                            aria-label={`Remove ${l.name}`}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No locations yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="lg:col-span-1">
                <div className="space-y-3">
                  <h4 className="font-medium">Add location</h4>
                  <form onSubmit={handleAddLocation} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="loc-name">Name</Label>
                      <Input
                        id="loc-name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., East Array"
                        className="bg-[color:var(--surface-2)]/70"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lat">Latitude</Label>
                      <Input
                        id="lat"
                        inputMode="decimal"
                        value={newLocation.latitude}
                        onChange={(e) => setNewLocation((p) => ({ ...p, latitude: e.target.value }))}
                        placeholder="e.g., 40.7128"
                        className="bg-[color:var(--surface-2)]/70"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lng">Longitude</Label>
                      <Input
                        id="lng"
                        inputMode="decimal"
                        value={newLocation.longitude}
                        onChange={(e) => setNewLocation((p) => ({ ...p, longitude: e.target.value }))}
                        placeholder="-74.0060"
                        className="bg-[color:var(--surface-2)]/70"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">Add location</Button>
                  </form>
                </div>
              </div>
            </div>
          </CardShell>
        </TabsContent>

        {/* Users & Roles */}
        <TabsContent value="users" className="space-y-6">
          <CardShell
            title="Team members"
            description="Invite teammates and manage access levels."
          >
            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={invite.email}
                  onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
                  className="bg-[color:var(--surface-2)]/70"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  onValueChange={(v: TeamMember["role"]) => setInvite((p) => ({ ...p, role: v }))}
                  value={invite.role}
                >
                  <SelectTrigger className="bg-[color:var(--surface-2)]/70">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Send invite</Button>
              </div>
            </form>

            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="min-w-0"><span className="break-words">{m.email}</span></TableCell>
                      <TableCell className="capitalize">{m.role}</TableCell>
                      <TableCell>
                        {m.status === "active" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-secondary/50">Invited</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">Manage</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[220px]">
                            <DropdownMenuItem onClick={() => toast.message("Permissions opened")}>
                              <PanelRight className="h-4 w-4 mr-2" /> View permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.message("Role change flow opened")}>
                              <UsersRound className="h-4 w-4 mr-2" /> Change role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setMembers(prev => prev.filter(x => x.id !== m.id))
                                toast.success("Member removed")
                              }}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No team members.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardShell>

          <CardShell
            title="Role permissions"
            description="Toggle granular permissions. Changes apply immediately."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Object.entries(permissions).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{k}</p>
                    <p className="text-xs text-muted-foreground">Grant {k.split(":")[0]} {k.includes(":write") ? "write" : "access"}</p>
                  </div>
                  <Switch
                    checked={v}
                    onCheckedChange={(val) => togglePermission(k, !!val)}
                    aria-label={`Toggle ${k}`}
                  />
                </div>
              ))}
            </div>
          </CardShell>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <CardShell
            title="Connected services"
            description="Manage external services and data flows."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connected.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-primary" aria-hidden />
                      <p className="font-medium truncate">{c.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{c.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("border", c.status === "connected" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-destructive/20 border-destructive/30 text-destructive")}>
                      {c.status}
                    </Badge>
                    <Button
                      variant="secondary"
                      className="bg-secondary/60"
                      size="sm"
                      onClick={() => {
                        setConnected(prev => prev.map(x => x.id === c.id ? { ...x, status: x.status === "connected" ? "disconnected" : "connected" } : x))
                        toast.message(c.status === "connected" ? "Integration disconnected" : "Integration connected")
                      }}
                    >
                      {c.status === "connected" ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardShell>

          <CardShell
            title="API keys"
            description="Create and manage API credentials."
            action={<KeyRound className="h-5 w-5 text-primary" aria-hidden />}
          >
            <form onSubmit={createApiKey} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <Label htmlFor="key-label">Label</Label>
                <Input
                  id="key-label"
                  placeholder="e.g., Backend service"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="bg-[color:var(--surface-2)]/70"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto">Create key</Button>
              </div>
            </form>

            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="min-w-0"><span className="truncate">{k.label}</span></TableCell>
                      <TableCell className="min-w-0"><code className="text-xs break-words">{k.masked}</code></TableCell>
                      <TableCell>{k.createdAt}</TableCell>
                      <TableCell>{k.lastUsed || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="bg-secondary/60" size="sm" onClick={() => copyMasked(k.masked)}>
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRevokeKeyId(k.id)}>
                            Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No API keys yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardShell>

          <CardShell
            title="Webhooks"
            description="Receive event notifications to your endpoints."
            action={<FileJson className="h-5 w-5 text-primary" aria-hidden />}
          >
            <form onSubmit={addWebhook} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="wh-url">URL</Label>
                <Input id="wh-url" name="url" placeholder="https://example.com/webhooks/solar" className="bg-[color:var(--surface-2)]/70" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-secret">Secret</Label>
                <Input id="wh-secret" name="secret" placeholder="whsec_..." className="bg-[color:var(--surface-2)]/70" required />
              </div>
              <div className="md:col-span-3">
                <Button type="submit">Add webhook</Button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {webhooks.map((w) => (
                <div key={w.id} className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{w.url}</p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">Secret: {w.secret}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={w.active} onCheckedChange={(v) => toggleWebhookActive(w.id, !!v)} aria-label="Toggle webhook" />
                      <Badge className={cn("border", w.active ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-muted/50")}>
                        {w.active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                  <Separator className="my-4 opacity-40" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subscribed events</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.keys(w.events).map((ev) => (
                          <label key={ev} className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/40 px-3 py-2">
                            <span className="text-sm break-words">{ev}</span>
                            <Switch
                              checked={w.events[ev]}
                              onCheckedChange={(val) => saveWebhook(w.id, { events: { ...w.events, [ev]: !!val } })}
                              aria-label={`Toggle event ${ev}`}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`wh-notes-${w.id}`}>Notes</Label>
                      <Textarea id={`wh-notes-${w.id}`} placeholder="Optional notes for this endpoint..." className="bg-[color:var(--surface-2)]/70 min-h-[92px]" />
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" className="bg-secondary/60" onClick={() => toast.message("Test event sent")}>
                          Send test
                        </Button>
                        <Button type="button" onClick={() => toast.success("Webhook saved")}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-destructive hover:text-destructive ml-auto"
                          onClick={() => {
                            setWebhooks(prev => prev.filter(x => x.id !== w.id))
                            toast.success("Webhook deleted")
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {webhooks.length === 0 && (
                <p className="text-sm text-muted-foreground">No webhooks configured.</p>
              )}
            </div>
          </CardShell>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="space-y-6">
          <CardShell
            title="Subscription"
            description="Your plan, renewal, and status."
            action={<Badge className="bg-primary/20 text-primary border-primary/30">{subscription.status}</Badge>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold mt-1">{subscription.plan}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                <p className="text-xs text-muted-foreground">Seats</p>
                <p className="text-lg font-semibold mt-1">{subscription.seats}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                <p className="text-xs text-muted-foreground">Renews on</p>
                <p className="text-lg font-semibold mt-1">{subscription.renewsOn}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => toast.message("Upgrade flow opened")}>Upgrade</Button>
              <Button variant="secondary" className="bg-secondary/60" onClick={() => setShowCancelSubscription(true)}>
                Cancel plan
              </Button>
            </div>
          </CardShell>

          <CardShell title="Usage" description="Track your current period consumption.">
            <div className="space-y-4">
              <div>
                <div className="flex items-end justify-between">
                  <p className="text-sm text-muted-foreground">API usage</p>
                  <p className="text-sm">{usage.apiCalls.toLocaleString()} / {usage.apiLimit.toLocaleString()}</p>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full bg-primary transition-all")}
                    style={{ width: `${apiUsagePct}%` }}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={apiUsagePct}
                    role="progressbar"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <p className="text-xs text-muted-foreground">Data retention</p>
                  <p className="text-lg font-semibold mt-1">{usage.dataRetentionDays} days</p>
                </div>
                <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <p className="text-xs text-muted-foreground">Overage</p>
                  <p className="text-lg font-semibold mt-1">None</p>
                </div>
                <div className="rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <p className="text-xs text-muted-foreground">Next invoice</p>
                  <p className="text-lg font-semibold mt-1">{subscription.renewsOn}</p>
                </div>
              </div>
            </div>
          </CardShell>

          <CardShell title="Payment methods" description="Manage saved cards for billing.">
            <div className="space-y-4">
              {methods.map((m) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-border/50 bg-[color:var(--surface-2)]/40 p-4">
                  <div>
                    <p className="font-medium capitalize">{m.brand} •••• {m.last4}</p>
                    <p className="text-xs text-muted-foreground">Exp {m.exp}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.default ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Default</Badge>
                    ) : (
                      <Button variant="secondary" className="bg-secondary/60" size="sm" onClick={() => setDefaultMethod(m.id)}>
                        Make default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setMethods(prev => prev.filter(x => x.id !== m.id))
                        toast.success("Payment method removed")
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-dashed border-border/50 bg-background/30 p-4">
                <h4 className="font-medium">Add new card</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card number</Label>
                    <Input id="card-number" inputMode="numeric" placeholder="4242 4242 4242 4242" className="bg-[color:var(--surface-2)]/70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Name on card</Label>
                    <Input id="card-name" placeholder="John Doe" className="bg-[color:var(--surface-2)]/70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exp">Exp</Label>
                    <Input id="exp" placeholder="MM/YY" className="bg-[color:var(--surface-2)]/70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" inputMode="numeric" placeholder="123" className="bg-[color:var(--surface-2)]/70" />
                  </div>
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => {
                      const id = `pm_${Math.random().toString(36).slice(2, 8)}`
                      setMethods(prev => [{ id, brand: "visa", last4: "0000", exp: "01/30", default: false }, ...prev])
                      toast.success("Card added")
                    }}
                  >
                    Save card
                  </Button>
                </div>
              </div>
            </div>
          </CardShell>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={!!removeLocationId} onOpenChange={(o) => !o && setRemoveLocationId(null)}>
        <DialogContent className="bg-[color:var(--surface-1)]/80 backdrop-blur border-border">
          <DialogHeader>
            <DialogTitle>Remove location</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" className="bg-secondary/60" onClick={() => setRemoveLocationId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveLocation}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeKeyId} onOpenChange={(o) => !o && setRevokeKeyId(null)}>
        <DialogContent className="bg-[color:var(--surface-1)]/80 backdrop-blur border-border">
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>Applications using this key will stop working.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" className="bg-secondary/60" onClick={() => setRevokeKeyId(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!revokeKeyId) return
                setApiKeys(prev => prev.filter(k => k.id !== revokeKeyId))
                toast.success("API key revoked")
                setRevokeKeyId(null)
              }}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelSubscription} onOpenChange={setShowCancelSubscription}>
        <DialogContent className="bg-[color:var(--surface-1)]/80 backdrop-blur border-border">
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>Your plan will remain active until the end of the billing period.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" className="bg-secondary/60" onClick={() => setShowCancelSubscription(false)}>
              Keep plan
            </Button>
            <Button variant="destructive" onClick={cancelSubscription}>
              Cancel at period end
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}