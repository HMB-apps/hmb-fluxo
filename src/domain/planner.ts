/**
 * Motor do planejador automático (seções 16.2 e 16.3 do briefing).
 *
 * Escopo desta primeira versão: agenda apenas tarefas ATIVAS, com
 * responsável e estimativa, que ainda NÃO têm início planejado — ou seja,
 * gera uma proposta do que "será adicionado" à agenda. Reorganizar tarefas
 * já planejadas manualmente fica para um refinamento futuro (o usuário pode
 * sempre mover manualmente pelo Quadro, Equipe ou Linha do Tempo).
 *
 * Regras respeitadas:
 * - nunca move/agenda tarefas travadas (`schedule_locked`) — nem entram aqui;
 * - nunca agenda uma etapa antes de quem a bloqueia (regra #9);
 * - nunca ultrapassa a capacidade diária do responsável silenciosamente —
 *   quando não cabe no horizonte, sinaliza conflito em vez de estourar;
 * - prioridade manual/sugerida define a ordem de quem "ganha" os horários
 *   livres primeiro.
 */
import { addDays, format } from 'date-fns'
import { computeAvailableMinutes, timeToMinutes } from './capacity'
import { topologicalOrder } from './dependencies'
import type { DependencyEdge } from './dependencies'
import type { TaskPriority } from './task'
import type { CalendarBlock, WorkSchedule } from './schedule'

export interface PlannerTask {
  id: string
  assignedTo: string
  estimateMinutes: number
  deadlineAt: string | null
  blockingTaskIds: string[]
  manualPriority: TaskPriority | null
  suggestedPriority: TaskPriority | null
}

export interface PlannerContext {
  schedules: WorkSchedule[]
  blocks: CalendarBlock[]
  /** Primeiro dia considerado (yyyy-MM-dd), normalmente "hoje". */
  startDate: string
  /** Quantos dias corridos à frente o planejador pode olhar. */
  horizonDays: number
  /** Minutos já ocupados por dia e responsável, fora deste lote (`${userId}::${day}`). */
  existingWorkloadMinutes?: Record<string, number>
  /** Dia (yyyy-MM-dd) em que dependências fora do lote terminam, se conhecido. */
  dependencyEndDay?: Record<string, string>
}

export interface PlanProposalItem {
  taskId: string
  assignedTo: string
  day: string
  startAt: string
  endAt: string
  conflict: string | null
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { critical: 4, high: 3, normal: 2, low: 1 }

function priorityWeight(task: PlannerTask): number {
  const level = task.manualPriority ?? task.suggestedPriority
  return level ? PRIORITY_WEIGHT[level] : 0
}

/** Kahn's algorithm, mas escolhendo entre empates pelo maior peso de prioridade e prazo mais cedo. */
function orderByDependencyAndPriority(tasks: PlannerTask[]): PlannerTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const ids = tasks.map((t) => t.id)
  const edges: DependencyEdge[] = tasks.flatMap((t) =>
    t.blockingTaskIds.filter((b) => byId.has(b)).map((b) => ({ blockingTaskId: b, blockedTaskId: t.id })),
  )

  const plain = topologicalOrder(ids, edges)
  if (!plain) return tasks // ciclo inesperado: mantém a ordem original em vez de travar

  const inDegree = new Map<string, number>(ids.map((id) => [id, 0]))
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]))
  for (const edge of edges) {
    adjacency.get(edge.blockingTaskId)!.push(edge.blockedTaskId)
    inDegree.set(edge.blockedTaskId, (inDegree.get(edge.blockedTaskId) ?? 0) + 1)
  }

  const ready = ids.filter((id) => inDegree.get(id) === 0)
  const result: PlannerTask[] = []

  function popBest(): string {
    ready.sort((a, b) => {
      const ta = byId.get(a)!
      const tb = byId.get(b)!
      if (priorityWeight(tb) !== priorityWeight(ta)) return priorityWeight(tb) - priorityWeight(ta)
      const da = ta.deadlineAt ?? '9999-12-31'
      const db = tb.deadlineAt ?? '9999-12-31'
      return da.localeCompare(db)
    })
    return ready.shift()!
  }

  while (ready.length > 0) {
    const id = popBest()
    result.push(byId.get(id)!)
    for (const next of adjacency.get(id) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 0) - 1)
      if (inDegree.get(next) === 0) ready.push(next)
    }
  }

  return result
}

export function generatePlan(tasks: PlannerTask[], context: PlannerContext): PlanProposalItem[] {
  const ordered = orderByDependencyAndPriority(tasks)
  const usedMinutes = new Map<string, number>(Object.entries(context.existingWorkloadMinutes ?? {}))
  const taskEndDay = new Map<string, string>()
  const proposals: PlanProposalItem[] = []

  for (const task of ordered) {
    const schedule = context.schedules.find((s) => s.userId === task.assignedTo)
    if (!schedule) continue // sem horário configurado: não é possível estimar capacidade

    let earliestDay = context.startDate
    for (const blockingId of task.blockingTaskIds) {
      const candidate = taskEndDay.get(blockingId) ?? context.dependencyEndDay?.[blockingId]
      if (candidate && candidate > earliestDay) earliestDay = candidate
    }

    const startIndex = 0
    let chosenDay: string | null = null
    for (let i = startIndex; i < context.horizonDays; i++) {
      const day = format(addDays(new Date(`${earliestDay}T12:00:00`), i), 'yyyy-MM-dd')
      const capacity = computeAvailableMinutes(schedule, day, context.blocks)
      const usedKey = `${task.assignedTo}::${day}`
      const used = usedMinutes.get(usedKey) ?? 0
      const remaining = capacity - used
      if (remaining >= task.estimateMinutes) {
        chosenDay = day
        break
      }
    }

    let conflict: string | null = null
    if (!chosenDay) {
      chosenDay = format(addDays(new Date(`${earliestDay}T12:00:00`), context.horizonDays - 1), 'yyyy-MM-dd')
      conflict = 'Excede a capacidade disponível no período considerado.'
    } else if (task.deadlineAt) {
      const deadlineDay = task.deadlineAt.slice(0, 10)
      if (chosenDay > deadlineDay) {
        conflict = 'Conclusão prevista depois do prazo combinado com o cliente.'
      }
    }

    const usedKey = `${task.assignedTo}::${chosenDay}`
    const usedBefore = usedMinutes.get(usedKey) ?? 0
    usedMinutes.set(usedKey, usedBefore + task.estimateMinutes)
    taskEndDay.set(task.id, chosenDay)

    const startMinutes = timeToMinutes(schedule.startTime) + usedBefore
    const endMinutes = startMinutes + task.estimateMinutes
    const startAt = `${chosenDay}T${minutesToTime(startMinutes)}:00`
    const endAt = `${chosenDay}T${minutesToTime(endMinutes)}:00`

    proposals.push({ taskId: task.id, assignedTo: task.assignedTo, day: chosenDay, startAt, endAt, conflict })
  }

  return proposals
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
