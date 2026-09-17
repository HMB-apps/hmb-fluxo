-- Fase 6 (seções 19, 20, 32 do briefing): recorrências e modelos de trabalho.

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'interval')),
  start_date date not null,
  end_date date,
  days_of_week integer[],
  day_of_month integer check (day_of_month between 1 and 31),
  interval_days integer check (interval_days > 0),
  last_generated_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id)
);

comment on table public.recurrence_rules is 'Regra de recorrência associada a uma tarefa "modelo"; instâncias geradas viram novas linhas em tasks com recurrence_rule_id apontando de volta aqui.';

alter table public.tasks add column recurrence_rule_id uuid references public.recurrence_rules(id) on delete set null;
alter table public.tasks add column occurrence_date date;

create index tasks_recurrence_rule_id_idx on public.tasks(recurrence_rule_id);
create unique index tasks_recurrence_occurrence_unique on public.tasks(recurrence_rule_id, occurrence_date) where recurrence_rule_id is not null;

alter table public.recurrence_rules enable row level security;

create policy recurrence_rules_select on public.recurrence_rules for select
  using (is_org_member(organization_id));
create policy recurrence_rules_insert on public.recurrence_rules for insert
  with check (is_org_member(organization_id));
create policy recurrence_rules_update on public.recurrence_rules for update
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy recurrence_rules_delete on public.recurrence_rules for delete
  using (is_org_member(organization_id));

create trigger recurrence_rules_set_updated_at
  before update on public.recurrence_rules
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.recurrence_rules;

-- Modelos de trabalho (templates) — seção 19.
create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  default_estimate_minutes integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id)
);

create table public.template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  position integer not null,
  title text not null,
  description text,
  estimate_minutes integer,
  depends_on_position integer,
  created_at timestamptz not null default now()
);

create unique index template_steps_template_position_unique on public.template_steps(template_id, position);

alter table public.task_templates enable row level security;
alter table public.template_steps enable row level security;

create policy task_templates_select on public.task_templates for select
  using (is_org_member(organization_id));
create policy task_templates_insert on public.task_templates for insert
  with check (is_org_member(organization_id));
create policy task_templates_update on public.task_templates for update
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy task_templates_delete on public.task_templates for delete
  using (is_org_member(organization_id));

create policy template_steps_select on public.template_steps for select
  using (is_org_member(organization_id));
create policy template_steps_insert on public.template_steps for insert
  with check (is_org_member(organization_id));
create policy template_steps_update on public.template_steps for update
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy template_steps_delete on public.template_steps for delete
  using (is_org_member(organization_id));

create trigger task_templates_set_updated_at
  before update on public.task_templates
  for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.task_templates;
alter publication supabase_realtime add table public.template_steps;
