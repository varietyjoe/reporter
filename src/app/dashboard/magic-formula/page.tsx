"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilters } from "@/contexts/FilterContext";

interface MagicFormulaDay {
  date: string;
  metrics: {
    meetingsHeld: number;
    qualifiedOpps: number;
    conversions: number;
    revenue: number;
    asp: number;
  };
  targets: {
    meetingsHeld: number;
    qualifiedOpps: number;
    conversions: number;
    revenue: number;
    mrrPerConversion: number;
  };
  percentToGoal: {
    meetingsHeld: number;
    qualifiedOpps: number;
    conversions: number;
    revenue: number;
    asp: number;
  };
  all_goals_met: boolean;
  scope?: "team_total" | "individual";
  ownerCount?: number;
}

interface MagicFormulaTarget {
  meetingsTarget: number;
  qualOppsTarget: number;
  conversionsTarget: number;
  mrrPerConversion: number;
}

const STORAGE_KEY = "dashboard-global-filters";

function formatDateValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function MagicFormulaPage() {
  const [data, setData] = useState<MagicFormulaDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [targets, setTargets] = useState<MagicFormulaTarget | null>(null);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState<string>("Individual");

  const { filters, setCustomDateRange, applyFilters, setAvailableOwners } = useFilters();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const today = new Date();
      const date = formatDateValue(today);
      setCustomDateRange(date, date);
      setTimeout(() => {
        applyFilters();
        setInitialized(true);
      }, 0);
    } else {
      setInitialized(true);
    }
  }, [applyFilters, setCustomDateRange]);

  const fetchData = useCallback(async () => {
    const currentFilters = filtersRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.ownerIds.length > 0) {
        params.append("ownerIds", currentFilters.ownerIds.join(","));
      }
      if (currentFilters.startDate) params.append("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.append("endDate", currentFilters.endDate);

      const response = await fetch(`/api/magic-formula?${params}`);
      const result = await response.json();

      if (response.ok) {
        const results = result.results || (result.result ? [result.result] : []);
        setData(results);
        if (result.scope === "team_total") {
          setScopeLabel(`Team total (${result.ownerCount || 1} reps)`);
        } else {
          setScopeLabel("Individual");
        }
        if (result.owners) {
          setAvailableOwners(result.owners);
        }
        setError(null);
      } else {
        setError(result?.error || "Failed to load Magic Formula");
      }
    } catch (err) {
      console.error("Magic Formula fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load Magic Formula");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    fetchData();
  }, [fetchData, initialized]);

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const response = await fetch("/api/magic-formula/targets");
        const result = await response.json();
        if (response.ok) {
          setTargets(result.target);
          setTargetsError(null);
        } else {
          setTargetsError(result?.error || "Failed to load targets");
        }
      } catch (err) {
        setTargetsError(err instanceof Error ? err.message : "Failed to load targets");
      }
    };
    fetchTargets();
  }, []);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.date.localeCompare(a.date));
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Magic Formula</h1>
        <p className="text-sm text-muted-foreground">
          Daily KPI tracker for meetings, qualified opps, conversions, and revenue.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Scope: {scopeLabel}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Global Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {targetsError && (
            <div className="text-sm text-red-600 mb-3">{targetsError}</div>
          )}
          {targets ? (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setSavingTargets(true);
                setTargetsError(null);
                try {
                  const response = await fetch("/api/magic-formula/targets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(targets),
                  });
                  const result = await response.json();
                  if (response.ok) {
                    setTargets(result.target);
                    fetchData();
                  } else {
                    setTargetsError(result?.error || "Failed to save targets");
                  }
                } catch (err) {
                  setTargetsError(err instanceof Error ? err.message : "Failed to save targets");
                } finally {
                  setSavingTargets(false);
                }
              }}
            >
              <label className="flex flex-col gap-1 text-sm">
                Meetings per day
                <input
                  type="number"
                  min={0}
                  value={targets.meetingsTarget}
                  onChange={(event) =>
                    setTargets((prev) =>
                      prev ? { ...prev, meetingsTarget: Number(event.target.value) } : prev
                    )
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Qualified opps per day
                <input
                  type="number"
                  min={0}
                  value={targets.qualOppsTarget}
                  onChange={(event) =>
                    setTargets((prev) =>
                      prev ? { ...prev, qualOppsTarget: Number(event.target.value) } : prev
                    )
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Conversions per day
                <input
                  type="number"
                  min={0}
                  value={targets.conversionsTarget}
                  onChange={(event) =>
                    setTargets((prev) =>
                      prev ? { ...prev, conversionsTarget: Number(event.target.value) } : prev
                    )
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                MRR per conversion
                <input
                  type="number"
                  min={0}
                  value={targets.mrrPerConversion}
                  onChange={(event) =>
                    setTargets((prev) =>
                      prev ? { ...prev, mrrPerConversion: Number(event.target.value) } : prev
                    )
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                />
              </label>
              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={savingTargets}
                >
                  {savingTargets ? "Saving..." : "Save Targets"}
                </button>
                <span className="text-xs text-muted-foreground">
                  Changes apply immediately to Magic Formula totals.
                </span>
              </div>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">Loading targets…</div>
          )}
        </CardContent>
      </Card>



      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {!error && sortedData.length === 0 && !loading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No data for the selected range.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {sortedData.map((day) => (
          <Card key={day.date}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{day.date}</span>
                <span className={day.all_goals_met ? "text-green-600" : "text-muted-foreground"}>
                  {day.all_goals_met ? "All goals met" : "Goals not met"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Meetings Held</span>
                <span>
                  {day.metrics.meetingsHeld}/{day.targets.meetingsHeld} ({formatPercent(day.percentToGoal.meetingsHeld)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Qualified Opps</span>
                <span>
                  {day.metrics.qualifiedOpps}/{day.targets.qualifiedOpps} ({formatPercent(day.percentToGoal.qualifiedOpps)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Conversions</span>
                <span>
                  {day.metrics.conversions}/{day.targets.conversions} ({formatPercent(day.percentToGoal.conversions)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Revenue</span>
                <span>
                  ${day.metrics.revenue.toFixed(0)}/${day.targets.revenue.toFixed(0)} ({formatPercent(day.percentToGoal.revenue)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>ASP</span>
                <span>${day.metrics.asp.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
