import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const form = await req.formData();

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const teamSize = String(form.get("teamSize") || "").trim();
  const useCase = String(form.get("useCase") || "").trim();

  if (!name || !email) {
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("reliability_leads").insert({
    name,
    email,
    team_size: teamSize || null,
    use_case: useCase || null,
    source: "app.conch.lol",
  });

  if (error) {
    console.error("Lead insert failed", error);
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  return NextResponse.redirect(new URL("/?submitted=1", req.url));
}
