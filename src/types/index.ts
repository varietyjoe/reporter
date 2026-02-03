// Metric types for reporting
export type MetricType =
  | "emails_sent"
  | "emails_received"
  | "emails_opened"
  | "emails_replied"
  | "calls_made"
  | "calls_connected"
  | "meetings_booked"
  | "meetings_held"
  | "meetings_no_show"
  | "meetings_canceled"
  | "meetings_qual_advanced"
  | "meetings_qual_sold"
  | "meetings_disqualified"
  | "deals_created"
  | "deals_advanced"
  | "deals_won"
  | "deals_lost"
  | "revenue"
  | "mrr"
  | "asp";

export type Period = "daily" | "weekly" | "monthly";

// HubSpot types
export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string | null;
    dealstage: string;
    pipeline: string;
    closedate: string | null;
    createdate: string;
    hubspot_owner_id: string | null;
    hs_analytics_source?: string;
    hs_analytics_source_data_1?: string;
    hs_analytics_source_data_2?: string;
  };
}

export interface HubSpotEngagement {
  id: string;
  type: "CALL" | "EMAIL" | "MEETING" | "NOTE" | "TASK";
  timestamp: number;
  associations: {
    dealIds: string[];
    contactIds: string[];
  };
  metadata: Record<string, unknown>;
  properties?: Record<string, string | null | undefined>;
}

export interface HubSpotSequence {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  folderId?: string;
}

export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname: string;
    lastname: string;
    hubspot_owner_id: string | null;
    hs_sequences_is_enrolled: string;
    hs_sequences_actively_enrolled_count: string;
    hs_sequences_enrolled_count: string;
    hs_latest_sequence_enrolled: string;
    hs_latest_sequence_enrolled_date: string;
    hs_email_replied?: string;
    hs_email_last_reply_date?: string;
    hs_sales_email_last_replied?: string;
    num_associated_deals?: string;
    recent_deal_amount?: string;
  };
}

export interface HubSpotMeeting {
  id: string;
  properties: {
    hs_timestamp: string;
    hs_meeting_title: string;
    hs_meeting_outcome: string | null;
    hs_meeting_start_time: string;
    hs_meeting_end_time: string;
    hubspot_owner_id: string | null;
    hs_engagement_id?: string | number | null;
    hs_activity_type?: string;
    hs_analytics_source?: string | null;
    hs_analytics_source_data_1?: string | null;
    hs_analytics_source_data_2?: string | null;
  };
}

export interface SequenceStats {
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

export interface CampaignData {
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
  owners: Array<{ id: string; email: string; firstName: string; lastName: string; userId?: number }>;
  pipelines: Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }>;
}

// Aggregated metrics
export interface DailyMetrics {
  date: string;
  emails_sent: number;
  emails_replied: number;
  calls_made: number;
  calls_connected: number;
  meetings_booked: number;
  meetings_held: number;
  meetings_no_show: number;
  meetings_canceled: number;
  meetings_qual_advanced: number;
  meetings_qual_sold: number;
  meetings_disqualified: number;
  deals_created: number;
  deals_advanced: number;
  deals_won: number;
  deals_lost: number;
  revenue: number;
  mrr: number;
  asp: number;
}

// Quota configuration
export interface QuotaConfig {
  metric: MetricType;
  period: Period;
  target: number;
}

// Building blocks types
export type BlockType =
  | "header"
  | "magic_formula"
  | "metric"
  | "section"
  | "stat_pair"
  | "insight"
  | "breakdown"
  | "meetings_summary"
  | "alert"
  | "divider";

export interface ReportBlock {
  id: string;
  type: BlockType;
  config: BlockConfig;
}

export interface BlockConfig {
  // Common
  label?: string;

  // Header block
  title?: string;
  includeDate?: boolean;

  // Metric blocks
  metric?: MetricType;
  showQuotaComparison?: boolean;
  quotaPeriod?: Period;
  perRep?: boolean;
  repCount?: number;

  // Stat pair
  metric1?: MetricType;
  metric2?: MetricType;
  separator?: string;

  // Insight
  text?: string;
  isAiGenerated?: boolean;

  // Breakdown
  steps?: Array<{ metric: MetricType; label: string }>;

  // Alert
  threshold?: number;
  warningIcon?: string;

  // Status icons
  showStatusIcon?: boolean;
  successThreshold?: number;
  warningThreshold?: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  blocks: ReportBlock[];
}

// AI Insights types
export interface AIInsight {
  id: string;
  category: "funnel" | "pipeline" | "activity" | "meeting";
  title: string;
  summary: string;
  details: string;
  recommendations: string[];
  severity: "info" | "warning" | "critical";
  createdAt: Date;
}

// Seat types
export type SeatRole = "rep" | "manager";
export type SeatStatus = "active" | "paused" | "inactive";

export interface Seat {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: SeatRole;
  status: SeatStatus;
  hubspotOwnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Grain meeting types
export interface GrainMeeting {
  id: string;
  title: string;
  duration: string;
  summary: string | null;
  startDatetime: string;
  participants: GrainParticipant[];
}

export interface GrainParticipant {
  name: string;
  email: string | null;
  scope: "internal" | "external" | "unknown";
}

export interface GrainCoachingFeedback {
  meetingId: string;
  overallScore: number;
  categories: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
}
