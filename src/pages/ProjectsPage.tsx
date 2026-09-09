import { useState } from 'react'
import { useClients, useProjects } from '../hooks/useOrgData'
import { ProjectFormModal } from '../components/projects/ProjectFormModal'
import { trashProject } from '../data/repositories/projectRepository'
import { PROJECT_STATUS_LABELS, type Project } from '../domain/task'

export function ProjectsPage() {
  const { items: projects, loading, error, reload } = useProjects()
  const { items: clients } = useClients()
  const [editing, setEditing] = useState<Project | 'new' | null>(null)

  async function handleTrash(project: Project) {
    if (!window.confirm(`Enviar "${project.name}" para a lixeira?`)) return
    await trashProject(project.id)
    reload()
  }

  function clientName(clientId: string | null): string {
    if (!clientId) return 'HMB (interno)'
    return clients.find((c) => c.id === clientId)?.name ?? '—'
  }

  return (
    <div>
      <div className="page-header">
        <h1>Projetos</h1>
        <button type="button" className="primary-button" onClick={() => setEditing('new')}>
          Novo projeto
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">Nenhum projeto cadastrado ainda.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cliente</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} onClick={() => setEditing(project)}>
                <td>{project.name}</td>
                <td>{clientName(project.clientId)}</td>
                <td>{PROJECT_STATUS_LABELS[project.status]}</td>
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleTrash(project)
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <ProjectFormModal
          project={editing === 'new' ? null : editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
