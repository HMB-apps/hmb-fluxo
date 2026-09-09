-- Correções apontadas pelo linter de segurança do Supabase (Database
-- Advisors) após a aplicação das migrations 0001-0006.

-- 1) search_path mutável em set_updated_at (function_search_path_mutable).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) is_org_member/is_org_admin são funções de apoio às policies de RLS,
-- não endpoints públicos. Precisam de EXECUTE para `authenticated` (o
-- Postgres exige isso para invocá-las dentro de USING/WITH CHECK), mas não
-- para `anon`, que nunca é dono de uma linha em organization_members.
revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;
