import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useMembers, useTasks, useWorkSchedules, useCalendarBlocks } from '../hooks/useOrgData'
import { KanbanCard } from '../components/tasks/KanbanCard'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { updateTask } from '../data/repositories/taskRepository'
import { computeAvailableMinutes, computeWorkloadMinutes, formatMinutesAsHours, todayKey } from '../domain/capacity'
import { DEFAULT_WORK_SCHEDULE, type WorkSchedule } from '../domain/schedule'
import { occupiesCapacity } from '../domain/task'
import type { TaskListItem } from '../domain/task'

const UNASSIGNED = 'unassigned'

function TeamLane({
  laneId,
  title,
  tasks,
  capacityLabel,
  overloaded,
  onOpenTask,
}: {
  laneId: string
  title: string
  tasks: TaskListItem[]
  capacityLabel: string | null
  overloaded: boolean
  onOpenTask: (task: TaskListItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId })
  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? ' kanban-column-over' : ''}`} style={{ flex: '1 1 280px' }}>
      <div className="kanban-column-header">
        <span>{title}</span>
        <span className="pill">{tasks.length}</span>
      </div>
      {capacityLabel && (
        <div style={{ padding: '6px 12px', fontSize: 12, color: overloaded ? 'var(--danger)' : 'var(--text)' }}>
          {capacityLabel}
          {overloaded && ' — sobrecarregado'}
        </div>
      )}
      <div className="kanban-column-body">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
        ))}
      </div>
    </div>
  )
}

export function TeamPage() {
  const { items: members } = useMembers()
  const { items: tasks, reload } = useTasks()
  const { items: schedules } = useWorkSchedules()
  const { items: blocks } = useCalendarBlocks()
  const [editing, setEditing] = useState<TaskListItem | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const today = todayKey()

  const activeTasks = useMemo(() => tasks.filter((t) => !t.deletedAt && occupiesCapacity(t.status)), [tasks])

  function tasksFor(userId: string | null): TaskListItem[] {
    return activeTasks.filter((t) => t.assignedTo === userId)
  }

  function capacityFor(userId: string): { label: string; overloaded: boolean } {
    const schedule: WorkSchedule =
      schedules.find((s) => s.userId === userId) ?? { id: 'default', organizationId: '', userId, ...DEFAULT_WORK_SCHEDULE }
    const capacity = computeAvailableMinutes(schedule, today, blocks)
    const workload = computeWorkloadMinutes(activeTasks, userId, today)
    return {
      label: `Hoje: ${formatMinutesAsHours(workload)} de ${formatMinutesAsHours(capacity)}`,
      overloaded: workload > capacity,
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const targetUserId = over.id === UNASSIGNED ? null : (over.id as string)
    if (task.assignedTo === targetUserId) return
    if (task.scheduleLocked) return

    if (targetUserId) {
      const { overloaded } = capacityFor(targetUserId)
      if (overloaded && !window.confirm('Esta pessoa já está com a agenda de hoje sobrecarregada. Redistribuir mesmo assim?')) {
        return
      }
    }

    await updateTask(task.id, task.rowVersion, { assignedTo: targetUserId })
    reload()
  }

  return (
    <div>
      <h1>Equipe</h1>
      <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
        <div className="kanban-board" style={{ flexWrap: 'wrap' }}>
          {members.map((member) => {
            const { label, overloaded } = capacityFor(member.userId)
            return (
              <TeamLane
                key={member.userId}
                laneId={member.userId}
                title={member.profile.name}
                tasks={tasksFor(member.userId)}
                capacityLabel={label}
                overloaded={overloaded}
                onOpenTask={setEditing}
              />
            )
          })}
          <TeamLane
            laneId={UNASSIGNED}
            title="Sem responsável"
            tasks={tasksFor(null)}
            capacityLabel={null}
            overloaded={false}
            onOpenTask={setEditing}
          />
        </div>
      </DndContext>

      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  )
}
