/**
 * Cálculo de prioridade sugerida (seção 17 do briefing).
 *
 * Fica isolado, testável e configurável, e sempre produz uma justificativa
 * humana — nunca só um número escondido. A prioridade MANUAL (definida pelo
 * usuário) tem precedência sobre a sugerida; este módulo só calcula a
 * sugestão, quem decide o que prevalece é a camada de tarefas.
 */
import type { TaskPriority } from './task'

export interface PriorityInput {
  /** Prazo de entrega ao cliente, se houver. */
  deadlineAt: string | null
  /** Quantas outras tarefas dependem desta (ela bloqueia quantas). */
  blocksCount: number
  /** Esta tarefa está bloqueada por alguma dependência ainda não concluída? */
  hasUnresolvedDependency: boolean
  /** Peso estratégico do cliente (0-10), quando houver cliente. */
  clientStrategicWeight: number | null
  /** Agora, injetável para tornar o cálculo determinístico em teste. */
  now?: Date
}

export interface PriorityResult {
  score: number
  level: TaskPriority
  reason: string
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

export function computeSuggestedPriority(input: PriorityInput): PriorityResult {
  const now = input.now ?? new Date()
  let score = 0
  const reasons: string[] = []

  if (input.deadlineAt) {
    const daysLeft = daysBetween(now, new Date(input.deadlineAt))
    if (daysLeft < 0) {
      score += 40
      reasons.push(`atrasada há ${Math.abs(daysLeft)} dia(s)`)
    } else if (daysLeft === 0) {
      score += 35
      reasons.push('a entrega vence hoje')
    } else if (daysLeft <= 2) {
      score += 25
      reasons.push(`a entrega vence em ${daysLeft} dia(s)`)
    } else if (daysLeft <= 5) {
      score += 12
      reasons.push(`a entrega vence em ${daysLeft} dias`)
    } else {
      score += 3
    }
  }

  if (input.blocksCount > 0) {
    score += 15 + input.blocksCount * 3
    reasons.push(
      input.blocksCount === 1 ? 'bloqueia outra tarefa' : `bloqueia outras ${input.blocksCount} tarefas`,
    )
  }

  if (input.hasUnresolvedDependency) {
    score -= 20
    reasons.push('depende de uma etapa anterior ainda não concluída')
  }

  if (input.clientStrategicWeight) {
    score += input.clientStrategicWeight * 2
    if (input.clientStrategicWeight >= 7) reasons.push('cliente de alto peso estratégico')
  }

  let level: TaskPriority
  if (score >= 50) level = 'critical'
  else if (score >= 30) level = 'high'
  else if (score >= 12) level = 'normal'
  else level = 'low'

  const reason = reasons.length > 0 ? capitalize(reasons.join('; ')) + '.' : 'Sem fatores de urgência identificados.'

  return { score, level, reason }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
