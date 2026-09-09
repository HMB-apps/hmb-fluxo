-- Fase 2: habilita Realtime para clientes, projetos, tarefas e notificações,
-- para que mudanças de um usuário apareçam para o outro sem recarregar.

alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notifications;
