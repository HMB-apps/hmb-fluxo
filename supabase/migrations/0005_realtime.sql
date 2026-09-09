-- Fase 1: habilita Realtime apenas nas tabelas necessárias por enquanto.
-- Tarefas, clientes etc. serão adicionadas nas migrations das fases seguintes.

alter publication supabase_realtime add table public.organization_members;
alter publication supabase_realtime add table public.profiles;
