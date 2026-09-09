-- O Supabase concede EXECUTE em novas funções do schema public a `anon` e
-- `authenticated` via ALTER DEFAULT PRIVILEGES do projeto; por isso
-- "revoke ... from public" na migration 0007 não removeu o acesso de
-- `anon` a essas duas funções. Revoga explicitamente.

revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.is_org_admin(uuid) from anon;
