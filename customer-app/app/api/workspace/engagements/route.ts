import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { STANDARD_DELIVERABLES } from "@/lib/workspace";

type NewEngagementInput = {
  companyName: string;
  contactEmail: string;
};

function parseEngagementPayload(body: unknown): NewEngagementInput | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const companyName = String(record.companyName ?? "").trim();
  const contactEmail = String(record.contactEmail ?? "").trim();

  if (!companyName || !contactEmail) {
    return null;
  }

  return { companyName, contactEmail };
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("engagements")
      .select("id, company_name, contact_email, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to list engagements", error);
      return NextResponse.json({ error: "Failed to list engagements" }, { status: 500 });
    }

    return NextResponse.json({ engagements: data ?? [] });
  } catch (error) {
    console.error("Workspace GET engagements failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let payload: NewEngagementInput | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = parseEngagementPayload(await req.json().catch(() => null));
  } else {
    const form = await req.formData();
    payload = parseEngagementPayload({
      companyName: form.get("companyName"),
      contactEmail: form.get("contactEmail"),
    });
  }

  if (!payload) {
    return NextResponse.json({ error: "companyName and contactEmail are required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: engagement, error: insertEngagementError } = await supabase
      .from("engagements")
      .insert({
        company_name: payload.companyName,
        contact_email: payload.contactEmail,
        status: "active",
      })
      .select("id, company_name, contact_email, status, created_at")
      .single();

    if (insertEngagementError || !engagement) {
      console.error("Failed to create engagement", insertEngagementError);
      return NextResponse.json({ error: "Failed to create engagement" }, { status: 500 });
    }

    const deliverableRows = STANDARD_DELIVERABLES.map((item) => ({
      engagement_id: engagement.id,
      key: item.key,
      title: item.title,
      status: "todo",
      notes: "",
      artifact_path: "",
    }));

    const { error: seedError } = await supabase.from("deliverable_runs").insert(deliverableRows);
    if (seedError) {
      console.error("Failed to seed deliverables", seedError);
      await supabase.from("engagements").delete().eq("id", engagement.id);
      return NextResponse.json({ error: "Failed to seed deliverables" }, { status: 500 });
    }

    return NextResponse.json({ engagement }, { status: 201 });
  } catch (error) {
    console.error("Workspace POST engagements failed", error);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
