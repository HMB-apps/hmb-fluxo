import { supabase } from '../supabase/client'
import type { TaskDependency } from '../../domain/planning'
import type { Database } from '../supabase/database.types'

type Row = Database['public']['Tables']['task_dependencies']['Row']

function mapRow(row: Row): TaskDependency {
  return {
    id: row.id,
    organizationId: row.organization_id,
    blockingTaskId: row.blocking_task_id,
    blockedTaskId: row.blocked_task_id,
    createdBy: row.created_by,
  }
}

export async function listDependenciesForOrganization(organizationId: string): Promise<TaskDependency[]> {
  const { data, error } = await supabase.from('task_dependencies').select('*').eq('organization_id', organizationId)
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function listDependenciesForTask(taskId: string): Promise<{
  blockedBy: TaskDependency[]
  blocks: TaskDependency[]
}> {
  const [blockedByRes, blocksRes] = await Promise.all([
    supabase.from('task_dependencies').select('*').eq('blocked_task_id', taskId),
    supabase.from('task_dependencies').select('*').eq('blocking_task_id', taskId),
  ])
  if (blockedByRes.error) throw blockedByRes.error
  if (blocksRes.error) throw blocksRes.error
  return {
    blockedBy: (blockedByRes.data ?? []).map(mapRow),
    blocks: (blocksRes.data ?? []).map(mapRow),
  }
}

export async function addDependency(
  organizationId: string,
  createdBy: string,
  blockingTaskId: string,
  blockedTaskId: string,
): Promise<TaskDependency> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      organization_id: organizationId,
      created_by: createdBy,
      blocking_task_id: blockingTaskId,
      blocked_task_id: blockedTaskId,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function removeDependency(id: string): Promise<void> {
  const { error } = await supabase.from('task_dependencies').delete().eq('id', id)
  if (error) throw error
}
