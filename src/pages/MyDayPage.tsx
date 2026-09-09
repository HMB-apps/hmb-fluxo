import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useCalendarBlocks, useMembers, useTasks, useWorkSchedules } from '../hooks/useOrgData'
import { computeAvailableMinutes, computeWorkloadMinutes, dateKey, formatMinutesAsHours, todayKey } from '../domain/capacity'
import { DEFAULT_WORK_SCHEDULE, type WorkSchedule } from '../domain/schedule'
import { occupiesCapacity, TASK_STATUS_LABELS } from '../domain/task'
import { updateTask } from '../data/repositories/taskRepository'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import type { TaskListItem, TaskStatus } from '../domain/task'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function MyDayPage() {
  const { user, profile } = useAuth()
  const { items: tasks, reload } = useTasks()
  const { items: schedules } = useWorkSchedules()
  const { items: blocks } = useCalendarBlocks()
  const { items: members } = useMembers()
  const [viewingUserId, setViewingUserId] = useState<string | undefined>(user?.id)
  const [editing, setEditing] = useState<TaskListItem | null>(null)

  const activeUserId = viewingUserId ?? user?.id ?? ''
  const today = todayKey()

  const schedule: WorkSchedule =
    schedules.find((s) => s.userId === activeUserId) ?? {
      id: 'default',
      organizationId: '',
      userId: activeUserId,
      ...DEFAULT_WORK_SCHEDULE,
    }

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assignedTo === activeUserId && !t.deletedAt),
    [tasks, activeUserId],
  )

  const overdue = useMemo(
    () =>
      myTasks.filter(
        (t) => t.deadlineAt && dateKey(t.deadlineAt) < today && occupiesCapacity(t.status),
      ),
    [myTasks, today],
  )

  const todayTasks = useMemo(
    () =>
      myTasks
        .filter((t) => t.plannedStartAt && dateKey(t.plannedStartAt) === today && occupiesCapacity(t.status))
        .sort((a, b) => (a.plannedStartAt ?? '').localeCompare(b.plannedStartAt ?? '')),
    [myTasks, today],
  )

  const deliveriesToday = useMemo(
    () => myTasks.filter((t) => t.deadlineAt && dateKey(t.deadlineAt) === today),
    [myTasks, today],
  )

  const waitingFollowup = useMemo(
    () =>
      myTasks.filter(
        (t) =>
          (t.status === 'waiting_client' || t.status === 'waiting_internal') &&
          t.waitingFollowupAt &&
          dateKey(t.waitingFollowupAt) <= today,
      ),
    [myTasks, today],
  )

  const capacityMinutes = computeAvailableMinutes(schedule, today, blocks)
  const workloadMinutes = computeWorkloadMinutes(myTasks, activeUserId, today)
  const occupancyPct = capacityMinutes > 0 ? Math.round((workloadMinutes / capacityMinutes) * 100) : workloadMinutes > 0 ? 100 : 0
  const overloaded = workloadMinutes > capacityMinutes

  async function handleQuickStatus(task: TaskListItem, status: TaskStatus) {
    await updateTask(task.id, task.rowVersion, { status })
    reload()
  }

  const viewingSelf = activeUserId === user?.id

  return (
    <div>
      <div className="page-header">
        <h1>
          {greeting()}
          {viewingSelf ? `, ${profile?.name}` : ''}
        </h1>
        <select value={activeUserId} onChange={(e) => setViewingUserId(e.target.value)}>
          <option value={user?.id}>Meu dia</option>
          {members
            .filter((m) => m.userId !== user?.id)
            .map((m) => (
              <option key={m.userId} value={m.userId}>
                Dia de {m.profile.name}
              </option>
            ))}
        </select>
      </div>

      <p>
        {viewingSelf ? 'Você possui' : `${members.find((m) => m.userId === activeUserId)?.profile.name ?? ''} possui`}{' '}
        <strong>{formatMinutesAsHours(capacityMinutes)}</strong> disponíveis hoje e{' '}
        <strong>{formatMinutesAsHours(workloadMinutes)}</strong> de trabalho programado ({occupancyPct}% de ocupação).
        {overloaded && <span className="auth-error"> A agenda de hoje está sobrecarregada.</span>}
      </p>

      {overdue.length > 0 && (
        <>
          <h2>Atrasadas ({overdue.length})</h2>
          <table className="data-table">
            <tbody>
              {overdue.map((task) => (
                <tr key={task.id} onClick={() => setEditing(task)}>
                  <td>{task.title}</td>
                  <td>{task.clientName ?? '—'}</td>
                  <td>{task.deadlineAt && new Date(task.deadlineAt).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Hoje ({todayTasks.length})</h2>
      {todayTasks.length === 0 ? (
        <div className="empty-state">Nenhuma tarefa planejada para hoje.</div>
      ) : (
        <table className="data-table">
          <tbody>
            {todayTasks.map((task) => (
              <tr key={task.id}>
                <td onClick={() => setEditing(task)}>{task.title}</td>
                <td>{TASK_STATUS_LABELS[task.status]}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {task.status !== 'in_progress' && (
                    <button type="button" className="link-button" onClick={() => void handleQuickStatus(task, 'in_progress')}>
                      Iniciar
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <>
                      {' '}
                      <button type="button" className="link-button" onClick={() => void handleQuickStatus(task, 'paused')}>
                        Pausar
                      </button>
                    </>
                  )}{' '}
                  <button type="button" className="link-button" onClick={() => void handleQuickStatus(task, 'done')}>
                    Concluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deliveriesToday.length > 0 && (
        <>
          <h2>Entregas ao cliente hoje ({deliveriesToday.length})</h2>
          <table className="data-table">
            <tbody>
              {deliveriesToday.map((task) => (
                <tr key={task.id} onClick={() => setEditing(task)}>
                  <td>{task.title}</td>
                  <td>{task.clientName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {waitingFollowup.length > 0 && (
        <>
          <h2>Aguardando ação ({waitingFollowup.length})</h2>
          <table className="data-table">
            <tbody>
              {waitingFollowup.map((task) => (
                <tr key={task.id} onClick={() => setEditing(task)}>
                  <td>{task.title}</td>
                  <td>{TASK_STATUS_LABELS[task.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  )
}
