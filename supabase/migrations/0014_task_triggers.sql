-- Fase 2: regras de negócio das tarefas aplicadas no banco (não confiar
-- apenas na interface):
--   - autor, último editor e controle de concorrência otimista (row_version);
--   - datas de conclusão/cancelamento automáticas ao mudar de status;
--   - histórico (audit_log);
--   - notificação ao atribuir tarefa para outra pessoa (regra #18).

create or replace function public.tasks_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.row_version := 1;
  return new;
end;
$$;

drop trigger if exists trg_tasks_before_insert on public.tasks;
create trigger trg_tasks_before_insert
  before insert on public.tasks
  for each row execute function public.tasks_before_insert();

create or replace function public.tasks_before_update()
returns trigger
language plpgsql
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  new.row_version := old.row_version + 1;

  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
    new.completed_by := auth.uid();
  elsif new.status is distinct from 'done' and old.status = 'done' then
    new.completed_at := null;
    new.completed_by := null;
  end if;

  if new.status = 'canceled' and old.status is distinct from 'canceled' then
    new.canceled_at := now();
  elsif new.status is distinct from 'canceled' and old.status = 'canceled' then
    new.canceled_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasks_before_update on public.tasks;
create trigger trg_tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();

create or replace function public.tasks_audit()
returns trigger
language plpgsql
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (organization_id, entity_type, entity_id, action, actor_id, changes)
    values (new.organization_id, 'task', new.id, 'created', auth.uid(), jsonb_build_object('title', new.title));
    return new;
  end if;

  if new.deleted_at is not null and old.deleted_at is null then
    insert into public.audit_log (organization_id, entity_type, entity_id, action, actor_id)
    values (new.organization_id, 'task', new.id, 'trashed', auth.uid());
    return new;
  end if;

  if new.deleted_at is null and old.deleted_at is not null then
    insert into public.audit_log (organization_id, entity_type, entity_id, action, actor_id)
    values (new.organization_id, 'task', new.id, 'restored', auth.uid());
    return new;
  end if;

  if old.status is distinct from new.status then
    diff := diff || jsonb_build_object('status', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if old.assigned_to is distinct from new.assigned_to then
    diff := diff || jsonb_build_object('assigned_to', jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;
  if old.deadline_at is distinct from new.deadline_at then
    diff := diff || jsonb_build_object('deadline_at', jsonb_build_object('from', old.deadline_at, 'to', new.deadline_at));
  end if;
  if old.planned_start_at is distinct from new.planned_start_at or old.planned_end_at is distinct from new.planned_end_at then
    diff := diff || jsonb_build_object('reagendado', true);
  end if;
  if old.title is distinct from new.title or old.description is distinct from new.description then
    diff := diff || jsonb_build_object('conteudo_editado', true);
  end if;

  if diff <> '{}'::jsonb then
    insert into public.audit_log (organization_id, entity_type, entity_id, action, actor_id, changes)
    values (new.organization_id, 'task', new.id, 'updated', auth.uid(), diff);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tasks_audit on public.tasks;
create trigger trg_tasks_audit
  after insert or update on public.tasks
  for each row execute function public.tasks_audit();

-- SECURITY DEFINER: precisa inserir uma notificação para OUTRO usuário
-- (o novo responsável), o que a policy de notifications não permite a partir
-- de uma sessão comum.
create or replace function public.tasks_notify_assignment()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  if new.assigned_to is not null
     and new.assigned_to <> auth.uid()
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    insert into public.notifications (organization_id, user_id, type, task_id, payload)
    values (new.organization_id, new.assigned_to, 'task_assigned', new.id, jsonb_build_object('title', new.title));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_notify_assignment on public.tasks;
create trigger trg_tasks_notify_assignment
  after insert or update on public.tasks
  for each row execute function public.tasks_notify_assignment();
