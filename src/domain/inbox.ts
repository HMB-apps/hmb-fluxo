/** Tipos de domínio da Fase 5: Caixa de Entrada Inteligente. */
import type { TaskPriority } from './task'

export type InboxEntryStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'discarded'

export interface InboxEntry {
  id: string
  organizationId: string
  rawText: string
  createdBy: string
  status: InboxEntryStatus
  createdAt: string
  processedAt: string | null
}

export interface InterpretedField<T> {
  value: T | null
  confidence: number
  reason: string
  sourceSnippet: string | null
}

export interface InterpretedTaskDraft {
  title: InterpretedField<string>
  description: InterpretedField<string>
  clientName: InterpretedField<string>
  categoryName: InterpretedField<string>
  deadlineAt: InterpretedField<string>
  estimateMinutes: InterpretedField<number>
  priority: InterpretedField<TaskPriority>
  tags: InterpretedField<string[]>
  dependsOnIndex: InterpretedField<number>
}

export interface AiInterpretation {
  id: string
  organizationId: string
  inboxEntryId: string
  provider: string
  model: string
  items: InterpretedTaskDraft[] | null
  error: string | null
  createdAt: string
}

export interface AiSettings {
  organizationId: string
  enabled: boolean
  provider: string
  model: string
}

/** Abaixo desse limiar, um campo é tratado como "incerto" na revisão (seção 10.4). */
export const LOW_CONFIDENCE_THRESHOLD = 0.6
