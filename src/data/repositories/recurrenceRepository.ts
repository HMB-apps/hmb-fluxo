import { addDays, format } from 'date-fns'
import { supabase } from '../supabase/client'
import { mapRecurrenceRule } from '../supabase/recurrenceMappers'
import { generateOccurrences, type RecurrenceRule, type RecurrenceRuleRecord } from '../../domain/recurrence'
import { createTask } from './taskRepository'
import type { Task } from '../../domain/task'

/** Quantos dias à frente gerar automaticamente a cada chamada (seção 20: "gerar sem duplicação"). */
const GENERATION_HORIZON_DAYS = 60

export async function listRecurrenceRules(organizationId: string): Promise<RecurrenceRuleRecord[]> {
  const { data, error } = await supabase
    .from('recurrence_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapRecurrenceRule)
}

export async function getRecurrenceRuleForTask(taskId: string): Promise<RecurrenceRuleRecord | null> {
  const { data, error } = await supabase.from('recurrence_rules').select('*').eq('task_id', taskId).maybeSingle()
  if (error) throw error
  return data ? mapRecurrenceRule(data) : null
}

export async function createRecurrenceRule(
  organizationId: string,
  actorId: string,
  taskId: string,
  rule: RecurrenceRule,
): Promise<RecurrenceRuleRecord> {
  const { data, error } = await supabase
    .from('recurrence_rules')
    .insert({
      organization_id: organizationId,
      created_by: actorId,
      task_id: taskId,
      frequency: rule.frequency,
      start_date: rule.startDate,
      end_date: rule.endDate,
      days_of_week: rule.daysOfWeek,
      day_of_month: rule.dayOfMonth,
      interval_days: rule.intervalDays,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapRecurrenceRule(data)
}

export async function updateRecurrenceRule(
  id: string,
  patch: Partial<RecurrenceRule> & { active?: boolean },
): Promise<RecurrenceRuleRecord> {
  const { data, error } = await supabase
    .from('recurrence_rules')
    .update({
      ...(patch.frequency !== undefined ? { frequency: patch.frequency } : {}),
      ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
      ...(patch.endDate !== undefined ? { end_date: patch.endDate } : {}),
      ...(patch.daysOfWeek !== undefined ? { days_of_week: patch.daysOfWeek } : {}),
      ...(patch.dayOfMonth !== undefined ? { day_of_month: patch.dayOfMonth } : {}),
      ...(patch.intervalDays !== undefined ? { interval_days: patch.intervalDays } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapRecurrenceRule(data)
}

export async function deleteRecurrenceRule(id: string): Promise<void> {
  const { error } = await supabase.from('recurrence_rules').delete().eq('id', id)
  if (error) throw error
}

/**
 * Gera as instâncias pendentes da regra como novas tarefas, clonando os
 * campos da tarefa-modelo. Nunca duplica: parte do dia seguinte à última
 * geração (ou do início da regra, se nunca gerou) e o índice único
 * (recurrence_rule_id, occurrence_date) no banco é a garantia final.
 */
export async function generateRecurrenceInstances(
  rule: RecurrenceRuleRecord,
  sourceTask: Task,
  actorId: string,
): Promise<Task[]> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const rangeStart = rule.lastGeneratedDate ? format(addDays(new Date(`${rule.lastGeneratedDate}T12:00:00`), 1), 'yyyy-MM-dd') : rule.startDate
  const rangeEnd = format(addDays(new Date(), GENERATION_HORIZON_DAYS), 'yyyy-MM-dd')
  if (rangeStart > rangeEnd) return []

  const occurrenceDates = generateOccurrences(rule, rangeStart > today ? rangeStart : today, rangeEnd)
  if (occurrenceDates.length === 0) return []

  const { data: existing, error: existingError } = await supabase
    .from('tasks')
    .select('occurrence_date')
    .eq('recurrence_rule_id', rule.id)
    .in('occurrence_date', occurrenceDates)
  if (existingError) throw existingError
  const existingDates = new Set((existing ?? []).map((r) => r.occurrence_date))

  const created: Task[] = []
  for (const occurrenceDate of occurrenceDates) {
    if (existingDates.has(occurrenceDate)) continue
    const task = await createTask(rule.organizationId, actorId, {
      title: sourceTask.title,
      description: sourceTask.description,
      clientId: sourceTask.clientId,
      projectId: sourceTask.projectId,
      categoryId: sourceTask.categoryId,
      estimateMinutes: sourceTask.estimateMinutes,
      assignedTo: sourceTask.assignedTo,
      deadlineAt: `${occurrenceDate}T23:59:59`,
    })
    await supabase.from('tasks').update({ recurrence_rule_id: rule.id, occurrence_date: occurrenceDate }).eq('id', task.id)
    created.push(task)
  }

  const lastDate = occurrenceDates[occurrenceDates.length - 1]
  if (lastDate) {
    await supabase.from('recurrence_rules').update({ last_generated_date: lastDate }).eq('id', rule.id)
  }

  return created
}
