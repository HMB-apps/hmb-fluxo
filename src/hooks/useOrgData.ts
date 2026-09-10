import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useRealtimeTable } from './useRealtimeTable'
import { listClients } from '../data/repositories/clientRepository'
import { listProjects } from '../data/repositories/projectRepository'
import { listCategories } from '../data/repositories/categoryRepository'
import { listOrganizationMembers } from '../data/repositories/organizationRepository'
import { listTasks } from '../data/repositories/taskRepository'
import { listWorkSchedules, listCalendarBlocks } from '../data/repositories/scheduleRepository'
import { listDependenciesForOrganization } from '../data/repositories/dependencyRepository'
import { listInboxEntries } from '../data/repositories/inboxRepository'
import { listRecurrenceRules } from '../data/repositories/recurrenceRepository'
import { listTaskTemplates } from '../data/repositories/templateRepository'
import type { Client, Project, Category, TaskListItem } from '../domain/task'
import type { MemberWithProfile } from '../domain/types'
import type { WorkSchedule, CalendarBlock } from '../domain/schedule'
import type { TaskDependency } from '../domain/planning'
import type { InboxEntry } from '../domain/inbox'
import type { RecurrenceRuleRecord } from '../domain/recurrence'
import type { TaskTemplateWithSteps } from '../domain/templates'

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

export function useWorkSchedules() {
  return useOrgResource<WorkSchedule>('work_schedules', (orgId) => listWorkSchedules(orgId))
}

export function useCalendarBlocks() {
  return useOrgResource<CalendarBlock>('calendar_blocks', (orgId) => listCalendarBlocks(orgId))
}

export function useDependencies() {
  return useOrgResource<TaskDependency>('task_dependencies', (orgId) => listDependenciesForOrganization(orgId))
}

export function useInboxEntries() {
  return useOrgResource<InboxEntry>('inbox_entries', (orgId) => listInboxEntries(orgId))
}

export function useRecurrenceRules() {
  return useOrgResource<RecurrenceRuleRecord>('recurrence_rules', (orgId) => listRecurrenceRules(orgId))
}

export function useTaskTemplates() {
  return useOrgResource<TaskTemplateWithSteps>('task_templates', (orgId) => listTaskTemplates(orgId))
}
