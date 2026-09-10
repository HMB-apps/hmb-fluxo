-- Fase 5: RLS da Caixa de Entrada, interpretações e preferências de IA.

alter table public.inbox_entries enable row level security;

create policy inbox_entries_select on public.inbox_entries
  for select using (public.is_org_member(organization_id));
create policy inbox_entries_insert on public.inbox_entries
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy inbox_entries_update on public.inbox_entries
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

alter table public.ai_interpretations enable row level security;

create policy ai_interpretations_select on public.ai_interpretations
  for select using (public.is_org_member(organization_id));
-- Sem policy de insert/update para authenticated: só a Edge Function
-- (com o token do próprio usuário, mas via função SECURITY DEFINER) grava.
-- Como a Edge Function roda com o JWT do usuário e ele já é membro ativo,
-- basta permitir insert aqui também.
create policy ai_interpretations_insert on public.ai_interpretations
  for insert with check (public.is_org_member(organization_id));

alter table public.ai_settings enable row level security;

create policy ai_settings_select on public.ai_settings
  for select using (public.is_org_member(organization_id));
create policy ai_settings_upsert on public.ai_settings
  for insert with check (public.is_org_admin(organization_id));
create policy ai_settings_update on public.ai_settings
  for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
