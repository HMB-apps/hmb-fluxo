-- Funções de trigger continuam precisando de EXECUTE para o papel que
-- dispara o UPDATE (authenticated), mesmo sendo SECURITY DEFINER — só
-- "anon" precisa ficar de fora aqui, replicando o padrão já usado em
-- handle_new_user() (que também aparece como "executável por
-- authenticated" nos advisors e é aceito como intencional neste projeto).
-- Chamar esta função diretamente como RPC (fora de um trigger real) só
-- resulta em erro de "record NEW is not assigned yet" — não há bypass de
-- segurança nisso, é apenas ruído informativo do linter.
grant execute on function public.prevent_org_admin_status_change() to authenticated;
