-- Fase 8: multi-organização self-service com aprovação de superadmin,
-- monitoramento de uso e identidade visual por organização.
--
-- Ordem crítica dentro desta migration (produção com uso diário real):
-- 1. Adiciona organizations.status com default 'pending' e IMEDIATAMENTE
--    promove a organização já existente (a HMB) para 'active', antes de
--    qualquer policy/função nova considerar esse campo.
-- 2. Cria platform_admins e já insere Michel (buenomic28@gmail.com).
-- 3. Só then altera is_org_member/is_org_admin para exigir status='active'
--    — como a HMB já foi promovida no passo 1, ninguém perde acesso.

-- 1) Status de aprovação da organização ------------------------------------

alter table public.organizations
  add column status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'suspended'));

update public.organizations set status = 'active' where status = 'pending';

-- 2) Superadmin da plataforma (tabela dedicada, não coluna em profiles) ----

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Quem pode aprovar novas organizações e ver métricas de uso entre todas as organizações. Só populada por migration, nunca pela aplicação.';

alter table public.platform_admins enable row level security;

create policy platform_admins_select_self on public.platform_admins
  for select
  using (user_id = auth.uid());

insert into public.platform_admins (user_id)
select id from auth.users where email = 'buenomic28@gmail.com'
on conflict (user_id) do nothing;

-- 3) Identidade visual por organização --------------------------------------

alter table public.organizations
  add column primary_color text,
  add column logo_path text;

comment on column public.organizations.logo_path is 'Caminho do objeto no bucket de Storage "org-logos", não uma URL — a URL pública é resolvida em runtime.';

-- 4) Propaga o gate de aprovação para todas as tabelas de negócio ----------
-- (is_org_member/is_org_admin já são usadas por toda política de RLS
-- existente; bastam estas duas alterações para bloquear automaticamente o
-- acesso de uma organização pending/rejected/suspended em qualquer tabela.)

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
      and o.status = 'active'
  );
$$;

-- 5) is_platform_admin() — mesmo molde de is_org_admin, sem escopo de org --

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.platform_admins p where p.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_platform_admin() from anon;
grant execute on function public.is_platform_admin() to authenticated;

-- 6) organizations: platform admin enxerga a linha de qualquer org --------
-- (só metadados desta tabela — nenhuma outra tabela de negócio ganha
-- is_platform_admin() nas suas políticas, então isso nunca vaza dados de
-- clientes/tarefas/etc. de uma organização que não é a do superadmin.)

drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select
  using (
    public.is_org_member(id)
    or public.is_platform_admin()
  );

-- Nenhuma policy de update existia até aqui (mutação era só via RPC). Agora
-- que a tela de identidade visual precisa de update direto pelo admin da
-- própria org, criamos uma — e um trigger garante que só o RPC de
-- aprovação (que roda como SECURITY DEFINER, ignorando RLS) pode mudar
-- o status.
create policy organizations_update_admin on public.organizations
  for update
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

create or replace function public.prevent_org_admin_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    if new.status is distinct from old.status then
      raise exception 'Apenas o administrador da plataforma pode alterar o status da organização';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_org_status_guard
  before update on public.organizations
  for each row execute function public.prevent_org_admin_status_change();

-- 7) Fluxo de solicitação de nova organização -------------------------------
-- claim_first_organization permanece intocada (nunca chamada a partir de
-- agora pelo frontend, mas nunca removida em produção sem necessidade).

create or replace function public.request_new_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_org_id uuid;
  default_categories text[] := array[
    'Google Ads', 'Meta Ads', 'Sites', 'Landing Pages', 'SEO', 'Conteúdo',
    'Copy', 'Criativos', 'Relatórios', 'GA4/GTM', 'Reuniões', 'Comercial',
    'Administrativo', 'Desenvolvimento de aplicativos', 'Outros'
  ];
  category_name text;
  category_position int := 0;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'Usuário já pertence a uma organização';
  end if;

  insert into public.organizations (name, created_by, status)
  values (org_name, auth.uid(), 'pending')
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (new_org_id, auth.uid(), 'admin', 'active', now());

  foreach category_name in array default_categories loop
    insert into public.categories (organization_id, name, sort_order)
    values (new_org_id, category_name, category_position);
    category_position := category_position + 1;
  end loop;

  return new_org_id;
end;
$$;

revoke all on function public.request_new_organization(text) from public;
revoke all on function public.request_new_organization(text) from anon;
grant execute on function public.request_new_organization(text) to authenticated;

-- 8) Aprovação/rejeição — só superadmin --------------------------------------

create or replace function public.approve_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode aprovar organizações';
  end if;

  update public.organizations set status = 'active' where id = target_org_id and status = 'pending';
  if not found then
    raise exception 'Organização não encontrada ou não está pendente';
  end if;
end;
$$;

revoke all on function public.approve_organization(uuid) from public;
revoke all on function public.approve_organization(uuid) from anon;
grant execute on function public.approve_organization(uuid) to authenticated;

create or replace function public.reject_organization(target_org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode rejeitar organizações';
  end if;

  update public.organizations set status = 'rejected' where id = target_org_id and status = 'pending';
  if not found then
    raise exception 'Organização não encontrada ou não está pendente';
  end if;
end;
$$;

revoke all on function public.reject_organization(uuid) from public;
revoke all on function public.reject_organization(uuid) from anon;
grant execute on function public.reject_organization(uuid) to authenticated;

-- 9) Uso agregado por organização (para o superadmin acompanhar volume) ----

create or replace function public.get_organization_usage()
returns table (
  organization_id uuid,
  organization_name text,
  status text,
  member_count bigint,
  client_count bigint,
  task_count bigint,
  project_count bigint,
  inbox_item_count bigint
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    o.id,
    o.name,
    o.status,
    (select count(*) from public.organization_members m where m.organization_id = o.id and m.status = 'active'),
    (select count(*) from public.clients c where c.organization_id = o.id),
    (select count(*) from public.tasks t where t.organization_id = o.id),
    (select count(*) from public.projects p where p.organization_id = o.id),
    (select count(*) from public.inbox_entries i where i.organization_id = o.id)
  from public.organizations o
  where public.is_platform_admin();
$$;

revoke all on function public.get_organization_usage() from public;
revoke all on function public.get_organization_usage() from anon;
grant execute on function public.get_organization_usage() to authenticated;

-- 10) Storage: bucket de logos por organização ------------------------------

insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

create policy org_logos_select_public on storage.objects
  for select
  using (bucket_id = 'org-logos');

create policy org_logos_insert_admin on storage.objects
  for insert
  with check (
    bucket_id = 'org-logos'
    and public.is_org_admin(((string_to_array(name, '/'))[1])::uuid)
  );

create policy org_logos_update_admin on storage.objects
  for update
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(((string_to_array(name, '/'))[1])::uuid)
  );

create policy org_logos_delete_admin on storage.objects
  for delete
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(((string_to_array(name, '/'))[1])::uuid)
  );
