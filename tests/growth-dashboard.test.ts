import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateInstagramTotals,
  captionTitle,
  formatMetric,
  isSyncStale,
  type InstagramMediaPerformance,
} from "../src/lib/growth-dashboard.ts";

function post(overrides: Partial<InstagramMediaPerformance> = {}): InstagramMediaPerformance {
  return {
    id: "row-1",
    external_media_id: "media-1",
    caption: "Eerste regel\nTweede regel",
    media_type: "VIDEO",
    media_product_type: "REELS",
    permalink: null,
    thumbnail_url: null,
    published_at: "2026-09-29T10:00:00Z",
    views: 100,
    reach: 80,
    likes: 10,
    comments: 2,
    saved: 3,
    shares: 4,
    total_interactions: 19,
    total_watch_time_ms: 1_000,
    avg_watch_time_ms: 500,
    replies: null,
    follows: null,
    profile_visits: null,
    navigation: null,
    trigger_key: null,
    leads: null,
    email_leads: null,
    booked_calls: null,
    held_calls: null,
    won_customers: null,
    last_synced_at: "2026-09-29T12:00:00Z",
    ...overrides,
  };
}

test("telt bekende Instagram-statistieken op zonder onbekend als nul te presenteren", () => {
  const totals = aggregateInstagramTotals([
    post(),
    post({ id: "row-2", views: 50, reach: null, leads: 2, email_leads: 1 }),
  ]);

  assert.equal(totals.posts, 2);
  assert.equal(totals.views, 150);
  assert.equal(totals.reach, 80);
  assert.equal(totals.leads, 2);
  assert.equal(totals.emailLeads, 1);
  assert.equal(totals.bookedCalls, null);
  assert.equal(totals.attributedPosts, 1);
});

test("toont een streepje voor ontbrekende waarden", () => {
  assert.equal(formatMetric(null), "—");
  assert.equal(formatMetric(0), "0");
});

test("gebruikt de eerste niet-lege captionregel als titel", () => {
  assert.equal(captionTitle("\n\nEerste zin\nTweede zin"), "Eerste zin");
  assert.equal(captionTitle(null), "Instagram-post");
});

test("markeert een synchronisatie ouder dan 48 uur als verouderd", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  assert.equal(isSyncStale("2026-09-28T12:01:00Z", now), false);
  assert.equal(isSyncStale("2026-09-27T11:59:00Z", now), true);
  assert.equal(isSyncStale(null, now), true);
});
