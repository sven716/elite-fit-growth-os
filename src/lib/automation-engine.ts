import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  detectExceptionTasks,
  exceptionDueDate,
  type ContentAssetInput,
  type FinanceSnapshotInput,
  type IntegrationStatusInput,
  type SalesSnapshotInput,
} from "@/lib/automation-exceptions";
import { GHL_USER_ID } from "@/lib/ghl";

const WORKFLOW = "exception-engine";

type QueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

function assertQuery<T>(name: string, result: QueryResult<T>): T {
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${name}: geen resultaat ontvangen.`);
  return result.data;
}

export async function refreshAutomationExceptions() {
  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      user_id: GHL_USER_ID,
      workflow: WORKFLOW,
      status: "gestart",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(`Automatiseringslog kon niet starten: ${runError?.message ?? "onbekende fout"}`);
  }

  try {
    const [integrationsResult, financeResult, salesResult, contentResult, clientsResult, reviewsResult, openTasksResult] =
      await Promise.all([
        supabase
          .from("integration_sync_status")
          .select("source,status,last_completed_at,message")
          .eq("user_id", GHL_USER_ID),
        supabase
          .from("finance_snapshots")
          .select("overdue_count,last_synced_at")
          .eq("user_id", GHL_USER_ID)
          .order("last_synced_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("marketing_funnel_snapshots")
          .select("unattributed_opportunities,unread_conversations,last_synced_at")
          .eq("user_id", GHL_USER_ID)
          .order("last_synced_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("content_assets")
          .select("status,created_at,approved_at,scheduled_for,external_url")
          .eq("user_id", GHL_USER_ID)
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("clients")
          .select("id")
          .eq("user_id", GHL_USER_ID)
          .eq("status", "actief"),
        supabase
          .from("gainz_reviews")
          .select("client_id,created_at")
          .eq("user_id", GHL_USER_ID)
          .order("created_at", { ascending: false }),
        supabase
          .from("tasks")
          .select("id,source_ref,status")
          .eq("user_id", GHL_USER_ID)
          .eq("auto_managed", true),
      ]);

    const integrations = assertQuery(
      "Synchronisatiestatus",
      integrationsResult,
    ) as IntegrationStatusInput[];
    if (financeResult.error) throw new Error(`Financiën: ${financeResult.error.message}`);
    if (salesResult.error) throw new Error(`Sales: ${salesResult.error.message}`);
    const content = assertQuery("Content", contentResult) as ContentAssetInput[];
    const clients = assertQuery("Klanten", clientsResult) as { id: string }[];
    const reviews = assertQuery("Reviews", reviewsResult) as { client_id: string; created_at: string }[];
    const openManagedTasks = assertQuery("Automatische taken", openTasksResult) as {
      id: string;
      source_ref: string | null;
      status: string;
    }[];

    const latestReviewByClient: Record<string, string | null> = {};
    for (const review of reviews) {
      if (!(review.client_id in latestReviewByClient)) {
        latestReviewByClient[review.client_id] = review.created_at;
      }
    }

    const specs = detectExceptionTasks({
      integrations,
      finance: (financeResult.data ?? null) as FinanceSnapshotInput,
      sales: (salesResult.data ?? null) as SalesSnapshotInput,
      content,
      coaching: {
        activeClientIds: clients.map((client) => client.id),
        latestReviewByClient,
      },
    });

    const now = new Date().toISOString();
    const dueDate = exceptionDueDate();
    const existingByRef = new Map(
      openManagedTasks
        .filter((task) => task.source_ref)
        .map((task) => [task.source_ref as string, task]),
    );

    if (specs.length > 0) {
      const { error } = await supabase.from("tasks").upsert(
        specs.map((spec) => ({
          user_id: GHL_USER_ID,
          title: spec.title,
          description: spec.description,
          due_date: dueDate,
          category: "opvolgen",
          status: "open",
          priority: spec.priority,
          area: spec.area,
          source: "automation",
          source_ref: spec.sourceRef,
          action_url: spec.actionUrl,
          auto_managed: true,
          detected_at: existingByRef.has(spec.sourceRef) ? undefined : now,
          last_seen_at: now,
          done_at: null,
        })),
        { onConflict: "user_id,source_ref" },
      );
      if (error) throw new Error(`Automatische taken bijwerken: ${error.message}`);
    }

    const activeRefs = new Set(specs.map((spec) => spec.sourceRef));
    const resolvedIds = openManagedTasks
      .filter((task) => task.status === "open" && task.source_ref && !activeRefs.has(task.source_ref))
      .map((task) => task.id);

    if (resolvedIds.length > 0) {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "klaar", done_at: now })
        .in("id", resolvedIds);
      if (error) throw new Error(`Opgeloste taken afsluiten: ${error.message}`);
    }

    const createdCount = specs.filter((spec) => !existingByRef.has(spec.sourceRef)).length;
    const { error: finishError } = await supabase
      .from("automation_runs")
      .update({
        status: "geslaagd",
        detected_count: specs.length,
        created_count: createdCount,
        resolved_count: resolvedIds.length,
        completed_at: now,
        metadata: { active_source_refs: specs.map((spec) => spec.sourceRef) },
      })
      .eq("id", run.id);
    if (finishError) throw new Error(`Automatiseringslog afronden: ${finishError.message}`);

    return {
      runId: run.id as string,
      detected: specs.length,
      created: createdCount,
      resolved: resolvedIds.length,
      activeSourceRefs: specs.map((spec) => spec.sourceRef),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    await supabase
      .from("automation_runs")
      .update({
        status: "fout",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}
