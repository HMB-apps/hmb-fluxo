-- A própria API do Gemini recomenda "models/gemini-3.6-flash" como
-- substituto direto dos modelos descontinuados (2.0-flash, 2.5-flash).
-- Fixamos esse nome em vez do alias "-latest" para ter um comportamento
-- previsível e não migrar sozinho para uma versão preview instável.

alter table public.ai_settings alter column model set default 'gemini-3.6-flash';

update public.ai_settings set model = 'gemini-3.6-flash' where model in ('gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest');
