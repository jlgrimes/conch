"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DELIVERABLE_STATUS, DeliverableStatus } from "@/lib/workspace";

type DeliverableRunEditorProps = {
  deliverableRun: {
    id: string;
    key: string;
    title: string;
    status: DeliverableStatus;
    notes: string | null;
    artifact_path: string | null;
    updated_at: string;
  };
};

export function DeliverableRunEditor({ deliverableRun }: DeliverableRunEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DeliverableStatus>(deliverableRun.status);
  const [notes, setNotes] = useState(deliverableRun.notes ?? "");
  const [artifactPath, setArtifactPath] = useState(deliverableRun.artifact_path ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [stateText, setStateText] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStateText("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspace/deliverable-runs/${deliverableRun.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, notes, artifactPath }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setStateText(payload?.error ?? "Could not save deliverable update.");
        return;
      }

      setStateText("Saved.");
      router.refresh();
    } catch (saveError) {
      console.error("Failed to update deliverable run", saveError);
      setStateText("Could not save deliverable update.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="deliverable-form" onSubmit={onSubmit}>
      <div className="deliverable-head">
        <h3>{deliverableRun.title}</h3>
        <p className="deliverable-key">{deliverableRun.key}</p>
      </div>

      <label>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value as DeliverableStatus)}>
          {DELIVERABLE_STATUS.map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notes
        <textarea
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Operational notes, blockers, and owner updates"
        />
      </label>

      <label>
        Artifact Path / Link
        <input
          type="text"
          value={artifactPath}
          onChange={(event) => setArtifactPath(event.target.value)}
          placeholder="https://... or s3://..."
        />
      </label>

      <div className="deliverable-footer">
        <button type="submit" className="secondary-btn" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save deliverable"}
        </button>
        {stateText ? <p className={stateText === "Saved." ? "status-ok" : "status-err"}>{stateText}</p> : null}
      </div>
    </form>
  );
}
