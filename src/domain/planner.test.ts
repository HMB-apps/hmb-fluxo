import { describe, expect, it } from 'vitest'
import { generatePlan } from './planner'
import { DEFAULT_WORK_SCHEDULE } from './schedule'
import type { WorkSchedule } from './schedule'
import type { PlannerTask } from './planner'

const schedule: WorkSchedule = {
  id: 'ws-1',
  organizationId: 'org-1',
  userId: 'user-1',
  ...DEFAULT_WORK_SCHEDULE, // 09:00-18:00, almoço 12-13, 480min - 20% buffer = 384min/dia
}

// 2026-09-07 é uma segunda-feira (dia útil).
const MONDAY = '2026-09-07'

function task(overrides: Partial<PlannerTask>): PlannerTask {
  return {
    id: 't1',
    assignedTo: 'user-1',
    estimateMinutes: 60,
    deadlineAt: null,
    blockingTaskIds: [],
    manualPriority: null,
    suggestedPriority: null,
    ...overrides,
  }
}

describe('generatePlan', () => {
  it('agenda uma tarefa simples no primeiro dia útil disponível', () => {
    const proposal = generatePlan([task({ id: 't1' })], {
      schedules: [schedule],
      blocks: [],
      startDate: MONDAY,
      horizonDays: 10,
    })[0]!
    expect(proposal.day).toBe(MONDAY)
    expect(proposal.conflict).toBeNull()
  })

  it('não agenda uma tarefa antes da que a bloqueia (regra #9)', () => {
    const proposals = generatePlan(
      [
        task({ id: 'depende', blockingTaskIds: ['bloqueadora'], estimateMinutes: 60 }),
        task({ id: 'bloqueadora', estimateMinutes: 380 }), // ocupa quase o dia todo
      ],
      { schedules: [schedule], blocks: [], startDate: MONDAY, horizonDays: 10 },
    )
    const bloqueadora = proposals.find((p) => p.taskId === 'bloqueadora')!
    const depende = proposals.find((p) => p.taskId === 'depende')!
    expect(depende.day >= bloqueadora.day).toBe(true)
  })

  it('prioriza tarefa crítica sobre tarefa de baixa prioridade no mesmo dia', () => {
    const proposals = generatePlan(
      [
        task({ id: 'baixa', manualPriority: 'low', estimateMinutes: 200 }),
        task({ id: 'critica', manualPriority: 'critical', estimateMinutes: 200 }),
      ],
      { schedules: [schedule], blocks: [], startDate: MONDAY, horizonDays: 1 },
    )
    const critica = proposals.find((p) => p.taskId === 'critica')!
    const baixa = proposals.find((p) => p.taskId === 'baixa')!
    // A crítica deve começar mais cedo no dia (ganha o horário livre primeiro).
    expect(critica.startAt < baixa.startAt).toBe(true)
  })

  it('sinaliza conflito quando a tarefa não cabe no horizonte considerado', () => {
    const proposal = generatePlan([task({ id: 't1', estimateMinutes: 999999 })], {
      schedules: [schedule],
      blocks: [],
      startDate: MONDAY,
      horizonDays: 3,
    })[0]!
    expect(proposal.conflict).toContain('capacidade')
  })

  it('sinaliza conflito quando a data proposta passa do prazo do cliente', () => {
    const proposal = generatePlan(
      [task({ id: 't1', estimateMinutes: 60, deadlineAt: `${MONDAY}T23:59:59Z` })],
      {
        schedules: [schedule],
        blocks: [],
        startDate: MONDAY,
        horizonDays: 5,
        // Segunda-feira já está com a agenda praticamente cheia por outro
        // compromisso, então esta tarefa só cabe na terça — um dia depois
        // do prazo combinado com o cliente.
        existingWorkloadMinutes: { [`user-1::${MONDAY}`]: 384 },
      },
    )[0]!
    expect(proposal.conflict).toContain('prazo')
  })

  it('não agenda tarefas de um responsável sem horário de trabalho configurado', () => {
    const proposals = generatePlan([task({ id: 't1', assignedTo: 'sem-horario' })], {
      schedules: [schedule],
      blocks: [],
      startDate: MONDAY,
      horizonDays: 5,
    })
    expect(proposals).toHaveLength(0)
  })
})
