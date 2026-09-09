-- Fase 4: RLS de dependências e execuções do planejador.

alter table public.task_dependencies enable row level security;

create policy task_dependencies_select on public.task_dependencies
  for select using (public.is_org_member(organization_id));
create policy task_dependencies_insert on public.task_dependencies
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy task_dependencies_delete on public.task_dependencies
  for delete using (public.is_org_member(organization_id));

alter table public.planner_runs enable row level security;

create policy planner_runs_select on public.planner_runs
  for select using (public.is_org_member(organization_id));
create policy planner_runs_insert on public.planner_runs
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy planner_runs_update on public.planner_runs
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
