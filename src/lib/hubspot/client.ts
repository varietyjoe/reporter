import type { HubSpotDeal, HubSpotEngagement, HubSpotSequence, HubSpotContact, HubSpotMeeting, SequenceStats, CampaignData } from "@/types";

const HUBSPOT_API_BASE = "https://api.hubapi.com";

export class HubSpotClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${HUBSPOT_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Deals - basic fetch (limited to 100)
  async getDeals(limit = 100, after?: string): Promise<{
    results: HubSpotDeal[];
    paging?: { next?: { after: string } };
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      properties: "dealname,amount,dealstage,pipeline,closedate,createdate,hubspot_owner_id",
    });
    if (after) params.append("after", after);

    return this.fetch(`/crm/v3/objects/deals?${params}`);
  }

  // Deals - fetch by pipeline (using search API with pagination)
  async getDealsByPipeline(pipelineId: string, options?: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotDeal[]> {
    const allDeals: HubSpotDeal[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value: string }> = [
        {
          propertyName: "pipeline",
          operator: "EQ",
          value: pipelineId,
        },
      ];

      // Add owner filter if specified
      if (options?.ownerIds && options.ownerIds.length > 0) {
        // For multiple owners, we need to use IN operator or multiple filter groups
        // HubSpot search supports IN operator for this
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          value: options.ownerIds.join(";"),
        });
      }

      // Add date filters
      if (options?.startDate) {
        filters.push({
          propertyName: "createdate",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "createdate",
          operator: "LTE",
          value: options.endDate,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate", "hubspot_owner_id"],
        limit: 100, // HubSpot max per request
      };

      // Only include after if we have a cursor
      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/deals/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allDeals.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (allDeals.length > 10000) {
        console.warn("Reached 10,000 deal limit for pipeline");
        break;
      }
    }

    return allDeals;
  }

  // Deals - fetch ALL deals (paginated) with optional filters
  async getAllDeals(options?: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotDeal[]> {
    // If no filters, use the simple pagination approach
    if (!options?.ownerIds?.length && !options?.startDate && !options?.endDate) {
      const allDeals: HubSpotDeal[] = [];
      let after: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getDeals(100, after);
        allDeals.push(...response.results);

        if (response.paging?.next?.after) {
          after = response.paging.next.after;
        } else {
          hasMore = false;
        }

        // Safety limit to prevent infinite loops
        if (allDeals.length > 10000) {
          console.warn("Reached 10,000 deal limit");
          break;
        }
      }

      return allDeals;
    }

    // With filters, use search API
    const allDeals: HubSpotDeal[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }> = [];

      // Add owner filter if specified
      if (options?.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          value: options.ownerIds.join(";"),
        });
      }

      // Add date filters
      if (options?.startDate) {
        filters.push({
          propertyName: "createdate",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "createdate",
          operator: "LTE",
          value: options.endDate,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: filters.length > 0 ? [{ filters }] : [],
        properties: ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate", "hubspot_owner_id"],
        limit: 100,
      };

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/deals/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allDeals.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      // Safety limit to prevent infinite loops
      if (allDeals.length > 10000) {
        console.warn("Reached 10,000 deal limit");
        break;
      }
    }

    return allDeals;
  }

  async getDeal(dealId: string): Promise<HubSpotDeal> {
    return this.fetch(
      `/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,pipeline,closedate,createdate,hubspot_owner_id`
    );
  }

  async getDealsByStage(stage: string): Promise<HubSpotDeal[]> {
    const response = await this.fetch<{ results: HubSpotDeal[] }>(
      `/crm/v3/objects/deals/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "dealstage",
                  operator: "EQ",
                  value: stage,
                },
              ],
            },
          ],
          properties: ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate"],
          limit: 100,
        }),
      }
    );
    return response.results;
  }

  // Engagements (Calls, Emails, Meetings)
  async getCalls(limit = 100): Promise<{ results: HubSpotEngagement[] }> {
    return this.fetch(`/crm/v3/objects/calls?limit=${limit}&properties=hs_timestamp,hs_call_duration,hs_call_status`);
  }

  async getEmails(limit = 100): Promise<{ results: HubSpotEngagement[] }> {
    return this.fetch(`/crm/v3/objects/emails?limit=${limit}&properties=hs_timestamp,hs_email_status,hs_email_subject`);
  }

  async getMeetings(limit = 100): Promise<{ results: HubSpotEngagement[] }> {
    return this.fetch(`/crm/v3/objects/meetings?limit=${limit}&properties=hs_timestamp,hs_meeting_outcome,hs_meeting_title`);
  }

  async getCallsWithDetails(options?: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotEngagement[]> {
    const allCalls: HubSpotEngagement[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }> = [];

      if (options?.startDate) {
        filters.push({
          propertyName: "hs_timestamp",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "hs_timestamp",
          operator: "LTE",
          value: options.endDate,
        });
      }

      if (options?.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          values: options.ownerIds,
        });
      }

      const body: Record<string, unknown> = {
        properties: ["hs_timestamp", "hs_call_status", "hubspot_owner_id"],
        limit: 100,
      };

      if (filters.length > 0) {
        body.filterGroups = [{ filters }];
      }

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotEngagement[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/calls/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allCalls.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allCalls.length > 10000) break;
    }

    return allCalls;
  }

  async getEmailsWithDetails(options?: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotEngagement[]> {
    const buildFilters = (timestampProperty: string) => {
      const filters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }> = [];

      if (options?.startDate) {
        filters.push({
          propertyName: timestampProperty,
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: timestampProperty,
          operator: "LTE",
          value: options.endDate,
        });
      }

      if (options?.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          values: options.ownerIds,
        });
      }

      return filters;
    };

    const fetchEmails = async (timestampProperty: string) => {
      const allEmails: HubSpotEngagement[] = [];
      let after: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const filters = buildFilters(timestampProperty);
        const body: Record<string, unknown> = {
          properties: ["hs_timestamp", "hs_email_status", "hubspot_owner_id", "hs_createdate", "createdate"],
          limit: 100,
        };

        if (filters.length > 0) {
          body.filterGroups = [{ filters }];
        }

        if (after) {
          body.after = after;
        }

        const response = await this.fetch<{ results: HubSpotEngagement[]; paging?: { next?: { after: string } } }>(
          `/crm/v3/objects/emails/search`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        );

        allEmails.push(...response.results);

        if (response.paging?.next?.after) {
          after = response.paging.next.after;
        } else {
          hasMore = false;
        }

        if (allEmails.length > 10000) break;
      }

      return allEmails;
    };

    const allEmails = await fetchEmails("hs_timestamp");
    if (allEmails.length > 0) return allEmails;

    if (options?.startDate || options?.endDate || options?.ownerIds?.length) {
      const createdateEmails = await fetchEmails("hs_createdate");
      if (createdateEmails.length > 0) return createdateEmails;
    }

    // Fallback: list emails without search and filter client-side
    const fallbackEmails: HubSpotEngagement[] = [];
    let listAfter: string | undefined;
    let listHasMore = true;
    const startMs = options?.startDate ? Number(options.startDate) : null;
    const endMs = options?.endDate ? Number(options.endDate) : null;
    const ownerSet = options?.ownerIds && options.ownerIds.length > 0 ? new Set(options.ownerIds) : null;

    while (listHasMore) {
      const response = await this.fetch<{ results: HubSpotEngagement[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/emails?limit=100&properties=hs_timestamp,hs_email_status,hubspot_owner_id${listAfter ? `&after=${listAfter}` : ""}`
      );

      response.results.forEach((email) => {
        const record = email as unknown as { properties?: Record<string, string | null | undefined> };
        const props = record.properties || {};
        const rawTimestamp = props.hs_timestamp || props.hs_createdate || props.createdate;
        const timestamp = rawTimestamp ? Number(rawTimestamp) : NaN;
        if (Number.isNaN(timestamp)) return;
        if (startMs !== null && timestamp < startMs) return;
        if (endMs !== null && timestamp > endMs) return;
        if (ownerSet && props.hubspot_owner_id && !ownerSet.has(props.hubspot_owner_id)) return;
        fallbackEmails.push(email);
      });

      if (response.paging?.next?.after) {
        listAfter = response.paging.next.after;
      } else {
        listHasMore = false;
      }

      if (fallbackEmails.length > 10000) break;
    }

    return fallbackEmails;
  }

  async getMeetingContactIds(meetingId: string): Promise<string[]> {
    const response = await this.fetch<{
      results: Array<{ id: string }>;
    }>(`/crm/v3/objects/meetings/${meetingId}/associations/contacts?limit=100`);

    return response.results.map((result) => result.id);
  }

  async getMeetingContactIdsBatch(meetingIds: string[]): Promise<Record<string, string[]>> {
    if (meetingIds.length === 0) return {};
    const body = {
      inputs: meetingIds.map((id) => ({ id })),
    };
    const response = await this.fetch<{
      results: Array<{ from: { id: string }; to: Array<{ id?: string; toObjectId?: number | string }> }>;
    }>(`/crm/v4/associations/meetings/contacts/batch/read`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const mapping: Record<string, string[]> = {};
    response.results.forEach((result) => {
      mapping[result.from.id] = result.to
        .map((entry) => {
          if (entry.id) return String(entry.id);
          if (entry.toObjectId !== undefined) return String(entry.toObjectId);
          return "";
        })
        .filter((value) => value.length > 0);
    });
    return mapping;
  }

  async getMeetingContactAssociationsBatchRaw(meetingIds: string[]) {
    if (meetingIds.length === 0) return { results: [] as Array<Record<string, unknown>> };
    const body = {
      inputs: meetingIds.map((id) => ({ id })),
    };
    return this.fetch<{ results: Array<Record<string, unknown>> }>(
      `/crm/v4/associations/meetings/contacts/batch/read`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  async getMeetingEngagementIdsBatch(meetingIds: string[]): Promise<Record<string, string[]>> {
    if (meetingIds.length === 0) return {};
    const body = {
      inputs: meetingIds.map((id) => ({ id })),
    };
    const response = await this.fetch<{
      results: Array<{ from: { id: string }; to: Array<{ id?: string; toObjectId?: number | string }> }>;
    }>(`/crm/v4/associations/meetings/engagements/batch/read`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const mapping: Record<string, string[]> = {};
    response.results.forEach((result) => {
      mapping[result.from.id] = result.to
        .map((entry) => {
          if (entry.id) return String(entry.id);
          if (entry.toObjectId !== undefined) return String(entry.toObjectId);
          return "";
        })
        .filter((value) => value.length > 0);
    });
    return mapping;
  }

  async getEngagementIdsForMeeting(meetingId: string): Promise<string[]> {
    const response = await this.fetch<{ results?: Array<{ id: number | string }> }>(
      `/engagements/v1/engagements/associated/meeting/${meetingId}/paged?limit=100`
    );
    const results = response.results || [];
    return results.map((item) => String(item.id));
  }

  async getContactsByIds(ids: string[]): Promise<Array<{ id: string; properties: { email?: string | null; firstname?: string | null; lastname?: string | null } }>> {
    if (ids.length === 0) return [];
    const body = {
      properties: ["email", "firstname", "lastname"],
      inputs: ids.map((id) => ({ id })),
    };
    const response = await this.fetch<{
      results: Array<{ id: string; properties: { email?: string | null; firstname?: string | null; lastname?: string | null } }>;
    }>(`/crm/v3/objects/contacts/batch/read`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.results || [];
  }

  async getMeetingContactEmails(meetingId: string): Promise<string[]> {
    const contactIds = await this.getMeetingContactIds(meetingId);
    if (contactIds.length === 0) return [];
    const contacts = await this.getContactsByIds(contactIds);
    return contacts
      .map((contact) => contact.properties.email || "")
      .filter(Boolean);
  }

  async getDealsByIds(ids: string[]): Promise<Array<{ id: string; properties: { lead_source?: string | null; hs_lastmodifieddate?: string | null; createdate?: string | null } }>> {
    if (ids.length === 0) return [];
    const body = {
      properties: ["lead_source", "hs_lastmodifieddate", "createdate"],
      inputs: ids.map((id) => ({ id })),
    };
    const response = await this.fetch<{
      results: Array<{ id: string; properties: { lead_source?: string | null; hs_lastmodifieddate?: string | null; createdate?: string | null } }>;
    }>(`/crm/v3/objects/deals/batch/read`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.results || [];
  }

  async getMeetingDealAssociations(meetingIds: string[]): Promise<Record<string, string[]>> {
    if (meetingIds.length === 0) return {};
    const body = {
      inputs: meetingIds.map((id) => ({ id })),
    };
    const response = await this.fetch<{
      results: Array<{ from: { id: string }; to: Array<{ id?: string; toObjectId?: number | string }> }>;
    }>(`/crm/v4/associations/meetings/deals/batch/read`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const mapping: Record<string, string[]> = {};
    response.results.forEach((result) => {
      mapping[result.from.id] = result.to
        .map((entry) => {
          if (entry.id) return String(entry.id);
          if (entry.toObjectId !== undefined) return String(entry.toObjectId);
          return "";
        })
        .filter((value) => value.length > 0);
    });
    return mapping;
  }

  async updateMeeting(
    meetingId: string,
    properties: Record<string, string | null | undefined>
  ): Promise<HubSpotMeeting> {
    const sanitized: Record<string, string> = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (value === undefined) return;
      // HubSpot CRM API v3 requires empty string to clear a property value
      sanitized[key] = value === null ? "" : String(value);
    });
    return this.fetch(`/crm/v3/objects/meetings/${meetingId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: sanitized }),
    });
  }

  async updateDeal(
    dealId: string,
    properties: Record<string, string | null | undefined>
  ): Promise<HubSpotDeal> {
    const sanitized: Record<string, string> = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (value === undefined) return;
      // HubSpot CRM API v3 requires empty string to clear a property value
      sanitized[key] = value === null ? "" : String(value);
    });
    return this.fetch(`/crm/v3/objects/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: sanitized }),
    });
  }

  async getDealPropertyOptions(propertyName: string): Promise<Array<{ label: string; value: string }>> {
    const response = await this.fetch<{ options?: Array<{ label: string; value: string }> }>(
      `/crm/v3/properties/deals/${propertyName}`
    );
    return response.options || [];
  }

  async getEngagement(engagementId: string): Promise<{ metadata?: { meetingOutcome?: string } }> {
    return this.fetch(`/engagements/v1/engagements/${engagementId}`);
  }

  // Pipelines
  async getPipelines(): Promise<{ results: Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }> }> {
    return this.fetch("/crm/v3/pipelines/deals");
  }

  private getWonStagesFromPipelines(pipelines: Array<{ id: string; label: string; stages: Array<{ id: string; label: string }> }>) {
    const wonStages = new Set<string>();
    const lostStages = new Set<string>();
    pipelines.forEach((pipeline) => {
      pipeline.stages.forEach((stage) => {
        const stageLower = stage.id.toLowerCase();
        const labelLower = stage.label.toLowerCase();
        if (stageLower.includes("won") || labelLower.includes("won")) {
          wonStages.add(stage.id);
        }
        if (stageLower.includes("lost") || labelLower.includes("lost")) {
          lostStages.add(stage.id);
        }
      });
    });
    return { wonStages, lostStages };
  }

  async getDealsClosedWon(options: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotDeal[]> {
    const pipelines = await this.getPipelines();
    const { wonStages } = this.getWonStagesFromPipelines(pipelines.results);
    if (wonStages.size === 0) return [];

    const allDeals: HubSpotDeal[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }> = [];

      if (options.startDate) {
        filters.push({
          propertyName: "closedate",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options.endDate) {
        filters.push({
          propertyName: "closedate",
          operator: "LTE",
          value: options.endDate,
        });
      }

      filters.push({
        propertyName: "dealstage",
        operator: "IN",
        values: Array.from(wonStages),
      });

      if (options.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          values: options.ownerIds,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate", "hubspot_owner_id"],
        limit: 100,
      };

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/deals/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allDeals.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allDeals.length > 10000) break;
    }

    return allDeals;
  }

  async getDealsClosedLost(options: {
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotDeal[]> {
    const pipelines = await this.getPipelines();
    const { lostStages } = this.getWonStagesFromPipelines(pipelines.results);
    if (lostStages.size === 0) return [];

    const allDeals: HubSpotDeal[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value?: string; values?: string[] }> = [];

      if (options.startDate) {
        filters.push({
          propertyName: "closedate",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options.endDate) {
        filters.push({
          propertyName: "closedate",
          operator: "LTE",
          value: options.endDate,
        });
      }

      filters.push({
        propertyName: "dealstage",
        operator: "IN",
        values: Array.from(lostStages),
      });

      if (options.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          values: options.ownerIds,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: ["dealname", "amount", "dealstage", "pipeline", "closedate", "createdate", "hubspot_owner_id"],
        limit: 100,
      };

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/deals/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allDeals.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allDeals.length > 10000) break;
    }

    return allDeals;
  }

  // Owners - fetch all with pagination
  async getOwners(): Promise<{ results: Array<{ id: string; email: string; firstName: string; lastName: string; userId?: number }> }> {
    const allOwners: Array<{ id: string; email: string; firstName: string; lastName: string; userId?: number }> = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({ limit: "100" });
      if (after) params.append("after", after);

      const response = await this.fetch<{
        results: Array<{ id: string; email: string; firstName: string; lastName: string; userId?: number }>;
        paging?: { next?: { after: string } };
      }>(`/crm/v3/owners?${params}`);

      allOwners.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allOwners.length > 500) break;
    }

    return { results: allOwners };
  }

  // Sequences (Campaigns)
  async getSequences(userId?: string): Promise<{ total: number; results: HubSpotSequence[] }> {
    // Get first owner if no userId provided
    if (!userId) {
      const owners = await this.getOwners();
      if (owners.results.length > 0 && owners.results[0].userId) {
        userId = owners.results[0].userId.toString();
      } else {
        userId = owners.results[0]?.id;
      }
    }

    return this.fetch(`/automation/v4/sequences?userId=${userId}`);
  }

  // Get contacts enrolled in sequences with pagination (single query)
  async getSequenceEnrollments(options?: {
    activeOnly?: boolean;
    startDate?: string;
    endDate?: string;
    sequenceId?: string;
    ownerId?: string;
  }): Promise<HubSpotContact[]> {
    const allContacts: HubSpotContact[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value: string }> = [];

      // Filter by enrollment status
      if (options?.activeOnly) {
        // Only currently active enrollees
        filters.push({
          propertyName: "hs_sequences_actively_enrolled_count",
          operator: "GT",
          value: "0",
        });
      } else if (options?.startDate || options?.endDate) {
        // When date range specified, use enrolled_count > 0 to capture anyone ever enrolled
        // The date filters below will limit to the specific range
        // This captures everyone enrolled during the period, even if they've since completed
        filters.push({
          propertyName: "hs_sequences_enrolled_count",
          operator: "GT",
          value: "0",
        });
      } else {
        // No date range - fall back to currently enrolled
        filters.push({
          propertyName: "hs_sequences_is_enrolled",
          operator: "EQ",
          value: "true",
        });
      }

      // Filter by date range
      if (options?.startDate) {
        filters.push({
          propertyName: "hs_latest_sequence_enrolled_date",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "hs_latest_sequence_enrolled_date",
          operator: "LTE",
          value: options.endDate,
        });
      }

      // Filter by specific sequence
      if (options?.sequenceId) {
        filters.push({
          propertyName: "hs_latest_sequence_enrolled",
          operator: "EQ",
          value: options.sequenceId,
        });
      }

      // Filter by owner
      if (options?.ownerId) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: options.ownerId,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: [
          "email",
          "firstname",
          "lastname",
          "hubspot_owner_id",
          "hs_sequences_is_enrolled",
          "hs_sequences_actively_enrolled_count",
          "hs_sequences_enrolled_count",
          "hs_latest_sequence_enrolled",
          "hs_latest_sequence_enrolled_date",
          "hs_email_replied",
          "hs_email_last_reply_date",
          "hs_sales_email_last_replied",
          "num_associated_deals",
          "recent_deal_amount",
        ],
        limit: 100,
      };

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotContact[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/contacts/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allContacts.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      // Safety limit per query (increased from 5000)
      if (allContacts.length > 10000) {
        console.warn("Reached 10,000 contact limit for sequence enrollments");
        break;
      }
    }

    return allContacts;
  }

  // Get contacts enrolled in sequences by multiple owners (fetches per-owner to avoid limits)
  async getSequenceEnrollmentsByOwners(
    ownerIds: string[],
    options?: {
      activeOnly?: boolean;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<HubSpotContact[]> {
    // If no specific owners, use the regular method
    if (ownerIds.length === 0) {
      return this.getSequenceEnrollments(options);
    }

    // Fetch enrollments per owner to avoid hitting the 5k/10k limit
    const allContacts: HubSpotContact[] = [];
    const seenContactIds = new Set<string>();

    for (let i = 0; i < ownerIds.length; i++) {
      const ownerId = ownerIds[i];

      // Add delay between owner fetches to avoid rate limits
      if (i > 0) {
        await this.delay(200);
      }

      const ownerContacts = await this.getSequenceEnrollments({
        ...options,
        ownerId,
      });

      // Dedupe by contact ID (in case a contact somehow appears for multiple owners)
      for (const contact of ownerContacts) {
        if (!seenContactIds.has(contact.id)) {
          seenContactIds.add(contact.id);
          allContacts.push(contact);
        }
      }
    }

    return allContacts;
  }

  // Get meetings with associations
  async getMeetingsWithDetails(options?: {
    ownerId?: string;
    ownerIds?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotMeeting[]> {
    const allMeetings: HubSpotMeeting[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value: string }> = [];

      if (options?.ownerIds && options.ownerIds.length > 0) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "IN",
          values: options.ownerIds,
        });
      } else if (options?.ownerId) {
        filters.push({
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: options.ownerId,
        });
      }

      if (options?.startDate) {
        filters.push({
          propertyName: "hs_meeting_start_time",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "hs_meeting_start_time",
          operator: "LTE",
          value: options.endDate,
        });
      }

      const body: Record<string, unknown> = {
        properties: [
          "hs_timestamp",
          "hs_meeting_title",
          "hs_meeting_outcome",
          "hs_meeting_start_time",
          "hs_meeting_end_time",
          "hubspot_owner_id",
          "hs_activity_type",
          "hs_analytics_source",
          "hs_analytics_source_data_1",
          "hs_analytics_source_data_2",
          "hs_engagement_id",
        ],
        limit: 100,
      };

      // Only add filterGroups if we have filters
      if (filters.length > 0) {
        body.filterGroups = [{ filters }];
      }

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotMeeting[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/meetings/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allMeetings.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allMeetings.length > 2000) {
        break;
      }
    }

    return allMeetings;
  }

  async getMeetingById(
    meetingId: string,
    properties?: string[]
  ): Promise<HubSpotMeeting> {
    const params = new URLSearchParams();
    if (properties && properties.length > 0) {
      params.set("properties", properties.join(","));
    }
    const query = params.toString();
    return this.fetch(
      `/crm/v3/objects/meetings/${meetingId}${query ? `?${query}` : ""}`
    );
  }

  // Get deals by owner with source data
  async getDealsByOwner(ownerId: string, options?: {
    pipelineId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<HubSpotDeal[]> {
    const allDeals: HubSpotDeal[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const filters: Array<{ propertyName: string; operator: string; value: string }> = [
        {
          propertyName: "hubspot_owner_id",
          operator: "EQ",
          value: ownerId,
        },
      ];

      if (options?.pipelineId) {
        filters.push({
          propertyName: "pipeline",
          operator: "EQ",
          value: options.pipelineId,
        });
      }

      if (options?.startDate) {
        filters.push({
          propertyName: "createdate",
          operator: "GTE",
          value: options.startDate,
        });
      }

      if (options?.endDate) {
        filters.push({
          propertyName: "createdate",
          operator: "LTE",
          value: options.endDate,
        });
      }

      const body: Record<string, unknown> = {
        filterGroups: [{ filters }],
        properties: [
          "dealname",
          "amount",
          "dealstage",
          "pipeline",
          "closedate",
          "createdate",
          "hubspot_owner_id",
          "hs_analytics_source",
          "hs_analytics_source_data_1",
          "hs_analytics_source_data_2",
        ],
        limit: 100,
      };

      if (after) {
        body.after = after;
      }

      const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
        `/crm/v3/objects/deals/search`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      allDeals.push(...response.results);

      if (response.paging?.next?.after) {
        after = response.paging.next.after;
      } else {
        hasMore = false;
      }

      if (allDeals.length > 5000) {
        break;
      }
    }

    return allDeals;
  }

  // Helper to add delay between API calls to avoid rate limits
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get deals for multiple owners with date filtering
  async getDealsForOwners(
    ownerIds: string[],
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<HubSpotDeal[]> {
    const allDeals: HubSpotDeal[] = [];
    const seenDealIds = new Set<string>();

    // If no specific owners and no date filters, return empty - too expensive to fetch all
    if (ownerIds.length === 0 && !options?.startDate && !options?.endDate) {
      return [];
    }

    // If no specific owners but have date filters, fetch all deals with date filter
    if (ownerIds.length === 0) {
      let after: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const filters: Array<{ propertyName: string; operator: string; value: string }> = [];

        if (options?.startDate) {
          filters.push({
            propertyName: "createdate",
            operator: "GTE",
            value: options.startDate,
          });
        }

        if (options?.endDate) {
          filters.push({
            propertyName: "createdate",
            operator: "LTE",
            value: options.endDate,
          });
        }

        const body: Record<string, unknown> = {
          filterGroups: [{ filters }],
          properties: [
            "dealname",
            "amount",
            "dealstage",
            "pipeline",
            "closedate",
            "createdate",
            "hubspot_owner_id",
          ],
          limit: 100,
        };

        if (after) {
          body.after = after;
        }

        const response = await this.fetch<{ results: HubSpotDeal[]; paging?: { next?: { after: string } } }>(
          `/crm/v3/objects/deals/search`,
          {
            method: "POST",
            body: JSON.stringify(body),
          }
        );

        allDeals.push(...response.results);

        if (response.paging?.next?.after) {
          after = response.paging.next.after;
        } else {
          hasMore = false;
        }

        if (allDeals.length > 10000) break;
      }

      return allDeals;
    }

    // Fetch deals per owner with delay to avoid rate limits
    for (let i = 0; i < ownerIds.length; i++) {
      const ownerId = ownerIds[i];

      // Add delay between owner fetches to avoid rate limits
      if (i > 0) {
        await this.delay(200);
      }

      const ownerDeals = await this.getDealsByOwner(ownerId, {
        startDate: options?.startDate,
        endDate: options?.endDate,
      });

      for (const deal of ownerDeals) {
        if (!seenDealIds.has(deal.id)) {
          seenDealIds.add(deal.id);
          allDeals.push(deal);
        }
      }
    }

    return allDeals;
  }

  // Comprehensive campaign data fetch
  async getCampaignData(options?: {
    ownerIds?: string[];  // Changed from ownerId to ownerIds array
    activeOnly?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<CampaignData> {
    // Get owners first
    const owners = await this.getOwners();

    // Get sequences
    const firstOwner = owners.results[0];
    const sequences = await this.getSequences(firstOwner?.userId?.toString() || firstOwner?.id);

    // Get pipelines for stage names (needed for won/lost identification)
    const pipelines = await this.getPipelines();

    // Identify won/lost stages from pipeline config
    const wonStages = new Set<string>();
    const lostStages = new Set<string>();
    pipelines.results.forEach((pipeline) => {
      pipeline.stages.forEach((stage) => {
        const stageLower = stage.id.toLowerCase();
        const labelLower = stage.label.toLowerCase();
        if (stageLower.includes("won") || labelLower.includes("won")) {
          wonStages.add(stage.id);
        }
        if (stageLower.includes("lost") || labelLower.includes("lost")) {
          lostStages.add(stage.id);
        }
      });
    });

    // Get enrolled contacts - use per-owner fetching to avoid 5k limit
    const enrollments = await this.getSequenceEnrollmentsByOwners(
      options?.ownerIds || [],
      {
        activeOnly: options?.activeOnly,
        startDate: options?.startDate,
        endDate: options?.endDate,
      }
    );

    // Get deals for selected owners
    const deals = await this.getDealsForOwners(
      options?.ownerIds || [],
      {
        startDate: options?.startDate,
        endDate: options?.endDate,
      }
    );

    // Calculate deal stats
    let dealsWon = 0;
    let dealsWonValue = 0;
    let dealsLost = 0;

    deals.forEach((deal) => {
      const stage = deal.properties.dealstage;
      if (wonStages.has(stage)) {
        dealsWon++;
        dealsWonValue += parseFloat(deal.properties.amount || "0") || 0;
      } else if (lostStages.has(stage)) {
        dealsLost++;
      }
    });

    // Get meetings - limit to recent ones to avoid timeout
    const meetings = await this.getMeetingsWithDetails({
      startDate: options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Default to last 90 days
      endDate: options?.endDate,
    });

    // Filter meetings by owner if needed
    const filteredMeetings = options?.ownerIds && options.ownerIds.length > 0
      ? meetings.filter((m) => m.properties.hubspot_owner_id && options.ownerIds!.includes(m.properties.hubspot_owner_id))
      : meetings;

    // Aggregate data by sequence
    const sequenceStats = new Map<string, SequenceStats>();

    // Initialize stats for each sequence
    sequences.results.forEach((seq) => {
      sequenceStats.set(seq.id, {
        id: seq.id,
        name: seq.name,
        userId: seq.userId,
        activeEnrollees: 0,
        totalEnrollees: 0,
        replies: 0,
        dealsCreated: 0,
        dealsValue: 0,
        dealsWon: 0,
        dealsWonValue: 0,
        dealsLost: 0,
        meetingsBooked: 0,
      });
    });

    // Count enrollees per sequence
    enrollments.forEach((contact) => {
      const seqId = contact.properties.hs_latest_sequence_enrolled;
      if (seqId && sequenceStats.has(seqId)) {
        const stats = sequenceStats.get(seqId)!;
        stats.totalEnrollees++;
        if (parseInt(contact.properties.hs_sequences_actively_enrolled_count || "0") > 0) {
          stats.activeEnrollees++;
        }
        if (contact.properties.hs_email_replied === "true" || contact.properties.hs_sales_email_last_replied) {
          stats.replies++;
        }
        if (parseInt(contact.properties.num_associated_deals || "0") > 0) {
          stats.dealsCreated++;
          stats.dealsValue += parseFloat(contact.properties.recent_deal_amount || "0") || 0;
        }
      }
    });

    // Count meetings by owner
    const meetingsByOwner = new Map<string, number>();
    const meetingOutcomes = new Map<string, number>();

    filteredMeetings.forEach((meeting) => {
      const ownerId = meeting.properties.hubspot_owner_id;
      if (ownerId) {
        meetingsByOwner.set(ownerId, (meetingsByOwner.get(ownerId) || 0) + 1);
      }
      const outcome = meeting.properties.hs_meeting_outcome || "No Outcome";
      meetingOutcomes.set(outcome, (meetingOutcomes.get(outcome) || 0) + 1);
    });

    return {
      sequences: Array.from(sequenceStats.values()),
      enrollments: {
        total: enrollments.length,
        active: enrollments.filter((c) => parseInt(c.properties.hs_sequences_actively_enrolled_count || "0") > 0).length,
        replied: enrollments.filter((c) => c.properties.hs_email_replied === "true" || c.properties.hs_sales_email_last_replied).length,
      },
      meetings: {
        total: filteredMeetings.length,
        byOwner: Object.fromEntries(meetingsByOwner),
        byOutcome: Object.fromEntries(meetingOutcomes),
      },
      deals: {
        created: deals.length,
        won: dealsWon,
        wonValue: dealsWonValue,
        lost: dealsLost,
      },
      owners: owners.results,
      pipelines: pipelines.results,
    };
  }
}

// Get client using the Private App token from env
export function getHubSpotClient(): HubSpotClient | null {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;
  return new HubSpotClient(token);
}
