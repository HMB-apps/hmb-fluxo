-- Fase 2: corrige avisos do linter de segurança sobre as novas funções.

create or replace function public.tasks_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.row_version := 1;
  return new;
end;
$$;

create or replace function public.tasks_before_update()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.tasks_audit()
returns trigger
language plpgsql
set search_path = public
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

-- tasks_notify_assignment só faz sentido chamado como trigger (usa NEW/OLD);
-- ainda assim, remove o endpoint RPC público por princípio de menor
-- privilégio, como já feito para is_org_member/is_org_admin.
revoke all on function public.tasks_notify_assignment() from public;
revoke all on function public.tasks_notify_assignment() from anon;
revoke all on function public.tasks_notify_assignment() from authenticated;
