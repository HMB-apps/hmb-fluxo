import type { Database, RecurrenceFrequency } from './database.types'
import type { RecurrenceRuleRecord } from '../../domain/recurrence'

type RecurrenceRuleRow = Database['public']['Tables']['recurrence_rules']['Row']

export function mapRecurrenceRule(row: RecurrenceRuleRow): RecurrenceRuleRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    taskId: row.task_id,
    frequency: row.frequency as RecurrenceFrequency,
    startDate: row.start_date,
    endDate: row.end_date,
    daysOfWeek: row.days_of_week,
    dayOfMonth: row.day_of_month,
    intervalDays: row.interval_days,
    lastGeneratedDate: row.last_generated_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }
}
