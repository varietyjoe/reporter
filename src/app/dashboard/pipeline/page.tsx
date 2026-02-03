"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useFilters } from "@/contexts/FilterContext";
import { TrendingUp, RefreshCw, Filter } from "lucide-react";

interface Deal {
  id: string;
  properties: {
    dealname: string;
    amount: string | null;
    dealstage: string;
    pipeline: string;
    closedate: string | null;
    createdate: string;
    hubspot_owner_id: string | null;
  };
}

interface Pipeline {
  id: string;
  label: string;
  stages: Array<{ id: string; label: string }>;
}

interface StageData {
  stageId: string;
  stageName: string;
  count: number;
  value: number;
}

interface Owner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId?: number;
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set());
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use global filters
  const { filters, setAvailableOwners } = useFilters();

  // Use ref to access current filters without triggering re-renders
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch deals for selected pipeline with global filter support
  const fetchDeals = useCallback(async (pipelineId: string | null) => {
    const currentFilters = filtersRef.current;
    setDealsLoading(true);
    try {
      const params = new URLSearchParams();
      if (pipelineId) {
        params.append("pipeline", pipelineId);
      } else {
        params.append("all", "true");
      }

      // Add global filter params
      if (currentFilters.ownerIds.length > 0) {
        params.append("ownerIds", currentFilters.ownerIds.join(","));
      }
      if (currentFilters.startDate) {
        params.append("startDate", currentFilters.startDate);
      }
      if (currentFilters.endDate) {
        params.append("endDate", currentFilters.endDate);
      }

      const response = await fetch(`/api/hubspot/deals?${params}`);
      const data = await response.json();

      if (response.ok && data.results) {
        setDeals(data.results);
      } else {
        setError(data.error || "Failed to fetch deals");
      }
    } catch (err) {
      setError("Failed to connect to HubSpot");
    } finally {
      setDealsLoading(false);
    }
  }, []);

  // Initial load - fetch pipelines and owners
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch pipelines and owners in parallel
        const [pipelinesRes, ownersRes] = await Promise.all([
          fetch("/api/hubspot/pipelines"),
          fetch("/api/hubspot/owners"),
        ]);

        const pipelinesData = await pipelinesRes.json();
        const ownersData = await ownersRes.json();

        if (pipelinesRes.ok && pipelinesData.results) {
          setPipelines(pipelinesData.results);

          // Auto-select "Sponsorship Sales" pipeline
          const sponsorshipsPipeline = pipelinesData.results.find(
            (p: Pipeline) => p.label.toLowerCase().includes("sponsorship")
          );
          if (sponsorshipsPipeline) {
            setSelectedPipeline(sponsorshipsPipeline.id);
            fetchDeals(sponsorshipsPipeline.id);
          } else {
            fetchDeals(null);
          }
        }

        if (ownersRes.ok && ownersData.results) {
          setOwners(ownersData.results);
          // Populate available owners in global filter context
          setAvailableOwners(ownersData.results);
        }
      } catch (err) {
        setError("Failed to fetch pipelines");
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();
  }, [fetchDeals, setAvailableOwners]);

  // Handle pipeline selection change
  const handlePipelineChange = (pipelineId: string | null) => {
    setSelectedPipeline(pipelineId);
    fetchDeals(pipelineId);
  };

  // Handle apply filters from FilterBar
  const handleApplyFilters = () => {
    fetchDeals(selectedPipeline);
  };

  // Get the selected pipeline object for stage names
  const currentPipeline = pipelines.find((p) => p.id === selectedPipeline);

  // Filter deals by selected stages and global owner filter
  const filteredDeals = deals.filter((deal) => {
    const stageId = deal.properties.dealstage || "unknown";

    // Check if stage is closed (won or lost)
    const isClosedStage = stageId.toLowerCase().includes("closed") ||
                          stageId.toLowerCase().includes("won") ||
                          stageId.toLowerCase().includes("lost");

    // If excludeClosed is true, filter out closed stages
    if (excludeClosed && isClosedStage) {
      return false;
    }

    // If specific stages are selected, filter to only those
    if (selectedStages.size > 0) {
      return selectedStages.has(stageId);
    }

    return true;
  });

  // Calculate stats from filtered deals
  const totalDeals = filteredDeals.length;
  const totalPipelineValue = filteredDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.properties.amount || "0") || 0);
  }, 0);

  // Calculate closed won from ALL deals (not filtered) for reference
  const closedWonDeals = deals.filter(
    (d) => d.properties.dealstage === "closedwon" || d.properties.dealstage.toLowerCase().includes("won")
  );
  const closedWonValue = closedWonDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.properties.amount || "0") || 0);
  }, 0);

  // Group filtered deals by stage with proper stage names
  const stageMap = new Map<string, StageData>();
  filteredDeals.forEach((deal) => {
    const stageId = deal.properties.dealstage || "unknown";
    const amount = parseFloat(deal.properties.amount || "0") || 0;

    // Get stage name from pipeline stages
    const stageName = currentPipeline?.stages.find((s) => s.id === stageId)?.label || stageId;

    if (stageMap.has(stageId)) {
      const existing = stageMap.get(stageId)!;
      existing.count++;
      existing.value += amount;
    } else {
      stageMap.set(stageId, { stageId, stageName, count: 1, value: amount });
    }
  });

  // Sort stages by pipeline order if available
  let stageData: StageData[];
  if (currentPipeline) {
    stageData = currentPipeline.stages
      .map((stage) => stageMap.get(stage.id))
      .filter((s): s is StageData => s !== undefined);
  } else {
    stageData = Array.from(stageMap.values()).sort((a, b) => b.count - a.count);
  }

  // Get recent deals from filtered set (sorted by create date)
  const recentDeals = [...filteredDeals]
    .sort((a, b) => {
      return new Date(b.properties.createdate).getTime() - new Date(a.properties.createdate).getTime();
    })
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageName = (stageId: string) => {
    if (currentPipeline) {
      const stage = currentPipeline.stages.find((s) => s.id === stageId);
      if (stage) return stage.label;
    }
    return stageId
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">Track deals and revenue</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-red-500">{error}</p>
            <a href="/dashboard/settings" className="text-primary underline mt-2 block">
              Check Settings
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            {selectedPipeline && currentPipeline
              ? `${currentPipeline.label} · ${totalDeals} deals${deals.length !== totalDeals ? ` (${deals.length} total)` : ""}`
              : `All pipelines · ${totalDeals} deals${deals.length !== totalDeals ? ` (${deals.length} total)` : ""}`}
          </p>
        </div>
        {dealsLoading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Global FilterBar (no activeOnly for pipeline) */}
      <FilterBar
        showActiveOnly={false}
        loading={dealsLoading}
        onApply={handleApplyFilters}
      />

      {/* Pipeline Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter by Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPipeline === null ? "default" : "outline"}
              size="sm"
              onClick={() => handlePipelineChange(null)}
              disabled={dealsLoading}
            >
              All Pipelines
            </Button>
            {pipelines.map((pipeline) => (
              <Button
                key={pipeline.id}
                variant={selectedPipeline === pipeline.id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePipelineChange(pipeline.id)}
                disabled={dealsLoading}
              >
                {pipeline.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Filter */}
      {currentPipeline && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter by Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={excludeClosed ? "default" : "outline"}
                size="sm"
                onClick={() => setExcludeClosed(!excludeClosed)}
              >
                {excludeClosed ? "Excluding Closed" : "Including Closed"}
              </Button>
              {selectedStages.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStages(new Set())}
                >
                  Clear Stage Filter
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {currentPipeline.stages.map((stage) => {
                const isSelected = selectedStages.has(stage.id);
                const isClosed = stage.id.toLowerCase().includes("closed") ||
                                 stage.label.toLowerCase().includes("won") ||
                                 stage.label.toLowerCase().includes("lost");
                return (
                  <Button
                    key={stage.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={isClosed && excludeClosed ? "opacity-50" : ""}
                    onClick={() => {
                      const newStages = new Set(selectedStages);
                      if (isSelected) {
                        newStages.delete(stage.id);
                      } else {
                        newStages.add(stage.id);
                      }
                      setSelectedStages(newStages);
                    }}
                  >
                    {stage.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">Total value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Won</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedWonDeals.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(closedWonValue)} revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDeals > 0 ? totalPipelineValue / totalDeals : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per deal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No deals in this pipeline</p>
            ) : (
              <>
                <div className="space-y-4">
                  {stageData.map((item) => (
                    <div key={item.stageId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-medium">{item.stageName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{item.count} deals</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Pipeline</span>
                    <span className="text-xl font-bold">{formatCurrency(totalPipelineValue)}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDeals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No deals in this pipeline</p>
            ) : (
              <div className="space-y-4">
                {recentDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">{deal.properties.dealname || "Untitled Deal"}</div>
                      <div className="text-sm text-muted-foreground">
                        {getStageName(deal.properties.dealstage || "unknown")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(parseFloat(deal.properties.amount || "0") || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
