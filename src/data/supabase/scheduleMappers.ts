import type { Database } from './database.types'
import type { CalendarBlock, CalendarBlockType, WorkSchedule } from '../../domain/schedule'

type WorkScheduleRow = Database['public']['Tables']['work_schedules']['Row']
type CalendarBlockRow = Database['public']['Tables']['calendar_blocks']['Row']

export function mapWorkSchedule(row: WorkScheduleRow): WorkSchedule {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    workingDays: row.working_days,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    lunchStart: row.lunch_start ? row.lunch_start.slice(0, 5) : null,
    lunchEnd: row.lunch_end ? row.lunch_end.slice(0, 5) : null,
    dailyCapacityMinutes: row.daily_capacity_minutes,
    bufferPercentage: row.buffer_percentage,
    focusBlockMinutes: row.focus_block_minutes,
  }
}

export function mapCalendarBlock(row: CalendarBlockRow): CalendarBlock {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    title: row.title,
    type: row.type as CalendarBlockType,
    startAt: row.start_at,
    endAt: row.end_at,
    createdBy: row.created_by,
  }
}
