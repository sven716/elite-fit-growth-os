export type InstagramMediaPerformance = {
  id: string;
  external_media_id: string;
  caption: string | null;
  media_type: string | null;
  media_product_type: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  published_at: string;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  total_interactions: number | null;
  total_watch_time_ms: number | null;
  avg_watch_time_ms: number | null;
  replies: number | null;
  follows: number | null;
  profile_visits: number | null;
  navigation: Record<string, number> | null;
  trigger_key: string | null;
  leads: number | null;
  email_leads: number | null;
  booked_calls: number | null;
  held_calls: number | null;
  won_customers: number | null;
  last_synced_at: string;
};

export type MarketingFunnelSnapshot = {
  id: string;
  snapshot_date: string;
  period_start: string;
  period_end: string;
  contacts_total: number;
  contacts_with_email: number;
  contacts_with_source: number;
  instagram_sourced_contacts: number;
  opportunities_total: number;
  open_opportunities: number;
  won_opportunities: number;
  booked_calls: number;
  held_calls: number;
  confirmed_customer_starts: number;
  attributed_opportunities: number;
  unattributed_opportunities: number;
  unread_conversations: number | null;
  last_synced_at: string;
};

export type InstagramTotals = {
  posts: number;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  interactions: number | null;
  leads: number | null;
  emailLeads: number | null;
  bookedCalls: number | null;
  heldCalls: number | null;
  customers: number | null;
  attributedPosts: number;
};

function sumKnown(
  rows: InstagramMediaPerformance[],
  key: keyof InstagramMediaPerformance,
): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number");
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}

export function aggregateInstagramTotals(
  rows: InstagramMediaPerformance[],
): InstagramTotals {
  return {
    posts: rows.length,
    views: sumKnown(rows, "views"),
    reach: sumKnown(rows, "reach"),
    likes: sumKnown(rows, "likes"),
    comments: sumKnown(rows, "comments"),
    saved: sumKnown(rows, "saved"),
    shares: sumKnown(rows, "shares"),
    interactions: sumKnown(rows, "total_interactions"),
    leads: sumKnown(rows, "leads"),
    emailLeads: sumKnown(rows, "email_leads"),
    bookedCalls: sumKnown(rows, "booked_calls"),
    heldCalls: sumKnown(rows, "held_calls"),
    customers: sumKnown(rows, "won_customers"),
    attributedPosts: rows.filter((row) => row.leads !== null).length,
  };
}

export function formatMetric(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function captionTitle(caption: string | null): string {
  const firstLine = caption?.split(/\r?\n/).find((line) => line.trim())?.trim();
  if (!firstLine) return "Instagram-post";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
}

export function isSyncStale(lastSyncedAt: string | null, now = new Date()): boolean {
  if (!lastSyncedAt) return true;
  const age = now.getTime() - new Date(lastSyncedAt).getTime();
  return !Number.isFinite(age) || age > 48 * 60 * 60 * 1000;
}
