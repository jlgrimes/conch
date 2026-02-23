import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { STANDARD_DELIVERABLES } from "@/lib/workspace";
import { DeliverableRunEditor } from "./deliverable-run-editor";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EngagementWorkspacePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: engagement, error: engagementError } = await supabase
    .from("engagements")
    .select("id, company_name, contact_email, status, created_at")
    .eq("id", id)
    .single();

  if (engagementError || !engagement) {
    notFound();
  }

  const { data: deliverableRuns, error: deliverableError } = await supabase
    .from("deliverable_runs")
    .select("id, engagement_id, key, title, status, notes, artifact_path, updated_at")
    .eq("engagement_id", id);

  if (deliverableError) {
    throw new Error("Failed to load deliverable runs");
  }

  const runMap = new Map((deliverableRuns ?? []).map((run) => [run.key, run]));
  const orderedRuns = STANDARD_DELIVERABLES.map((standard) => runMap.get(standard.key)).filter((run) => Boolean(run));

  return (
    <main className="page-shell">
      <nav className="top-nav card">
        <Link href="/">Home</Link>
        <Link href="/workspace">Workspace</Link>
        <span className="active-nav">{engagement.company_name}</span>
      </nav>

      <header className="card">
        <p className="eyebrow">Engagement workspace</p>
        <h1>{engagement.company_name}</h1>
        <p className="lead">Internal operations tool. Keep all notes factual and scoped to delivery execution.</p>
        <div className="workspace-meta-row">
          <p>
            Contact: <strong>{engagement.contact_email}</strong>
          </p>
          <p>
            Status: <strong>{engagement.status}</strong>
          </p>
          <a href={`/api/workspace/engagements/${engagement.id}/export`} className="primary-btn">
            Export engagement summary
          </a>
        </div>
      </header>

      {orderedRuns.length < 8 ? (
        <p className="status-err">Expected 8 deliverables but found {orderedRuns.length}. Re-seed this engagement.</p>
      ) : null}

      <section className="deliverable-grid">
        {orderedRuns.map((run) =>
          run ? (
            <article className="card" key={run.id}>
              <DeliverableRunEditor deliverableRun={run} />
            </article>
          ) : null,
        )}
      </section>
    </main>
  );
}
