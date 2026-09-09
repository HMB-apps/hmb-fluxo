import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useAuth } from '../auth/AuthProvider'
import { useCategories, useClients, useMembers, useProjects, useTasks } from '../hooks/useOrgData'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { KanbanColumn } from '../components/tasks/KanbanColumn'
import { updateTask } from '../data/repositories/taskRepository'
import { TASK_STATUS_LABELS } from '../domain/task'
import type { TaskListItem, TaskStatus } from '../domain/task'

const BOARD_STATUSES: TaskStatus[] = [
  'inbox',
  'needs_review',
  'planned',
  'in_progress',
  'waiting_client',
  'waiting_internal',
  'paused',
  'done',
]

export function BoardPage() {
  const { user } = useAuth()
  const { items: tasks, loading, error, reload } = useTasks()
  const { items: clients } = useClients()
  const { items: projects } = useProjects()
  const { items: categories } = useCategories()
  const { items: members } = useMembers()

  const [editing, setEditing] = useState<TaskListItem | 'new' | null>(null)
  const [clientFilter, setClientFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (clientFilter && task.clientId !== clientFilter) return false
      if (projectFilter && task.projectId !== projectFilter) return false
      if (categoryFilter && task.categoryId !== categoryFilter) return false
      if (assigneeFilter === 'unassigned' && task.assignedTo) return false
      if (assigneeFilter && assigneeFilter !== 'unassigned' && task.assignedTo !== assigneeFilter) return false
      if (search) {
        const term = search.toLowerCase()
        const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [tasks, clientFilter, projectFilter, categoryFilter, assigneeFilter, search])

  const columns = useMemo(() => {
    const byStatus = new Map<TaskStatus, TaskListItem[]>()
    for (const status of BOARD_STATUSES) byStatus.set(status, [])
    for (const task of filtered) {
      if (byStatus.has(task.status)) byStatus.get(task.status)!.push(task)
    }
    return BOARD_STATUSES.filter((s) => !hideEmpty || (byStatus.get(s)?.length ?? 0) > 0).map((status) => ({
      status,
      tasks: byStatus.get(status) ?? [],
    }))
  }, [filtered, hideEmpty])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.status === newStatus) return
    if (task.scheduleLocked) return
    await updateTask(task.id, task.rowVersion, { status: newStatus })
    reload()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Quadro</h1>
        <button type="button" className="primary-button" onClick={() => setEditing('new')}>
          Nova tarefa
        </button>
      </div>

      <div className="filters-bar">
        <input placeholder="Buscar por título ou descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">Todos os projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          <option value={user?.id ?? ''}>Minhas tarefas</option>
          <option value="unassigned">Sem responsável</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.profile.name}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
          Ocultar colunas vazias
        </label>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
          <div className="kanban-board">
            {columns.map(({ status, tasks: columnTasks }) => (
              <KanbanColumn
                key={status}
                status={status}
                label={TASK_STATUS_LABELS[status]}
                tasks={columnTasks}
                onOpenTask={setEditing}
              />
            ))}
          </div>
        </DndContext>
      )}

      {editing && (
        <TaskFormModal task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  )
}
