-- Fase 1: permite que quem recebeu o link de convite veja para qual
-- e-mail/organização ele é destinado antes de criar conta ou logar.
-- Só expõe dados a quem já possui o token (link), nunca lista convites.

create or replace function public.get_invitation_preview(invitation_token uuid)
returns table (
  email text,
  organization_name text,
  status text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select i.email, o.name, i.status, i.expires_at
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = invitation_token;
$$;

revoke all on function public.get_invitation_preview(uuid) from public;
grant execute on function public.get_invitation_preview(uuid) to anon, authenticated;
