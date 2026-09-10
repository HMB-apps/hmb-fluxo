import { describe, expect, it } from 'vitest'
import { generateOccurrences, type RecurrenceRule } from './recurrence'

function rule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    frequency: 'daily',
    startDate: '2026-01-01',
    endDate: null,
    daysOfWeek: null,
    dayOfMonth: null,
    intervalDays: null,
    ...overrides,
  }
}

describe('generateOccurrences', () => {
  it('daily gera todos os dias do intervalo', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-01-01' })
    expect(generateOccurrences(r, '2026-01-01', '2026-01-03')).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })

  it('weekly só gera nos dias da semana marcados', () => {
    // 2026-01-05 é segunda-feira
    const r = rule({ frequency: 'weekly', startDate: '2026-01-01', daysOfWeek: [1, 3] }) // seg, qua
    expect(generateOccurrences(r, '2026-01-01', '2026-01-14')).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-12',
      '2026-01-14',
    ])
  })

  it('monthly ajusta o dia para meses mais curtos', () => {
    const r = rule({ frequency: 'monthly', startDate: '2026-01-31', dayOfMonth: 31 })
    // fevereiro/2026 tem 28 dias
    expect(generateOccurrences(r, '2026-01-01', '2026-03-31')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('interval respeita a cadência a partir do início original mesmo cortando o range', () => {
    const r = rule({ frequency: 'interval', startDate: '2026-01-01', intervalDays: 3 })
    expect(generateOccurrences(r, '2026-01-05', '2026-01-12')).toEqual(['2026-01-07', '2026-01-10'])
  })

  it('respeita a data final da regra', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-01-01', endDate: '2026-01-02' })
    expect(generateOccurrences(r, '2026-01-01', '2026-01-10')).toEqual(['2026-01-01', '2026-01-02'])
  })

  it('retorna vazio quando o range pedido é totalmente anterior ao início da regra', () => {
    const r = rule({ frequency: 'daily', startDate: '2026-02-01' })
    expect(generateOccurrences(r, '2026-01-01', '2026-01-10')).toEqual([])
  })
})
