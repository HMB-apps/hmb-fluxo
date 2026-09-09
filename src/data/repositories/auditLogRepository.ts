import { supabase } from '../supabase/client'
import { mapAuditLogEntry } from '../supabase/taskMappers'
import type { AuditLogEntry } from '../../domain/task'

export async function listAuditLogForEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapAuditLogEntry)
}
