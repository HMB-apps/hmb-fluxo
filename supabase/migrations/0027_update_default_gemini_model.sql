-- O modelo padrão "gemini-2.0-flash" foi descontinuado pelo Google
-- (a API passou a recomendar gemini-3.6-flash). Atualiza o valor padrão da
-- coluna e qualquer linha existente que ainda esteja usando o modelo antigo.

alter table public.ai_settings alter column model set default 'gemini-3.6-flash';

update public.ai_settings set model = 'gemini-3.6-flash' where model = 'gemini-2.0-flash';
