-- Fase 3: capacidade e calendário de trabalho (seção 18 do briefing).

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 0=domingo .. 6=sábado (convenção JS Date#getDay).
  working_days int[] not null default '{1,2,3,4,5}',
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  lunch_start time,
  lunch_end time,
  daily_capacity_minutes int not null default 480,
  buffer_percentage int not null default 20 check (buffer_percentage between 0 and 100),
  focus_block_minutes int not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

drop trigger if exists trg_work_schedules_updated_at on public.work_schedules;
create trigger trg_work_schedules_updated_at
  before update on public.work_schedules
  for each row execute function public.set_updated_at();

-- Feriados, ausências e reuniões que bloqueiam períodos da agenda.
-- user_id nulo = bloqueio vale para toda a organização (ex.: feriado).
create table if not exists public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  type text not null default 'meeting' check (type in ('holiday', 'absence', 'meeting')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_calendar_blocks_org on public.calendar_blocks (organization_id);
create index if not exists idx_calendar_blocks_user on public.calendar_blocks (user_id);
create index if not exists idx_calendar_blocks_range on public.calendar_blocks (organization_id, start_at, end_at);
