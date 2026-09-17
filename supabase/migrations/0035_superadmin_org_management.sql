-- Fase 8.1: expande o painel do superadmin — suspender/reativar uma
-- organização já ativa, ver a lista completa (não só pendentes), ver
-- detalhe de uma organização (membros incluídos), editar o nome, e
-- bloquear/desativar um integrante de qualquer organização.

-- 1) Superadmin passa a poder ver perfis e vínculos de QUALQUER
--    organização (só leitura) — necessário para a tela de detalhe listar
--    nome/e-mail dos membros de uma organização que não é a dele.

drop policy profiles_select_org_members on public.profiles;
create policy profiles_select_org_members on public.profiles
  for select
  using (
    exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
    or public.is_platform_admin()
  );

drop policy members_select on public.organization_members;
create policy members_select on public.organization_members
  for select
  using (public.is_org_participant(organization_id) or public.is_platform_admin());

-- 2) Suspender / reativar uma organização já aprovada -----------------------

create or replace function public.suspend_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode suspender organizações';
  end if;

  update public.organizations set status = 'suspended' where id = target_org_id and status = 'active';
  if not found then
    raise exception 'Organização não encontrada ou não está ativa';
  end if;
end;
$$;

revoke all on function public.suspend_organization(uuid) from public;
revoke all on function public.suspend_organization(uuid) from anon;
grant execute on function public.suspend_organization(uuid) to authenticated;

create or replace function public.reactivate_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode reativar organizações';
  end if;

  update public.organizations set status = 'active' where id = target_org_id and status = 'suspended';
  if not found then
    raise exception 'Organização não encontrada ou não está suspensa';
  end if;
end;
$$;

revoke all on function public.reactivate_organization(uuid) from public;
revoke all on function public.reactivate_organization(uuid) from anon;
grant execute on function public.reactivate_organization(uuid) to authenticated;

-- 3) Renomear uma organização (o admin da própria org já pode via update
--    direto, mas o superadmin precisa poder fazer isso em QUALQUER
--    organização, então usa um RPC que ignora RLS via SECURITY DEFINER) --

create or replace function public.rename_organization_as_platform_admin(target_org_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode renomear qualquer organização';
  end if;

  if trim(new_name) = '' then
    raise exception 'O nome não pode ficar vazio';
  end if;

  update public.organizations set name = trim(new_name) where id = target_org_id;
  if not found then
    raise exception 'Organização não encontrada';
  end if;
end;
$$;

revoke all on function public.rename_organization_as_platform_admin(uuid, text) from public;
revoke all on function public.rename_organization_as_platform_admin(uuid, text) from anon;
grant execute on function public.rename_organization_as_platform_admin(uuid, text) to authenticated;

-- 4) Bloquear/reativar um integrante de QUALQUER organização ---------------
--    (o admin de uma org já pode fazer isso na própria org via update
--    direto em organization_members — isto é o equivalente para o
--    superadmin agir em qualquer organização.)

create or replace function public.set_member_status_as_platform_admin(target_member_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode alterar integrantes de qualquer organização';
  end if;

  if new_status not in ('active', 'disabled') then
    raise exception 'Status inválido';
  end if;

  update public.organization_members set status = new_status where id = target_member_id;
  if not found then
    raise exception 'Integrante não encontrado';
  end if;
end;
$$;

revoke all on function public.set_member_status_as_platform_admin(uuid, text) from public;
revoke all on function public.set_member_status_as_platform_admin(uuid, text) from anon;
grant execute on function public.set_member_status_as_platform_admin(uuid, text) to authenticated;
