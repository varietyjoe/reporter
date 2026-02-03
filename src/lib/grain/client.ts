import type { GrainMeeting, GrainCoachingFeedback } from "@/types";

// This client can be used when accessing Grain directly via API
// For MCP integration, the calls go through the MCP tools directly

export class GrainClient {
  private apiKey: string;
  private baseUrl = "https://api.grain.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grain API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async listMeetings(filters?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<GrainMeeting[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("start_date", filters.startDate);
    if (filters?.endDate) params.append("end_date", filters.endDate);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const response = await this.fetch<{ meetings: GrainMeeting[] }>(
      `/meetings?${params}`
    );
    return response.meetings;
  }

  async getMeeting(meetingId: string): Promise<GrainMeeting> {
    return this.fetch(`/meetings/${meetingId}`);
  }

  async getMeetingTranscript(meetingId: string): Promise<string> {
    const response = await this.fetch<{ transcript: string }>(
      `/meetings/${meetingId}/transcript`
    );
    return response.transcript;
  }

  async getMeetingNotes(meetingId: string): Promise<string> {
    const response = await this.fetch<{ notes: string }>(
      `/meetings/${meetingId}/notes`
    );
    return response.notes;
  }

  async getCoachingFeedback(meetingId: string): Promise<GrainCoachingFeedback | null> {
    try {
      return await this.fetch(`/meetings/${meetingId}/coaching`);
    } catch {
      return null;
    }
  }
}

// MCP-based Grain integration
// These functions are designed to work with the Grain MCP tools available in Claude Code

export interface MCPGrainMeeting {
  id: string;
  title: string;
  duration: string;
  summary: string | null;
  start_datetime: string;
  participants: Array<{
    name: string;
    email: string | null;
    scope: "internal" | "external" | "unknown";
  }>;
}

export interface MCPGrainDeal {
  deal_id: string;
  name: string;
  amount: string | null;
  stage: string;
  pipeline: { name: string; pipeline_id: string };
  owner: { name: string; person_id: string };
  company: { name: string; company_id: string };
  is_open: boolean;
  at_risk: boolean;
  latest_momentum: "progressing" | "stalled";
}

// Transform MCP meeting data to our app format
export function transformMCPMeeting(mcpMeeting: MCPGrainMeeting): GrainMeeting {
  return {
    id: mcpMeeting.id,
    title: mcpMeeting.title,
    duration: mcpMeeting.duration,
    summary: mcpMeeting.summary,
    startDatetime: mcpMeeting.start_datetime,
    participants: mcpMeeting.participants.map((p) => ({
      name: p.name,
      email: p.email,
      scope: p.scope,
    })),
  };
}

// Helper to format meeting duration
export function formatDuration(duration: string): string {
  // Grain returns duration as "HH:MM:SS" or similar
  const parts = duration.split(":");
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  return duration;
}
