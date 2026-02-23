create extension if not exists pgcrypto;

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_email text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint engagements_status_check check (status in ('active', 'paused', 'closed'))
);

create table if not exists public.deliverable_runs (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  key text not null,
  title text not null,
  status text not null default 'todo',
  notes text,
  artifact_path text,
  updated_at timestamptz not null default now(),
  constraint deliverable_runs_status_check check (status in ('todo', 'in_progress', 'done')),
  constraint deliverable_runs_key_unique unique (engagement_id, key)
);

create index if not exists engagements_created_at_idx
  on public.engagements (created_at desc);

create index if not exists deliverable_runs_engagement_id_idx
  on public.deliverable_runs (engagement_id);

create or replace function public.set_deliverable_runs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_deliverable_runs_updated_at on public.deliverable_runs;

create trigger set_deliverable_runs_updated_at
before update on public.deliverable_runs
for each row
execute function public.set_deliverable_runs_updated_at();

-- Keep writes/reads server-side (service role in Next routes for now).
revoke all on table public.engagements from anon, authenticated;
revoke all on table public.deliverable_runs from anon, authenticated;
