import { supabase } from '../supabase/client'
import { mapProject } from '../supabase/taskMappers'
import type { Project, ProjectStatus } from '../../domain/task'

export interface ProjectInput {
  name: string
  clientId?: string | null
  description?: string | null
  color?: string | null
  status?: ProjectStatus
  startDate?: string | null
  endDate?: string | null
}

export async function listProjects(organizationId: string, options?: { includeTrashed?: boolean }): Promise<Project[]> {
  let query = supabase.from('projects').select('*').eq('organization_id', organizationId)
  query = options?.includeTrashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null)
  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapProject)
}

export async function createProject(
  organizationId: string,
  createdBy: string,
  input: ProjectInput,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: organizationId,
      created_by: createdBy,
      name: input.name,
      client_id: input.clientId ?? null,
      description: input.description ?? null,
      color: input.color ?? null,
      status: input.status ?? 'active',
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapProject(data)
}

export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.clientId !== undefined ? { client_id: input.clientId } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { start_date: input.startDate } : {}),
      ...(input.endDate !== undefined ? { end_date: input.endDate } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapProject(data)
}

export async function trashProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function restoreProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
