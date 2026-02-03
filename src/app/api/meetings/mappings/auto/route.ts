import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GrainClient } from "@/lib/grain/client";
import { extractGrainShareUrl } from "@/lib/grain/share";
import { getHubSpotClient } from "@/lib/hubspot/client";

interface HubSpotMeetingInput {
  id: string;
  startTime: string | null;
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return new Date(numeric);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const grainKey = process.env.GRAIN_API_KEY;
    if (!grainKey) {
      return NextResponse.json(
        { error: "Grain not connected. Add GRAIN_API_KEY to .env.local" },
        { status: 401 }
      );
    }

    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const meetings = Array.isArray(body?.meetings) ? (body.meetings as HubSpotMeetingInput[]) : [];
    const startDate = body?.startDate as string | undefined;
    const endDate = body?.endDate as string | undefined;

    if (meetings.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, results: [] });
    }

    const grainClient = new GrainClient(grainKey);
    const grainMeetings = await grainClient.listMeetings({
      startDate,
      endDate,
      limit: 500,
    });

    const grainByEmail = new Map<string, string[]>();
    grainMeetings.forEach((meeting) => {
      meeting.participants.forEach((participant) => {
        if (participant.email) {
          const key = normalizeEmail(participant.email);
          const list = grainByEmail.get(key) || [];
          list.push(meeting.id);
          grainByEmail.set(key, list);
        }
      });
    });

    const results = [];
    let created = 0;
    let skipped = 0;

    for (const meeting of meetings) {
      const contactEmails = await client.getMeetingContactEmails(meeting.id);
      if (contactEmails.length === 0) {
        skipped++;
        continue;
      }

      const grainIds = new Set<string>();
      contactEmails.forEach((email) => {
        const ids = grainByEmail.get(normalizeEmail(email)) || [];
        ids.forEach((id) => grainIds.add(id));
      });

      if (grainIds.size === 0) {
        skipped++;
        continue;
      }

      let chosenId: string | null = null;
      let chosenShareUrl: string | null = null;
      if (grainIds.size === 1) {
        chosenId = Array.from(grainIds)[0];
        const grainMeeting = grainMeetings.find((g) => g.id === chosenId);
        chosenShareUrl = extractGrainShareUrl(grainMeeting);
      } else {
        const start = parseDate(meeting.startTime);
        if (start) {
          let closestId: string | null = null;
          let closestDelta = Infinity;
          let closestShareUrl: string | null = null;
          for (const id of grainIds) {
            const grainMeeting = grainMeetings.find((g) => g.id === id);
            const grainStart = parseDate(grainMeeting?.startDatetime || null);
            if (!grainStart) continue;
            const delta = Math.abs(grainStart.getTime() - start.getTime());
            if (delta < closestDelta) {
              closestDelta = delta;
              closestId = id;
              closestShareUrl = extractGrainShareUrl(grainMeeting);
            }
          }
          if (closestId) {
            chosenId = closestId;
            chosenShareUrl = closestShareUrl;
          }
        }
      }

      if (!chosenId) {
        skipped++;
        continue;
      }

      const updateData = {
        grainMeetingId: chosenId,
        ...(chosenShareUrl ? { grainShareUrl: chosenShareUrl } : {}),
      };
      const createData = {
        hubspotMeetingId: meeting.id,
        grainMeetingId: chosenId,
        ...(chosenShareUrl ? { grainShareUrl: chosenShareUrl } : {}),
      };

      const mapping = await prisma.grainMeetingMapping.upsert({
        where: { hubspotMeetingId: meeting.id },
        update: updateData,
        create: createData,
      });
      results.push(mapping);
      created++;
    }

    return NextResponse.json({ created, skipped, results });
  } catch (error) {
    console.error("Failed to auto-map meetings:", error);
    return NextResponse.json(
      { error: "Failed to auto-map meetings", details: String(error) },
      { status: 500 }
    );
  }
}
