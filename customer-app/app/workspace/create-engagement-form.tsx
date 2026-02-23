"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateEngagementForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/workspace/engagements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName, contactEmail }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Could not create engagement.");
        return;
      }

      const payload = (await response.json()) as {
        engagement: { id: string };
      };

      setCompanyName("");
      setContactEmail("");
      router.push(`/workspace/${payload.engagement.id}`);
      router.refresh();
    } catch (submitError) {
      console.error("Failed to create engagement", submitError);
      setError("Could not create engagement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        Company Name
        <input
          type="text"
          name="companyName"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Acme Inc"
          required
        />
      </label>
      <label>
        Contact Email
        <input
          type="email"
          name="contactEmail"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="owner@acme.com"
          required
        />
      </label>
      <button type="submit" className="secondary-btn" disabled={isSaving}>
        {isSaving ? "Creating..." : "Create engagement"}
      </button>
      {error ? <p className="status-err">{error}</p> : null}
    </form>
  );
}
