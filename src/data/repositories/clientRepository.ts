import { supabase } from '../supabase/client'
import { mapClient } from '../supabase/taskMappers'
import type { Client } from '../../domain/task'

export interface ClientInput {
  name: string
  shortName?: string | null
  color?: string | null
  strategicWeight?: number | null
  active?: boolean
  notes?: string | null
}

export async function listClients(organizationId: string, options?: { includeTrashed?: boolean }): Promise<Client[]> {
  let query = supabase.from('clients').select('*').eq('organization_id', organizationId)
  query = options?.includeTrashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapClient)
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapClient(data) : null
}

export async function createClient(
  organizationId: string,
  createdBy: string,
  input: ClientInput,
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      created_by: createdBy,
      name: input.name,
      short_name: input.shortName ?? null,
      color: input.color ?? null,
      strategic_weight: input.strategicWeight ?? null,
      active: input.active ?? true,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapClient(data)
}

export async function updateClient(id: string, input: Partial<ClientInput>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.shortName !== undefined ? { short_name: input.shortName } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.strategicWeight !== undefined ? { strategic_weight: input.strategicWeight } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapClient(data)
}

export async function trashClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function restoreClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}
