"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useFilters } from "@/contexts/FilterContext";
import {
  RefreshCw,
  Users,
  Mail,
  Target,
  TrendingUp,
  MessageSquare,
  DollarSign,
  Video,
} from "lucide-react";

interface Owner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId?: number;
}

interface SequenceStats {
  id: string;
  name: string;
  userId: string;
  activeEnrollees: number;
  totalEnrollees: number;
  replies: number;
  dealsCreated: number;
  dealsValue: number;
  dealsWon: number;
  dealsWonValue: number;
  dealsLost: number;
  meetingsBooked: number;
}

interface CampaignData {
  sequences: SequenceStats[];
  enrollments: {
    total: number;
    active: number;
    replied: number;
  };
  meetings: {
    total: number;
    byOwner: Record<string, number>;
    byOutcome: Record<string, number>;
  };
  deals: {
    created: number;
    won: number;
    wonValue: number;
    lost: number;
  };
  owners: Owner[];
  pipelines: Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }>;
}

export default function CampaignsPage() {
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use global filters
  const { filters, setAvailableOwners } = useFilters();

  // Use ref to access current filters without triggering re-renders
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Fetch campaign data using global filters
  const fetchData = useCallback(async () => {
    const currentFilters = filtersRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.ownerIds.length > 0) {
        params.append("ownerIds", currentFilters.ownerIds.join(","));
      }
      if (currentFilters.activeOnly) params.append("activeOnly", "true");
      if (currentFilters.startDate) params.append("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.append("endDate", currentFilters.endDate);

      const response = await fetch(`/api/hubspot/campaigns?${params}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
        setError(null);
        // Populate available owners in global filter context
        if (result.owners) {
          setAvailableOwners(result.owners);
        }
      } else {
        setError(result.error || "Failed to fetch campaign data");
      }
    } catch (err) {
      console.error("Campaign fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to HubSpot");
    } finally {
      setLoading(false);
    }
  }, [setAvailableOwners]);

  // Initial load only - subsequent fetches triggered by FilterBar's onApply
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getOwnerName = (ownerId: string) => {
    const owner = data?.owners.find((o) => o.id === ownerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : ownerId;
  };

  // Filter sequences based on selected owners from global filters
  const filteredSequences = data?.sequences.filter((seq) => {
    if (filters.ownerIds.length === 0) return true;
    // Match by owner ID - find owners whose userId matches the sequence userId
    const matchingOwner = data?.owners?.find((o) =>
      filters.ownerIds.includes(o.id) && o.userId?.toString() === seq.userId
    );
    return !!matchingOwner;
  }) || [];

  // Only show sequences with enrollees (when activeOnly is true)
  const displaySequences = filters.activeOnly
    ? filteredSequences.filter((s) => s.activeEnrollees > 0)
    : filteredSequences.filter((s) => s.totalEnrollees > 0);

  // Sort by active enrollees descending
  displaySequences.sort((a, b) => b.activeEnrollees - a.activeEnrollees);

  // Filter meetings by selected owners for display
  const filteredMeetingsByOwner = filters.ownerIds.length > 0 && data?.meetings.byOwner
    ? Object.fromEntries(
        Object.entries(data.meetings.byOwner).filter(([ownerId]) => filters.ownerIds.includes(ownerId))
      )
    : data?.meetings.byOwner || {};

  const filteredMeetingsTotal = Object.values(filteredMeetingsByOwner).reduce((sum, count) => sum + count, 0);

  // Calculate filtered stats
  const filteredEnrollmentsTotal = displaySequences.reduce((sum, s) => sum + s.totalEnrollees, 0);
  const filteredEnrollmentsActive = displaySequences.reduce((sum, s) => sum + s.activeEnrollees, 0);
  const filteredReplies = displaySequences.reduce((sum, s) => sum + s.replies, 0);

  if (loading && !data) {
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
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Sequence performance and enrollments</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Sequence performance and enrollments
            {data && ` · ${data.sequences.length} sequences`}
          </p>
        </div>
        {loading && <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Global FilterBar */}
      <FilterBar loading={loading} onApply={fetchData} />

      {/* Summary Stats - Full Funnel */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {filters.startDate || filters.endDate ? "Enrolled in Period" : "Enrolled"}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEnrollmentsTotal}</div>
            <p className="text-xs text-muted-foreground">
              {filteredEnrollmentsActive} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredReplies}</div>
            <p className="text-xs text-muted-foreground">
              {filteredEnrollmentsTotal
                ? ((filteredReplies / filteredEnrollmentsTotal) * 100).toFixed(1)
                : 0}
              % reply rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredMeetingsTotal}</div>
            <p className="text-xs text-muted-foreground">
              {filters.ownerIds.length > 0 ? "For selected reps" : "All reps"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Created</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.deals?.created || 0}</div>
            <p className="text-xs text-muted-foreground">
              In date range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Won</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data?.deals?.won || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.deals?.lost || 0} lost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data?.deals?.wonValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From won deals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Report - Sequences Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displaySequences.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No campaigns found with current filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Campaign</th>
                    <th className="text-right py-3 px-2 font-medium">Active</th>
                    <th className="text-right py-3 px-2 font-medium">Total</th>
                    <th className="text-right py-3 px-2 font-medium">Replies</th>
                    <th className="text-right py-3 px-2 font-medium">Deals</th>
                    <th className="text-right py-3 px-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {displaySequences.slice(0, 20).map((seq) => (
                    <tr key={seq.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="font-medium">{seq.name}</div>
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className={seq.activeEnrollees > 0 ? "text-green-600 font-medium" : ""}>
                          {seq.activeEnrollees}
                        </span>
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">
                        {seq.totalEnrollees}
                      </td>
                      <td className="text-right py-3 px-2">
                        {seq.replies}
                        {seq.totalEnrollees > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({((seq.replies / seq.totalEnrollees) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="text-right py-3 px-2">{seq.dealsCreated}</td>
                      <td className="text-right py-3 px-2 font-medium">
                        {formatCurrency(seq.dealsValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2">
                    <td className="py-3 px-2 font-bold">Total</td>
                    <td className="text-right py-3 px-2 font-bold">
                      {displaySequences.reduce((sum, s) => sum + s.activeEnrollees, 0)}
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      {displaySequences.reduce((sum, s) => sum + s.totalEnrollees, 0)}
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      {displaySequences.reduce((sum, s) => sum + s.replies, 0)}
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      {displaySequences.reduce((sum, s) => sum + s.dealsCreated, 0)}
                    </td>
                    <td className="text-right py-3 px-2 font-bold">
                      {formatCurrency(displaySequences.reduce((sum, s) => sum + s.dealsValue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Outcomes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Meeting Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.meetings.byOutcome && Object.keys(data.meetings.byOutcome).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.meetings.byOutcome)
                  .sort((a, b) => b[1] - a[1])
                  .map(([outcome, count]) => (
                    <div key={outcome} className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {outcome === "null" || outcome === "No Outcome" ? "No Outcome Set" : outcome.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{
                              width: `${(count / data.meetings.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No meeting data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meetings by Rep
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.meetings.byOwner && Object.keys(data.meetings.byOwner).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(data.meetings.byOwner)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([ownerId, count]) => (
                    <div key={ownerId} className="flex items-center justify-between">
                      <span className="font-medium">{getOwnerName(ownerId)}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2"
                            style={{
                              width: `${(count / Math.max(...Object.values(data.meetings.byOwner))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No meeting data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
