export const DELIVERABLE_STATUS = ["todo", "in_progress", "done"] as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUS)[number];

export type StandardDeliverable = {
  key: string;
  title: string;
};

export const STANDARD_DELIVERABLES: StandardDeliverable[] = [
  { key: "reliability_baseline", title: "Reliability baseline and risk register" },
  { key: "memory_data_audit", title: "Memory data audit and quality report" },
  { key: "retrieval_tuning", title: "Retrieval tuning and evaluation pass" },
  { key: "snapshot_drift_checks", title: "Snapshot drift and regression checks" },
  { key: "load_resilience", title: "Load resilience and retry hardening" },
  { key: "observability_setup", title: "Observability dashboards and alerting" },
  { key: "runbooks_slos", title: "Runbooks, SLO targets, and escalation rules" },
  { key: "handoff_enablement", title: "Team handoff and enablement package" },
];
