-- Fase 1: funções RPC que atravessam RLS de forma controlada.
--
-- Ambas são SECURITY DEFINER porque o usuário chamador ainda não é membro
-- ativo da organização no momento da chamada (não passaria pelas policies
-- normais de insert). A validação de segurança fica dentro da própria
-- função, não na ausência de RLS.

create or replace function public.claim_first_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'Usuário já pertence a uma organização';
  end if;

  insert into public.organizations (name, created_by)
  values (org_name, auth.uid())
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (new_org_id, auth.uid(), 'admin', 'active', now());

  return new_org_id;
end;
$$;

revoke all on function public.claim_first_organization(text) from public;
grant execute on function public.claim_first_organization(text) to authenticated;

create or replace function public.accept_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select email into caller_email from auth.users where id = auth.uid();

  select * into inv from public.invitations where token = invitation_token for update;

  if not found then
    raise exception 'Convite não encontrado';
  end if;

  if inv.status <> 'pending' then
    raise exception 'Este convite não está mais disponível';
  end if;

  if inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = inv.id;
    raise exception 'Este convite expirou';
  end if;

  if lower(caller_email) <> lower(inv.email) then
    raise exception 'Este convite foi enviado para outro e-mail';
  end if;

  insert into public.organization_members
    (organization_id, user_id, role, status, invited_by, invited_at, joined_at)
  values
    (inv.organization_id, auth.uid(), inv.role, 'active', inv.invited_by, inv.created_at, now())
  on conflict (organization_id, user_id) do update
    set status = 'active',
        role = excluded.role,
        joined_at = now();

  update public.invitations set status = 'accepted' where id = inv.id;

  return inv.organization_id;
end;
$$;

revoke all on function public.accept_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;
