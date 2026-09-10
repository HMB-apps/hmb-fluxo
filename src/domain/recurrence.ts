/**
 * Tarefas recorrentes (seção 20 do briefing): diária, semanal (em dias
 * específicos), mensal, ou intervalo personalizado, com data final opcional.
 * Lógica pura — "gerar instâncias sem duplicação" é responsabilidade de
 * quem chama isto, comparando as datas retornadas com o que já existe.
 */
import { addDays, addMonths, format, getDate, getDaysInMonth, isAfter, isBefore, setDate } from 'date-fns'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'interval'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  startDate: string // yyyy-MM-dd
  endDate: string | null // yyyy-MM-dd, inclusive
  /** Só para frequency === 'weekly'. 0=domingo..6=sábado. */
  daysOfWeek: number[] | null
  /** Só para frequency === 'monthly'. 1-31 (ajustado para meses menores). */
  dayOfMonth: number | null
  /** Só para frequency === 'interval'. */
  intervalDays: number | null
}

/** Registro completo, como persistido no banco — a tarefa referenciada funciona como "modelo" da recorrência. */
export interface RecurrenceRuleRecord extends RecurrenceRule {
  id: string
  organizationId: string
  taskId: string
  lastGeneratedDate: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

/** Gera as datas de ocorrência (yyyy-MM-dd) dentro de [rangeStart, rangeEnd], ambos inclusive. */
export function generateOccurrences(rule: RecurrenceRule, rangeStart: string, rangeEnd: string): string[] {
  const effectiveStart = rule.startDate > rangeStart ? rule.startDate : rangeStart
  const effectiveEnd = rule.endDate && rule.endDate < rangeEnd ? rule.endDate : rangeEnd
  if (effectiveStart > effectiveEnd) return []

  const start = new Date(`${effectiveStart}T12:00:00`)
  const end = new Date(`${effectiveEnd}T12:00:00`)
  const occurrences: string[] = []

  if (rule.frequency === 'daily') {
    let cursor = start
    while (!isAfter(cursor, end)) {
      occurrences.push(format(cursor, 'yyyy-MM-dd'))
      cursor = addDays(cursor, 1)
    }
    return occurrences
  }

  if (rule.frequency === 'weekly') {
    const days = new Set(rule.daysOfWeek ?? [])
    let cursor = start
    while (!isAfter(cursor, end)) {
      if (days.has(cursor.getDay())) occurrences.push(format(cursor, 'yyyy-MM-dd'))
      cursor = addDays(cursor, 1)
    }
    return occurrences
  }

  if (rule.frequency === 'interval') {
    const step = rule.intervalDays && rule.intervalDays > 0 ? rule.intervalDays : 1
    // Reconta a partir do início ORIGINAL da regra para manter a cadência
    // estável mesmo que rangeStart corte no meio do ciclo.
    const ruleStart = new Date(`${rule.startDate}T12:00:00`)
    let cursor = ruleStart
    while (isBefore(cursor, start)) cursor = addDays(cursor, step)
    while (!isAfter(cursor, end)) {
      occurrences.push(format(cursor, 'yyyy-MM-dd'))
      cursor = addDays(cursor, step)
    }
    return occurrences
  }

  if (rule.frequency === 'monthly') {
    const targetDay = rule.dayOfMonth ?? getDate(start)
    let cursor = setDate(start, Math.min(targetDay, getDaysInMonth(start)))
    if (isBefore(cursor, start)) cursor = addMonths(cursor, 1)
    while (!isAfter(cursor, end)) {
      const clampedDay = Math.min(targetDay, getDaysInMonth(cursor))
      const occurrence = setDate(cursor, clampedDay)
      if (!isBefore(occurrence, start) && !isAfter(occurrence, end)) {
        occurrences.push(format(occurrence, 'yyyy-MM-dd'))
      }
      cursor = addMonths(cursor, 1)
    }
    return occurrences
  }

  return occurrences
}
