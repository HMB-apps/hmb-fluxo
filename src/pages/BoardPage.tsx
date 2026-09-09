import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useCategories, useClients, useMembers, useProjects, useTasks } from '../hooks/useOrgData'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '../domain/task'
import type { TaskListItem, TaskStatus } from '../domain/task'

export function BoardPage() {
  const { user } = useAuth()
  const { items: tasks, loading, error, reload } = useTasks()
  const { items: clients } = useClients()
  const { items: projects } = useProjects()
  const { items: categories } = useCategories()
  const { items: members } = useMembers()

  const [editing, setEditing] = useState<TaskListItem | 'new' | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false
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
  }, [tasks, statusFilter, clientFilter, projectFilter, categoryFilter, assigneeFilter, search])

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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Nenhuma tarefa encontrada com esses filtros.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Responsável</th>
              <th>Prazo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => (
              <tr key={task.id} onClick={() => setEditing(task)}>
                <td>
                  {task.title}
                  {task.tags.length > 0 && (
                    <div>
                      {task.tags.map((tag) => (
                        <span key={tag.id} className="tag-chip">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>{task.clientName ?? '—'}</td>
                <td>{TASK_STATUS_LABELS[task.status as TaskStatus]}</td>
                <td>
                  {task.manualPriority && (
                    <span className={`pill priority-${task.manualPriority}`}>
                      {TASK_PRIORITY_LABELS[task.manualPriority]}
                    </span>
                  )}
                </td>
                <td>{task.assigneeName ?? 'Sem responsável'}</td>
                <td>{task.deadlineAt ? new Date(task.deadlineAt).toLocaleDateString('pt-BR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <TaskFormModal task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  )
}
