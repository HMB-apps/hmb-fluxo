import { formatInTimeZone } from 'date-fns-tz'
import { appConfig } from '../config/app'
import { occupiesCapacity } from './task'
import type { TaskListItem } from './task'
import type { CalendarBlock, WorkSchedule } from './schedule'

/** Chave "yyyy-MM-dd" no fuso do app — evita bugs de dia trocado por UTC. */
export function dateKey(iso: string, timeZone: string = appConfig.timezone): string {
  return formatInTimeZone(new Date(iso), timeZone, 'yyyy-MM-dd')
}

export function todayKey(timeZone: string = appConfig.timezone): string {
  return formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd')
}

export function weekdayInTimeZone(iso: string, timeZone: string = appConfig.timezone): number {
  const key = dateKey(iso, timeZone)
  // Meio-dia evita qualquer problema de borda de fuso horário ao reconstruir a data.
  return new Date(`${key}T12:00:00`).getDay()
}

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Minutos de sobreposição entre um bloqueio de agenda e a janela de trabalho
 * do dia (aproximação: não deduplica sobreposição com o horário de almoço,
 * que já é descontado separadamente).
 */
function blockOverlapMinutes(block: CalendarBlock, dayKey: string, schedule: WorkSchedule, timeZone: string): number {
  const workStart = new Date(`${dayKey}T${schedule.startTime}:00`)
  const workEnd = new Date(`${dayKey}T${schedule.endTime}:00`)
  const blockStart = new Date(block.startAt)
  const blockEnd = new Date(block.endAt)

  // Ignora blocos de outro dia (compara pela data no fuso do app).
  if (dateKey(block.startAt, timeZone) !== dayKey && dateKey(block.endAt, timeZone) !== dayKey) {
    if (blockEnd < workStart || blockStart > workEnd) return 0
  }

  const overlapStart = Math.max(workStart.getTime(), blockStart.getTime())
  const overlapEnd = Math.min(workEnd.getTime(), blockEnd.getTime())
  return Math.max(0, (overlapEnd - overlapStart) / 60000)
}

/**
 * Capacidade disponível (em minutos) para um dia específico, considerando
 * dias úteis, horário de almoço, bloqueios de agenda e a margem reservada
 * para imprevistos (seção 18 do briefing).
 */
export function computeAvailableMinutes(
  schedule: WorkSchedule,
  dayKey: string,
  blocks: CalendarBlock[],
  timeZone: string = appConfig.timezone,
): number {
  const weekday = new Date(`${dayKey}T12:00:00`).getDay()
  if (!schedule.workingDays.includes(weekday)) return 0

  let base = timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)
  if (schedule.lunchStart && schedule.lunchEnd) {
    base -= timeToMinutes(schedule.lunchEnd) - timeToMinutes(schedule.lunchStart)
  }

  const relevantBlocks = blocks.filter(
    (b) => b.userId === null || b.userId === schedule.userId,
  )
  const blockedMinutes = relevantBlocks.reduce(
    (sum, block) => sum + blockOverlapMinutes(block, dayKey, schedule, timeZone),
    0,
  )

  const afterBlocks = Math.max(0, base - blockedMinutes)
  const withBuffer = afterBlocks * (1 - schedule.bufferPercentage / 100)
  return Math.max(0, Math.round(withBuffer))
}

/** Soma das estimativas das tarefas de um responsável planejadas para o dia. */
export function computeWorkloadMinutes(
  tasks: TaskListItem[],
  userId: string,
  dayKey: string,
  timeZone: string = appConfig.timezone,
): number {
  return tasks
    .filter(
      (t) =>
        t.assignedTo === userId &&
        occupiesCapacity(t.status) &&
        t.plannedStartAt !== null &&
        dateKey(t.plannedStartAt, timeZone) === dayKey,
    )
    .reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0)
}

export function formatMinutesAsHours(minutes: number): string {
  if (minutes <= 0) return '0h'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}
