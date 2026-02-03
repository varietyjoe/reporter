import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SHARE_URL_REGEX = /\/share\/recording\/([^/]+)\/([^/?#]+)/i;

function parseShareUrl(shareUrl: string): { meetingId: string; shareToken: string } | null {
  const match = shareUrl.match(SHARE_URL_REGEX);
  if (!match) return null;
  return { meetingId: match[1], shareToken: match[2] };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hubspotIds = searchParams.get("hubspotIds")?.split(",").filter(Boolean) || [];

    if (hubspotIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await prisma.grainMeetingMapping.findMany({
      where: { hubspotMeetingId: { in: hubspotIds } },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to fetch meeting mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meeting mappings", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hubspotMeetingId = body?.hubspotMeetingId as string | undefined;
    const grainMeetingId = body?.grainMeetingId as string | undefined;
    const grainShareUrl = body?.grainShareUrl as string | undefined;

    if (!hubspotMeetingId) {
      return NextResponse.json(
        { error: "hubspotMeetingId is required" },
        { status: 400 }
      );
    }

    let resolvedMeetingId = grainMeetingId;
    if (!resolvedMeetingId && grainShareUrl) {
      const parsed = parseShareUrl(grainShareUrl);
      if (parsed) {
        resolvedMeetingId = parsed.meetingId;
      }
    }

    if (!resolvedMeetingId) {
      return NextResponse.json(
        { error: "grainMeetingId is required (or provide a valid grainShareUrl)" },
        { status: 400 }
      );
    }

    const mapping = await prisma.grainMeetingMapping.upsert({
      where: { hubspotMeetingId },
      update: {
        grainMeetingId: resolvedMeetingId,
        grainShareUrl: grainShareUrl || undefined,
      },
      create: {
        hubspotMeetingId,
        grainMeetingId: resolvedMeetingId,
        grainShareUrl: grainShareUrl || undefined,
      },
    });

    return NextResponse.json({ result: mapping });
  } catch (error) {
    console.error("Failed to save meeting mapping:", error);
    return NextResponse.json(
      { error: "Failed to save meeting mapping", details: String(error) },
      { status: 500 }
    );
  }
}
