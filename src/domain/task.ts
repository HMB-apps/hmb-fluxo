/**
 * Tipos de domínio da Fase 2: clientes, projetos, categorias, tarefas,
 * tags, notificações e histórico.
 */
import type { TaskPriority, TaskStatus, ProjectStatus } from '../data/supabase/database.types'

export type { TaskPriority, TaskStatus, ProjectStatus }

export interface Client {
  id: string
  organizationId: string
  name: string
  shortName: string | null
  color: string | null
  strategicWeight: number | null
  active: boolean
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Project {
  id: string
  organizationId: string
  clientId: string | null
  name: string
  description: string | null
  color: string | null
  status: ProjectStatus
  startDate: string | null
  endDate: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Category {
  id: string
  organizationId: string
  name: string
  color: string | null
  sortOrder: number
  active: boolean
}

export interface Tag {
  id: string
  organizationId: string
  name: string
  color: string | null
}

export interface Task {
  id: string
  organizationId: string
  clientId: string | null
  projectId: string | null
  categoryId: string | null
  parentTaskId: string | null

  title: string
  description: string | null
  sourceText: string | null

  status: TaskStatus

  suggestedPriority: TaskPriority | null
  manualPriority: TaskPriority | null
  priorityScore: number | null
  priorityReason: string | null
  impact: string | null

  deadlineAt: string | null
  internalTargetAt: string | null
  plannedStartAt: string | null
  plannedEndAt: string | null
  estimateMinutes: number | null
  actualMinutes: number | null
  scheduleLocked: boolean
  splittable: boolean
  waitingFollowupAt: string | null

  completedAt: string | null
  canceledAt: string | null

  assignedTo: string | null
  createdBy: string
  updatedBy: string
  completedBy: string | null

  rowVersion: number

  createdAt: string
  updatedAt: string
  deletedAt: string | null

  tags: Tag[]
}

export interface TaskListItem extends Task {
  clientName: string | null
  projectName: string | null
  categoryName: string | null
  assigneeName: string | null
}

export interface NotificationItem {
  id: string
  organizationId: string
  userId: string
  type: string
  taskId: string | null
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  entityType: string
  entityId: string
  action: string
  actorId: string
  changes: Record<string, unknown> | null
  createdAt: string
}

/** Regra #5 (seção 26): esses status não consomem capacidade da agenda. */
export const NON_ACTIVE_STATUSES: readonly TaskStatus[] = [
  'waiting_client',
  'waiting_internal',
  'paused',
  'done',
  'canceled',
  'archived',
]

export function occupiesCapacity(status: TaskStatus): boolean {
  return !NON_ACTIVE_STATUSES.includes(status)
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Caixa de entrada',
  needs_review: 'Precisa revisar',
  planned: 'Planejada',
  in_progress: 'Em andamento',
  waiting_client: 'Aguardando cliente',
  waiting_internal: 'Aguardando interno',
  paused: 'Pausada',
  done: 'Concluída',
  canceled: 'Cancelada',
  archived: 'Arquivada',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baixa',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Encerrado',
}
