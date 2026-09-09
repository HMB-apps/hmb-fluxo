import { useDroppable } from '@dnd-kit/core'
import { KanbanCard } from './KanbanCard'
import type { TaskListItem, TaskStatus } from '../../domain/task'

export function KanbanColumn({
  status,
  label,
  tasks,
  onOpenTask,
}: {
  status: TaskStatus
  label: string
  tasks: TaskListItem[]
  onOpenTask: (task: TaskListItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? ' kanban-column-over' : ''}`}>
      <div className="kanban-column-header">
        <span>{label}</span>
        <span className="pill">{tasks.length}</span>
      </div>
      <div className="kanban-column-body">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
        ))}
      </div>
    </div>
  )
}
