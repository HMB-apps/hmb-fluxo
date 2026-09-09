-- Fase 1: Row Level Security.
--
-- Princípio: nenhuma tabela de negócio confia em `authenticated` sozinho.
-- Toda leitura/escrita exige participação ativa comprovada na organização,
-- verificada por funções SECURITY DEFINER (evita recursão de RLS ao
-- consultar a própria tabela organization_members dentro de sua policy).

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select
  using (public.is_org_member(id));

-- Sem policy de insert/update/delete: criação só via função
-- claim_first_organization (SECURITY DEFINER, migration 0004).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_select_org_members on public.profiles;
create policy profiles_select_org_members on public.profiles
  for select
  using (
    exists (
      select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
        and theirs.status = 'active'
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sem policy de insert: perfil é criado pelo trigger handle_new_user.

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------

alter table public.organization_members enable row level security;

drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members
  for select
  using (public.is_org_member(organization_id));

drop policy if exists members_update_admin on public.organization_members;
create policy members_update_admin on public.organization_members
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Sem policy de insert/delete: entrada só via claim_first_organization ou
-- accept_invitation (ambas SECURITY DEFINER, migration 0004). Remoção de
-- integrante é feita via update de status para 'disabled', nunca delete
-- (preserva autoria e histórico).

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------

alter table public.invitations enable row level security;

drop policy if exists invitations_select_admin on public.invitations;
create policy invitations_select_admin on public.invitations
  for select
  using (public.is_org_admin(organization_id));

drop policy if exists invitations_insert_admin on public.invitations;
create policy invitations_insert_admin on public.invitations
  for insert
  with check (
    public.is_org_admin(organization_id)
    and invited_by = auth.uid()
  );

drop policy if exists invitations_update_admin on public.invitations;
create policy invitations_update_admin on public.invitations
  for update
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- O convidado (ainda não-membro) não lê a tabela diretamente: ele aceita o
-- convite pelo token via a função accept_invitation (SECURITY DEFINER).
