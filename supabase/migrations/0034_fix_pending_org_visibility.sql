-- Bug real do design anterior: is_org_member/is_org_admin agora exigem
-- organizations.status='active' (correto para tabelas de negócio como
-- clients/tasks/etc — é o gate de aprovação). Mas isso também bloqueava
-- a visibilidade da PRÓPRIA linha de organizations/organization_members
-- enquanto pending, impedindo o app de sequer mostrar "aguardando
-- aprovação" para quem acabou de se cadastrar (cairia num loop: sem
-- conseguir ver a org, needsOrganization voltava a true).
--
-- Fix: uma função separada, sem o requisito de org.status='active', usada
-- só nas policies de SELECT de organizations/organization_members — nunca
-- nas tabelas de negócio, que continuam via is_org_member/is_org_admin.

create or replace function public.is_org_participant(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

revoke all on function public.is_org_participant(uuid) from public;
revoke all on function public.is_org_participant(uuid) from anon;
grant execute on function public.is_org_participant(uuid) to authenticated;

drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select
  using (
    public.is_org_participant(id)
    or public.is_platform_admin()
  );

drop policy members_select on public.organization_members;
create policy members_select on public.organization_members
  for select
  using (public.is_org_participant(organization_id));
