import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { listClients, restoreClient, permanentlyDeleteClient } from '../data/repositories/clientRepository'
import { listProjects, restoreProject, permanentlyDeleteProject } from '../data/repositories/projectRepository'
import { listTasks, restoreTask, permanentlyDeleteTask } from '../data/repositories/taskRepository'
import type { Client, Project, TaskListItem } from '../domain/task'

export function TrashPage() {
  const { organization } = useAuth()
  const organizationId = organization?.id
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const [c, p, t] = await Promise.all([
        listClients(organizationId, { includeTrashed: true }),
        listProjects(organizationId, { includeTrashed: true }),
        listTasks(organizationId, { includeTrashed: true }),
      ])
      setClients(c)
      setProjects(p)
      setTasks(t)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a lixeira.')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRestore(kind: 'client' | 'project' | 'task', id: string) {
    if (kind === 'client') await restoreClient(id)
    else if (kind === 'project') await restoreProject(id)
    else await restoreTask(id)
    await load()
  }

  async function handlePermanentDelete(kind: 'client' | 'project' | 'task', id: string, label: string) {
    if (!window.confirm(`Excluir "${label}" definitivamente? Esta ação não pode ser desfeita.`)) return
    if (kind === 'client') await permanentlyDeleteClient(id)
    else if (kind === 'project') await permanentlyDeleteProject(id)
    else await permanentlyDeleteTask(id)
    await load()
  }

  if (loading) return <p>Carregando…</p>

  const isEmpty = clients.length === 0 && projects.length === 0 && tasks.length === 0

  return (
    <div>
      <h1>Lixeira</h1>
      {error && <p className="auth-error">{error}</p>}

      {isEmpty ? (
        <div className="empty-state">A lixeira está vazia.</div>
      ) : (
        <>
          {tasks.length > 0 && (
            <>
              <h2>Tarefas ({tasks.length})</h2>
              <table className="data-table">
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td style={{ width: 200 }}>
                        <button type="button" className="link-button" onClick={() => void handleRestore('task', t.id)}>
                          Restaurar
                        </button>{' '}
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => void handlePermanentDelete('task', t.id, t.title)}
                        >
                          Excluir definitivamente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {clients.length > 0 && (
            <>
              <h2>Clientes ({clients.length})</h2>
              <table className="data-table">
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td style={{ width: 200 }}>
                        <button type="button" className="link-button" onClick={() => void handleRestore('client', c.id)}>
                          Restaurar
                        </button>{' '}
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => void handlePermanentDelete('client', c.id, c.name)}
                        >
                          Excluir definitivamente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {projects.length > 0 && (
            <>
              <h2>Projetos ({projects.length})</h2>
              <table className="data-table">
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td style={{ width: 200 }}>
                        <button type="button" className="link-button" onClick={() => void handleRestore('project', p.id)}>
                          Restaurar
                        </button>{' '}
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => void handlePermanentDelete('project', p.id, p.name)}
                        >
                          Excluir definitivamente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}
