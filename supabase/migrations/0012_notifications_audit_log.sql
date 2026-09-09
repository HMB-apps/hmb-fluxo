-- Fase 2: central de notificações internas e histórico de auditoria.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  task_id uuid references public.tasks (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read_at);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid not null references public.profiles (id),
  changes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_entity on public.audit_log (organization_id, entity_type, entity_id);
