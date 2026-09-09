-- Fase 2: tarefas e subtarefas.
--
-- A tabela já inclui colunas usadas só a partir da Fase 4 (agenda/planejador)
-- para evitar migrations disruptivas repetidas no mesmo entidade central;
-- a Fase 2 só implementa CRUD, status, responsáveis e histórico sobre ela.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  parent_task_id uuid references public.tasks (id) on delete cascade,

  title text not null,
  description text,
  source_text text,

  status text not null default 'inbox' check (status in (
    'inbox', 'needs_review', 'planned', 'in_progress',
    'waiting_client', 'waiting_internal', 'paused',
    'done', 'canceled', 'archived'
  )),

  suggested_priority text check (suggested_priority in ('critical', 'high', 'normal', 'low')),
  manual_priority text check (manual_priority in ('critical', 'high', 'normal', 'low')),
  priority_score numeric,
  priority_reason text,
  impact text,

  deadline_at timestamptz,
  internal_target_at timestamptz,
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  estimate_minutes int,
  actual_minutes int,
  schedule_locked boolean not null default false,
  splittable boolean not null default true,
  waiting_followup_at timestamptz,

  completed_at timestamptz,
  canceled_at timestamptz,

  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  updated_by uuid not null references public.profiles (id),
  completed_by uuid references public.profiles (id),

  row_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tasks_org on public.tasks (organization_id);
create index if not exists idx_tasks_status on public.tasks (organization_id, status);
create index if not exists idx_tasks_assigned on public.tasks (organization_id, assigned_to);
create index if not exists idx_tasks_client on public.tasks (client_id);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_parent on public.tasks (parent_task_id);
create index if not exists idx_tasks_deleted on public.tasks (organization_id, deleted_at);

-- Tags (não usar lista separada por vírgula, ver seção 25 do briefing).

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);
