import type { ReportBlock, DailyMetrics, QuotaConfig, MetricType } from "@/types";
import { formatCurrency, formatNumber, getStatusIcon, formatDate } from "@/lib/utils";

// Metric display names
const METRIC_LABELS: Record<MetricType, string> = {
  emails_sent: "emails sent",
  emails_received: "emails received",
  emails_opened: "emails opened",
  emails_replied: "replies",
  calls_made: "calls made",
  calls_connected: "calls connected",
  meetings_booked: "meetings booked",
  meetings_held: "meetings held",
  meetings_no_show: "no-shows",
  deals_created: "deals created",
  deals_advanced: "deals advanced",
  deals_won: "deals won",
  deals_lost: "deals lost",
  revenue: "revenue",
  mrr: "MRR",
  asp: "ASP",
};

// Get metric value from daily metrics
function getMetricValue(metrics: DailyMetrics, metric: MetricType): number {
  return (metrics as Record<string, number>)[metric] ?? 0;
}

// Format metric value based on type
function formatMetricValue(metric: MetricType, value: number): string {
  if (metric === "revenue" || metric === "mrr" || metric === "asp") {
    return formatCurrency(value);
  }
  return formatNumber(value);
}

function getStatusDot(value: number, target: number): string {
  if (target <= 0) return "";
  const ratio = value / target;
  if (ratio >= 1) return "🟢";
  if (ratio >= 0.8) return "🟡";
  return "🔴";
}

// Render a single block to markdown
export function renderBlockToMarkdown(
  block: ReportBlock,
  metrics: DailyMetrics,
  quotas: QuotaConfig[],
  date: Date
): string {
  const { type, config } = block;

  switch (type) {
    case "header": {
      const dateStr = config.includeDate !== false ? formatDate(date) + " " : "";
      return `**${dateStr}${config.title || "Sales Pulse"}**\n`;
    }

    case "section": {
      return `\n**${config.label}**`;
    }

    case "divider": {
      return "\n---\n";
    }

    case "metric": {
      if (!config.metric) return "";
      const value = getMetricValue(metrics, config.metric);
      const formattedValue = formatMetricValue(config.metric, value);
      const label = config.label || METRIC_LABELS[config.metric];

      let output = `${formattedValue} ${label}`;

      if (config.showQuotaComparison) {
        const quota = quotas.find(
          (q) => q.metric === config.metric && q.period === (config.quotaPeriod || "daily")
        );
        if (quota) {
          const ratio = value / quota.target;
          const icon = getStatusIcon(value, quota.target);
          output = `${formatNumber(value)} ${label}: ${ratio.toFixed(1)} ${icon}`;
        }
      } else if (config.showStatusIcon && config.successThreshold !== undefined) {
        const icon = value >= config.successThreshold ? "✅" :
                     value >= (config.warningThreshold || config.successThreshold * 0.7) ? "⚠️" : "❌";
        output = `${formattedValue} ${label} ${icon}`;
      }

      return output;
    }

    case "magic_formula": {
      if (!config.metric) return "";
      const value = getMetricValue(metrics, config.metric);
      const quota = quotas.find(
        (q) => q.metric === config.metric && q.period === (config.quotaPeriod || "daily")
      );

      if (!quota) {
        return `${formatNumber(value)} ${config.label || METRIC_LABELS[config.metric]}`;
      }

      const label = config.label || METRIC_LABELS[config.metric];
      if (config.perRep && config.repCount && config.repCount > 0) {
        const targetPerRep = quota.target / config.repCount;
        const valuePerRep = value / config.repCount;
        return `${formatNumber(targetPerRep)} ${label}: ${formatNumber(valuePerRep)}`;
      }

      const dot = getStatusDot(value, quota.target);
      return `${formatNumber(value)} ${label} ${dot}`;
    }

    case "stat_pair": {
      if (!config.metric1 || !config.metric2) return "";
      const value1 = getMetricValue(metrics, config.metric1);
      const value2 = getMetricValue(metrics, config.metric2);
      const label1 = METRIC_LABELS[config.metric1];
      const label2 = METRIC_LABELS[config.metric2];
      const sep = config.separator || " / ";
      return `${formatNumber(value1)} ${label1}${sep}${formatNumber(value2)} ${label2}`;
    }

    case "insight": {
      const arrow = config.text?.startsWith("→") ? "" : "→ ";
      return `${arrow}${config.text || ""}`;
    }

    case "breakdown": {
      if (!config.steps || config.steps.length === 0) return "";
      return config.steps
        .map((step) => {
          const value = getMetricValue(metrics, step.metric);
          return `${formatNumber(value)} ${step.label}`;
        })
        .join(" → ");
    }

    case "meetings_summary": {
      const booked = getMetricValue(metrics, "meetings_booked");
      const noShows = getMetricValue(metrics, "meetings_no_show");
      const canceled = getMetricValue(metrics, "meetings_canceled");
      const held = getMetricValue(metrics, "meetings_held");
      const qualAdvanced = getMetricValue(metrics, "meetings_qual_advanced");
      const qualSold = getMetricValue(metrics, "meetings_qual_sold");
      const disqualified = getMetricValue(metrics, "meetings_disqualified");

      return [
        `• ${formatNumber(booked)} booked`,
        `• ${formatNumber(noShows)} no-shows, ${formatNumber(canceled)} canceled`,
        `• ${formatNumber(held)} held`,
        `• ${formatNumber(qualAdvanced)} qual-advanced, ${formatNumber(qualSold)} qualified-sold`,
        `• ${formatNumber(disqualified)} DQ'd`,
      ].join("\n");
    }

    case "alert": {
      if (!config.metric) return "";
      const value = getMetricValue(metrics, config.metric);
      const formattedValue = formatMetricValue(config.metric, value);
      const label = config.label || METRIC_LABELS[config.metric];
      const warning = config.warningIcon || "⚠️⚠️";

      if (config.threshold !== undefined && value < config.threshold) {
        const dot = getStatusDot(value, config.threshold);
        return `${label}: ${formattedValue} ${warning} ${dot}`;
      }
      const dot = config.threshold !== undefined ? getStatusDot(value, config.threshold) : "";
      return `${label}: ${formattedValue} ${dot}`.trim();
    }

    default:
      return "";
  }
}

// Render full report template to markdown
export function renderReportToMarkdown(
  blocks: ReportBlock[],
  metrics: DailyMetrics,
  quotas: QuotaConfig[],
  date: Date
): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const rendered = renderBlockToMarkdown(block, metrics, quotas, date);
    if (rendered) {
      lines.push(rendered);
    }
  }

  return lines.join("\n");
}

// Render report to plain text (for email)
export function renderReportToPlainText(
  blocks: ReportBlock[],
  metrics: DailyMetrics,
  quotas: QuotaConfig[],
  date: Date
): string {
  // Remove markdown formatting
  return renderReportToMarkdown(blocks, metrics, quotas, date)
    .replace(/\*\*/g, "")
    .replace(/---/g, "────────────────");
}

// Pre-built templates
export const DEFAULT_TEMPLATES = {
  dailySalesPulse: {
    name: "Daily Sales Pulse",
    blocks: [
      {
        id: "header",
        type: "header" as const,
        config: { title: "Sales Pulse", includeDate: true },
      },
      {
        id: "section-formula",
        type: "section" as const,
        config: { label: "Magic Formula" },
      },
      {
        id: "metric-meetings",
        type: "magic_formula" as const,
        config: { metric: "meetings_held" as MetricType, label: "meetings", showQuotaComparison: true, quotaPeriod: "daily" as const },
      },
      {
        id: "metric-opps",
        type: "magic_formula" as const,
        config: { metric: "deals_created" as MetricType, label: "Qual Opps", showQuotaComparison: true, quotaPeriod: "daily" as const },
      },
      {
        id: "metric-conversions",
        type: "magic_formula" as const,
        config: { metric: "deals_won" as MetricType, label: "Conversions", showQuotaComparison: true, quotaPeriod: "daily" as const },
      },
      {
        id: "section-outbound",
        type: "section" as const,
        config: { label: "Outbound" },
      },
      {
        id: "stat-outbound",
        type: "stat_pair" as const,
        config: { metric1: "emails_sent" as MetricType, metric2: "calls_connected" as MetricType },
      },
      {
        id: "insight-outbound",
        type: "insight" as const,
        config: { text: "outbound volume summary", isAiGenerated: true },
      },
      {
        id: "section-meetings",
        type: "section" as const,
        config: { label: "Meetings" },
      },
      {
        id: "summary-meetings",
        type: "meetings_summary" as const,
        config: {},
      },
      {
        id: "section-revenue",
        type: "section" as const,
        config: { label: "Conversion & Revenue" },
      },
      {
        id: "stat-deals",
        type: "stat_pair" as const,
        config: { metric1: "deals_won" as MetricType, metric2: "deals_lost" as MetricType, separator: " won / " },
      },
      {
        id: "alert-mrr",
        type: "alert" as const,
        config: { metric: "mrr" as MetricType, label: "MRR sold", threshold: 500, warningIcon: "⚠️⚠️" },
      },
      {
        id: "alert-asp",
        type: "alert" as const,
        config: { metric: "asp" as MetricType, label: "ASP", threshold: 150, warningIcon: "⚠️⚠️" },
      },
    ],
  },
};
