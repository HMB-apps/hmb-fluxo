import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Modal } from '../common/Modal'
import { useAuth } from '../../auth/AuthProvider'
import { generatePlan } from '../../domain/planner'
import { computeWorkloadMinutes, todayKey } from '../../domain/capacity'
import { occupiesCapacity } from '../../domain/task'
import { updateTask } from '../../data/repositories/taskRepository'
import { createPlannerRun } from '../../data/repositories/plannerRunRepository'
import type { PlannerTask, PlanProposalItem } from '../../domain/planner'
import type { TaskListItem } from '../../domain/task'
import type { TaskDependency } from '../../domain/planning'
import type { WorkSchedule, CalendarBlock } from '../../domain/schedule'
import type { PlannerRunChange } from '../../domain/planning'

const HORIZON_DAYS = 14

export function PlannerModal({
  tasks,
  dependencies,
  schedules,
  blocks,
  onClose,
  onApplied,
}: {
  tasks: TaskListItem[]
  dependencies: TaskDependency[]
  schedules: WorkSchedule[]
  blocks: CalendarBlock[]
  onClose: () => void
  onApplied: () => void
}) {
  const { organization, user } = useAuth()
  const today = todayKey()

  const candidateTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          !t.deletedAt &&
          !t.scheduleLocked &&
          t.assignedTo &&
          t.estimateMinutes &&
          t.estimateMinutes > 0 &&
          !t.plannedStartAt &&
          occupiesCapacity(t.status),
      ),
    [tasks],
  )

  const proposals = useMemo(() => {
    if (candidateTasks.length === 0) return []

    const plannerTasks: PlannerTask[] = candidateTasks.map((t) => ({
      id: t.id,
      assignedTo: t.assignedTo!,
      estimateMinutes: t.estimateMinutes!,
      deadlineAt: t.deadlineAt,
      blockingTaskIds: dependencies.filter((d) => d.blockedTaskId === t.id).map((d) => d.blockingTaskId),
      manualPriority: t.manualPriority,
      suggestedPriority: t.suggestedPriority,
    }))

    const dependencyEndDay: Record<string, string> = {}
    for (const t of tasks) {
      if (t.plannedEndAt) dependencyEndDay[t.id] = t.plannedEndAt.slice(0, 10)
    }

    const existingWorkloadMinutes: Record<string, number> = {}
    const involvedUsers = [...new Set(plannerTasks.map((t) => t.assignedTo))]
    for (const userId of involvedUsers) {
      for (let i = 0; i < HORIZON_DAYS; i++) {
        const day = format(addDays(new Date(`${today}T12:00:00`), i), 'yyyy-MM-dd')
        existingWorkloadMinutes[`${userId}::${day}`] = computeWorkloadMinutes(tasks, userId, day)
      }
    }

    return generatePlan(plannerTasks, {
      schedules,
      blocks,
      startDate: today,
      horizonDays: HORIZON_DAYS,
      existingWorkloadMinutes,
      dependencyEndDay,
    })
  }, [candidateTasks, dependencies, tasks, schedules, blocks, today])

  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposals.map((p) => p.taskId)))
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  function toggle(taskId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  async function handleApply() {
    if (!organization || !user) return
    setApplying(true)
    setError(null)
    const changes: PlannerRunChange[] = []
    try {
      for (const proposal of proposals) {
        if (!selected.has(proposal.taskId)) continue
        const current = taskById.get(proposal.taskId)
        if (!current) continue
        await updateTask(current.id, current.rowVersion, {
          plannedStartAt: proposal.startAt,
          plannedEndAt: proposal.endAt,
        })
        changes.push({
          taskId: current.id,
          taskTitle: current.title,
          before: { plannedStartAt: current.plannedStartAt, plannedEndAt: current.plannedEndAt },
          after: { plannedStartAt: proposal.startAt, plannedEndAt: proposal.endAt },
        })
      }
      if (changes.length > 0) {
        await createPlannerRun(organization.id, user.id, changes)
      }
      onApplied()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível aplicar o planejamento.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal title="Planejamento automático — prévia" onClose={onClose} wide>
      {proposals.length === 0 ? (
        <p>Nenhuma tarefa pendente de agendamento (com responsável e estimativa, mas sem início planejado).</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text)' }}>
            Nada é aplicado ainda. Revise abaixo, desmarque o que não quiser e confirme.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th>Novo início planejado</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal: PlanProposalItem) => {
                const t = taskById.get(proposal.taskId)
                return (
                  <tr key={proposal.taskId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(proposal.taskId)}
                        onChange={() => toggle(proposal.taskId)}
                      />
                    </td>
                    <td>{t?.title ?? proposal.taskId}</td>
                    <td>{t?.assigneeName ?? '—'}</td>
                    <td>{new Date(proposal.startAt).toLocaleString('pt-BR')}</td>
                    <td>
                      {proposal.conflict ? (
                        <span className="pill priority-critical">{proposal.conflict}</span>
                      ) : (
                        <span className="pill priority-low">Ok</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="form-actions">
            {error && <span className="save-status error">{error}</span>}
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleApply()}
              disabled={applying || selected.size === 0}
            >
              {applying ? 'Aplicando…' : `Aplicar selecionadas (${selected.size})`}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
