-- Fase 2: Row Level Security para clientes, projetos, categorias, tarefas,
-- tags, notificações e histórico.
--
-- Regra do MVP (seção 12.4 do briefing): Michel e Helena têm autonomia
-- operacional semelhante — qualquer membro ativo da organização pode ler e
-- editar clientes/projetos/tarefas da própria organização. Exclusão
-- definitiva só é permitida sobre registros já enviados à lixeira
-- (deleted_at preenchido), nunca diretamente.

-- clients
alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select using (public.is_org_member(organization_id));
create policy clients_insert on public.clients
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy clients_update on public.clients
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy clients_delete on public.clients
  for delete using (public.is_org_member(organization_id) and deleted_at is not null);

-- projects
alter table public.projects enable row level security;

create policy projects_select on public.projects
  for select using (public.is_org_member(organization_id));
create policy projects_insert on public.projects
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy projects_update on public.projects
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy projects_delete on public.projects
  for delete using (public.is_org_member(organization_id) and deleted_at is not null);

-- categories
alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select using (public.is_org_member(organization_id));
create policy categories_insert on public.categories
  for insert with check (public.is_org_member(organization_id));
create policy categories_update on public.categories
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- tasks
alter table public.tasks enable row level security;

create policy tasks_select on public.tasks
  for select using (public.is_org_member(organization_id));
create policy tasks_insert on public.tasks
  for insert with check (public.is_org_member(organization_id));
create policy tasks_update on public.tasks
  for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy tasks_delete on public.tasks
  for delete using (public.is_org_member(organization_id) and deleted_at is not null);

-- tags
alter table public.tags enable row level security;

create policy tags_select on public.tags
  for select using (public.is_org_member(organization_id));
create policy tags_insert on public.tags
  for insert with check (public.is_org_member(organization_id));
create policy tags_delete on public.tags
  for delete using (public.is_org_member(organization_id));

-- task_tags (escopo herdado da tarefa)
alter table public.task_tags enable row level security;

create policy task_tags_select on public.task_tags
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_org_member(t.organization_id))
  );
create policy task_tags_insert on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_org_member(t.organization_id))
  );
create policy task_tags_delete on public.task_tags
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and public.is_org_member(t.organization_id))
  );

-- notifications: cada pessoa só vê e só marca como lida a sua própria.
-- Sem policy de insert/delete para authenticated: só o trigger
-- (SECURITY DEFINER) cria notificações.
alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: histórico é somente leitura para membros da organização;
-- inserção só pelo trigger de auditoria, em nome do próprio ator.
alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log
  for select using (public.is_org_member(organization_id));
create policy audit_log_insert on public.audit_log
  for insert with check (public.is_org_member(organization_id) and actor_id = auth.uid());
