import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getHubSpotClient } from "@/lib/hubspot/client";
import type { HubSpotMeeting } from "@/types";

const DEFAULT_TARGETS = {
  meetingsTarget: 5,
  qualOppsTarget: 3,
  conversionsTarget: 2,
  mrrPerConversion: 300,
};

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayStartEnd(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function isQualified(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const value = outcome.toLowerCase();
  if (value.includes("unqual")) return false;
  return value.includes("qualified");
}

function isConversion(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const value = outcome.toLowerCase();
  return value.includes("deal won") || value.includes("closed won") || /\bwon\b/.test(value);
}

async function resolveTargets(options: {
  ownerIds: string[];
  teamId?: string;
  ownerCount: number;
}) {
  const { ownerIds, teamId, ownerCount } = options;

  if (ownerIds.length === 1) {
    const ownerTarget = await prisma.magicFormulaTarget.findFirst({
      where: { scope: "owner", ownerId: ownerIds[0] },
    });
    if (ownerTarget) return ownerTarget;
  }

  if (teamId) {
    const teamTarget = await prisma.magicFormulaTarget.findFirst({
      where: { scope: "team", teamId },
    });
    if (teamTarget) return teamTarget;
  }

  const globalTarget = await prisma.magicFormulaTarget.findFirst({
    where: { scope: "global" },
  });

  if (globalTarget) {
    if (ownerCount > 1) {
      return {
        ...globalTarget,
        meetingsTarget: globalTarget.meetingsTarget * ownerCount,
        qualOppsTarget: globalTarget.qualOppsTarget * ownerCount,
        conversionsTarget: globalTarget.conversionsTarget * ownerCount,
      };
    }
    return globalTarget;
  }

  if (ownerCount > 1) {
    return {
      id: "default",
      scope: "global",
      meetingsTarget: DEFAULT_TARGETS.meetingsTarget * ownerCount,
      qualOppsTarget: DEFAULT_TARGETS.qualOppsTarget * ownerCount,
      conversionsTarget: DEFAULT_TARGETS.conversionsTarget * ownerCount,
      mrrPerConversion: DEFAULT_TARGETS.mrrPerConversion,
    };
  }

  return { id: "default", scope: "global", ...DEFAULT_TARGETS };
}

function buildDayResult(args: {
  dateKey: string;
  meetings: HubSpotMeeting[];
  ownerIds: string[];
  teamId?: string;
  revenue: number;
  dealsCount: number;
  ownerCount: number;
}) {
  const { dateKey, meetings, ownerIds, teamId, revenue, dealsCount, ownerCount } = args;
  const qualified = meetings.filter((meeting) =>
    isQualified(meeting.properties.hs_meeting_outcome)
  ).length;
  const meetingsHeld = meetings.length;

  return resolveTargets({ ownerIds, teamId, ownerCount }).then((target) => {
    const revenueTarget = target.conversionsTarget * target.mrrPerConversion;

    const metrics = {
      meetingsHeld,
      qualifiedOpps: qualified,
      conversions: dealsCount,
      revenue,
      asp: dealsCount > 0 ? revenue / dealsCount : 0,
    };

    const targets = {
      meetingsHeld: target.meetingsTarget,
      qualifiedOpps: target.qualOppsTarget,
      conversions: target.conversionsTarget,
      revenue: revenueTarget,
      mrrPerConversion: target.mrrPerConversion,
    };

    const percentToGoal = {
      meetingsHeld: target.meetingsTarget
        ? metrics.meetingsHeld / target.meetingsTarget
        : 0,
      qualifiedOpps: target.qualOppsTarget
        ? metrics.qualifiedOpps / target.qualOppsTarget
        : 0,
      conversions: target.conversionsTarget
        ? metrics.conversions / target.conversionsTarget
        : 0,
      revenue: revenueTarget ? metrics.revenue / revenueTarget : 0,
      asp: 0,
    };

    const allGoalsMet =
      metrics.meetingsHeld >= target.meetingsTarget &&
      metrics.qualifiedOpps >= target.qualOppsTarget &&
      metrics.conversions >= target.conversionsTarget &&
      metrics.revenue >= revenueTarget;

    return {
      date: dateKey,
      metrics,
      targets,
      percentToGoal,
      all_goals_met: allGoalsMet,
      scope: ownerCount > 1 ? "team_total" : "individual",
      ownerCount,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ownerIds = searchParams.get("ownerIds")?.split(",").filter(Boolean) || [];
    const teamId = searchParams.get("teamId") || undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const dateParam = searchParams.get("date");

    const today = new Date();
    const baseDate =
      (dateParam && parseDate(dateParam)) ||
      (startDateParam && parseDate(startDateParam)) ||
      today;

    if (!baseDate) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const startDate = startDateParam ? parseDate(startDateParam) : null;
    const endDate = endDateParam ? parseDate(endDateParam) : null;

    const rangeStart = startDate || getDayStartEnd(baseDate).start;
    const rangeEnd = endDate || getDayStartEnd(baseDate).end;

    const meetings = await client.getMeetingsWithDetails({
      startDate: rangeStart.getTime().toString(),
      endDate: rangeEnd.getTime().toString(),
    });

    const owners = await client.getOwners();
    const deals = await client.getDealsClosedWon({
      ownerIds,
      startDate: rangeStart.getTime().toString(),
      endDate: rangeEnd.getTime().toString(),
    });

    const filteredMeetings =
      ownerIds.length > 0
        ? meetings.filter(
            (meeting) =>
              meeting.properties.hubspot_owner_id &&
              ownerIds.includes(meeting.properties.hubspot_owner_id)
          )
        : meetings;

    const grouped = new Map<string, HubSpotMeeting[]>();
    filteredMeetings.forEach((meeting) => {
      const raw =
        meeting.properties.hs_meeting_start_time ||
        meeting.properties.hs_timestamp;
      const date = raw ? new Date(Number(raw) || raw) : null;
      if (!date || Number.isNaN(date.getTime())) return;
      const key = toLocalDateKey(date);
      const list = grouped.get(key) || [];
      list.push(meeting);
      grouped.set(key, list);
    });

    const revenueByDate = new Map<string, number>();
    const dealsByDate = new Map<string, number>();
    deals.forEach((deal) => {
      const closed = deal.properties.closedate;
      if (!closed) return;
      const date = new Date(Number(closed) || closed);
      if (Number.isNaN(date.getTime())) return;
      const key = toLocalDateKey(date);
      const amount = parseFloat(deal.properties.amount || "0") || 0;
      revenueByDate.set(key, (revenueByDate.get(key) || 0) + amount);
      dealsByDate.set(key, (dealsByDate.get(key) || 0) + 1);
    });

    const ownerCount = ownerIds.length > 0 ? ownerIds.length : 1;

    const isRange =
      startDateParam &&
      endDateParam &&
      startDateParam !== endDateParam;

    if (isRange) {
      const results = [];
      const cursor = new Date(rangeStart);
      const endCursor = new Date(rangeEnd);
      cursor.setHours(0, 0, 0, 0);
      endCursor.setHours(0, 0, 0, 0);

      while (cursor <= endCursor) {
        const key = toLocalDateKey(cursor);
        const dayMeetings = grouped.get(key) || [];
        results.push(
          await buildDayResult({
            dateKey: key,
            meetings: dayMeetings,
            ownerIds,
            teamId,
            revenue: revenueByDate.get(key) || 0,
            dealsCount: dealsByDate.get(key) || 0,
            ownerCount,
          })
        );
        cursor.setDate(cursor.getDate() + 1);
      }

      return NextResponse.json({
        results,
        scope: ownerCount > 1 ? "team_total" : "individual",
        ownerCount,
        owners: owners.results,
      });
    }

    const dateKey = toLocalDateKey(baseDate);
    const dayMeetings = grouped.get(dateKey) || [];
    const result = await buildDayResult({
      dateKey,
      meetings: dayMeetings,
      ownerIds,
      teamId,
      revenue: revenueByDate.get(dateKey) || 0,
      dealsCount: dealsByDate.get(dateKey) || 0,
      ownerCount,
    });

    return NextResponse.json({
      result,
      scope: ownerCount > 1 ? "team_total" : "individual",
      ownerCount,
      owners: owners.results,
    });
  } catch (error) {
    console.error("Failed to compute magic formula:", error);
    return NextResponse.json(
      { error: "Failed to compute magic formula", details: String(error) },
      { status: 500 }
    );
  }
}
