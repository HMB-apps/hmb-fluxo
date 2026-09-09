import { supabase } from '../supabase/client'
import { mapTag, mapTask, mapTaskListItem } from '../supabase/taskMappers'
import type { Task, TaskListItem, TaskPriority, TaskStatus } from '../../domain/task'

const TASK_LIST_SELECT =
  '*, clients(name), projects(name), categories(name), assignee:profiles!tasks_assigned_to_fkey(name), task_tags(tags(*))'

export class TaskConflictError extends Error {
  constructor() {
    super('Esta tarefa foi alterada por outra pessoa. Revise antes de salvar novamente.')
    this.name = 'TaskConflictError'
  }
}

export interface TaskInput {
  title: string
  description?: string | null
  clientId?: string | null
  projectId?: string | null
  categoryId?: string | null
  parentTaskId?: string | null
  status?: TaskStatus
  manualPriority?: TaskPriority | null
  deadlineAt?: string | null
  internalTargetAt?: string | null
  plannedStartAt?: string | null
  plannedEndAt?: string | null
  estimateMinutes?: number | null
  actualMinutes?: number | null
  scheduleLocked?: boolean
  splittable?: boolean
  assignedTo?: string | null
  sourceText?: string | null
  tagNames?: string[]
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  clientId?: string
  projectId?: string
  categoryId?: string
  assignedTo?: string | 'unassigned'
  search?: string
  includeTrashed?: boolean
  parentTaskId?: string | null
}

export async function listTasks(organizationId: string, filters: TaskFilters = {}): Promise<TaskListItem[]> {
  let query = supabase.from('tasks').select(TASK_LIST_SELECT).eq('organization_id', organizationId)

  query = filters.includeTrashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)

  if (filters.status) {
    query = Array.isArray(filters.status) ? query.in('status', filters.status) : query.eq('status', filters.status)
  }
  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.assignedTo === 'unassigned') query = query.is('assigned_to', null)
  else if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
  if (filters.parentTaskId !== undefined) {
    query = filters.parentTaskId === null ? query.is('parent_task_id', null) : query.eq('parent_task_id', filters.parentTaskId)
  }
  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, '')
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapTaskListItem(row))
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_tags(tags(*))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const tagRows = (data.task_tags ?? []).map((t: { tags: Parameters<typeof mapTag>[0] }) => t.tags)
  return mapTask(data, tagRows)
}

async function ensureTags(organizationId: string, names: string[]): Promise<string[]> {
  const cleanNames = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  if (cleanNames.length === 0) return []

  const { error: upsertError } = await supabase
    .from('tags')
    .upsert(
      cleanNames.map((name) => ({ organization_id: organizationId, name })),
      { onConflict: 'organization_id,name', ignoreDuplicates: true },
    )
  if (upsertError) throw upsertError

  const { data, error } = await supabase
    .from('tags')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('name', cleanNames)
  if (error) throw error
  return (data ?? []).map((t) => t.id)
}

async function replaceTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from('task_tags').delete().eq('task_id', taskId)
  if (deleteError) throw deleteError
  if (tagIds.length === 0) return
  const { error: insertError } = await supabase
    .from('task_tags')
    .insert(tagIds.map((tagId) => ({ task_id: taskId, tag_id: tagId })))
  if (insertError) throw insertError
}

function toTaskRow(input: Partial<TaskInput>) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.clientId !== undefined ? { client_id: input.clientId } : {}),
    ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
    ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
    ...(input.parentTaskId !== undefined ? { parent_task_id: input.parentTaskId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.manualPriority !== undefined ? { manual_priority: input.manualPriority } : {}),
    ...(input.deadlineAt !== undefined ? { deadline_at: input.deadlineAt } : {}),
    ...(input.internalTargetAt !== undefined ? { internal_target_at: input.internalTargetAt } : {}),
    ...(input.plannedStartAt !== undefined ? { planned_start_at: input.plannedStartAt } : {}),
    ...(input.plannedEndAt !== undefined ? { planned_end_at: input.plannedEndAt } : {}),
    ...(input.estimateMinutes !== undefined ? { estimate_minutes: input.estimateMinutes } : {}),
    ...(input.actualMinutes !== undefined ? { actual_minutes: input.actualMinutes } : {}),
    ...(input.scheduleLocked !== undefined ? { schedule_locked: input.scheduleLocked } : {}),
    ...(input.splittable !== undefined ? { splittable: input.splittable } : {}),
    ...(input.assignedTo !== undefined ? { assigned_to: input.assignedTo } : {}),
    ...(input.sourceText !== undefined ? { source_text: input.sourceText } : {}),
  }
}

export async function createTask(organizationId: string, actorId: string, input: TaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: organizationId,
      created_by: actorId,
      updated_by: actorId,
      title: input.title,
      ...toTaskRow(input),
    })
    .select('*')
    .single()
  if (error) throw error

  if (input.tagNames && input.tagNames.length > 0) {
    const tagIds = await ensureTags(organizationId, input.tagNames)
    await replaceTaskTags(data.id, tagIds)
  }

  const full = await getTask(data.id)
  if (!full) throw new Error('Tarefa criada, mas não foi possível recarregá-la.')
  return full
}

/**
 * Atualização com concorrência otimista (cenário 6 do briefing): o
 * `expectedRowVersion` precisa bater com o valor atual no banco, senão
 * nenhuma linha é afetada e tratamos como conflito de edição concorrente.
 */
export async function updateTask(
  id: string,
  expectedRowVersion: number,
  input: Partial<TaskInput>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(toTaskRow(input))
    .eq('id', id)
    .eq('row_version', expectedRowVersion)
    .select('id, organization_id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new TaskConflictError()

  if (input.tagNames !== undefined) {
    const tagIds = await ensureTags(data.organization_id, input.tagNames)
    await replaceTaskTags(id, tagIds)
  }

  const full = await getTask(id)
  if (!full) throw new Error('Tarefa não encontrada após a atualização.')
  return full
}

export async function trashTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function restoreTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function listSubtasks(parentTaskId: string): Promise<TaskListItem[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_LIST_SELECT)
    .eq('parent_task_id', parentTaskId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapTaskListItem(row))
}
