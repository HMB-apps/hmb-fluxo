import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { useTaskTemplates, useClients, useProjects, useMembers } from '../../hooks/useOrgData'
import { createTaskTemplate, deleteTaskTemplate, applyTaskTemplate, type TemplateStepInput } from '../../data/repositories/templateRepository'
import type { TaskTemplateWithSteps } from '../../domain/templates'

function emptyStep(): TemplateStepInput {
  return { title: '', description: '', estimateMinutes: null, dependsOnPosition: null }
}

export function TemplatesSection() {
  const { organization, user } = useAuth()
  const { items: templates, loading, reload } = useTaskTemplates()
  const { items: clients } = useClients()
  const { items: projects } = useProjects()
  const { items: members } = useMembers()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<TemplateStepInput[]>([emptyStep()])
  const [error, setError] = useState<string | null>(null)

  const [applyingTemplate, setApplyingTemplate] = useState<TaskTemplateWithSteps | null>(null)
  const [applyClientId, setApplyClientId] = useState('')
  const [applyProjectId, setApplyProjectId] = useState('')
  const [applyAssignedTo, setApplyAssignedTo] = useState('')
  const [applyStatus, setApplyStatus] = useState<string | null>(null)

  function updateStep(index: number, patch: Partial<TemplateStepInput>) {
    setSteps((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function addStep() {
    setSteps((current) => [...current, emptyStep()])
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, i) => i !== index))
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    const validSteps = steps.filter((s) => s.title.trim())
    if (!name.trim() || validSteps.length === 0) return
    setError(null)
    try {
      await createTaskTemplate(organization.id, user.id, { name: name.trim(), description: description || null }, validSteps)
      setName('')
      setDescription('')
      setSteps([emptyStep()])
      setCreating(false)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o modelo.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir este modelo? As tarefas já criadas a partir dele não são afetadas.')) return
    await deleteTaskTemplate(id)
    reload()
  }

  async function handleApply() {
    if (!organization || !user || !applyingTemplate) return
    setApplyStatus('Aplicando…')
    try {
      const created = await applyTaskTemplate(organization.id, user.id, applyingTemplate, {
        clientId: applyClientId || null,
        projectId: applyProjectId || null,
        assignedTo: applyAssignedTo || null,
      })
      setApplyStatus(`${created.length} demanda(s) criada(s) a partir do modelo.`)
      setTimeout(() => {
        setApplyingTemplate(null)
        setApplyStatus(null)
      }, 1500)
    } catch (err) {
      setApplyStatus(err instanceof Error ? err.message : 'Não foi possível aplicar o modelo.')
    }
  }

  if (loading) return <p>Carregando…</p>

  return (
    <div>
      <ul className="invitation-list">
        {templates.map((template) => (
          <li key={template.id} className="invitation-item">
            <div className="invitation-item-row">
              <span>
                <strong>{template.name}</strong> — {template.steps.length} etapa(s)
              </span>
              <span style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="link-button" onClick={() => setApplyingTemplate(template)}>
                  Aplicar
                </button>
                <button type="button" className="link-button" onClick={() => void handleDelete(template.id)}>
                  Excluir
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {!creating ? (
        <button type="button" className="secondary-button" onClick={() => setCreating(true)}>
          + Novo modelo de trabalho
        </button>
      ) : (
        <form onSubmit={handleCreate} className="form-grid" style={{ marginTop: 12 }}>
          <label className="form-field-full">
            Nome do modelo
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Criação de landing page" required />
          </label>
          <label className="form-field-full">
            Descrição (opcional)
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="form-field-full">
            <strong style={{ fontSize: 12 }}>Etapas (na ordem em que devem acontecer):</strong>
            {steps.map((step, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, width: 20 }}>{index + 1}.</span>
                <input
                  value={step.title}
                  onChange={(e) => updateStep(index, { title: e.target.value })}
                  placeholder="Título da etapa"
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  min={0}
                  value={step.estimateMinutes ?? ''}
                  onChange={(e) => updateStep(index, { estimateMinutes: e.target.value ? Number(e.target.value) : null })}
                  placeholder="min"
                  style={{ width: 70 }}
                />
                <select
                  value={step.dependsOnPosition ?? ''}
                  onChange={(e) => updateStep(index, { dependsOnPosition: e.target.value ? Number(e.target.value) : null })}
                  style={{ flex: 1 }}
                >
                  <option value="">Sem dependência</option>
                  {steps.slice(0, index).map((s, i) => (
                    <option key={i} value={i}>
                      Depende de: {s.title || `etapa ${i + 1}`}
                    </option>
                  ))}
                </select>
                <button type="button" className="link-button" onClick={() => removeStep(index)}>
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="link-button" onClick={addStep} style={{ marginTop: 8 }}>
              + Adicionar etapa
            </button>
          </div>

          {error && <p className="auth-error form-field-full">{error}</p>}

          <div className="form-actions form-field-full">
            <button type="button" className="link-button" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button type="submit" className="primary-button">
              Salvar modelo
            </button>
          </div>
        </form>
      )}

      {applyingTemplate && (
        <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 6, padding: 12 }}>
          <strong>Aplicar "{applyingTemplate.name}"</strong>
          <div className="form-grid" style={{ marginTop: 8 }}>
            <label>
              Cliente
              <select value={applyClientId} onChange={(e) => setApplyClientId(e.target.value)}>
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Projeto
              <select value={applyProjectId} onChange={(e) => setApplyProjectId(e.target.value)}>
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Responsável
              <select value={applyAssignedTo} onChange={(e) => setApplyAssignedTo(e.target.value)}>
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.profile.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => void handleApply()}>
              Criar demandas
            </button>
            <button type="button" className="link-button" onClick={() => setApplyingTemplate(null)}>
              Cancelar
            </button>
          </div>
          {applyStatus && <p style={{ fontSize: 12, marginTop: 8 }}>{applyStatus}</p>}
        </div>
      )}
    </div>
  )
}
