import { supabase } from '../supabase/client'
import { mapAiInterpretation, mapAiSettings, mapInboxEntry } from '../supabase/inboxMappers'
import type { AiInterpretation, AiSettings, InboxEntry, InterpretedTaskDraft } from '../../domain/inbox'

export async function listInboxEntries(organizationId: string): Promise<InboxEntry[]> {
  const { data, error } = await supabase
    .from('inbox_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapInboxEntry)
}

/** Salva o texto bruto imediatamente — antes de qualquer chamada à IA (regra da seção 5.1). */
export async function createInboxEntry(organizationId: string, createdBy: string, rawText: string): Promise<InboxEntry> {
  const { data, error } = await supabase
    .from('inbox_entries')
    .insert({ organization_id: organizationId, created_by: createdBy, raw_text: rawText })
    .select('*')
    .single()
  if (error) throw error
  return mapInboxEntry(data)
}

export async function discardInboxEntry(id: string): Promise<void> {
  const { error } = await supabase.from('inbox_entries').update({ status: 'discarded' }).eq('id', id)
  if (error) throw error
}

export async function getLatestInterpretation(inboxEntryId: string): Promise<AiInterpretation | null> {
  const { data, error } = await supabase
    .from('ai_interpretations')
    .select('*')
    .eq('inbox_entry_id', inboxEntryId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapAiInterpretation(data) : null
}

/**
 * Chama a Edge Function que interpreta o texto com IA (seção 24.1: nunca
 * direto do navegador com a chave — sempre por um backend seguro).
 */
export async function interpretInboxEntry(
  inboxEntryId: string,
): Promise<{ interpretationId: string; items: InterpretedTaskDraft[] }> {
  const { data, error } = await supabase.functions.invoke<{
    interpretationId: string
    items: InterpretedTaskDraft[]
    error?: string
  }>('interpret-inbox', { body: { inboxEntryId } })
  if (error) throw error
  if (!data || data.error) throw new Error(data?.error ?? 'Falha ao interpretar o texto.')
  return { interpretationId: data.interpretationId, items: data.items }
}

export async function getAiSettings(organizationId: string): Promise<AiSettings> {
  const { data, error } = await supabase.from('ai_settings').select('*').eq('organization_id', organizationId).maybeSingle()
  if (error) throw error
  return data ? mapAiSettings(data) : { organizationId, enabled: true, provider: 'gemini', model: 'gemini-3.6-flash' }
}

export async function updateAiSettings(
  organizationId: string,
  input: { enabled: boolean; provider: string; model: string },
): Promise<AiSettings> {
  const { data, error } = await supabase
    .from('ai_settings')
    .upsert({ organization_id: organizationId, ...input })
    .select('*')
    .single()
  if (error) throw error
  return mapAiSettings(data)
}
