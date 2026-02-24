import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

async function sendAlerts(payload: { name: string; email: string; teamSize: string; useCase: string }) {
  const { name, email, teamSize, useCase } = payload;
  const text = [
    "New Conch reliability lead",
    `Name: ${name}`,
    `Email: ${email}`,
    `Team size: ${teamSize || "n/a"}`,
    `Use case: ${useCase || "n/a"}`,
  ].join("\n");

  const discordWebhook = process.env.LEAD_ALERT_DISCORD_WEBHOOK_URL;
  if (discordWebhook) {
    await fetch(discordWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
    }).catch((err) => console.error("Discord alert failed", err));
  }

  const tgToken = process.env.LEAD_ALERT_TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.LEAD_ALERT_TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: tgChatId, text }),
    }).catch((err) => console.error("Telegram alert failed", err));
  }
}

export async function POST(req: Request) {
  const form = await req.formData();

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim();
  const teamSize = String(form.get("teamSize") || "").trim();
  const useCase = String(form.get("useCase") || "").trim();

  if (!name || !email) {
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (error) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", error);
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  const { error } = await supabase.from("reliability_leads").insert({
    name,
    email,
    team_size: teamSize || null,
    use_case: useCase || null,
    source: "app.conch.so",
  });

  if (error) {
    console.error("Lead insert failed", error);
    return NextResponse.redirect(new URL("/?error=1", req.url));
  }

  await sendAlerts({ name, email, teamSize, useCase });

  return NextResponse.redirect(new URL("/?submitted=1", req.url));
}
