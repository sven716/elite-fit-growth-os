"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates";
import { isWorkArea } from "@/lib/work-areas";

function refreshAll() {
  revalidatePath("/");
  revalidatePath("/doelen");
  revalidatePath("/planning");
  revalidatePath("/projecten");
  revalidatePath("/taken");
  revalidatePath("/winnaarsformule");
  revalidatePath("/klanten");
  revalidatePath("/meer");
  revalidatePath("/meer/gainz-legenda");
  revalidatePath("/meer/gainz-reviewflow");
  revalidatePath("/ideeen");
  revalidatePath("/goedkeuringen");
  revalidatePath("/content");
  revalidatePath("/coaching");
  revalidatePath("/administratie");
  revalidatePath("/operations");
}

/* ---------- Taken ---------- */

export async function toggleTask(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "klaar" : "open",
      done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new Error(`Taak bijwerken mislukt: ${error.message}`);
  refreshAll();
}

export async function setTaskPriority(id: string, priority: "normaal" | "hoog") {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ priority: priority === "hoog" ? "hoog" : "normaal" })
    .eq("id", id);
  refreshAll();
}

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectId = String(formData.get("project_id") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const category = String(formData.get("category") ?? "todo");
  const priority = String(formData.get("priority") ?? "normaal");
  const areaInput = String(formData.get("area") ?? "centraal");
  const area = isWorkArea(areaInput) ? areaInput : "centraal";

  const { error } = await supabase.from("tasks").insert({
    title,
    project_id: projectId || null,
    due_date: dueDate || null,
    category: category === "opvolgen" ? "opvolgen" : "todo",
    priority: priority === "hoog" ? "hoog" : "normaal",
    area,
  });
  if (error) throw new Error(`Taak toevoegen mislukt: ${error.message}`);
  refreshAll();
}

/* ---------- Contentideeën ---------- */

export async function createContentIdea(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const topic = String(formData.get("topic") ?? "")
    .trim()
    .toLocaleLowerCase("nl-NL");
  const format = String(formData.get("format") ?? "")
    .trim()
    .toLocaleLowerCase("nl-NL");
  const funnelStage = String(formData.get("funnel_stage") ?? "tof");
  if (!title || !topic || !format) return;

  await supabase.from("content_ideas").insert({
    title,
    topic,
    format,
    funnel_stage: ["tof", "mof", "bof"].includes(funnelStage)
      ? funnelStage
      : "tof",
    hook: String(formData.get("hook") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    status: "goedgekeurd",
  });
  refreshAll();
}

export async function setContentIdeaStatus(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const allowed = [
    "goedgekeurd",
    "uitwerken",
    "gepland",
    "gepubliceerd",
    "afgekeurd",
  ];
  if (!id || !allowed.includes(status)) return;

  await supabase
    .from("content_ideas")
    .update({
      status,
      selected_at: status === "uitwerken" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  refreshAll();
}

/* ---------- Winnaarsformule ---------- */

export async function toggleCheckin(actionId: string, done: boolean) {
  const supabase = await createClient();
  const day = today();

  if (done) {
    await supabase
      .from("daily_checkins")
      .upsert(
        { daily_action_id: actionId, date: day, done: true },
        { onConflict: "daily_action_id,date" },
      );
  } else {
    await supabase
      .from("daily_checkins")
      .delete()
      .eq("daily_action_id", actionId)
      .eq("date", day);
  }
  refreshAll();
}

export async function addDailyAction(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await supabase.from("daily_actions").insert({ title, sort: 99 });
  refreshAll();
}

export async function deactivateDailyAction(id: string) {
  const supabase = await createClient();
  await supabase.from("daily_actions").update({ active: false }).eq("id", id);
  refreshAll();
}

/* ---------- Doelen ---------- */

export async function setVision(formData: FormData) {
  const supabase = await createClient();
  const vision = String(formData.get("vision") ?? "").trim();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  await supabase
    .from("settings")
    .upsert({ user_id: user.user.id, vision }, { onConflict: "user_id" });
  refreshAll();
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const title = String(formData.get("title") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  const type = String(formData.get("type") ?? "maand");
  const metric = String(formData.get("metric") ?? "omzet");
  const target = Number(formData.get("target") ?? 0);
  if (!title || !period) return;

  await supabase.from("goals").insert({
    title,
    period,
    type: type === "jaar" ? "jaar" : "maand",
    metric: metric === "klanten" ? "klanten" : "omzet",
    target,
  });
  refreshAll();
}

export async function addMilestone(formData: FormData) {
  const supabase = await createClient();
  const goalId = String(formData.get("goal_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!goalId || !title) return;

  const dueDate = String(formData.get("due_date") ?? "");
  await supabase.from("milestones").insert({
    goal_id: goalId,
    title,
    due_date: dueDate || null,
  });
  refreshAll();
}

export async function toggleMilestone(id: string, done: boolean) {
  const supabase = await createClient();
  await supabase.from("milestones").update({ done }).eq("id", id);
  refreshAll();
}

/* ---------- Projecten ---------- */

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const kind = String(formData.get("kind") ?? "doorlopend");
  const eventDate = String(formData.get("event_date") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  await supabase.from("projects").insert({
    name,
    kind: kind === "event" ? "event" : "doorlopend",
    event_date: kind === "event" && eventDate ? eventDate : null,
    description: description || null,
  });
  refreshAll();
}

const PROJECT_TOPIC_TYPES = [
  "algemeen",
  "content_idee",
  "onderzoek",
  "besluit",
  "uitvoering",
] as const;

const PROJECT_BOT_PROFILES = [
  "default",
  "marketing",
  "sales",
  "coaching",
  "operations",
] as const;

export async function createProjectThread(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const initialMessage = String(formData.get("message") ?? "").trim();
  if (!projectId || !title) return;

  const topicInput = String(formData.get("topic_type") ?? "algemeen");
  const topicType = PROJECT_TOPIC_TYPES.includes(
    topicInput as (typeof PROJECT_TOPIC_TYPES)[number],
  )
    ? topicInput
    : "algemeen";
  const profileInput = String(formData.get("bot_profile") ?? "default");
  const botProfile = PROJECT_BOT_PROFILES.includes(
    profileInput as (typeof PROJECT_BOT_PROFILES)[number],
  )
    ? profileInput
    : "default";
  const threadId = randomUUID();
  const linkedContentIdeaId = String(
    formData.get("linked_content_idea_id") ?? "",
  ).trim();

  const { error: threadError } = await supabase.from("project_threads").insert({
    id: threadId,
    project_id: projectId,
    title,
    topic_type: topicType,
    bot_profile: botProfile,
    linked_content_idea_id: linkedContentIdeaId || null,
    hermes_session_name: `growth-os-${projectId}-${threadId}`,
  });
  if (threadError) throw new Error(`Gesprek aanmaken mislukt: ${threadError.message}`);

  if (initialMessage) {
    const { error: messageError } = await supabase.from("project_messages").insert({
      project_id: projectId,
      thread_id: threadId,
      role: "user",
      content: initialMessage,
      status: "pending",
      source_ref: `growth-os:web:${randomUUID()}`,
    });
    if (messageError) {
      throw new Error(`Eerste bericht opslaan mislukt: ${messageError.message}`);
    }
  }

  refreshAll();
  redirect(`/projecten/${projectId}/gesprekken/${threadId}`);
}

export async function createProjectMessage(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const threadId = String(formData.get("thread_id") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!projectId || !threadId || !content) return;

  const { error } = await supabase.from("project_messages").insert({
    project_id: projectId,
    thread_id: threadId,
    role: "user",
    content,
    status: "pending",
    source_ref: `growth-os:web:${randomUUID()}`,
  });
  if (error) throw new Error(`Bericht versturen mislukt: ${error.message}`);

  revalidatePath(`/projecten/${projectId}`);
  revalidatePath(`/projecten/${projectId}/gesprekken/${threadId}`);
}

export async function createProjectItem(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) return;

  const allowed = ["idee", "besluit", "vraag", "voortgang", "bron"];
  const itemTypeInput = String(formData.get("item_type") ?? "voortgang");
  const { error } = await supabase.from("project_items").insert({
    project_id: projectId,
    item_type: allowed.includes(itemTypeInput) ? itemTypeInput : "voortgang",
    title,
    content: String(formData.get("content") ?? "").trim() || null,
    source: "handmatig",
    created_by_profile: "sven",
  });
  if (error) throw new Error(`Projectgeheugen bijwerken mislukt: ${error.message}`);
  revalidatePath(`/projecten/${projectId}`);
}

export async function discussContentIdea(formData: FormData) {
  const supabase = await createClient();
  const ideaId = String(formData.get("idea_id") ?? "").trim();
  if (!ideaId) return;

  const { data: idea, error: ideaError } = await supabase
    .from("content_ideas")
    .select("id, title, topic, format, hook, notes")
    .eq("id", ideaId)
    .single();
  if (ideaError || !idea) throw new Error("Contentidee niet gevonden.");

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;
  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.user.id)
    .ilike("name", "Content")
    .limit(1)
    .maybeSingle();

  if (!project) {
    const result = await supabase
      .from("projects")
      .insert({
        name: "Content",
        kind: "doorlopend",
        description: "Contentideeën, uitwerking en goedgekeurde inhoud.",
      })
      .select("id")
      .single();
    if (result.error) throw new Error(`Contentproject aanmaken mislukt: ${result.error.message}`);
    project = result.data;
  }

  const { data: existing } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", project.id)
    .eq("linked_content_idea_id", idea.id)
    .eq("status", "actief")
    .limit(1)
    .maybeSingle();

  if (existing) redirect(`/projecten/${project.id}/gesprekken/${existing.id}`);

  const threadId = randomUUID();
  const { error: threadError } = await supabase.from("project_threads").insert({
    id: threadId,
    project_id: project.id,
    title: idea.title,
    topic_type: "content_idee",
    bot_profile: "marketing",
    linked_content_idea_id: idea.id,
    hermes_session_name: `growth-os-${project.id}-${threadId}`,
    source_ref: `content-idea:${idea.id}`,
  });
  if (threadError) throw new Error(`Contentgesprek aanmaken mislukt: ${threadError.message}`);

  const details = [
    `Ik wil dit contentidee verder uitwerken: ${idea.title}.`,
    `Onderwerp: ${idea.topic}. Vorm: ${idea.format}.`,
    idea.hook ? `Hook: ${idea.hook}` : null,
    idea.notes ? `Notities: ${idea.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const { error: messageError } = await supabase.from("project_messages").insert({
    project_id: project.id,
    thread_id: threadId,
    role: "user",
    content: details,
    status: "pending",
    source_ref: `content-idea:start:${idea.id}`,
  });
  if (messageError) throw new Error(`Contentidee versturen mislukt: ${messageError.message}`);

  redirect(`/projecten/${project.id}/gesprekken/${threadId}`);
}

export async function ensureContentProject() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", user.user.id)
    .ilike("name", "Content")
    .limit(1)
    .maybeSingle();

  if (!existing) {
    await supabase.from("projects").insert({
      name: "Content",
      kind: "doorlopend",
      description:
        "Goedgekeurde content, assets en losse output die klanten en omzet moeten opleveren.",
    });
  }

  refreshAll();
}

export async function createApprovedContentAsset(formData: FormData) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const projectId = String(formData.get("project_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!projectId || !title) return;

  const assetType = String(formData.get("asset_type") ?? "overig").trim();
  const sourcePath = String(formData.get("source_path") ?? "").trim();
  const previewPath = String(formData.get("preview_path") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const approvedAt = new Date().toISOString();

  await supabase.from("content_assets").insert({
    user_id: user.user.id,
    project_id: projectId,
    task_id: null,
    title,
    asset_type: [
      "reel",
      "carousel",
      "storyset",
      "afbeelding",
      "caption",
      "lead_magnet",
    ].includes(assetType)
      ? assetType
      : "overig",
    status: "goedgekeurd",
    approved_at: approvedAt,
    source_path: sourcePath || null,
    preview_path: previewPath || null,
    external_url: externalUrl || null,
    notes: notes || null,
  });

  refreshAll();
}

/* ---------- Goedkeuringen ---------- */

type ApprovalDecision = "goedgekeurd" | "aanpassen" | "gestopt";

async function decideContentAsset(
  formData: FormData,
  status: ApprovalDecision,
) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const decidedAt = new Date().toISOString();
  const decisionReason = String(formData.get("decision_reason") ?? "").trim();
  const { error } = await supabase
    .from("content_assets")
    .update({
      status,
      decision_reason: decisionReason || null,
      decided_at: decidedAt,
      approved_at: status === "goedgekeurd" ? decidedAt : null,
    })
    .eq("id", id)
    .eq("user_id", user.user.id);

  if (error) throw new Error(`Besluit opslaan mislukt: ${error.message}`);
  revalidatePath("/goedkeuringen");
}

export async function approveContentAsset(formData: FormData) {
  await decideContentAsset(formData, "goedgekeurd");
}

export async function requestContentAssetChanges(formData: FormData) {
  await decideContentAsset(formData, "aanpassen");
}

export async function stopContentAsset(formData: FormData) {
  await decideContentAsset(formData, "gestopt");
}

/* ---------- Aanpassen & verwijderen ---------- */

export async function updateGoal(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const target = Number(formData.get("target") ?? 0);
  if (!id || !title) return;

  await supabase.from("goals").update({ title, target }).eq("id", id);
  refreshAll();
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", id);
  refreshAll();
}

export async function deleteMilestone(id: string) {
  const supabase = await createClient();
  await supabase.from("milestones").delete().eq("id", id);
  refreshAll();
}

export async function updateProject(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "");

  await supabase
    .from("projects")
    .update({
      name,
      description: description || null,
      event_date: eventDate || null,
    })
    .eq("id", id);
  refreshAll();
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  refreshAll();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  refreshAll();
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  await supabase.from("project_contacts").delete().eq("id", id);
  refreshAll();
}

/* ---------- Klanten ---------- */

export async function addClient(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  if (!name || !startDate) return;

  const dealValue = Number(formData.get("deal_value") ?? 0);

  await supabase.from("clients").insert({
    name,
    start_date: startDate,
    program: String(formData.get("program") ?? "").trim() || null,
    deal_value: dealValue > 0 ? dealValue : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  refreshAll();
}

export async function setClientStatus(id: string, status: "actief" | "gestopt") {
  const supabase = await createClient();
  await supabase.from("clients").update({ status }).eq("id", id);
  refreshAll();
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", id);
  refreshAll();
}

export async function saveGainzReview(formData: FormData) {
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "").trim();
  const weekLabel = String(formData.get("week_label") ?? "").trim();

  if (!clientId || !weekLabel) return;

  await supabase.from("gainz_reviews").insert({
    client_id: clientId,
    week_label: weekLabel,
    uitvoerbaarheid: String(formData.get("uitvoerbaarheid") ?? "").trim() || null,
    resultaat: String(formData.get("resultaat") ?? "").trim() || null,
    adherence: String(formData.get("adherence") ?? "").trim() || null,
    tevredenheid: String(formData.get("tevredenheid") ?? "").trim() || null,
    een_op_een: String(formData.get("een_op_een") ?? "").trim() || null,
    verlenging: String(formData.get("verlenging") ?? "").trim() || null,
    referral: String(formData.get("referral") ?? "").trim() || null,
    hoofdgewoonte: String(formData.get("hoofdgewoonte") ?? "").trim() || null,
    bottleneck: String(formData.get("bottleneck") ?? "").trim() || null,
    next_step: String(formData.get("next_step") ?? "").trim() || null,
    intern_advies: String(formData.get("intern_advies") ?? "").trim() || null,
  });
  refreshAll();
}

export async function deleteGainzReview(id: string) {
  const supabase = await createClient();
  await supabase.from("gainz_reviews").delete().eq("id", id);
  refreshAll();
}

/* ---------- Kosten ---------- */

export async function addExpense(formData: FormData) {
  const supabase = await createClient();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const period = String(formData.get("period") ?? "").trim();
  if (!description || !period) return;

  await supabase.from("expenses").insert({
    description,
    amount,
    period,
    recurring: formData.get("recurring") === "on",
  });
  refreshAll();
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);
  refreshAll();
}

export async function addContact(formData: FormData) {
  const supabase = await createClient();
  const projectId = String(formData.get("project_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!projectId || !name) return;

  await supabase.from("project_contacts").insert({
    project_id: projectId,
    name,
    company: String(formData.get("company") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    role: String(formData.get("role") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  refreshAll();
}
