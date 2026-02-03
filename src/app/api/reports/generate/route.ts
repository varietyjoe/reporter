import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderReportToMarkdown, DEFAULT_TEMPLATES } from "@/lib/reports/blocks";
import { getHubSpotClient } from "@/lib/hubspot/client";
import type { DailyMetrics, QuotaConfig, ReportBlock } from "@/types";

const DEFAULT_MAGIC_TARGETS = {
  meetingsTarget: 5,
  qualOppsTarget: 3,
  conversionsTarget: 2,
  mrrPerConversion: 300,
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function isNoShow(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const value = outcome.toLowerCase();
  // Handle both HubSpot internal value (NO_SHOW -> no_show) and display label (No Show -> no show)
  return value.includes("no show") || value.includes("no-show") || value.includes("no_show");
}

function isQualified(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const value = outcome.toLowerCase();
  if (value.includes("unqual")) return false;
  return value.includes("qualified");
}

function normalizeOutcome(outcome: string | null | undefined): string {
  if (!outcome) return "";
  return outcome.toLowerCase().replace(/[_-]+/g, " ");
}

function isCanceled(outcome: string | null | undefined): boolean {
  const value = normalizeOutcome(outcome);
  return value.includes("cancel");
}

function isQualAdvanced(outcome: string | null | undefined): boolean {
  const value = normalizeOutcome(outcome);
  return value.includes("qualified") && value.includes("advance");
}

function isQualSold(outcome: string | null | undefined): boolean {
  const value = normalizeOutcome(outcome);
  return value.includes("qualified") && value.includes("sold");
}

function isDisqualified(outcome: string | null | undefined): boolean {
  const value = normalizeOutcome(outcome);
  if (!value) return false;
  if (value.includes("disqual")) return true;
  return value.includes("unqual");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, date, ownerIds, startDate, endDate } = body as {
      templateId?: string;
      date?: string;
      ownerIds?: string[];
      startDate?: string;
      endDate?: string;
    };

    // In production, get userId from session
    const userId = "demo-user";

    // Get template
    let blocks: ReportBlock[];
    if (templateId === "dailySalesPulse") {
      blocks = DEFAULT_TEMPLATES.dailySalesPulse.blocks;
    } else {
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      blocks = JSON.parse(template.blocks);
    }

    const reportDate = date ? parseLocalDate(date) || new Date(date) : new Date();
    const rangeStart = startDate ? parseLocalDate(startDate) || new Date(startDate) : startOfDay(reportDate);
    const rangeEnd = endDate ? parseLocalDate(endDate) || new Date(endDate) : endOfDay(reportDate);

    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const results = await Promise.allSettled([
      client.getMeetingsWithDetails({
        startDate: rangeStart.getTime().toString(),
        endDate: endOfDay(rangeEnd).getTime().toString(),
        ownerIds: ownerIds && ownerIds.length > 0 ? ownerIds : undefined,
      }),
      client.getDealsClosedWon({
        ownerIds: ownerIds && ownerIds.length > 0 ? ownerIds : undefined,
        startDate: rangeStart.getTime().toString(),
        endDate: endOfDay(rangeEnd).getTime().toString(),
      }),
      client.getDealsClosedLost({
        ownerIds: ownerIds && ownerIds.length > 0 ? ownerIds : undefined,
        startDate: rangeStart.getTime().toString(),
        endDate: endOfDay(rangeEnd).getTime().toString(),
      }),
      client.getCallsWithDetails({
        ownerIds: ownerIds && ownerIds.length > 0 ? ownerIds : undefined,
        startDate: rangeStart.getTime().toString(),
        endDate: endOfDay(rangeEnd).getTime().toString(),
      }),
      client.getEmailsWithDetails({
        ownerIds: ownerIds && ownerIds.length > 0 ? ownerIds : undefined,
        startDate: rangeStart.getTime().toString(),
        endDate: endOfDay(rangeEnd).getTime().toString(),
      }),
    ]);

    if (results[0].status === "rejected") throw results[0].reason;
    if (results[1].status === "rejected") throw results[1].reason;
    if (results[2].status === "rejected") throw results[2].reason;

    if (results[3].status === "rejected") {
      console.warn("Failed to fetch calls for report:", results[3].reason);
    }
    if (results[4].status === "rejected") {
      console.warn("Failed to fetch emails for report:", results[4].reason);
    }

    const meetings = results[0].value;
    const wonDeals = results[1].value;
    const lostDeals = results[2].value;
    const calls = results[3].status === "fulfilled" ? results[3].value : [];
    const emails = results[4].status === "fulfilled" ? results[4].value : [];

    const inferredOwnerCount = (() => {
      const ownerIdSet = new Set<string>();
      meetings.forEach((meeting) => {
        const ownerId = meeting.properties.hubspot_owner_id;
        if (ownerId) ownerIdSet.add(ownerId);
      });
      [...wonDeals, ...lostDeals].forEach((deal) => {
        const ownerId = deal.properties.hubspot_owner_id;
        if (ownerId) ownerIdSet.add(ownerId);
      });
      return ownerIdSet.size || 1;
    })();

    const ownerCount =
      ownerIds && ownerIds.length > 0
        ? ownerIds.length
        : templateId === "dailySalesPulse"
        ? 3
        : inferredOwnerCount;

    // Get quotas (fallback to Magic Formula targets for daily metrics)
    const quotaConfigs = await prisma.quotaConfig.findMany({
      where: { userId },
    });

    const quotas: QuotaConfig[] = quotaConfigs.map((q) => ({
      metric: q.metric as QuotaConfig["metric"],
      period: q.period as QuotaConfig["period"],
      target: q.target,
    }));

    const magicTarget =
      (await prisma.magicFormulaTarget.findFirst({ where: { scope: "global" } })) ||
      DEFAULT_MAGIC_TARGETS;

    const hasMeetingQuota = quotas.some((q) => q.metric === "meetings_held");
    const hasQualQuota = quotas.some((q) => q.metric === "deals_created");
    const hasConvQuota = quotas.some((q) => q.metric === "deals_won");
    const meetingsTarget = magicTarget.meetingsTarget * ownerCount;
    const qualOppsTarget = magicTarget.qualOppsTarget * ownerCount;
    const conversionsTarget = magicTarget.conversionsTarget * ownerCount;

    if (!hasMeetingQuota) {
      quotas.push({ metric: "meetings_held", period: "daily", target: meetingsTarget });
    }
    if (!hasQualQuota) {
      quotas.push({ metric: "deals_created", period: "daily", target: qualOppsTarget });
    }
    if (!hasConvQuota) {
      quotas.push({ metric: "deals_won", period: "daily", target: conversionsTarget });
    }

    const meetingsNoShow = meetings.filter((m) => isNoShow(m.properties.hs_meeting_outcome)).length;
    const meetingsCanceled = meetings.filter((m) => isCanceled(m.properties.hs_meeting_outcome)).length;
    const meetingsHeld = meetings.length - meetingsNoShow - meetingsCanceled;
    const meetingsQualAdvanced = meetings.filter((m) =>
      isQualAdvanced(m.properties.hs_meeting_outcome)
    ).length;
    const meetingsQualSold = meetings.filter((m) =>
      isQualSold(m.properties.hs_meeting_outcome)
    ).length;
    const meetingsDisqualified = meetings.filter((m) =>
      isDisqualified(m.properties.hs_meeting_outcome)
    ).length;
    const qualifiedOpps = meetings.filter((m) => isQualified(m.properties.hs_meeting_outcome)).length;
    const revenue = wonDeals.reduce(
      (sum, deal) => sum + (parseFloat(deal.properties.amount || "0") || 0),
      0
    );
    const callsConnected = calls.filter((call) => {
      const status = String(call.properties?.hs_call_status || "").toLowerCase();
      return status.includes("completed") || status.includes("connected");
    }).length;
    const emailsReplied = emails.filter((email) => {
      const status = String(email.properties?.hs_email_status || "").toLowerCase();
      return status.includes("replied");
    }).length;

    const metrics: DailyMetrics = {
      date: reportDate.toISOString(),
      emails_sent: emails.length,
      emails_replied: emailsReplied,
      calls_made: calls.length,
      calls_connected: callsConnected,
      meetings_booked: meetings.length,
      meetings_held: meetingsHeld,
      meetings_no_show: meetingsNoShow,
      meetings_canceled: meetingsCanceled,
      meetings_qual_advanced: meetingsQualAdvanced,
      meetings_qual_sold: meetingsQualSold,
      meetings_disqualified: meetingsDisqualified,
      deals_created: qualifiedOpps,
      deals_advanced: 0,
      deals_won: wonDeals.length,
      deals_lost: lostDeals.length,
      revenue,
      mrr: revenue,
      asp: wonDeals.length > 0 ? revenue / wonDeals.length : 0,
    };

    // Adjust alert thresholds to reflect Magic Formula targets
    const revenueTarget = conversionsTarget * magicTarget.mrrPerConversion;
    const adjustedBlocks = blocks.map((block) => {
      if (block.type === "magic_formula") {
        return {
          ...block,
          config: {
            ...block.config,
            perRep: true,
            repCount: ownerCount,
          },
        };
      }
      if (block.type !== "alert" || !block.config.metric) return block;
      if (block.config.metric === "mrr") {
        return {
          ...block,
          config: { ...block.config, threshold: revenueTarget },
        };
      }
      if (block.config.metric === "asp") {
        return {
          ...block,
          config: { ...block.config, threshold: magicTarget.mrrPerConversion },
        };
      }
      return block;
    });

    // Generate markdown
    const markdown = renderReportToMarkdown(adjustedBlocks, metrics, quotas, reportDate);

    const dayKey = startOfDay(reportDate);
    const shouldPersist = templateId && templateId !== "dailySalesPulse";
    let reportId: string | null = null;

    if (shouldPersist) {
      const [user, templateRecord] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.reportTemplate.findUnique({ where: { id: templateId } }),
      ]);

      if (user && templateRecord) {
        const existing = await prisma.generatedReport.findFirst({
          where: {
            userId,
            templateId,
            date: dayKey,
          },
        });

        const report = existing
          ? await prisma.generatedReport.update({
              where: { id: existing.id },
              data: {
                markdown,
                data: JSON.stringify(metrics),
              },
            })
          : await prisma.generatedReport.create({
              data: {
                userId,
                templateId,
                date: dayKey,
                markdown,
                data: JSON.stringify(metrics),
              },
            });

        reportId = report.id;
      }
    }

    return NextResponse.json({
      id: reportId,
      markdown,
      date: dayKey.toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
