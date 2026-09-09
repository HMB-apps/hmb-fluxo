import { useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { useAuth } from '../../auth/AuthProvider'
import { useClients, useProjects, useCategories, useMembers } from '../../hooks/useOrgData'
import {
  createTask,
  updateTask,
  trashTask,
  TaskConflictError,
  type TaskInput,
} from '../../data/repositories/taskRepository'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../../domain/task'
import type { Task, TaskListItem, TaskPriority, TaskStatus } from '../../domain/task'

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null
  return new Date(value).toISOString()
}

export function TaskFormModal({
  task,
  onClose,
  onSaved,
}: {
  task: Task | TaskListItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const { organization, user } = useAuth()
  const { items: clients } = useClients()
  const { items: projects } = useProjects()
  const { items: categories } = useCategories()
  const { items: members } = useMembers()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [clientId, setClientId] = useState(task?.clientId ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'inbox')
  const [manualPriority, setManualPriority] = useState<TaskPriority | ''>(task?.manualPriority ?? '')
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? '')
  const [deadlineAt, setDeadlineAt] = useState(toDateTimeLocal(task?.deadlineAt ?? null))
  const [internalTargetAt, setInternalTargetAt] = useState(toDateTimeLocal(task?.internalTargetAt ?? null))
  const [plannedStartAt, setPlannedStartAt] = useState(toDateTimeLocal(task?.plannedStartAt ?? null))
  const [plannedEndAt, setPlannedEndAt] = useState(toDateTimeLocal(task?.plannedEndAt ?? null))
  const [estimateMinutes, setEstimateMinutes] = useState(task?.estimateMinutes?.toString() ?? '')
  const [actualMinutes, setActualMinutes] = useState(task?.actualMinutes?.toString() ?? '')
  const [scheduleLocked, setScheduleLocked] = useState(task?.scheduleLocked ?? false)
  const [splittable, setSplittable] = useState(task?.splittable ?? true)
  const [tagsText, setTagsText] = useState(task && 'tags' in task ? task.tags.map((t) => t.name).join(', ') : '')

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    setSaveStatus('saving')
    setError(null)

    const input: TaskInput = {
      title,
      description: description || null,
      clientId: clientId || null,
      projectId: projectId || null,
      categoryId: categoryId || null,
      status,
      manualPriority: manualPriority || null,
      assignedTo: assignedTo || null,
      deadlineAt: fromDateTimeLocal(deadlineAt),
      internalTargetAt: fromDateTimeLocal(internalTargetAt),
      plannedStartAt: fromDateTimeLocal(plannedStartAt),
      plannedEndAt: fromDateTimeLocal(plannedEndAt),
      estimateMinutes: estimateMinutes ? Number(estimateMinutes) : null,
      actualMinutes: actualMinutes ? Number(actualMinutes) : null,
      scheduleLocked,
      splittable,
      tagNames: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }

    try {
      if (task) {
        await updateTask(task.id, task.rowVersion, input)
      } else {
        await createTask(organization.id, user.id, input)
      }
      setSaveStatus('saved')
      onSaved()
      onClose()
    } catch (err) {
      if (err instanceof TaskConflictError) {
        setSaveStatus('conflict')
        setError(err.message)
      } else {
        setSaveStatus('error')
        setError(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.')
      }
    }
  }

  async function handleTrash() {
    if (!task) return
    if (!window.confirm(`Enviar "${task.title}" para a lixeira?`)) return
    await trashTask(task.id)
    onSaved()
    onClose()
  }

  return (
    <Modal title={task ? 'Editar tarefa' : 'Nova tarefa'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-field-full">
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label className="form-field-full">
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>

        <label>
          Cliente
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Sem projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Responsável
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.profile.name}
                {m.userId === user?.id ? ' (eu)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioridade manual
          <select value={manualPriority} onChange={(e) => setManualPriority(e.target.value as TaskPriority | '')}>
            <option value="">Automática (Fase 4)</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Prazo de entrega ao cliente
          <input type="datetime-local" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} />
        </label>
        <label>
          Meta interna
          <input
            type="datetime-local"
            value={internalTargetAt}
            onChange={(e) => setInternalTargetAt(e.target.value)}
          />
        </label>
        <label>
          Início planejado
          <input type="datetime-local" value={plannedStartAt} onChange={(e) => setPlannedStartAt(e.target.value)} />
        </label>
        <label>
          Fim planejado
          <input type="datetime-local" value={plannedEndAt} onChange={(e) => setPlannedEndAt(e.target.value)} />
        </label>
        <label>
          Duração estimada (min)
          <input type="number" min={0} value={estimateMinutes} onChange={(e) => setEstimateMinutes(e.target.value)} />
        </label>
        <label>
          Duração real (min)
          <input type="number" min={0} value={actualMinutes} onChange={(e) => setActualMinutes(e.target.value)} />
        </label>

        <label className="form-field-full">
          Tags (separadas por vírgula)
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ex: urgente, revisão" />
        </label>

        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={scheduleLocked} onChange={(e) => setScheduleLocked(e.target.checked)} />
          Travar posição na agenda
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={splittable} onChange={(e) => setSplittable(e.target.checked)} />
          Pode ser dividida em blocos
        </label>

        <div className="form-actions form-field-full">
          <div>
            {task && (
              <button type="button" className="danger-button" onClick={() => void handleTrash()}>
                Enviar para lixeira
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`save-status ${saveStatus === 'conflict' || saveStatus === 'error' ? 'error' : ''}`}>
              {saveStatus === 'saving' && 'Salvando…'}
              {(saveStatus === 'error' || saveStatus === 'conflict') && error}
            </span>
            <button type="submit" className="primary-button" disabled={saveStatus === 'saving' || !title.trim()}>
              Salvar
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
