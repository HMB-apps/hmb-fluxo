import { useMemo, useState } from 'react'
import { useTasks } from '../hooks/useOrgData'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import type { TaskListItem } from '../domain/task'

export function CompletedPage() {
  const { items: tasks, loading, error, reload } = useTasks()
  const [editing, setEditing] = useState<TaskListItem | null>(null)

  const completed = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'done')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [tasks],
  )

  return (
    <div>
      <h1>Concluídos</h1>
      {error && <p className="auth-error">{error}</p>}
      {loading ? (
        <p>Carregando…</p>
      ) : completed.length === 0 ? (
        <div className="empty-state">Nenhuma tarefa concluída ainda.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Cliente</th>
              <th>Concluída em</th>
              <th>Por</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((task) => (
              <tr key={task.id} onClick={() => setEditing(task)}>
                <td>{task.title}</td>
                <td>{task.clientName ?? '—'}</td>
                <td>{task.completedAt ? new Date(task.completedAt).toLocaleString('pt-BR') : '—'}</td>
                <td>{task.assigneeName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  )
}
