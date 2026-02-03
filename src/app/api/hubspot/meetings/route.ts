import { NextRequest, NextResponse } from "next/server";
import { getHubSpotClient } from "@/lib/hubspot/client";

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
    const rawStartDate = searchParams.get("startDate") || undefined;
    const rawEndDate = searchParams.get("endDate") || undefined;

    const parseLocalDate = (value: string | undefined) => {
      if (!value) return undefined;
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return value;
      const parts = value.split("-").map((part) => Number(part));
      if (parts.length === 3 && parts.every((part) => !Number.isNaN(part))) {
        const [year, month, day] = parts;
        const local = new Date(year, month - 1, day);
        return local;
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return parsed;
    };

    const startLocal = parseLocalDate(rawStartDate);
    const endLocal = parseLocalDate(rawEndDate);

    const startDate =
      startLocal instanceof Date ? startLocal.getTime().toString() : startLocal;
    const endDate =
      endLocal instanceof Date
        ? new Date(
            endLocal.getFullYear(),
            endLocal.getMonth(),
            endLocal.getDate(),
            23,
            59,
            59,
            999
          ).getTime().toString()
        : endLocal;

    const meetings = await client.getMeetingsWithDetails({
      startDate,
      endDate,
    });

    const filteredMeetings =
      ownerIds.length > 0
        ? meetings.filter(
            (meeting) =>
              meeting.properties.hubspot_owner_id &&
              ownerIds.includes(meeting.properties.hubspot_owner_id)
          )
        : meetings;

    const owners = await client.getOwners();

    const meetingIds = filteredMeetings.map((meeting) => meeting.id);
    const associations = await client.getMeetingDealAssociations(meetingIds);
    const dealIds = Array.from(
      new Set(
        meetingIds
          .flatMap((id) => associations[id] || [])
          .filter((id) => typeof id === "string" && id.trim().length > 0)
      )
    );
    const deals = dealIds.length > 0 ? await client.getDealsByIds(dealIds) : [];
    const dealById = new Map(
      deals.map((deal) => [
        deal.id,
        {
          leadSource: deal.properties.lead_source || null,
          updatedAt: deal.properties.hs_lastmodifieddate || deal.properties.createdate || "",
        },
      ])
    );
    const leadSources: Record<string, string | null> = {};
    const dealByMeetingId: Record<string, string | null> = {};
    meetingIds.forEach((id) => {
      const associatedDeals = associations[id] || [];
      if (associatedDeals.length === 0) {
        leadSources[id] = null;
        dealByMeetingId[id] = null;
        return;
      }

      const mostRecent = [...associatedDeals]
        .map((dealId) => ({ dealId, meta: dealById.get(dealId) }))
        .filter((entry) => entry.meta)
        .sort((a, b) => (a.meta!.updatedAt > b.meta!.updatedAt ? -1 : 1))[0];

      if (!mostRecent) {
        leadSources[id] = null;
        dealByMeetingId[id] = null;
        return;
      }

      leadSources[id] = mostRecent.meta!.leadSource || null;
      dealByMeetingId[id] = mostRecent.dealId;
    });

    const meetingContacts = await client.getMeetingContactIdsBatch(meetingIds);
    const missingContactMeetings = meetingIds.filter(
      (id) => !meetingContacts[id] || meetingContacts[id].length === 0
    );
    if (missingContactMeetings.length > 0) {
      for (const meetingId of missingContactMeetings) {
        try {
          const ids = await client.getMeetingContactIds(meetingId);
          if (ids.length > 0) {
            meetingContacts[meetingId] = ids;
          }
        } catch {
          // ignore per-meeting association failures
        }
      }
    }

    const contactIds = Array.from(
      new Set(
        Object.values(meetingContacts)
          .flat()
          .filter((id) => typeof id === "string" && id.trim().length > 0)
      )
    );
    const contacts = contactIds.length > 0 ? await client.getContactsByIds(contactIds) : [];
    const contactsById = new Map(
      contacts.map((contact) => [
        contact.id,
        {
          id: contact.id,
          email: contact.properties.email || null,
          name: `${contact.properties.firstname || ""} ${contact.properties.lastname || ""}`.trim() || null,
        },
      ])
    );
    const contactByMeetingId: Record<string, { id: string; email: string | null; name: string | null } | null> = {};
    Object.entries(meetingContacts).forEach(([meetingId, ids]) => {
      const first = ids[0];
      if (!first) {
        contactByMeetingId[meetingId] = null;
        return;
      }
      const contact = contactsById.get(first);
      if (contact) {
        contactByMeetingId[meetingId] = contact;
        return;
      }
      // Fallback: at least return the contact id so the UI can link to the record
      contactByMeetingId[meetingId] = { id: first, email: null, name: null };
    });

    const debug = new URL(request.url).searchParams.get("debug") === "1";
    const associationCounts: Record<string, number> = {};
    if (debug) {
      Object.entries(meetingContacts).forEach(([meetingId, ids]) => {
        associationCounts[meetingId] = ids.length;
      });
    }

    let sampleAssociation: Record<string, unknown> | null = null;
    if (debug && meetingIds.length > 0) {
      try {
        const raw = await client.getMeetingContactAssociationsBatchRaw([meetingIds[0]]);
        sampleAssociation = raw.results?.[0] || null;
      } catch {
        sampleAssociation = { error: "Failed to fetch raw associations" };
      }
    }

    const engagementOutcomes: Record<string, string | null> = {};
    const meetingsMissingOutcome = filteredMeetings.filter(
      (meeting) => !meeting.properties.hs_meeting_outcome
    );
    if (meetingsMissingOutcome.length > 0) {
      const missingIds = meetingsMissingOutcome.map((meeting) => meeting.id);
      const engagementMap = await client.getMeetingEngagementIdsBatch(missingIds);
      for (const meeting of meetingsMissingOutcome) {
        let meetingDetailsOutcome: string | null = null;
        let directEngagementId =
          typeof meeting.properties.hs_engagement_id === "string"
            ? meeting.properties.hs_engagement_id
            : meeting.properties.hs_engagement_id !== undefined
              ? String(meeting.properties.hs_engagement_id)
              : null;
        if (!directEngagementId) {
          try {
            const meetingDetails = await client.getMeetingById(meeting.id, [
              "hs_engagement_id",
              "hs_meeting_outcome",
            ]);
            const rawEngagementId =
              (meetingDetails as { properties?: Record<string, unknown> })?.properties
                ?.hs_engagement_id;
            const rawOutcome =
              (meetingDetails as { properties?: Record<string, unknown> })?.properties
                ?.hs_meeting_outcome;
            if (typeof rawEngagementId === "string" && rawEngagementId.trim()) {
              directEngagementId = rawEngagementId.trim();
            } else if (rawEngagementId !== undefined && rawEngagementId !== null) {
              directEngagementId = String(rawEngagementId);
            }
            if (typeof rawOutcome === "string" && rawOutcome.trim()) {
              meetingDetailsOutcome = rawOutcome.trim();
            } else if (rawOutcome !== undefined && rawOutcome !== null) {
              meetingDetailsOutcome = String(rawOutcome);
            }
          } catch {
            // ignore lookup failures
          }
        }
        if (meetingDetailsOutcome) {
          engagementOutcomes[meeting.id] = meetingDetailsOutcome;
          continue;
        }
        let engagementIds = directEngagementId ? [directEngagementId] : engagementMap[meeting.id] || [];
        if (engagementIds.length === 0) {
          try {
            engagementIds = await client.getEngagementIdsForMeeting(meeting.id);
          } catch {
            engagementIds = [];
          }
        }
        const engagementId = engagementIds[0];
        if (!engagementId) {
          try {
            const engagement = await client.getEngagement(meeting.id);
            const outcome =
              (engagement as { metadata?: Record<string, unknown> })?.metadata?.meetingOutcome ||
              (engagement as { metadata?: Record<string, unknown> })?.metadata?.meeting_result ||
              (engagement as { metadata?: Record<string, unknown> })?.metadata?.outcome ||
              null;
            engagementOutcomes[meeting.id] = outcome ? String(outcome) : null;
          } catch {
            engagementOutcomes[meeting.id] = null;
          }
          continue;
        }
        try {
          const engagement = await client.getEngagement(engagementId);
          const outcome =
            (engagement as { metadata?: Record<string, unknown> })?.metadata?.meetingOutcome ||
            (engagement as { metadata?: Record<string, unknown> })?.metadata?.meeting_result ||
            (engagement as { metadata?: Record<string, unknown> })?.metadata?.outcome ||
            null;
          engagementOutcomes[meeting.id] = outcome ? String(outcome) : null;
        } catch {
          engagementOutcomes[meeting.id] = null;
        }
      }
    }

    const engagementDebug: Record<string, unknown> = {};
    if (debug && meetingsMissingOutcome.length > 0) {
      const sampleMeetingId = meetingsMissingOutcome[0]?.id;
      const engagementMap = await client.getMeetingEngagementIdsBatch([sampleMeetingId]);
      const sampleMeeting = meetingsMissingOutcome[0];
      let directEngagementId =
        typeof sampleMeeting?.properties?.hs_engagement_id === "string"
          ? sampleMeeting.properties.hs_engagement_id
          : sampleMeeting?.properties?.hs_engagement_id !== undefined
            ? String(sampleMeeting.properties.hs_engagement_id)
            : null;
      if (!directEngagementId && sampleMeetingId) {
        try {
          const meetingDetails = await client.getMeetingById(sampleMeetingId, [
            "hs_engagement_id",
            "hs_meeting_outcome",
          ]);
          const meetingDetailsProps =
            (meetingDetails as { properties?: Record<string, unknown> })?.properties || null;
          engagementDebug.sampleMeetingDetails = meetingDetailsProps;
          directEngagementId = meetingDetailsProps?.hs_engagement_id || null;
        } catch {
          directEngagementId = null;
        }
      }
      engagementDebug.sampleEngagementIdsFromBatch = engagementMap[sampleMeetingId] || [];
      engagementDebug.sampleEngagementIdsFromLegacy = [];
      if (!directEngagementId) {
        try {
          engagementDebug.sampleEngagementIdsFromLegacy = await client.getEngagementIdsForMeeting(
            sampleMeetingId
          );
        } catch {
          engagementDebug.sampleEngagementIdsFromLegacy = [];
        }
      }
      let engagementIds = directEngagementId ? [directEngagementId] : engagementMap[sampleMeetingId] || [];
      if (engagementIds.length === 0) {
        try {
          engagementIds = await client.getEngagementIdsForMeeting(sampleMeetingId);
        } catch {
          engagementIds = [];
        }
      }
      if (engagementIds[0]) {
        try {
          const engagement = await client.getEngagement(engagementIds[0]);
          engagementDebug.sampleMeetingId = sampleMeetingId;
          engagementDebug.sampleEngagementId = engagementIds[0];
          engagementDebug.sampleEngagementMetadata =
            (engagement as { metadata?: Record<string, unknown> })?.metadata || null;
        } catch {
          engagementDebug.sampleEngagementError = "Failed to fetch engagement";
        }
      } else {
        engagementDebug.sampleMeetingId = sampleMeetingId;
        engagementDebug.sampleEngagementId = null;
        try {
          const engagement = await client.getEngagement(sampleMeetingId);
          engagementDebug.sampleEngagementFallbackId = sampleMeetingId;
          engagementDebug.sampleEngagementFallbackMetadata =
            (engagement as { metadata?: Record<string, unknown> })?.metadata || null;
        } catch {
          engagementDebug.sampleEngagementFallbackError = "Failed to fetch fallback engagement";
        }
      }
    }

    return NextResponse.json({
      results: filteredMeetings,
      owners: owners.results,
      total: filteredMeetings.length,
      leadSources,
      dealByMeetingId,
      contacts: contactByMeetingId,
      engagementOutcomes,
      portalId: process.env.HUBSPOT_PORTAL_ID || null,
      ...(debug
        ? {
            debug: {
              meetingCount: meetingIds.length,
              meetingsWithContacts: Object.values(associationCounts).filter((count) => count > 0).length,
              contactIdsCount: contactIds.length,
              contactsFetched: contacts.length,
              associationCounts,
              sampleAssociation,
              engagementDebug,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings", details: String(error) },
      { status: 500 }
    );
  }
}
