import assert from "node:assert/strict";
import test from "node:test";
import { groupItemsByTimeline } from "../src/lib/task-groups.ts";

const items = [
  { id: "overdue", due_date: "2026-10-22" },
  { id: "today", due_date: "2026-10-23" },
  { id: "week", due_date: "2026-10-30" },
  { id: "later", due_date: "2026-10-31" },
  { id: "none", due_date: null },
];

test("deelt iedere taak precies één keer in", () => {
  const groups = groupItemsByTimeline(items, "2026-10-23");
  const grouped = Object.values(groups).flat();
  assert.equal(grouped.length, items.length);
  assert.equal(new Set(grouped.map((item) => item.id)).size, items.length);
});

test("gebruikt heldere tijdvakken zonder overlap", () => {
  const groups = groupItemsByTimeline(items, "2026-10-23");
  assert.deepEqual(groups.overdue.map((item) => item.id), ["overdue"]);
  assert.deepEqual(groups.today.map((item) => item.id), ["today"]);
  assert.deepEqual(groups.upcoming.map((item) => item.id), ["week"]);
  assert.deepEqual(groups.later.map((item) => item.id), ["later"]);
  assert.deepEqual(groups.withoutDate.map((item) => item.id), ["none"]);
});
