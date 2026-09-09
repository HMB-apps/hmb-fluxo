/** Tipos de domínio da Fase 4: dependências e histórico do planejador. */

export interface TaskDependency {
  id: string
  organizationId: string
  blockingTaskId: string
  blockedTaskId: string
  createdBy: string
}

export interface PlannerRunChange {
  taskId: string
  taskTitle: string
  before: { plannedStartAt: string | null; plannedEndAt: string | null }
  after: { plannedStartAt: string | null; plannedEndAt: string | null }
}

export interface PlannerRun {
  id: string
  organizationId: string
  createdBy: string
  changes: PlannerRunChange[]
  createdAt: string
  undoneAt: string | null
}
