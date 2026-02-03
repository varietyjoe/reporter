"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileText, Plus } from "lucide-react";
import { useFilters } from "@/contexts/FilterContext";

export default function ReportsPage() {
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("dailySalesPulse");
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filters, setAvailableOwners, setCustomDateRange, applyFilters } = useFilters();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [initialized, setInitialized] = useState(false);

  const getLastBusinessDay = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = today.getDay();
    const offset =
      day === 1 ? 3 : // Monday -> Friday
      day === 0 ? 2 : // Sunday -> Friday
      day === 6 ? 1 : // Saturday -> Friday
      1; // Weekday -> previous day
    const lastBusinessDay = new Date(today);
    lastBusinessDay.setDate(today.getDate() - offset);
    return lastBusinessDay.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("dashboard-global-filters");
    if (!stored) {
      const date = getLastBusinessDay();
      setCustomDateRange(date, date);
      setTimeout(() => {
        applyFilters();
        setInitialized(true);
      }, 0);
    } else {
      setInitialized(true);
    }
  }, [applyFilters, setCustomDateRange]);

  const fetchReport = useCallback(async () => {
    const currentFilters = filtersRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          ownerIds: currentFilters.ownerIds,
          startDate: currentFilters.startDate,
          endDate: currentFilters.endDate,
          date:
            currentFilters.startDate &&
            currentFilters.endDate &&
            currentFilters.startDate === currentFilters.endDate
              ? currentFilters.startDate
              : undefined,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setMarkdown(result.markdown || "");
      } else {
        setError(result?.error || "Failed to generate report");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (!initialized) return;
    fetchReport();
  }, [fetchReport, initialized]);

  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const response = await fetch("/api/hubspot/owners");
        const result = await response.json();
        if (response.ok && result.results) {
          setAvailableOwners(result.results);
        }
      } catch {
        // no-op
      }
    };
    fetchOwners();
  }, [setAvailableOwners]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Build and generate shareable sales reports
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              onClick={() => setSelectedTemplate("dailySalesPulse")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedTemplate === "dailySalesPulse"
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Daily Sales Pulse</div>
                <div className="text-sm text-muted-foreground">
                  Magic formula, outbound, meetings, revenue
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedTemplate("weeklyReview")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedTemplate === "weeklyReview"
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted"
              }`}
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">Weekly Pipeline Review</div>
                <div className="text-sm text-muted-foreground">
                  Pipeline summary, deal movement, forecasts
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Preview</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Markdown
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
              {loading ? "Generating report..." : error ? error : markdown}
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Generated Report Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
            {loading ? "Generating report..." : error ? error : markdown}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
