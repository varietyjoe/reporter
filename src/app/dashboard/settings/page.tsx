"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, RefreshCw } from "lucide-react";
import type { Seat, SeatRole, SeatStatus } from "@/types";

const quotaMetrics = [
  { metric: "Meetings Held", daily: 3, weekly: 15, monthly: 60 },
  { metric: "Qualified Opps", daily: 3, weekly: 15, monthly: 60 },
  { metric: "Deals Won", daily: 3, weekly: 15, monthly: 60 },
  { metric: "Emails Sent", daily: 100, weekly: 500, monthly: 2000 },
  { metric: "Calls Made", daily: 20, weekly: 100, monthly: 400 },
];

export default function SettingsPage() {
  const [hubspotStatus, setHubspotStatus] = useState<"loading" | "connected" | "error" | "not_configured">("loading");
  const [dealCount, setDealCount] = useState<number | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  const [creatingSeat, setCreatingSeat] = useState(false);
  const [newSeat, setNewSeat] = useState<{
    name: string;
    email: string;
    role: SeatRole;
    status: SeatStatus;
  }>({ name: "", email: "", role: "rep", status: "active" });

  const testHubSpotConnection = async () => {
    setHubspotStatus("loading");
    try {
      const response = await fetch("/api/hubspot/deals");
      const data = await response.json();

      if (response.ok && data.results) {
        setHubspotStatus("connected");
        setDealCount(data.results.length);
      } else if (data.error?.includes("not connected")) {
        setHubspotStatus("not_configured");
      } else {
        setHubspotStatus("error");
      }
    } catch {
      setHubspotStatus("error");
    }
  };

  useEffect(() => {
    testHubSpotConnection();
  }, []);

  const loadSeats = async () => {
    setSeatLoading(true);
    setSeatError(null);
    try {
      const response = await fetch("/api/seats");
      const result = await response.json();
      if (response.ok) {
        setSeats(result.results || []);
      } else {
        setSeatError(result?.error || "Failed to load seats");
      }
    } catch (error) {
      setSeatError(error instanceof Error ? error.message : "Failed to load seats");
    } finally {
      setSeatLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
  }, []);

  const handleCreateSeat = async () => {
    if (!newSeat.name.trim()) {
      setSeatError("Seat name is required");
      return;
    }
    setCreatingSeat(true);
    setSeatError(null);
    try {
      const response = await fetch("/api/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSeat.name.trim(),
          email: newSeat.email.trim() || undefined,
          role: newSeat.role,
          status: newSeat.status,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create seat");
      }
      setSeats((prev) => [...prev, result.result]);
      setNewSeat({ name: "", email: "", role: "rep", status: "active" });
    } catch (error) {
      setSeatError(error instanceof Error ? error.message : "Failed to create seat");
    } finally {
      setCreatingSeat(false);
    }
  };

  const handleAutoMap = async () => {
    setAutoMapping(true);
    setSeatError(null);
    try {
      const response = await fetch("/api/seats/auto-map", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to auto-map seats");
      }
      if (Array.isArray(result.results)) {
        setSeats((prev) =>
          prev.map((seat) => {
            const updated = result.results.find((item: Seat) => item.id === seat.id);
            return updated || seat;
          })
        );
      }
    } catch (error) {
      setSeatError(error instanceof Error ? error.message : "Failed to auto-map seats");
    } finally {
      setAutoMapping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage integrations and configure quotas
        </p>
      </div>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your accounts to pull data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* HubSpot */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🟠</span>
              <div>
                <h3 className="font-medium">HubSpot</h3>
                <p className="text-sm text-muted-foreground">
                  {hubspotStatus === "connected"
                    ? `Connected - ${dealCount} deals found`
                    : "Connect to sync deals, contacts, and activities"}
                </p>
              </div>
            </div>
            {hubspotStatus === "loading" ? (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : hubspotStatus === "connected" ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <Button variant="outline" onClick={testHubSpotConnection}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
            )}
          </div>

          {/* Grain */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🎙️</span>
              <div>
                <h3 className="font-medium">Grain</h3>
                <p className="text-sm text-muted-foreground">Meeting insights via MCP</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quota Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Quota Configuration</CardTitle>
          <CardDescription>Set daily, weekly, and monthly targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Metric</th>
                  <th className="text-right py-3 px-4 font-medium">Daily</th>
                  <th className="text-right py-3 px-4 font-medium">Weekly</th>
                  <th className="text-right py-3 px-4 font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {quotaMetrics.map((item) => (
                  <tr key={item.metric} className="border-b last:border-0">
                    <td className="py-3 px-4">{item.metric}</td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        defaultValue={item.daily}
                        className="w-20 text-right px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        defaultValue={item.weekly}
                        className="w-20 text-right px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        defaultValue={item.monthly}
                        className="w-20 text-right px-2 py-1 border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Save Quotas</Button>
          </div>
        </CardContent>
      </Card>

      {/* Seats */}
      <Card>
        <CardHeader>
          <CardTitle>Seats</CardTitle>
          <CardDescription>Assign reps and managers to seats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {seatError && <div className="text-sm text-red-600">{seatError}</div>}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Name</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={newSeat.name}
                onChange={(event) => setNewSeat((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Connor"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={newSeat.email}
                onChange={(event) => setNewSeat((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="rep@company.com"
              />
            </div>
            <div className="w-full md:w-40">
              <label className="text-sm font-medium">Role</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={newSeat.role}
                onChange={(event) =>
                  setNewSeat((prev) => ({ ...prev, role: event.target.value as SeatRole }))
                }
              >
                <option value="rep">Rep</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={newSeat.status}
                onChange={(event) =>
                  setNewSeat((prev) => ({ ...prev, status: event.target.value as SeatStatus }))
                }
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <Button onClick={handleCreateSeat} disabled={creatingSeat}>
              {creatingSeat ? "Adding..." : "Add Seat"}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {seatLoading ? "Loading seats..." : `${seats.length} seats`}
            </div>
            <Button variant="outline" onClick={handleAutoMap} disabled={autoMapping}>
              {autoMapping ? "Mapping..." : "Auto-map HubSpot owners"}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">HubSpot Owner</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={seat.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{seat.name}</td>
                    <td className="py-2 pr-4">{seat.email || "—"}</td>
                    <td className="py-2 pr-4 capitalize">{seat.role}</td>
                    <td className="py-2 pr-4 capitalize">{seat.status}</td>
                    <td className="py-2 pr-4">{seat.hubspotOwnerId || "Unmapped"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Environment variables in .env.local</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              {hubspotStatus === "connected" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <code className="bg-muted px-2 py-1 rounded">HUBSPOT_ACCESS_TOKEN</code>
              <span className="text-muted-foreground">
                {hubspotStatus === "connected" ? "- Configured" : "- Add your Private App token"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <code className="bg-muted px-2 py-1 rounded">ANTHROPIC_API_KEY</code>
              <span className="text-muted-foreground">- For AI insights</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Private App tokens start with <code className="bg-muted px-1 rounded">pat-</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
