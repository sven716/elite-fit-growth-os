import assert from "node:assert/strict";
import test from "node:test";
import {
  detectExceptionTasks,
  exceptionDueDate,
  type ExceptionInputs,
} from "../src/lib/automation-exceptions.ts";

const now = new Date("2026-10-23T05:00:00.000Z");
const recent = "2026-10-23T04:00:00.000Z";

function healthyInputs(overrides: Partial<ExceptionInputs> = {}): ExceptionInputs {
  return {
    now,
    integrations: [
      "instagram",
      "ghl",
      "moneybird",
      "google_analytics",
      "google_calendar",
      "fathom",
    ].map((source) => ({ source, status: "ok", last_completed_at: recent, message: null })),
    finance: { overdue_count: 0, last_synced_at: recent },
    sales: {
      unattributed_opportunities: 0,
      unread_conversations: 0,
      last_synced_at: recent,
    },
    content: [],
    coaching: { activeClientIds: [], latestReviewByClient: {} },
    ...overrides,
  };
}

test("een gezonde situatie maakt geen werk aan", () => {
  assert.deepEqual(detectExceptionTasks(healthyInputs()), []);
});

test("afwijkingen worden één keer naar het juiste werkgebied gestuurd", () => {
  const tasks = detectExceptionTasks(
    healthyInputs({
      finance: { overdue_count: 2, last_synced_at: recent },
      sales: {
        unattributed_opportunities: 3,
        unread_conversations: 1,
        last_synced_at: recent,
      },
      content: [
        {
          status: "wacht_op_goedkeuring",
          created_at: recent,
          approved_at: null,
          scheduled_for: null,
          external_url: null,
        },
      ],
      coaching: {
        activeClientIds: ["klant-1"],
        latestReviewByClient: { "klant-1": "2026-09-01T00:00:00.000Z" },
      },
    }),
  );

  assert.equal(new Set(tasks.map((task) => task.sourceRef)).size, tasks.length);
  assert.deepEqual(
    tasks.map((task) => [task.sourceRef, task.area]),
    [
      ["automation:coaching:reviews-overdue", "coaching"],
      ["automation:content:waiting-approval", "content"],
      ["automation:finance:overdue-invoices", "administratie"],
      ["automation:sales:unattributed-opportunities", "sales"],
      ["automation:sales:unread-conversations", "sales"],
    ],
  );
});

test("ontbrekende of verouderde koppelingen worden zichtbaar", () => {
  const inputs = healthyInputs();
  inputs.integrations = inputs.integrations
    .filter((status) => status.source !== "fathom")
    .map((status) =>
      status.source === "ghl"
        ? { ...status, last_completed_at: "2026-10-20T00:00:00.000Z" }
        : status,
    );

  const refs = detectExceptionTasks(inputs).map((task) => task.sourceRef);
  assert.deepEqual(refs, [
    "automation:integration:fathom",
    "automation:integration:ghl",
  ]);
});

test("goedgekeurde content krijgt pas na twee dagen een planningsactie", () => {
  const fresh = detectExceptionTasks(
    healthyInputs({
      content: [
        {
          status: "goedgekeurd",
          created_at: recent,
          approved_at: recent,
          scheduled_for: null,
          external_url: null,
        },
      ],
    }),
  );
  assert.equal(fresh.length, 0);

  const old = detectExceptionTasks(
    healthyInputs({
      content: [
        {
          status: "goedgekeurd",
          created_at: "2026-10-18T00:00:00.000Z",
          approved_at: "2026-10-19T00:00:00.000Z",
          scheduled_for: null,
          external_url: null,
        },
      ],
    }),
  );
  assert.equal(old[0]?.sourceRef, "automation:content:approved-unscheduled");
});

test("deadline gebruikt de Nederlandse bedrijfsdatum", () => {
  assert.equal(exceptionDueDate(now), "2026-10-23");
});
