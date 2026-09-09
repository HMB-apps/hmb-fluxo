import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTasks } from '../hooks/useOrgData'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import { dateKey } from '../domain/capacity'
import { appConfig } from '../config/app'
import type { TaskListItem } from '../domain/task'

export function CalendarPage() {
  const { items: tasks, reload } = useTasks()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [editing, setEditing] = useState<TaskListItem | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: appConfig.weekStartsOn as 0 | 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: appConfig.weekStartsOn as 0 | 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskListItem[]>()
    for (const task of tasks) {
      if (task.deletedAt) continue
      const date = task.deadlineAt ?? task.plannedStartAt
      if (!date) continue
      const key = dateKey(date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks])

  return (
    <div>
      <div className="page-header">
        <h1>Calendário</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="secondary-button" onClick={() => setMonth((m) => addMonths(m, -1))}>
            ← Anterior
          </button>
          <strong style={{ minWidth: 160, textAlign: 'center' }}>{format(month, 'MMMM yyyy', { locale: ptBR })}</strong>
          <button type="button" className="secondary-button" onClick={() => setMonth((m) => addMonths(m, 1))}>
            Próximo →
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-grid-header">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay.get(key) ?? []
          return (
            <div
              key={key}
              className={`calendar-day${isSameMonth(day, month) ? '' : ' calendar-day-outside'}${isToday(day) ? ' calendar-day-today' : ''}`}
            >
              <div className="calendar-day-number">{format(day, 'd')}</div>
              <div className="calendar-day-tasks">
                {dayTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="calendar-day-task" onClick={() => setEditing(task)}>
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="calendar-day-more">+{dayTasks.length - 3} mais</div>}
              </div>
            </div>
          )
        })}
      </div>

      {editing && <TaskFormModal task={editing} onClose={() => setEditing(null)} onSaved={reload} />}
    </div>
  )
}
