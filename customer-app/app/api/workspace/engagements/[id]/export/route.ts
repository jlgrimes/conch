import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

function toIsoDate(input: string) {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? input : date.toISOString();
}

function markdownSummary(engagement: {
  id: string;
  company_name: string;
  contact_email: string;
  status: string;
  created_at: string;
}, deliverables: Array<{
  title: string;
  status: string;
  notes: string | null;
  artifact_path: string | null;
  updated_at: string;
}>) {
  const lines: string[] = [];

  lines.push(`# Reliability Engagement Summary: ${engagement.company_name}`);
  lines.push("");
  lines.push(`- Engagement ID: ${engagement.id}`);
  lines.push(`- Contact Email: ${engagement.contact_email}`);
  lines.push(`- Engagement Status: ${engagement.status}`);
  lines.push(`- Created At: ${toIsoDate(engagement.created_at)}`);
  lines.push("");
  lines.push("## Deliverable Runs");
  lines.push("");

  for (const run of deliverables) {
    lines.push(`### ${run.title}`);
    lines.push(`- Status: ${run.status}`);
    lines.push(`- Last Updated: ${toIsoDate(run.updated_at)}`);
    lines.push(`- Artifact: ${run.artifact_path?.trim() ? run.artifact_path : "(none)"}`);
    lines.push("- Notes:");
    lines.push(run.notes?.trim() ? run.notes : "  (none)");
    lines.push("");
  }

  return lines.join("\n");
}

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

    const { data: deliverables, error: deliverablesError } = await supabase
      .from("deliverable_runs")
      .select("title, status, notes, artifact_path, updated_at")
      .eq("engagement_id", id)
      .order("title", { ascending: true });

    if (deliverablesError) {
      console.error("Failed to list deliverables for export", deliverablesError);
      return NextResponse.json({ error: "Failed to prepare summary" }, { status: 500 });
    }

    const markdown = markdownSummary(engagement, deliverables ?? []);

    return new NextResponse(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="engagement-${id}-summary.md"`,
      },
    });
  } catch (error) {
    console.error("Workspace export failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
