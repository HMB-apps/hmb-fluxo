import type { Database, ProjectStatus, TaskPriority, TaskStatus } from './database.types'
import type { AuditLogEntry, Category, Client, NotificationItem, Project, Tag, Task, TaskListItem } from '../../domain/task'

type ClientRow = Database['public']['Tables']['clients']['Row']
type ProjectRow = Database['public']['Tables']['projects']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type TagRow = Database['public']['Tables']['tags']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type AuditLogRow = Database['public']['Tables']['audit_log']['Row']

export function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    shortName: row.short_name,
    color: row.color,
    strategicWeight: row.strategic_weight,
    active: row.active,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    name: row.name,
    description: row.description,
    color: row.color,
    status: row.status as ProjectStatus,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    active: row.active,
  }
}

export function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    color: row.color,
  }
}

export function mapTask(row: TaskRow, tags: TagRow[] = []): Task {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientId: row.client_id,
    projectId: row.project_id,
    categoryId: row.category_id,
    parentTaskId: row.parent_task_id,
    title: row.title,
    description: row.description,
    sourceText: row.source_text,
    status: row.status as TaskStatus,
    suggestedPriority: row.suggested_priority as TaskPriority | null,
    manualPriority: row.manual_priority as TaskPriority | null,
    priorityScore: row.priority_score,
    priorityReason: row.priority_reason,
    impact: row.impact,
    deadlineAt: row.deadline_at,
    internalTargetAt: row.internal_target_at,
    plannedStartAt: row.planned_start_at,
    plannedEndAt: row.planned_end_at,
    estimateMinutes: row.estimate_minutes,
    actualMinutes: row.actual_minutes,
    scheduleLocked: row.schedule_locked,
    splittable: row.splittable,
    waitingFollowupAt: row.waiting_followup_at,
    completedAt: row.completed_at,
    canceledAt: row.canceled_at,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    completedBy: row.completed_by,
    rowVersion: row.row_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    tags: tags.map(mapTag),
  }
}

interface TaskRowWithRelations extends TaskRow {
  clients?: { name: string } | null
  projects?: { name: string } | null
  categories?: { name: string } | null
  assignee?: { name: string } | null
  task_tags?: { tags: TagRow }[]
}

export function mapTaskListItem(row: TaskRowWithRelations): TaskListItem {
  const tags = (row.task_tags ?? []).map((t) => t.tags)
  return {
    ...mapTask(row, tags),
    clientName: row.clients?.name ?? null,
    projectName: row.projects?.name ?? null,
    categoryName: row.categories?.name ?? null,
    assigneeName: row.assignee?.name ?? null,
  }
}

export function mapNotification(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    type: row.type,
    taskId: row.task_id,
    payload: (row.payload as Record<string, unknown>) ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export function mapAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorId: row.actor_id,
    changes: (row.changes as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at,
  }
}
