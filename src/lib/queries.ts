import { createClient } from "@/lib/supabase/server";
import {
  currentMonthPeriod,
  currentYearPeriod,
  today,
} from "@/lib/dates";
import { computeStreak, shiftDays } from "@/lib/streak";
import {
  aggregateInstagramTotals,
  type InstagramMediaPerformance,
  type MarketingFunnelSnapshot,
} from "@/lib/growth-dashboard";

export type Goal = {
  id: string;
  type: "jaar" | "maand";
  period: string;
  title: string;
  metric: "omzet" | "klanten";
  target: number;
  current: number;
};

export type Task = {
  id: string;
  title: string;
  status: "open" | "klaar";
  due_date: string | null;
  category: "todo" | "opvolgen";
  source: "handmatig" | "plaud" | "fathom" | "ghl";
  project_id: string | null;
};

export type UpcomingEvent = {
  id: string;
  name: string;
  event_date: string;
};

export type CoachNote = {
  date: string;
  reflection: string | null;
  wins: string | null;
  misses: string | null;
  advice: string | null;
};

/** Alles wat de Cockpit nodig heeft, in één keer opgehaald. */
export async function getCockpitData() {
  const supabase = await createClient();
  const month = currentMonthPeriod();
  const year = currentYearPeriod();
  const day = today();

  const [
    activationsRes,
    coachRes,
    metricsRes,
    goalsRes,
    tasksRes,
    actionsRes,
    checkinsRes,
    eventsRes,
    clientsRes,
  ] = await Promise.all([
    supabase.from("activations").select("text, sort").order("sort"),
    supabase
      .from("coach_notes")
      .select("date, reflection, wins, misses, advice")
      .eq("date", day)
      .maybeSingle(),
    supabase
      .from("metrics")
      .select("metric, period, value, synced_at")
      .in("period", [month, year]),
    supabase
      .from("goals")
      .select("id, type, period, title, metric, target, current")
      .in("period", [month, year]),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, category, source, project_id")
      .eq("status", "open")
      .lte("due_date", day)
      .order("due_date"),
    supabase
      .from("daily_actions")
      .select("id, title, sort")
      .eq("active", true)
      .order("sort"),
    supabase.from("daily_checkins").select("daily_action_id").eq("date", day),
    supabase
      .from("projects")
      .select("id, name, event_date")
      .eq("kind", "event")
      .gte("event_date", day)
      .order("event_date")
      .limit(3),
    supabase
      .from("clients")
      .select("id")
      .gte("start_date", `${month}-01`)
      .lte("start_date", day),
  ]);

  const activations = activationsRes.data ?? [];
  const goals = (goalsRes.data ?? []) as Goal[];
  const metrics = metricsRes.data ?? [];
  const checkedIds = new Set(
    (checkinsRes.data ?? []).map((c) => c.daily_action_id),
  );

  // Activatie roteert deterministisch op de dag van het jaar.
  const dayOfYear = Math.floor(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${year}-01-01T00:00:00Z`)) /
      86_400_000,
  );
  const activation =
    activations.length > 0
      ? activations[dayOfYear % activations.length].text
      : null;

  const metricValue = (metric: string, period: string) =>
    metrics.find((m) => m.metric === metric && m.period === period)?.value ??
    null;

  const goalFor = (metric: string, type: "jaar" | "maand") =>
    goals.find((g) => g.metric === metric && g.type === type) ?? null;

  return {
    activation,
    coachNote: (coachRes.data ?? null) as CoachNote | null,
    revenue: {
      month: metricValue("omzet", month),
      year: metricValue("omzet", year),
      monthGoal: goalFor("omzet", "maand"),
      yearGoal: goalFor("omzet", "jaar"),
    },
    clients: {
      // Nieuwe klanten houdt Sven zelf bij — Moneybird-facturen zeggen alleen
      // iets over wanneer er gefactureerd is, niet wanneer iemand start.
      month: (clientsRes.data ?? []).length,
      monthGoal: goalFor("klanten", "maand"),
    },
    todayTasks: (tasksRes.data ?? []) as Task[],
    dailyActions: (actionsRes.data ?? []).map((a) => ({
      ...a,
      done: checkedIds.has(a.id),
    })),
    upcomingEvents: (eventsRes.data ?? []) as UpcomingEvent[],
  };
}

/* ---------- Doelen ---------- */

export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  auto_source: string | null;
};

export async function getGoalsPage() {
  const supabase = await createClient();

  const [settingsRes, goalsRes, milestonesRes] = await Promise.all([
    supabase.from("settings").select("vision").maybeSingle(),
    supabase
      .from("goals")
      .select("id, type, period, title, metric, target, current")
      .order("type")
      .order("period", { ascending: false }),
    supabase
      .from("milestones")
      .select("id, goal_id, title, done, due_date, auto_source")
      .order("done")
      .order("due_date", { nullsFirst: false }),
  ]);

  return {
    vision: settingsRes.data?.vision ?? "",
    goals: (goalsRes.data ?? []) as Goal[],
    milestones: (milestonesRes.data ?? []) as Milestone[],
  };
}

/* ---------- Projecten ---------- */

export type Project = {
  id: string;
  name: string;
  kind: "doorlopend" | "event";
  event_date: string | null;
  status: string;
  description: string | null;
};

export async function getProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, kind, event_date, status, description")
    .order("event_date", { nullsFirst: false })
    .order("name");

  const projects = (data ?? []) as Project[];
  return {
    doorlopend: projects.filter((p) => p.kind === "doorlopend"),
    events: projects
      .filter((p) => p.kind === "event")
      .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? "")),
  };
}

export type ProjectEmail = {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string | null;
  snippet: string | null;
  last_date: string | null;
  message_count: number | null;
  needs_reply: boolean | null;
};

export async function getProject(id: string) {
  const supabase = await createClient();

  const [projectRes, contactsRes, tasksRes, emailsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, kind, event_date, status, description")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("project_contacts")
      .select("id, name, company, email, role, notes")
      .eq("project_id", id)
      .order("name"),
    supabase
      .from("tasks")
      .select("id, title, status, due_date, category, source, project_id")
      .eq("project_id", id)
      .order("status")
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("project_emails")
      .select(
        "id, thread_id, subject, participants, snippet, last_date, message_count, needs_reply",
      )
      .eq("project_id", id)
      .order("last_date", { ascending: false }),
  ]);

  return {
    project: (projectRes.data ?? null) as Project | null,
    contacts: contactsRes.data ?? [],
    tasks: (tasksRes.data ?? []) as Task[],
    emails: (emailsRes.data ?? []) as ProjectEmail[],
  };
}

/* ---------- Taken ---------- */

export async function getTasksGrouped() {
  const supabase = await createClient();
  const day = today();

  const [tasksRes, projectsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, status, due_date, category, source, project_id")
      .order("status")
      .order("due_date", { nullsFirst: false }),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  const tasks = (tasksRes.data ?? []) as Task[];
  const projects = projectsRes.data ?? [];
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const open = tasks.filter((t) => t.status === "open");

  return {
    vandaag: open.filter(
      (t) => t.category === "todo" && t.due_date !== null && t.due_date <= day,
    ),
    opvolgen: open.filter((t) => t.category === "opvolgen"),
    overig: open.filter(
      (t) =>
        t.category === "todo" && (t.due_date === null || t.due_date > day),
    ),
    klaar: tasks.filter((t) => t.status === "klaar").slice(0, 10),
    projects,
    projectName,
  };
}

/* ---------- Winnaarsformule ---------- */

export async function getDailyFormula() {
  const supabase = await createClient();
  const day = today();

  const [actionsRes, checkinsRes] = await Promise.all([
    supabase
      .from("daily_actions")
      .select("id, title, sort")
      .eq("active", true)
      .order("sort"),
    supabase
      .from("daily_checkins")
      .select("daily_action_id, date")
      .gte("date", shiftDays(day, -60)),
  ]);

  const actions = actionsRes.data ?? [];
  const checkins = checkinsRes.data ?? [];

  return {
    today: day,
    actions: actions.map((a) => {
      const dates = checkins
        .filter((c) => c.daily_action_id === a.id)
        .map((c) => c.date as string);
      return {
        ...a,
        done: dates.includes(day),
        dates,
        streak: computeStreak(dates, day),
      };
    }),
  };
}

/* ---------- Groei: Instagram + GHL ---------- */

export async function getGrowthDashboardData() {
  const supabase = await createClient();

  const [mediaRes, funnelRes] = await Promise.all([
    supabase
      .from("instagram_media_performance")
      .select(
        "id, external_media_id, caption, media_type, media_product_type, permalink, thumbnail_url, published_at, views, reach, likes, comments, saved, shares, total_interactions, total_watch_time_ms, avg_watch_time_ms, replies, follows, profile_visits, navigation, trigger_key, leads, email_leads, booked_calls, held_calls, won_customers, last_synced_at",
      )
      .order("published_at", { ascending: false })
      .limit(120),
    supabase
      .from("marketing_funnel_snapshots")
      .select(
        "id, snapshot_date, period_start, period_end, contacts_total, contacts_with_email, contacts_with_source, instagram_sourced_contacts, opportunities_total, open_opportunities, won_opportunities, booked_calls, held_calls, confirmed_customer_starts, attributed_opportunities, unattributed_opportunities, unread_conversations, last_synced_at",
      )
      .order("snapshot_date", { ascending: false })
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const posts = (mediaRes.data ?? []) as InstagramMediaPerformance[];
  const funnel = (funnelRes.data ?? null) as MarketingFunnelSnapshot | null;
  const latestMediaSync = posts
    .map((post) => post.last_synced_at)
    .sort()
    .at(-1);

  return {
    posts,
    totals: aggregateInstagramTotals(posts),
    funnel,
    lastSyncedAt:
      [latestMediaSync, funnel?.last_synced_at]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null,
    errors: [mediaRes.error?.message, funnelRes.error?.message].filter(
      (value): value is string => Boolean(value),
    ),
  };
}
