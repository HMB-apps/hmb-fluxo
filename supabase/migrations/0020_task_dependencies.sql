-- Fase 4: dependências entre tarefas (seção 19 do briefing) — "bloqueia" e
-- "é bloqueada por" são a mesma aresta vista dos dois lados.

create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  blocking_task_id uuid not null references public.tasks (id) on delete cascade,
  blocked_task_id uuid not null references public.tasks (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (blocking_task_id <> blocked_task_id),
  unique (blocking_task_id, blocked_task_id)
);

create index if not exists idx_task_deps_blocking on public.task_dependencies (blocking_task_id);
create index if not exists idx_task_deps_blocked on public.task_dependencies (blocked_task_id);

-- Alertar sobre ciclos inválidos (seção 19): rejeita a inserção se já existir
-- um caminho de blocked_task_id até blocking_task_id (o que fecharia um
-- ciclo A bloqueia B bloqueia ... bloqueia A).
create or replace function public.check_task_dependency_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  creates_cycle boolean;
begin
  with recursive reachable as (
    select blocked_task_id as task_id
    from public.task_dependencies
    where blocking_task_id = new.blocked_task_id

    union

    select d.blocked_task_id
    from public.task_dependencies d
    join reachable r on d.blocking_task_id = r.task_id
  )
  select exists (select 1 from reachable where task_id = new.blocking_task_id) into creates_cycle;

  if creates_cycle then
    raise exception 'Esta dependência criaria um ciclo entre tarefas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_task_dependency_cycle on public.task_dependencies;
create trigger trg_check_task_dependency_cycle
  before insert on public.task_dependencies
  for each row execute function public.check_task_dependency_cycle();
