import { createClient } from "@/lib/supabase/server";

export type FinanceSnapshot = {
  id: string;
  snapshot_date: string;
  period_start: string;
  period_end: string;
  revenue_invoiced: number;
  revenue_paid: number;
  expenses: number;
  outstanding: number;
  overdue: number;
  margin: number;
  margin_percentage: number | null;
  sales_invoice_count: number;
  purchase_invoice_count: number;
  overdue_count: number;
  last_synced_at: string;
};

export type WebsiteSnapshot = {
  id: string;
  snapshot_date: string;
  period_start: string;
  period_end: string;
  sessions: number;
  active_users: number;
  new_users: number;
  engaged_sessions: number;
  page_views: number;
  event_count: number;
  cta_clicks: number;
  generate_leads: number;
  last_synced_at: string;
};

export type WebsiteBreakdown = {
  id: string;
  dimension_type: "kanaal" | "landingspagina" | "event";
  dimension_value: string;
  sessions: number | null;
  active_users: number | null;
  new_users: number | null;
  engaged_sessions: number | null;
  page_views: number | null;
  event_count: number | null;
};

export type OperationsSnapshot = {
  id: string;
  snapshot_date: string;
  period_start: string;
  period_end: string;
  calendar_events: number;
  business_meetings: number;
  strategy_calls: number;
  coaching_calls: number;
  group_calls: number;
  focus_blocks: number;
  meeting_minutes: number;
  upcoming_7d_events: number;
  upcoming_7d_meeting_minutes: number;
  fathom_meetings: number;
  fathom_crm_matches: number;
  last_synced_at: string;
};

export type IntegrationStatus = {
  id: string;
  source: string;
  status: "ok" | "gedeeltelijk" | "fout";
  last_started_at: string | null;
  last_completed_at: string | null;
  record_count: number | null;
  message: string | null;
};

export type SalesSnapshot = {
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

async function latestRow<T>(table: string, select: string, periodStart?: string) {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select(select)
    .order("last_synced_at", { ascending: false })
    .limit(1);
  if (periodStart) query = query.eq("period_start", periodStart);
  const { data, error } = await query.maybeSingle();
  return { data: (data ?? null) as T | null, error: error?.message ?? null };
}

export async function getFinanceDashboardData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const [monthResult, yearResult] = await Promise.all([
    latestRow<FinanceSnapshot>(
      "finance_snapshots",
      "id,snapshot_date,period_start,period_end,revenue_invoiced,revenue_paid,expenses,outstanding,overdue,margin,margin_percentage,sales_invoice_count,purchase_invoice_count,overdue_count,last_synced_at",
      `${year}-${month}-01`,
    ),
    latestRow<FinanceSnapshot>(
      "finance_snapshots",
      "id,snapshot_date,period_start,period_end,revenue_invoiced,revenue_paid,expenses,outstanding,overdue,margin,margin_percentage,sales_invoice_count,purchase_invoice_count,overdue_count,last_synced_at",
      `${year}-01-01`,
    ),
  ]);
  return {
    month: monthResult.data,
    year: yearResult.data,
    errors: [monthResult.error, yearResult.error].filter((value): value is string => Boolean(value)),
  };
}

export async function getWebsiteDashboardData() {
  const supabase = await createClient();
  const snapshotResult = await latestRow<WebsiteSnapshot>(
    "website_snapshots",
    "id,snapshot_date,period_start,period_end,sessions,active_users,new_users,engaged_sessions,page_views,event_count,cta_clicks,generate_leads,last_synced_at",
  );
  const snapshot = snapshotResult.data;
  if (!snapshot) return { snapshot: null, channels: [], events: [], error: snapshotResult.error };

  const { data, error } = await supabase
    .from("website_breakdowns")
    .select("id,dimension_type,dimension_value,sessions,active_users,new_users,engaged_sessions,page_views,event_count")
    .eq("snapshot_date", snapshot.snapshot_date)
    .eq("period_start", snapshot.period_start)
    .eq("period_end", snapshot.period_end);
  const rows = (data ?? []) as WebsiteBreakdown[];
  return {
    snapshot,
    channels: rows.filter((row) => row.dimension_type === "kanaal").sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0)),
    events: rows.filter((row) => row.dimension_type === "event").sort((a, b) => (b.event_count ?? 0) - (a.event_count ?? 0)),
    error: snapshotResult.error ?? error?.message ?? null,
  };
}

export async function getSalesDashboardData() {
  return latestRow<SalesSnapshot>(
    "marketing_funnel_snapshots",
    "id,snapshot_date,period_start,period_end,contacts_total,contacts_with_email,contacts_with_source,instagram_sourced_contacts,opportunities_total,open_opportunities,won_opportunities,booked_calls,held_calls,confirmed_customer_starts,attributed_opportunities,unattributed_opportunities,unread_conversations,last_synced_at",
  );
}

export async function getOperationsDashboardData() {
  const supabase = await createClient();
  const day = new Date().toISOString().slice(0, 10);
  const monthStart = `${day.slice(0, 7)}-01`;
  const [snapshotResult, statusesResult, tasksResult, clientsResult] = await Promise.all([
    latestRow<OperationsSnapshot>(
      "operations_snapshots",
      "id,snapshot_date,period_start,period_end,calendar_events,business_meetings,strategy_calls,coaching_calls,group_calls,focus_blocks,meeting_minutes,upcoming_7d_events,upcoming_7d_meeting_minutes,fathom_meetings,fathom_crm_matches,last_synced_at",
    ),
    supabase
      .from("integration_sync_status")
      .select("id,source,status,last_started_at,last_completed_at,record_count,message")
      .order("source"),
    supabase.from("tasks").select("id,due_date").eq("status", "open"),
    supabase.from("clients").select("id,start_date,status"),
  ]);
  const openTasks = tasksResult.data ?? [];
  const clients = clientsResult.data ?? [];
  return {
    snapshot: snapshotResult.data,
    statuses: (statusesResult.data ?? []) as IntegrationStatus[],
    taskDebt: {
      open: openTasks.length,
      overdue: openTasks.filter((task) => task.due_date && task.due_date < day).length,
      withoutDate: openTasks.filter((task) => !task.due_date).length,
    },
    clients: {
      active: clients.filter((client) => client.status === "actief").length,
      startedThisMonth: clients.filter((client) => client.start_date && client.start_date >= monthStart).length,
    },
    errors: [
      snapshotResult.error,
      statusesResult.error?.message,
      tasksResult.error?.message,
      clientsResult.error?.message,
    ].filter((value): value is string => Boolean(value)),
  };
}

export async function getIntegrationHealth() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_sync_status")
    .select("source,status,last_completed_at,message")
    .order("source");
  return (data ?? []) as Pick<IntegrationStatus, "source" | "status" | "last_completed_at" | "message">[];
}
