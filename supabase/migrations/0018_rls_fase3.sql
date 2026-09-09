-- Fase 3: RLS de horários de trabalho e bloqueios de agenda.
-- Qualquer membro ativo pode ver a agenda de todos (visão da equipe), mas só
-- edita a própria configuração de horário de trabalho.

alter table public.work_schedules enable row level security;

create policy work_schedules_select on public.work_schedules
  for select using (public.is_org_member(organization_id));
create policy work_schedules_insert on public.work_schedules
  for insert with check (public.is_org_member(organization_id) and user_id = auth.uid());
create policy work_schedules_update on public.work_schedules
  for update using (public.is_org_member(organization_id) and user_id = auth.uid())
  with check (public.is_org_member(organization_id) and user_id = auth.uid());

alter table public.calendar_blocks enable row level security;

create policy calendar_blocks_select on public.calendar_blocks
  for select using (public.is_org_member(organization_id));
create policy calendar_blocks_insert on public.calendar_blocks
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy calendar_blocks_update on public.calendar_blocks
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy calendar_blocks_delete on public.calendar_blocks
  for delete using (public.is_org_member(organization_id));
