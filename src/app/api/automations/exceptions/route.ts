import { refreshAutomationExceptions } from "@/lib/automation-engine";
import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

async function run(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return Response.json(
      { ok: false, error: "CRON_SECRET ontbreekt in de omgeving." },
      { status: 500 },
    );
  }

  if (!authorized(request)) {
    return Response.json(
      { ok: false, error: "Niet bevoegd." },
      { status: 401 },
    );
  }

  try {
    const result = await refreshAutomationExceptions();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
