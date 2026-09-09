import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useRealtimeTable } from './useRealtimeTable'
import { listClients } from '../data/repositories/clientRepository'
import { listProjects } from '../data/repositories/projectRepository'
import { listCategories } from '../data/repositories/categoryRepository'
import { listOrganizationMembers } from '../data/repositories/organizationRepository'
import { listTasks } from '../data/repositories/taskRepository'
import type { Client, Project, Category, TaskListItem } from '../domain/task'
import type { MemberWithProfile } from '../domain/types'

function useOrgResource<T>(
  table: string,
  fetcher: (organizationId: string) => Promise<T[]>,
): { items: T[]; loading: boolean; error: string | null; reload: () => void } {
  const { organization } = useAuth()
  const organizationId = organization?.id
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      setItems(await fetcher(organizationId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, reloadToken])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeTable(table, organizationId, () => setReloadToken((t) => t + 1))

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  return { items, loading, error, reload }
}

export function useClients() {
  return useOrgResource<Client>('clients', (orgId) => listClients(orgId))
}

export function useProjects() {
  return useOrgResource<Project>('projects', (orgId) => listProjects(orgId))
}

export function useCategories() {
  return useOrgResource<Category>('categories', (orgId) => listCategories(orgId))
}

export function useTasks() {
  return useOrgResource<TaskListItem>('tasks', (orgId) => listTasks(orgId))
}

export function useMembers(): { items: MemberWithProfile[]; loading: boolean; error: string | null; reload: () => void } {
  return useOrgResource<MemberWithProfile>('organization_members', (orgId) => listOrganizationMembers(orgId))
}
