import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { CreateEngagementForm } from "./create-engagement-form";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = createServiceRoleClient();
  const { data: engagements, error } = await supabase
    .from("engagements")
    .select("id, company_name, contact_email, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load engagements");
  }

  return (
    <main className="page-shell">
      <nav className="top-nav card">
        <Link href="/">Home</Link>
        <Link href="/workspace" className="active-nav">
          Workspace
        </Link>
      </nav>

      <header className="card">
        <p className="eyebrow">Reliability Engagement Workspace</p>
        <h1>Operational board for active reliability engagements.</h1>
        <p className="lead">Internal operations tool: do not share links, artifacts, or notes outside the delivery team.</p>
      </header>

      <section className="card" aria-labelledby="create-engagement-title">
        <h2 id="create-engagement-title">Create engagement</h2>
        <p className="section-note">New engagements are automatically seeded with the 8 standard deliverables.</p>
        <CreateEngagementForm />
      </section>

      <section className="card" aria-labelledby="engagement-list-title">
        <h2 id="engagement-list-title">Engagements</h2>
        <p className="section-note">Open an engagement to update deliverable status, notes, and artifacts.</p>
        <div className="engagement-list">
          {(engagements ?? []).map((engagement) => (
            <article className="engagement-item" key={engagement.id}>
              <div>
                <h3>{engagement.company_name}</h3>
                <p>{engagement.contact_email}</p>
                <p>
                  Status: <strong>{engagement.status}</strong>
                </p>
              </div>
              <Link className="primary-btn" href={`/workspace/${engagement.id}`}>
                Open workspace
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
