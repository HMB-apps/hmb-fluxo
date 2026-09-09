-- Fase 4: registro de cada aplicação do planejador automático, para permitir
-- desfazer (seção 16.3: "Registrar a operação para permitir desfazer").

create table if not exists public.planner_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  -- Array de { taskId, before: {plannedStartAt, plannedEndAt}, after: {...} }.
  changes jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index if not exists idx_planner_runs_org on public.planner_runs (organization_id, created_at desc);
