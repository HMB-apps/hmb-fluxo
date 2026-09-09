import { useDraggable } from '@dnd-kit/core'
import { TASK_PRIORITY_LABELS } from '../../domain/task'
import type { TaskListItem } from '../../domain/task'

export function KanbanCard({ task, onOpen }: { task: TaskListItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const isOverdue = task.deadlineAt && new Date(task.deadlineAt) < new Date() && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className="kanban-card"
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div className="kanban-card-title">
        {task.scheduleLocked && <span title="Travada na agenda">🔒 </span>}
        {task.title}
      </div>
      <div className="kanban-card-meta">
        {task.clientName && (
          <span className="pill" style={{ background: '#eef2ff', color: '#3730a3' }}>
            {task.clientName}
          </span>
        )}
        {task.manualPriority && (
          <span className={`pill priority-${task.manualPriority}`}>{TASK_PRIORITY_LABELS[task.manualPriority]}</span>
        )}
        {isOverdue && <span className="pill priority-critical">Atrasada</span>}
      </div>
      <div className="kanban-card-footer">
        <span>{task.deadlineAt ? new Date(task.deadlineAt).toLocaleDateString('pt-BR') : ''}</span>
        {task.assigneeName && (
          <span className="user-badge" style={{ width: 22, height: 22, fontSize: 11, backgroundColor: '#64748b' }}>
            {task.assigneeName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}
