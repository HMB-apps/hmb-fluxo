// Fase 5 — Caixa de Entrada Inteligente (seções 10 e 24 do briefing).
//
// Roda no backend (Supabase Edge Function) para nunca expor a chave da IA
// no navegador (regra da seção 24.1). Usa o JWT do próprio usuário para
// falar com o banco, então o Row Level Security de sempre continua valendo
// — esta função não tem privilégio nenhum além do que o usuário já tem.
//
// Provedor de IA isolado atrás de uma interface simples (`AiProvider`) para
// permitir trocar de fornecedor depois sem mexer no resto da função,
// conforme a seção 24.1 exige.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface InterpretedField<T> {
  value: T | null
  confidence: number
  reason: string
  sourceSnippet: string | null
}

interface InterpretedTaskDraft {
  title: InterpretedField<string>
  description: InterpretedField<string>
  clientName: InterpretedField<string>
  categoryName: InterpretedField<string>
  deadlineAt: InterpretedField<string>
  estimateMinutes: InterpretedField<number>
  priority: InterpretedField<'critical' | 'high' | 'normal' | 'low'>
  tags: InterpretedField<string[]>
  dependsOnIndex: InterpretedField<number>
}

interface AiProvider {
  interpret(input: {
    rawText: string
    todayIso: string
    clientNames: string[]
    categoryNames: string[]
  }): Promise<InterpretedTaskDraft[]>
}

const VALID_PRIORITIES = new Set(['critical', 'high', 'normal', 'low'])

function emptyField<T>(): InterpretedField<T> {
  return { value: null, confidence: 0, reason: '', sourceSnippet: null }
}

function coerceField<T>(raw: unknown, validate: (v: unknown) => T | null): InterpretedField<T> {
  if (typeof raw !== 'object' || raw === null) return emptyField<T>()
  const obj = raw as Record<string, unknown>
  const value = validate(obj.value)
  const confidence = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0
  const reason = typeof obj.reason === 'string' ? obj.reason : ''
  const sourceSnippet = typeof obj.sourceSnippet === 'string' ? obj.sourceSnippet : null
  return { value, confidence, reason, sourceSnippet }
}

/** Valida a estrutura que o modelo devolveu — nunca grava a resposta crua sem checar (seção 24.3). */
function validateItems(parsed: unknown): InterpretedTaskDraft[] {
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Record<string, unknown>).items)) {
    throw new Error('Resposta da IA fora do formato esperado (sem "items").')
  }
  const items = (parsed as { items: unknown[] }).items
  return items.map((raw) => {
    const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    return {
      title: coerceField<string>(obj.title, (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)),
      description: coerceField<string>(obj.description, (v) => (typeof v === 'string' ? v : null)),
      clientName: coerceField<string>(obj.clientName, (v) => (typeof v === 'string' ? v : null)),
      categoryName: coerceField<string>(obj.categoryName, (v) => (typeof v === 'string' ? v : null)),
      deadlineAt: coerceField<string>(obj.deadlineAt, (v) => (typeof v === 'string' ? v : null)),
      estimateMinutes: coerceField<number>(obj.estimateMinutes, (v) => (typeof v === 'number' ? v : null)),
      priority: coerceField<'critical' | 'high' | 'normal' | 'low'>(obj.priority, (v) =>
        typeof v === 'string' && VALID_PRIORITIES.has(v) ? (v as 'critical' | 'high' | 'normal' | 'low') : null,
      ),
      tags: coerceField<string[]>(obj.tags, (v) => (Array.isArray(v) ? v.filter((t) => typeof t === 'string') : null)),
      dependsOnIndex: coerceField<number>(obj.dependsOnIndex, (v) => (typeof v === 'number' ? v : null)),
    }
  })
}

function buildPrompt(input: { rawText: string; todayIso: string; clientNames: string[]; categoryNames: string[] }): string {
  return `Você extrai tarefas de um texto livre escrito por alguém de uma agência de marketing digital (HMB Negócios Digitais).

Hoje é ${input.todayIso} (fuso America/Sao_Paulo, semana começa na segunda-feira). Resolva datas relativas ("amanhã", "sexta", "semana que vem") com base nessa data.

Clientes já cadastrados (use o nome EXATAMENTE como está aqui se reconhecer o cliente no texto; se não tiver certeza ou não existir, deixe null): ${JSON.stringify(input.clientNames)}
Categorias já cadastradas (idem): ${JSON.stringify(input.categoryNames)}

Separe o texto abaixo em uma ou mais tarefas distintas. Para cada tarefa, preencha os campos abaixo. Cada campo é um objeto {value, confidence, reason, sourceSnippet}:
- value: o valor interpretado (ou null se não der para inferir).
- confidence: número de 0 a 1, quão confiante você está nesse valor.
- reason: justificativa curta em português.
- sourceSnippet: o trecho exato do texto original que te levou a essa conclusão (ou null).

Campos por tarefa:
- title (string, obrigatório): título objetivo da tarefa.
- description (string): descrição um pouco mais detalhada, se houver conteúdo além do título.
- clientName (string): nome do cliente, só da lista acima ou null.
- categoryName (string): categoria, só da lista acima ou null.
- deadlineAt (string): prazo de entrega, formato "AAAA-MM-DD", ou null se não mencionado.
- estimateMinutes (number): duração estimada em minutos, só se o texto der uma pista (ex.: "reunião de 1h" = 60); senão null.
- priority (string): "critical", "high", "normal" ou "low", só se houver urgência explícita no texto; senão null (a prioridade sugerida do sistema cobre o resto).
- tags (array de strings): palavras-chave relevantes, se houver.
- dependsOnIndex (number): se esta tarefa claramente depende de outra tarefa DESTE MESMO texto (ex.: "o resumo depende da análise"), o índice (começando em 0) dessa outra tarefa na lista que você está montando; senão null.

Responda SOMENTE com um JSON no formato: {"items": [ { ...campos acima... }, ... ]}. Sem markdown, sem texto fora do JSON.

Texto para interpretar:
"""
${input.rawText}
"""`
}

class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async interpret(input: {
    rawText: string
    todayIso: string
    clientNames: string[]
    categoryNames: string[]
  }): Promise<InterpretedTaskDraft[]> {
    const prompt = buildPrompt(input)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gemini respondeu ${response.status}: ${errorBody.slice(0, 300)}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') {
      throw new Error('Resposta da IA sem conteúdo de texto.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error('A IA não devolveu um JSON válido.')
    }

    return validateItems(parsed)
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { inboxEntryId } = await req.json()
    if (!inboxEntryId) {
      return new Response(JSON.stringify({ error: 'inboxEntryId é obrigatório.' }), { status: 400, headers: corsHeaders })
    }

    const { data: entry, error: entryError } = await supabase
      .from('inbox_entries')
      .select('*')
      .eq('id', inboxEntryId)
      .single()
    if (entryError || !entry) {
      return new Response(JSON.stringify({ error: 'Item da caixa de entrada não encontrado.' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('organization_id', entry.organization_id)
      .maybeSingle()

    if (settings && settings.enabled === false) {
      return new Response(JSON.stringify({ error: 'A interpretação por IA está desativada em Configurações.' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const model = settings?.model ?? 'gemini-3.6-flash'
    const provider = settings?.provider ?? 'gemini'

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave da IA não configurada no servidor (GEMINI_API_KEY ausente).' }),
        { status: 500, headers: corsHeaders },
      )
    }

    await supabase.from('inbox_entries').update({ status: 'processing' }).eq('id', inboxEntryId)

    const [{ data: clients }, { data: categories }] = await Promise.all([
      supabase.from('clients').select('name').eq('organization_id', entry.organization_id).is('deleted_at', null),
      supabase.from('categories').select('name').eq('organization_id', entry.organization_id).eq('active', true),
    ])

    const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

    try {
      const aiProvider: AiProvider = new GeminiProvider(apiKey, model)
      const items = await aiProvider.interpret({
        rawText: entry.raw_text,
        todayIso,
        clientNames: (clients ?? []).map((c: { name: string }) => c.name),
        categoryNames: (categories ?? []).map((c: { name: string }) => c.name),
      })

      const { data: interpretation, error: insertError } = await supabase
        .from('ai_interpretations')
        .insert({
          organization_id: entry.organization_id,
          inbox_entry_id: inboxEntryId,
          provider,
          model,
          items,
        })
        .select('id')
        .single()
      if (insertError) throw insertError

      await supabase
        .from('inbox_entries')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', inboxEntryId)

      return new Response(JSON.stringify({ interpretationId: interpretation.id, items }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : 'Falha desconhecida ao interpretar o texto.'

      await supabase.from('ai_interpretations').insert({
        organization_id: entry.organization_id,
        inbox_entry_id: inboxEntryId,
        provider,
        model,
        items: null,
        error: message,
      })
      await supabase
        .from('inbox_entries')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', inboxEntryId)

      return new Response(JSON.stringify({ error: message }), { status: 502, headers: corsHeaders })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro inesperado.'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
