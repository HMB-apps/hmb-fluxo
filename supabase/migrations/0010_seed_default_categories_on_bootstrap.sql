-- Fase 2: ao criar o espaço de trabalho, semeia as categorias sugeridas na
-- seção 12.3 do briefing. O usuário pode editá-las ou desativá-las depois.

create or replace function public.claim_first_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  default_categories text[] := array[
    'Google Ads', 'Meta Ads', 'Sites', 'Landing Pages', 'SEO', 'Conteúdo',
    'Copy', 'Criativos', 'Relatórios', 'GA4/GTM', 'Reuniões', 'Comercial',
    'Administrativo', 'Desenvolvimento de aplicativos', 'Outros'
  ];
  category_name text;
  position int := 0;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.organization_members where user_id = auth.uid()) then
    raise exception 'Usuário já pertence a uma organização';
  end if;

  insert into public.organizations (name, created_by)
  values (org_name, auth.uid())
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at)
  values (new_org_id, auth.uid(), 'admin', 'active', now());

  foreach category_name in array default_categories loop
    insert into public.categories (organization_id, name, sort_order)
    values (new_org_id, category_name, position);
    position := position + 1;
  end loop;

  return new_org_id;
end;
$$;
