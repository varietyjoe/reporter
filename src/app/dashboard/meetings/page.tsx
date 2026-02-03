"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilters } from "@/contexts/FilterContext";
import type { HubSpotMeeting } from "@/types";

interface MeetingsResponse {
  results: HubSpotMeeting[];
  owners: Array<{ id: string; email: string; firstName: string; lastName: string; userId?: number }>;
  total: number;
  leadSources?: Record<string, string | null>;
  dealByMeetingId?: Record<string, string | null>;
  contacts?: Record<string, { id: string; email: string | null; name: string | null } | null>;
  engagementOutcomes?: Record<string, string | null>;
  portalId?: string | null;
}

interface GrainMeetingDetails {
  id: string;
  title: string;
  duration: string;
  summary: string | null;
  startDatetime: string;
  coachingScore: number | null;
  shareUrl: string | null;
}

interface GrainMeetingMapping {
  id: string;
  hubspotMeetingId: string;
  grainMeetingId: string;
  grainShareUrl?: string | null;
}

const STORAGE_KEY = "dashboard-global-filters";

// HubSpot internal values mapped to display labels
// HubSpot returns UPPERCASE values like "NO_SHOW", "DISQUAL - PRICE" etc.
const OUTCOME_INTERNAL_TO_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "No Show",
  CANCELED: "Canceled",
  // Custom outcomes use UPPERCASE with hyphens
  "QUALIFIED - SOLD": "Qualified - Sold",
  "DISQUAL - PRICE": "Disqual - Price",
  "DISQUAL - FIT": "Disqual - Fit",
  "DISQUAL - TIMING": "Disqual - Timing",
  "QUALIFIED - ADVANCE": "Qualified - Advance",
};

// Reverse mapping: display labels to internal values for saving
const OUTCOME_LABEL_TO_INTERNAL: Record<string, string> = {
  Scheduled: "SCHEDULED",
  Completed: "COMPLETED",
  Rescheduled: "RESCHEDULED",
  "No Show": "NO_SHOW",
  Canceled: "CANCELED",
  // Custom outcomes map to UPPERCASE with hyphens
  "Qualified - Sold": "QUALIFIED - SOLD",
  "Disqual - Price": "DISQUAL - PRICE",
  "Disqual - Fit": "DISQUAL - FIT",
  "Disqual - Timing": "DISQUAL - TIMING",
  "Qualified - Advance": "QUALIFIED - ADVANCE",
};

// Convert HubSpot internal value to display label
function outcomeToLabel(internal: string | null | undefined): string {
  if (!internal) return "";
  // Check if it's an internal value that needs mapping
  const mapped = OUTCOME_INTERNAL_TO_LABEL[internal];
  if (mapped) return mapped;
  // If not in mapping, return as-is (might already be a label or custom value)
  return internal;
}

// Convert display label to HubSpot internal value for saving
function labelToOutcome(label: string | null | undefined): string | null {
  if (!label) return null;
  // Check if it's a label that needs mapping
  const mapped = OUTCOME_LABEL_TO_INTERNAL[label];
  if (mapped) return mapped;
  // If not in mapping, return as-is
  return label;
}

const OUTCOME_OPTIONS = [
  "Scheduled",
  "Completed",
  "Rescheduled",
  "No Show",
  "Canceled",
  "Qualified - Sold",
  "Disqual - Price",
  "Disqual - Fit",
  "Disqual - Timing",
  "Qualified - Advance",
];

const TYPE_OPTIONS = [
  "Discovery",
  "Demo",
  "Closing",
  "Follow-up",
  "Check-in",
  "Onboarding",
  "Support",
  "Other",
];

function formatDateValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseHubSpotDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return new Date(numeric);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function MeetingsPage() {
  const [data, setData] = useState<MeetingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grainError, setGrainError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const {
    filters,
    setAvailableOwners,
    setCustomDateRange,
    applyFilters,
  } = useFilters();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      setCustomDateRange(formatDateValue(start), formatDateValue(end));
      setTimeout(() => {
        applyFilters();
        setInitialized(true);
      }, 0);
    } else {
      setInitialized(true);
    }
  }, [applyFilters, setCustomDateRange]);

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

  useEffect(() => {
    const fetchLeadSourceOptions = async () => {
      try {
        const response = await fetch("/api/hubspot/properties/deals/lead_source");
        const result = await response.json();
        if (response.ok && result.options) {
          setLeadSourceOptions(result.options);
        }
      } catch {
        // no-op
      }
    };
    fetchLeadSourceOptions();
  }, []);

  const fetchData = useCallback(async () => {
    const currentFilters = filtersRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.ownerIds.length > 0) {
        params.append("ownerIds", currentFilters.ownerIds.join(","));
      }

      const now = new Date();
      const fallbackEnd = formatDateValue(now);
      const fallbackStart = formatDateValue(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      );

      params.append("startDate", currentFilters.startDate || fallbackStart);
      params.append("endDate", currentFilters.endDate || fallbackEnd);

      const meetingsResponse = await fetch(`/api/hubspot/meetings?${params}`);
      const meetingsResult: MeetingsResponse = await meetingsResponse.json();

      if (meetingsResponse.ok) {
        setData(meetingsResult);
        setError(null);
        if (meetingsResult.owners) {
          setAvailableOwners(meetingsResult.owners);
        }
      } else {
        setError(meetingsResult?.error || "Failed to fetch meetings");
      }
    } catch (err) {
      console.error("Meetings fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to HubSpot");
      setGrainError("Failed to connect to Grain");
    } finally {
      setLoading(false);
    }
  }, [setAvailableOwners]);

  useEffect(() => {
    if (!initialized) return;
    fetchData();
  }, [fetchData, initialized]);

  const ownersById = useMemo(() => {
    const map = new Map<string, string>();
    if (data?.owners) {
      data.owners.forEach((owner) => {
        const name = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
        map.set(owner.id, name || owner.email || "Unknown");
      });
    }
    return map;
  }, [data?.owners]);

  const leadSourceByMeetingId = useMemo(() => {
    return data?.leadSources || {};
  }, [data?.leadSources]);

  const dealIdByMeetingId = useMemo(() => {
    return data?.dealByMeetingId || {};
  }, [data?.dealByMeetingId]);

  const engagementOutcomeByMeetingId = useMemo(() => {
    return data?.engagementOutcomes || {};
  }, [data?.engagementOutcomes]);

  const contactByMeetingId = useMemo(() => {
    return data?.contacts || {};
  }, [data?.contacts]);

  const portalId = data?.portalId || null;

  const [grainMappings, setGrainMappings] = useState<GrainMeetingMapping[]>([]);
  const [grainDetails, setGrainDetails] = useState<GrainMeetingDetails[]>([]);
  const lastAutoMapKey = useRef<string>("");
  const [savingMeetingId, setSavingMeetingId] = useState<string | null>(null);
  const [savingLeadMeetingId, setSavingLeadMeetingId] = useState<string | null>(null);
  const [leadSourceOptions, setLeadSourceOptions] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    const hubspotIds = data?.results.map((meeting) => meeting.id) || [];
    if (hubspotIds.length === 0) {
      setGrainMappings([]);
      setGrainDetails([]);
      return;
    }

    const fetchMappings = async () => {
      try {
        const autoKey = `${filters.startDate || ""}-${filters.endDate || ""}-${hubspotIds.join(",")}`;
        if (autoKey !== lastAutoMapKey.current) {
          lastAutoMapKey.current = autoKey;
          await fetch("/api/meetings/mappings/auto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetings: data?.results.map((meeting) => ({
                id: meeting.id,
                startTime:
                  meeting.properties.hs_meeting_start_time ||
                  meeting.properties.hs_timestamp ||
                  null,
              })),
              startDate: filters.startDate,
              endDate: filters.endDate,
            }),
          });
        }

        const response = await fetch(
          `/api/meetings/mappings?hubspotIds=${hubspotIds.join(",")}`
        );
        const result = await response.json();
        if (response.ok) {
          setGrainMappings(result.results || []);
        } else {
          setGrainMappings([]);
        }
      } catch {
        setGrainMappings([]);
      }
    };

    fetchMappings();
  }, [data?.results, filters.startDate, filters.endDate]);

  useEffect(() => {
    const grainIds = grainMappings.map((mapping) => mapping.grainMeetingId);
    if (grainIds.length === 0) {
      setGrainDetails([]);
      return;
    }

    const fetchDetails = async () => {
      try {
        const response = await fetch("/api/grain/meetings/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: grainIds }),
        });
        const result = await response.json();
        if (response.ok) {
          setGrainDetails(result.results || []);
          setGrainError(null);
        } else {
          setGrainDetails([]);
          setGrainError(result?.error || "Failed to fetch Grain meetings");
        }
      } catch {
        setGrainDetails([]);
        setGrainError("Failed to fetch Grain meetings");
      }
    };

    fetchDetails();
  }, [grainMappings]);

  const mappingByHubspotId = useMemo(() => {
    return new Map(
      grainMappings.map((mapping) => [mapping.hubspotMeetingId, mapping])
    );
  }, [grainMappings]);

  const detailsById = useMemo(() => {
    return new Map(grainDetails.map((detail) => [detail.id, detail]));
  }, [grainDetails]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }),
    []
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }),
    []
  );

  const handleUpdateMeeting = useCallback(
    async (meetingId: string, properties: Record<string, string | null | undefined>) => {
      setSavingMeetingId(meetingId);
      try {
        const response = await fetch(`/api/hubspot/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ properties }),
        });
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result?.error || "Failed to update meeting");
        }

        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            results: prev.results.map((meeting) =>
              meeting.id === meetingId
                ? {
                    ...meeting,
                    properties: {
                      ...meeting.properties,
                      ...properties,
                    },
                  }
                : meeting
            ),
          };
        });
      } catch (err) {
        console.error("Meeting update failed:", err);
        alert(err instanceof Error ? err.message : "Failed to update meeting");
      } finally {
        setSavingMeetingId((prev) => (prev === meetingId ? null : prev));
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Last 30 days by default. Filter by host or date range.
          </p>
        </div>
      </div>



      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {loading ? "Loading meetings..." : `${data?.total ?? 0} meetings`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          {!error && !loading && (!data || data.results.length === 0) && (
            <div className="text-sm text-muted-foreground">No meetings found for this range.</div>
          )}

          {!error && data && data.results.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Meeting</th>
                    <th className="py-2 pr-4 font-medium">Contact</th>
                    <th className="py-2 pr-4 font-medium">Lead Source</th>
                    <th className="py-2 pr-4 font-medium">Outcome</th>
                    <th className="py-2 pr-4 font-medium">Recording</th>
                    <th className="py-2 pr-4 font-medium">Coaching</th>
                    <th className="py-2 pr-4 font-medium">Host</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((meeting) => {
                    const start = parseHubSpotDate(
                      meeting.properties.hs_meeting_start_time || meeting.properties.hs_timestamp
                    );
                    const end = parseHubSpotDate(meeting.properties.hs_meeting_end_time);
                    const dateLabel = start ? dateFormatter.format(start) : "Unknown";
                    const timeLabel = start
                      ? end
                        ? `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`
                        : timeFormatter.format(start)
                      : "N/A";
                    const hostName = meeting.properties.hubspot_owner_id
                      ? ownersById.get(meeting.properties.hubspot_owner_id) || "Unknown"
                      : "Unassigned";
                    const contact = contactByMeetingId[meeting.id] || null;
                    const contactLabel =
                      contact?.name || contact?.email || (contact ? "Contact" : "N/A");
                    const contactUrl =
                      contact && portalId
                        ? `https://app.hubspot.com/contacts/${portalId}/record/0-1/${contact.id}`
                        : null;
                    const meetingUrl =
                      contact && portalId
                        ? `https://app.hubspot.com/contacts/${portalId}/record/0-1/${contact.id}/view/1?engagement=${meeting.id}`
                        : null;
                    const leadSource =
                      leadSourceByMeetingId[meeting.id] ||
                      meeting.properties.hs_analytics_source_data_1 ||
                      meeting.properties.hs_analytics_source ||
                      "N/A";
                    const dealId = dealIdByMeetingId[meeting.id] || null;
                    const mapping = mappingByHubspotId.get(meeting.id);
                    const details = mapping ? detailsById.get(mapping.grainMeetingId) : null;
                    const recordingUrl = mapping?.grainShareUrl || details?.shareUrl || null;

                    return (
                      <tr key={meeting.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4 whitespace-nowrap">{dateLabel}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">{timeLabel}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-foreground">
                            {meeting.properties.hs_meeting_title || "Untitled Meeting"}
                          </div>
                          {meeting.properties.hs_activity_type && (
                            <div className="text-xs text-muted-foreground">
                              {meeting.properties.hs_activity_type}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {contactUrl ? (
                            <a
                              href={contactUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {contactLabel}
                            </a>
                          ) : meetingUrl ? (
                            <a
                              href={meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {contactLabel === "N/A" ? "Open meeting" : contactLabel}
                            </a>
                          ) : (
                            contactLabel
                          )}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <select
                            className="rounded-md border px-2 py-1 text-sm"
                            value={leadSource === "N/A" ? "" : leadSource}
                            onChange={(event) => {
                              if (!dealId) return;
                              const value = event.target.value.trim();
                              const previous = leadSource === "N/A" ? "" : leadSource;
                              if (value === previous) return;
                              setSavingLeadMeetingId(meeting.id);
                              fetch(`/api/hubspot/deals/${dealId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  properties: { lead_source: value || null },
                                }),
                              })
                                .then((response) => {
                                  if (!response.ok) {
                                    return response.json().then((result) => {
                                      throw new Error(result?.error || "Failed to update lead source");
                                    });
                                  }
                                  setData((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      leadSources: {
                                        ...(prev.leadSources || {}),
                                        [meeting.id]: value || null,
                                      },
                                    };
                                  });
                                })
                                .catch((err) => {
                                  console.error("Lead source update failed:", err);
                                  alert(err instanceof Error ? err.message : "Failed to update lead source");
                                })
                                .finally(() => {
                                  setSavingLeadMeetingId((prev) => (prev === meeting.id ? null : prev));
                                });
                            }}
                            disabled={!dealId || savingLeadMeetingId === meeting.id}
                          >
                            <option value="">Select</option>
                            {leadSourceOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <select
                            className="rounded-md border px-2 py-1 text-sm"
                            value={outcomeToLabel(
                              meeting.properties.hs_meeting_outcome ||
                              engagementOutcomeByMeetingId[meeting.id]
                            )}
                            onChange={(event) =>
                              handleUpdateMeeting(meeting.id, {
                                hs_meeting_outcome: labelToOutcome(event.target.value),
                              })
                            }
                            disabled={savingMeetingId === meeting.id}
                          >
                            <option value="">N/A</option>
                            {OUTCOME_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {grainError ? (
                            "Unavailable"
                          ) : recordingUrl ? (
                            <a
                              href={recordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Open
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {grainError ? "Unavailable" : details?.coachingScore ?? "N/A"}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <select
                            className="rounded-md border px-2 py-1 text-sm"
                            value={meeting.properties.hubspot_owner_id || ""}
                            onChange={(event) =>
                              handleUpdateMeeting(meeting.id, {
                                hubspot_owner_id: event.target.value || null,
                              })
                            }
                            disabled={savingMeetingId === meeting.id}
                          >
                            <option value="">Unassigned</option>
                            {data?.owners.map((owner) => (
                              <option key={owner.id} value={owner.id}>
                                {owner.firstName} {owner.lastName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <select
                            className="rounded-md border px-2 py-1 text-sm"
                            value={meeting.properties.hs_activity_type || ""}
                            onChange={(event) =>
                              handleUpdateMeeting(meeting.id, {
                                hs_activity_type: event.target.value || null,
                              })
                            }
                            disabled={savingMeetingId === meeting.id}
                          >
                            <option value="">N/A</option>
                            {TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
