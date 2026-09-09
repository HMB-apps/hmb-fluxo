import { useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { createProject, updateProject, type ProjectInput } from '../../data/repositories/projectRepository'
import { useAuth } from '../../auth/AuthProvider'
import { PROJECT_STATUS_LABELS, type Project, type ProjectStatus } from '../../domain/task'
import type { Client } from '../../domain/task'

export function ProjectFormModal({
  project,
  clients,
  onClose,
  onSaved,
}: {
  project: Project | null
  clients: Client[]
  onClose: () => void
  onSaved: () => void
}) {
  const { organization, user } = useAuth()
  const [name, setName] = useState(project?.name ?? '')
  const [clientId, setClientId] = useState(project?.clientId ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [color, setColor] = useState(project?.color ?? '#2563eb')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [endDate, setEndDate] = useState(project?.endDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    setSaving(true)
    setError(null)
    const input: ProjectInput = {
      name,
      clientId: clientId || null,
      description: description || null,
      status,
      color,
      startDate: startDate || null,
      endDate: endDate || null,
    }
    try {
      if (project) await updateProject(project.id, input)
      else await createProject(organization.id, user.id, input)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o projeto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={project ? 'Editar projeto' : 'Novo projeto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-field-full">
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Cliente
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">HMB (interno)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Data de início
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          Data de término
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label>
          Cor
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="form-field-full">
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        <div className="form-actions form-field-full">
          <span className="save-status error">{error}</span>
          <button type="submit" className="primary-button" disabled={saving || !name.trim()}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
