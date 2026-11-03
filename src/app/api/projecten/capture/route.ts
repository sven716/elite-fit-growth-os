import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: NextRequest) {
  const secret = process.env.PROJECT_CHAT_SECRET?.trim();
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

type CaptureBody = {
  project_id?: string;
  project_name?: string;
  project_description?: string;
  project_kind?: "doorlopend" | "event";
  event_date?: string;
  create_project?: boolean;
  item_type?: "idee" | "besluit" | "vraag" | "voortgang" | "bron";
  title?: string;
  content?: string;
  source?: string;
  source_ref?: string;
  created_by_profile?: string;
};

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Niet bevoegd." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CaptureBody | null;
  if (!body?.title?.trim()) {
    return Response.json({ ok: false, error: "title ontbreekt." }, { status: 400 });
  }
  if (!body.project_id && !body.project_name?.trim()) {
    return Response.json(
      { ok: false, error: "project_id of project_name ontbreekt." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const userId = users?.users?.[0]?.id;
  if (usersError || !userId) {
    return Response.json(
      { ok: false, error: usersError?.message ?? "Geen Growth OS-gebruiker gevonden." },
      { status: 500 },
    );
  }

  let projectId = body.project_id?.trim() || null;
  let projectName = body.project_name?.trim() || null;
  let createdProject = false;

  if (projectId) {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !project) {
      return Response.json(
        { ok: false, error: error?.message ?? "Project niet gevonden." },
        { status: 404 },
      );
    }
    projectName = project.name;
  } else if (projectName) {
    const { data: existing, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", userId)
      .ilike("name", projectName)
      .limit(1)
      .maybeSingle();
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (existing) {
      projectId = existing.id;
      projectName = existing.name;
    } else if (body.create_project !== false) {
      const kind = body.project_kind === "event" ? "event" : "doorlopend";
      const { data: project, error: createError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: projectName,
          description: body.project_description?.trim() || null,
          kind,
          event_date: kind === "event" ? body.event_date || null : null,
          status: "actief",
        })
        .select("id, name")
        .single();
      if (createError) {
        return Response.json({ ok: false, error: createError.message }, { status: 500 });
      }
      projectId = project.id;
      projectName = project.name;
      createdProject = true;
    } else {
      return Response.json(
        { ok: false, error: "Project bestaat nog niet." },
        { status: 404 },
      );
    }
  }

  const item = {
    user_id: userId,
    project_id: projectId,
    item_type: body.item_type ?? "voortgang",
    title: body.title.trim(),
    content: body.content?.trim() || null,
    source: body.source?.trim() || "agent",
    source_ref: body.source_ref?.trim() || null,
    created_by_profile: body.created_by_profile?.trim() || null,
  };

  let itemResult;
  if (item.source_ref) {
    itemResult = await supabase
      .from("project_items")
      .upsert(item, { onConflict: "user_id,source_ref" })
      .select("id")
      .single();
  } else {
    itemResult = await supabase
      .from("project_items")
      .insert(item)
      .select("id")
      .single();
  }

  if (itemResult.error) {
    return Response.json(
      { ok: false, error: itemResult.error.message },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    project_id: projectId,
    project_name: projectName,
    project_created: createdProject,
    item_id: itemResult.data.id,
  });
}
