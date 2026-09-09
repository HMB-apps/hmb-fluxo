import { supabase } from '../supabase/client'
import { mapCalendarBlock, mapWorkSchedule } from '../supabase/scheduleMappers'
import { DEFAULT_WORK_SCHEDULE } from '../../domain/schedule'
import type { CalendarBlock, CalendarBlockType, WorkSchedule } from '../../domain/schedule'

export async function listWorkSchedules(organizationId: string): Promise<WorkSchedule[]> {
  const { data, error } = await supabase.from('work_schedules').select('*').eq('organization_id', organizationId)
  if (error) throw error
  return (data ?? []).map(mapWorkSchedule)
}

/** Garante que o usuário tenha uma configuração de horário (cria com os padrões se faltar). */
export async function ensureWorkSchedule(organizationId: string, userId: string): Promise<WorkSchedule> {
  const { data: existing, error: selectError } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()
  if (selectError) throw selectError
  if (existing) return mapWorkSchedule(existing)

  const { data, error } = await supabase
    .from('work_schedules')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      working_days: DEFAULT_WORK_SCHEDULE.workingDays,
      start_time: DEFAULT_WORK_SCHEDULE.startTime,
      end_time: DEFAULT_WORK_SCHEDULE.endTime,
      lunch_start: DEFAULT_WORK_SCHEDULE.lunchStart,
      lunch_end: DEFAULT_WORK_SCHEDULE.lunchEnd,
      daily_capacity_minutes: DEFAULT_WORK_SCHEDULE.dailyCapacityMinutes,
      buffer_percentage: DEFAULT_WORK_SCHEDULE.bufferPercentage,
      focus_block_minutes: DEFAULT_WORK_SCHEDULE.focusBlockMinutes,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapWorkSchedule(data)
}

export interface WorkScheduleInput {
  workingDays: number[]
  startTime: string
  endTime: string
  lunchStart: string | null
  lunchEnd: string | null
  dailyCapacityMinutes: number
  bufferPercentage: number
  focusBlockMinutes: number
}

export async function updateWorkSchedule(id: string, input: WorkScheduleInput): Promise<WorkSchedule> {
  const { data, error } = await supabase
    .from('work_schedules')
    .update({
      working_days: input.workingDays,
      start_time: input.startTime,
      end_time: input.endTime,
      lunch_start: input.lunchStart,
      lunch_end: input.lunchEnd,
      daily_capacity_minutes: input.dailyCapacityMinutes,
      buffer_percentage: input.bufferPercentage,
      focus_block_minutes: input.focusBlockMinutes,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapWorkSchedule(data)
}

export async function listCalendarBlocks(organizationId: string): Promise<CalendarBlock[]> {
  const { data, error } = await supabase
    .from('calendar_blocks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('start_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapCalendarBlock)
}

export interface CalendarBlockInput {
  userId: string | null
  title: string
  type: CalendarBlockType
  startAt: string
  endAt: string
}

export async function createCalendarBlock(
  organizationId: string,
  createdBy: string,
  input: CalendarBlockInput,
): Promise<CalendarBlock> {
  const { data, error } = await supabase
    .from('calendar_blocks')
    .insert({
      organization_id: organizationId,
      created_by: createdBy,
      user_id: input.userId,
      title: input.title,
      type: input.type,
      start_at: input.startAt,
      end_at: input.endAt,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapCalendarBlock(data)
}

export async function deleteCalendarBlock(id: string): Promise<void> {
  const { error } = await supabase.from('calendar_blocks').delete().eq('id', id)
  if (error) throw error
}
