-- Usa o alias "gemini-flash-latest" em vez de fixar uma versão datada do
-- modelo — o Google aponta esse alias sempre para o Flash estável mais
-- atual, evitando quebrar de novo quando uma versão específica for
-- descontinuada (como aconteceu com gemini-2.0-flash).

alter table public.ai_settings alter column model set default 'gemini-flash-latest';

update public.ai_settings set model = 'gemini-flash-latest' where model = 'gemini-3.6-flash';
