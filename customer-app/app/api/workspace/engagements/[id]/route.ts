import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing engagement id" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: engagement, error: engagementError } = await supabase
      .from("engagements")
      .select("id, company_name, contact_email, status, created_at")
      .eq("id", id)
      .single();

    if (engagementError || !engagement) {
      return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
    }

    const { data: deliverableRuns, error: deliverablesError } = await supabase
      .from("deliverable_runs")
      .select("id, engagement_id, key, title, status, notes, artifact_path, updated_at")
      .eq("engagement_id", id)
      .order("title", { ascending: true });

    if (deliverablesError) {
      console.error("Failed to list deliverable runs", deliverablesError);
      return NextResponse.json({ error: "Failed to list deliverables" }, { status: 500 });
    }

    return NextResponse.json({ engagement, deliverableRuns: deliverableRuns ?? [] });
  } catch (error) {
    console.error("Workspace GET engagement failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing engagement id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (typeof body.companyName === "string") {
    update.company_name = body.companyName.trim();
  }
  if (typeof body.contactEmail === "string") {
    update.contact_email = body.contactEmail.trim();
  }
  if (typeof body.status === "string") {
    update.status = body.status.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("engagements")
      .update(update)
      .eq("id", id)
      .select("id, company_name, contact_email, status, created_at")
      .single();

    if (error || !data) {
      console.error("Failed to update engagement", error);
      return NextResponse.json({ error: "Failed to update engagement" }, { status: 500 });
    }

    return NextResponse.json({ engagement: data });
  } catch (error) {
    console.error("Workspace PATCH engagement failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing engagement id" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("engagements").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete engagement", error);
      return NextResponse.json({ error: "Failed to delete engagement" }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Workspace DELETE engagement failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
