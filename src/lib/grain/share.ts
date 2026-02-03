export function extractGrainShareUrl(meeting: unknown): string | null {
  if (!meeting || typeof meeting !== "object") return null;

  const record = meeting as Record<string, unknown>;
  const keys = [
    "shareUrl",
    "share_url",
    "publicShareUrl",
    "public_share_url",
    "recordingUrl",
    "recording_url",
    "shareLink",
    "share_link",
  ];

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  return null;
}
