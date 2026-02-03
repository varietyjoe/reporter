import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getHubSpotClient } from "@/lib/hubspot/client";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return normalize(value).replace(/\s+/g, " ");
}

export async function POST() {
  try {
    const client = getHubSpotClient();
    if (!client) {
      return NextResponse.json(
        { error: "HubSpot not connected. Add HUBSPOT_ACCESS_TOKEN to .env.local" },
        { status: 401 }
      );
    }

    const [seats, ownersResponse] = await Promise.all([
      prisma.seat.findMany(),
      client.getOwners(),
    ]);

    const owners = ownersResponse.results;
    const ownersByEmail = new Map<string, string>();
    const ownersByFullName = new Map<string, string>();
    const ownersByFirstName = new Map<string, string[]>();

    owners.forEach((owner) => {
      if (owner.email) {
        ownersByEmail.set(normalize(owner.email), owner.id);
      }
      const fullName = normalizeName(`${owner.firstName || ""} ${owner.lastName || ""}`.trim());
      if (fullName) {
        ownersByFullName.set(fullName, owner.id);
      }
      if (owner.firstName) {
        const firstKey = normalizeName(owner.firstName);
        const list = ownersByFirstName.get(firstKey) || [];
        list.push(owner.id);
        ownersByFirstName.set(firstKey, list);
      }
    });

    const updates: Array<{ id: string; hubspotOwnerId: string }> = [];
    const skipped: string[] = [];

    seats.forEach((seat) => {
      if (seat.hubspotOwnerId) {
        skipped.push(seat.id);
        return;
      }

      let ownerId: string | undefined;
      if (seat.email) {
        ownerId = ownersByEmail.get(normalize(seat.email)) || undefined;
      }

      if (!ownerId && seat.name) {
        const nameKey = normalizeName(seat.name);
        ownerId = ownersByFullName.get(nameKey);
        if (!ownerId && !nameKey.includes(" ")) {
          const matches = ownersByFirstName.get(nameKey) || [];
          if (matches.length === 1) {
            ownerId = matches[0];
          }
        }
      }

      if (ownerId) {
        updates.push({ id: seat.id, hubspotOwnerId: ownerId });
      } else {
        skipped.push(seat.id);
      }
    });

    const results = await Promise.all(
      updates.map((update) =>
        prisma.seat.update({
          where: { id: update.id },
          data: { hubspotOwnerId: update.hubspotOwnerId },
        })
      )
    );

    return NextResponse.json({
      updated: results.length,
      skipped: skipped.length,
      results,
    });
  } catch (error) {
    console.error("Failed to auto-map seats:", error);
    return NextResponse.json(
      { error: "Failed to auto-map seats", details: String(error) },
      { status: 500 }
    );
  }
}
