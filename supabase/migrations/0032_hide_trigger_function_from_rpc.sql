-- prevent_org_admin_status_change() é só para uso interno do trigger
-- trg_org_status_guard — nunca deveria ter sido exposta como RPC via
-- PostgREST (comportamento padrão do Supabase para qualquer função nova
-- no schema public, a menos que explicitamente revogada, como já é feito
-- para as outras funções de apoio deste projeto).
revoke all on function public.prevent_org_admin_status_change() from public;
revoke all on function public.prevent_org_admin_status_change() from anon;
revoke all on function public.prevent_org_admin_status_change() from authenticated;
