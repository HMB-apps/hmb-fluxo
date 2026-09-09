import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClient } from '../data/repositories/clientRepository'
import { listTasks } from '../data/repositories/taskRepository'
import { TASK_STATUS_LABELS } from '../domain/task'
import type { Client, TaskListItem } from '../domain/task'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let active = true
    async function load() {
      setLoading(true)
      const c = await getClient(id!)
      if (!active) return
      setClient(c)
      if (c) {
        const t = await listTasks(c.organizationId, { clientId: c.id })
        if (active) setTasks(t)
      }
      if (active) setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) return <p>Carregando…</p>
  if (!client) return <p>Cliente não encontrado.</p>

  const openTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'canceled' && t.status !== 'archived')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div>
      <button type="button" className="link-button" onClick={() => navigate('/clientes')}>
        ← Voltar para clientes
      </button>
      <div className="page-header">
        <h1>{client.name}</h1>
      </div>
      {client.notes && <p>{client.notes}</p>}

      <h2>Demandas abertas ({openTasks.length})</h2>
      {openTasks.length === 0 ? (
        <div className="empty-state">Nenhuma demanda aberta para este cliente.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            {openTasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{TASK_STATUS_LABELS[task.status]}</td>
                <td>{task.assigneeName ?? 'Sem responsável'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Concluídas ({doneTasks.length})</h2>
      {doneTasks.length === 0 ? (
        <div className="empty-state">Nenhuma tarefa concluída ainda.</div>
      ) : (
        <table className="data-table">
          <tbody>
            {doneTasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
