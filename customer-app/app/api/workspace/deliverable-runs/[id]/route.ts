import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { DELIVERABLE_STATUS } from "@/lib/workspace";

type RouteContext = { params: Promise<{ id: string }> };

function isAllowedStatus(value: string) {
  return (DELIVERABLE_STATUS as readonly string[]).includes(value);
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing deliverable run id" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("deliverable_runs")
      .select("id, engagement_id, key, title, status, notes, artifact_path, updated_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Deliverable run not found" }, { status: 404 });
    }

    return NextResponse.json({ deliverableRun: data });
  } catch (error) {
    console.error("Workspace GET deliverable run failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing deliverable run id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (typeof body.status === "string") {
    if (!isAllowedStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (typeof body.notes === "string") {
    update.notes = body.notes;
  }
  if (typeof body.artifactPath === "string") {
    update.artifact_path = body.artifactPath;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("deliverable_runs")
      .update(update)
      .eq("id", id)
      .select("id, engagement_id, key, title, status, notes, artifact_path, updated_at")
      .single();

    if (error || !data) {
      console.error("Failed to update deliverable run", error);
      return NextResponse.json({ error: "Failed to update deliverable run" }, { status: 500 });
    }

    return NextResponse.json({ deliverableRun: data });
  } catch (error) {
    console.error("Workspace PATCH deliverable run failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing deliverable run id" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("deliverable_runs").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete deliverable run", error);
      return NextResponse.json({ error: "Failed to delete deliverable run" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Workspace DELETE deliverable run failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
