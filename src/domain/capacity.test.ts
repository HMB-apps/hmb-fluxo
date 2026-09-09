import { describe, expect, it } from 'vitest'
import { computeAvailableMinutes, computeWorkloadMinutes, formatMinutesAsHours } from './capacity'
import { DEFAULT_WORK_SCHEDULE } from './schedule'
import type { WorkSchedule } from './schedule'
import type { TaskListItem } from './task'

const schedule: WorkSchedule = {
  id: 'ws-1',
  organizationId: 'org-1',
  userId: 'user-1',
  ...DEFAULT_WORK_SCHEDULE,
}

// Segunda-feira (2026-09-07 é uma segunda).
const MONDAY = '2026-09-07'
const SUNDAY = '2026-09-06'

describe('computeAvailableMinutes', () => {
  it('calcula a capacidade de um dia útil descontando almoço e margem de imprevistos', () => {
    // 9h-18h (540min) - 1h de almoço (60min) = 480min; com 20% de buffer = 384min.
    expect(computeAvailableMinutes(schedule, MONDAY, [])).toBe(384)
  })

  it('retorna 0 em um dia que não é útil (regra: dias fora da agenda não têm capacidade)', () => {
    expect(computeAvailableMinutes(schedule, SUNDAY, [])).toBe(0)
  })

  it('desconta um bloqueio de agenda (ausência) que cobre o dia inteiro', () => {
    const blocks = [
      {
        id: 'b1',
        organizationId: 'org-1',
        userId: 'user-1',
        title: 'Fora do escritório',
        type: 'absence' as const,
        startAt: `${MONDAY}T00:00:00Z`,
        endAt: `${MONDAY}T23:59:59Z`,
        createdBy: 'user-1',
      },
    ]
    expect(computeAvailableMinutes(schedule, MONDAY, blocks)).toBe(0)
  })

  it('não desconta bloqueio de outro usuário', () => {
    const blocks = [
      {
        id: 'b2',
        organizationId: 'org-1',
        userId: 'other-user',
        title: 'Ausência de outra pessoa',
        type: 'absence' as const,
        startAt: `${MONDAY}T00:00:00Z`,
        endAt: `${MONDAY}T23:59:59Z`,
        createdBy: 'other-user',
      },
    ]
    expect(computeAvailableMinutes(schedule, MONDAY, blocks)).toBe(384)
  })
})

describe('computeWorkloadMinutes', () => {
  const baseTask: Partial<TaskListItem> = {
    assignedTo: 'user-1',
    plannedStartAt: `${MONDAY}T13:00:00Z`,
    estimateMinutes: 60,
  }

  function task(overrides: Partial<TaskListItem>): TaskListItem {
    return { ...baseTask, ...overrides } as TaskListItem
  }

  it('soma as estimativas das tarefas ativas planejadas para o dia', () => {
    const tasks = [task({ status: 'planned', estimateMinutes: 60 }), task({ status: 'in_progress', estimateMinutes: 90 })]
    expect(computeWorkloadMinutes(tasks, 'user-1', MONDAY)).toBe(150)
  })

  it('ignora tarefas concluídas, canceladas ou arquivadas (regra #5)', () => {
    const tasks = [task({ status: 'done', estimateMinutes: 60 }), task({ status: 'canceled', estimateMinutes: 90 })]
    expect(computeWorkloadMinutes(tasks, 'user-1', MONDAY)).toBe(0)
  })

  it('ignora tarefas de outro responsável ou de outro dia', () => {
    const tasks = [
      task({ status: 'planned', assignedTo: 'other-user' }),
      task({ status: 'planned', plannedStartAt: '2026-09-08T13:00:00Z' }),
    ]
    expect(computeWorkloadMinutes(tasks, 'user-1', MONDAY)).toBe(0)
  })
})

describe('formatMinutesAsHours', () => {
  it('formata minutos como horas legíveis', () => {
    expect(formatMinutesAsHours(0)).toBe('0h')
    expect(formatMinutesAsHours(60)).toBe('1h')
    expect(formatMinutesAsHours(90)).toBe('1h30')
    expect(formatMinutesAsHours(384)).toBe('6h24')
  })
})
