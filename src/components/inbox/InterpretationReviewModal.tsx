import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { useAuth } from '../../auth/AuthProvider'
import { useClients, useCategories } from '../../hooks/useOrgData'
import { createTask } from '../../data/repositories/taskRepository'
import { addDependency } from '../../data/repositories/dependencyRepository'
import { computeSuggestedPriority } from '../../domain/priority'
import { LOW_CONFIDENCE_THRESHOLD } from '../../domain/inbox'
import { TASK_PRIORITY_LABELS } from '../../domain/task'
import type { InterpretedTaskDraft } from '../../domain/inbox'
import type { TaskPriority } from '../../domain/task'

interface EditableDraft {
  title: string
  description: string
  clientId: string
  categoryId: string
  deadlineAt: string
  estimateMinutes: string
  priority: TaskPriority | ''
  tags: string
  dependsOnIndex: number | null
  removed: boolean
  lowConfidenceFields: Set<string>
  reasons: Record<string, string>
}

function findByName<T extends { id: string; name: string }>(items: T[], name: string | null): string {
  if (!name) return ''
  const match = items.find((i) => i.name.toLowerCase() === name.toLowerCase())
  return match?.id ?? ''
}

function toEditable(draft: InterpretedTaskDraft, clients: { id: string; name: string }[], categories: { id: string; name: string }[]): EditableDraft {
  const lowConfidenceFields = new Set<string>()
  const reasons: Record<string, string> = {}
  for (const [key, field] of Object.entries(draft)) {
    if (field.value !== null && field.confidence < LOW_CONFIDENCE_THRESHOLD) lowConfidenceFields.add(key)
    if (field.reason) reasons[key] = field.reason
  }
  return {
    title: draft.title.value ?? '',
    description: draft.description.value ?? '',
    clientId: findByName(clients, draft.clientName.value),
    categoryId: findByName(categories, draft.categoryName.value),
    deadlineAt: draft.deadlineAt.value ?? '',
    estimateMinutes: draft.estimateMinutes.value?.toString() ?? '',
    priority: draft.priority.value ?? '',
    tags: (draft.tags.value ?? []).join(', '),
    dependsOnIndex: draft.dependsOnIndex.value,
    removed: false,
    lowConfidenceFields,
    reasons,
  }
}

export function InterpretationReviewModal({
  items,
  onClose,
  onConfirmed,
}: {
  items: InterpretedTaskDraft[]
  onClose: () => void
  onConfirmed: () => void
}) {
  const { organization, user } = useAuth()
  const navigate = useNavigate()
  const { items: clients } = useClients()
  const { items: categories } = useCategories()

  const [drafts, setDrafts] = useState<EditableDraft[]>(() => items.map((d) => toEditable(d, clients, categories)))
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const remaining = useMemo(() => drafts.filter((d) => !d.removed), [drafts])

  function updateDraft(index: number, patch: Partial<EditableDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function fieldClass(draft: EditableDraft, field: string): string {
    return draft.lowConfidenceFields.has(field) ? 'form-field low-confidence-field' : 'form-field'
  }

  async function handleConfirmAll() {
    if (!organization || !user) return
    setConfirming(true)
    setError(null)
    try {
      const createdIds: (string | null)[] = []
      for (const draft of drafts) {
        if (draft.removed || !draft.title.trim()) {
          createdIds.push(null)
          continue
        }
        const client = clients.find((c) => c.id === draft.clientId)
        const suggested = computeSuggestedPriority({
          deadlineAt: draft.deadlineAt ? new Date(draft.deadlineAt).toISOString() : null,
          blocksCount: 0,
          hasUnresolvedDependency: draft.dependsOnIndex !== null,
          clientStrategicWeight: client?.strategicWeight ?? null,
        })
        const task = await createTask(organization.id, user.id, {
          title: draft.title.trim(),
          description: draft.description || null,
          clientId: draft.clientId || null,
          categoryId: draft.categoryId || null,
          deadlineAt: draft.deadlineAt ? new Date(draft.deadlineAt).toISOString() : null,
          estimateMinutes: draft.estimateMinutes ? Number(draft.estimateMinutes) : null,
          manualPriority: draft.priority || null,
          status: 'needs_review',
          tagNames: draft.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          suggestedPriority: suggested.level,
          priorityScore: suggested.score,
          priorityReason: suggested.reason,
        })
        createdIds.push(task.id)
      }

      for (let i = 0; i < drafts.length; i++) {
        const draft = drafts[i]!
        const blockedId = createdIds[i]
        if (!blockedId || draft.dependsOnIndex === null) continue
        const blockingId = createdIds[draft.dependsOnIndex]
        if (blockingId) {
          try {
            await addDependency(organization.id, user.id, blockingId, blockedId)
          } catch {
            // Dependência sugerida pela IA não pôde ser criada (ex.: ciclo);
            // as tarefas já foram criadas, então seguimos sem travar o fluxo.
          }
        }
      }

      setDone(true)
      onConfirmed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar as tarefas.')
    } finally {
      setConfirming(false)
    }
  }

  if (done) {
    return (
      <Modal title="Tarefas criadas" onClose={onClose}>
        <p>{remaining.length} tarefa(s) criada(s) com sucesso, com status "Precisa revisar".</p>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              onClose()
              navigate('/linha-do-tempo')
            }}
          >
            Planejar automaticamente
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Revisar demandas interpretadas" onClose={onClose} wide>
      <p style={{ fontSize: 13, color: 'var(--text)' }}>
        Campos destacados têm baixa confiança — revise antes de confirmar. Nada é salvo até você confirmar.
      </p>
      {error && <p className="auth-error">{error}</p>}

      {drafts.map((draft, index) =>
        draft.removed ? null : (
          <div key={index} className="inbox-draft-card">
            <div className="form-actions" style={{ marginTop: 0, marginBottom: 8 }}>
              <strong>Demanda {index + 1}</strong>
              <button type="button" className="link-button" onClick={() => updateDraft(index, { removed: true })}>
                Descartar esta
              </button>
            </div>
            <div className="form-grid">
              <label className={`${fieldClass(draft, 'title')} form-field-full`}>
                Título
                {draft.lowConfidenceFields.has('title') && (
                  <span className="confidence-hint">{draft.reasons.title}</span>
                )}
                <input value={draft.title} onChange={(e) => updateDraft(index, { title: e.target.value })} />
              </label>
              <label className={`${fieldClass(draft, 'description')} form-field-full`}>
                Descrição
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => updateDraft(index, { description: e.target.value })}
                />
              </label>
              <label className={fieldClass(draft, 'clientName')}>
                Cliente
                {draft.lowConfidenceFields.has('clientName') && (
                  <span className="confidence-hint">{draft.reasons.clientName}</span>
                )}
                <select value={draft.clientId} onChange={(e) => updateDraft(index, { clientId: e.target.value })}>
                  <option value="">Sem cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={fieldClass(draft, 'categoryName')}>
                Categoria
                <select value={draft.categoryId} onChange={(e) => updateDraft(index, { categoryId: e.target.value })}>
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
              <label className={fieldClass(draft, 'deadlineAt')}>
                Prazo de entrega
                {draft.lowConfidenceFields.has('deadlineAt') && (
                  <span className="confidence-hint">{draft.reasons.deadlineAt}</span>
                )}
                <input
                  type="date"
                  value={draft.deadlineAt}
                  onChange={(e) => updateDraft(index, { deadlineAt: e.target.value })}
                />
              </label>
              <label className={fieldClass(draft, 'estimateMinutes')}>
                Duração estimada (min)
                <input
                  type="number"
                  min={0}
                  value={draft.estimateMinutes}
                  onChange={(e) => updateDraft(index, { estimateMinutes: e.target.value })}
                />
              </label>
              <label className={fieldClass(draft, 'priority')}>
                Prioridade
                <select
                  value={draft.priority}
                  onChange={(e) => updateDraft(index, { priority: e.target.value as TaskPriority | '' })}
                >
                  <option value="">Usar a sugerida</option>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field-full">
                Tags
                <input value={draft.tags} onChange={(e) => updateDraft(index, { tags: e.target.value })} />
              </label>
              {draft.dependsOnIndex !== null && drafts[draft.dependsOnIndex] && !drafts[draft.dependsOnIndex]!.removed && (
                <p className="form-field-full" style={{ fontSize: 12, color: 'var(--text)' }}>
                  Provavelmente depende de: <strong>{drafts[draft.dependsOnIndex]!.title || `Demanda ${draft.dependsOnIndex + 1}`}</strong>
                </p>
              )}
            </div>
          </div>
        ),
      )}

      <div className="form-actions">
        <span>{remaining.length} demanda(s) serão criadas</span>
        <button type="button" className="primary-button" onClick={() => void handleConfirmAll()} disabled={confirming || remaining.length === 0}>
          {confirming ? 'Criando…' : 'Confirmar todas'}
        </button>
      </div>
    </Modal>
  )
}
