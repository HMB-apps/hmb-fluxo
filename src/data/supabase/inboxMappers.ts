import type { Database } from './database.types'
import type { AiInterpretation, AiSettings, InboxEntry, InboxEntryStatus, InterpretedTaskDraft } from '../../domain/inbox'

type InboxEntryRow = Database['public']['Tables']['inbox_entries']['Row']
type AiInterpretationRow = Database['public']['Tables']['ai_interpretations']['Row']
type AiSettingsRow = Database['public']['Tables']['ai_settings']['Row']

export function mapInboxEntry(row: InboxEntryRow): InboxEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    rawText: row.raw_text,
    createdBy: row.created_by,
    status: row.status as InboxEntryStatus,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }
}

export function mapAiInterpretation(row: AiInterpretationRow): AiInterpretation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    inboxEntryId: row.inbox_entry_id,
    provider: row.provider,
    model: row.model,
    items: row.items as unknown as InterpretedTaskDraft[] | null,
    error: row.error,
    createdAt: row.created_at,
  }
}

export function mapAiSettings(row: AiSettingsRow): AiSettings {
  return {
    organizationId: row.organization_id,
    enabled: row.enabled,
    provider: row.provider,
    model: row.model,
  }
}
