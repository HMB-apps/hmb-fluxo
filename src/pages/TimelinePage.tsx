import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMembers, useTasks } from '../hooks/useOrgData'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { dateKey } from '../domain/capacity'
import { appConfig } from '../config/app'
import { occupiesCapacity } from '../domain/task'
import { updateTask } from '../data/repositories/taskRepository'
import type { TaskListItem } from '../domain/task'

function cellId(userId: string, day: string): string {
  return `${userId}::${day}`
}

function TimelineBlock({ task, onOpen }: { task: TaskListItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className="timeline-block"
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
        cursor: task.scheduleLocked ? 'not-allowed' : 'grab',
      }}
    >
      {task.scheduleLocked && '🔒 '}
      {task.title}
    </div>
  )
}

function TimelineDayCell({
  userId,
  day,
  tasks,
  onOpenTask,
}: {
  userId: string
  day: string
  tasks: TaskListItem[]
  onOpenTask: (task: TaskListItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(userId, day) })
  return (
    <div ref={setNodeRef} className="timeline-day-cell" style={isOver ? { background: '#eff6ff' } : undefined}>
      {tasks.map((task) => (
        <TimelineBlock key={task.id} task={task} onOpen={() => onOpenTask(task)} />
      ))}
    </div>
  )
}

export function TimelinePage() {
  const { items: members } = useMembers()
  const { items: tasks, reload } = useTasks()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: appConfig.weekStartsOn as 0 | 1 }))
  const [editing, setEditing] = useState<TaskListItem | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const dayKeys = days.map((d) => format(d, 'yyyy-MM-dd'))

  const scheduledTasks = useMemo(
    () => tasks.filter((t) => !t.deletedAt && t.plannedStartAt && occupiesCapacity(t.status)),
    [tasks],
  )

  function tasksForCell(userId: string, day: string): TaskListItem[] {
    return scheduledTasks.filter((t) => t.assignedTo === userId && dateKey(t.plannedStartAt!) === day)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || !task.plannedStartAt || task.scheduleLocked) return

    const [targetUserId, targetDay] = String(over.id).split('::')
    const currentDay = dateKey(task.plannedStartAt)
    if (currentDay === targetDay && task.assignedTo === targetUserId) return

    const oldStart = new Date(task.plannedStartAt)
    const newStart = new Date(`${targetDay}T${format(oldStart, 'HH:mm:ss')}`)
    const deltaMs = newStart.getTime() - oldStart.getTime()
    const newEnd = task.plannedEndAt ? new Date(new Date(task.plannedEndAt).getTime() + deltaMs) : null

    await updateTask(task.id, task.rowVersion, {
      plannedStartAt: newStart.toISOString(),
      plannedEndAt: newEnd ? newEnd.toISOString() : null,
      assignedTo: targetUserId,
    })
    reload()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Linha do tempo</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="secondary-button" onClick={() => setWeekStart((w) => addWeeks(w, -1))}>
            ← Semana anterior
          </button>
          <strong>
            {format(weekStart, 'dd/MM')} – {format(addDays(weekStart, 6), 'dd/MM')}
          </strong>
          <button type="button" className="secondary-button" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
            Próxima semana →
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text)' }}>
        Mostra tarefas com início planejado definido. Arraste um bloco para outro dia ou responsável para
        reagendar — o prazo de entrega ao cliente não muda (regra #7 do briefing).
      </p>

      <DndContext sensors={sensors} onDragEnd={(e) => void handleDragEnd(e)}>
        <div className="timeline-wrapper">
          <div className="timeline-grid">
            <div className="timeline-header-row">
              <div />
              {days.map((day) => (
                <div key={day.toISOString()} className="timeline-header-cell">
                  {format(day, 'EEE dd/MM', { locale: ptBR })}
                </div>
              ))}
            </div>
            {members.map((member) => (
              <div key={member.userId} className="timeline-lane">
                <div className="timeline-lane-label">{member.profile.name}</div>
                {dayKeys.map((day) => (
                  <TimelineDayCell
                    key={day}
                    userId={member.userId}
                    day={day}
                    tasks={tasksForCell(member.userId, day)}
                    onOpenTask={setEditing}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  )
}
