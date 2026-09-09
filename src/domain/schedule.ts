/**
 * Tipos de domínio da Fase 3: capacidade e calendário de trabalho
 * (seção 18 do briefing).
 */

export type CalendarBlockType = 'holiday' | 'absence' | 'meeting'

export interface WorkSchedule {
  id: string
  organizationId: string
  userId: string
  /** 0=domingo .. 6=sábado (convenção JS Date#getDay). */
  workingDays: number[]
  startTime: string
  endTime: string
  lunchStart: string | null
  lunchEnd: string | null
  dailyCapacityMinutes: number
  bufferPercentage: number
  focusBlockMinutes: number
}

export interface CalendarBlock {
  id: string
  organizationId: string
  userId: string | null
  title: string
  type: CalendarBlockType
  startAt: string
  endAt: string
  createdBy: string
}

export const DEFAULT_WORK_SCHEDULE: Omit<WorkSchedule, 'id' | 'organizationId' | 'userId'> = {
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  dailyCapacityMinutes: 480,
  bufferPercentage: 20,
  focusBlockMinutes: 90,
}

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEKDAY_SHORT_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
