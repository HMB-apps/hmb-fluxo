-- Fase 5: Caixa de Entrada Inteligente (seções 10 e 24 do briefing).
--
-- O texto bruto é salvo ANTES de qualquer chamada à IA (regra da seção 5.1:
-- "Todo texto enviado à Caixa de Entrada deve ser salvo no banco antes de
-- qualquer processamento por IA"). A interpretação fica em uma tabela
-- separada para nunca sobrescrever ou perder o texto original.

create table if not exists public.inbox_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  raw_text text not null,
  created_by uuid not null references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed', 'discarded')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_inbox_entries_org on public.inbox_entries (organization_id, created_at desc);

create table if not exists public.ai_interpretations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  inbox_entry_id uuid not null references public.inbox_entries (id) on delete cascade,
  provider text not null,
  model text not null,
  -- Array de rascunhos de tarefa: cada campo interpretado vem com
  -- {value, confidence, reason, sourceSnippet} (seção 24.3).
  items jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_interpretations_entry on public.ai_interpretations (inbox_entry_id);

-- Preferências de IA por organização (não guarda a chave — isso fica só
-- como segredo de ambiente da Edge Function, nunca em uma tabela lida pelo
-- cliente).
create table if not exists public.ai_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  enabled boolean not null default true,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.0-flash',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ai_settings_updated_at on public.ai_settings;
create trigger trg_ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();
