import { describe, expect, it } from 'vitest'
import { computeSuggestedPriority } from './priority'

const NOW = new Date('2026-09-09T12:00:00Z')

describe('computeSuggestedPriority', () => {
  it('marca como crítica uma tarefa atrasada que também bloqueia outras', () => {
    const result = computeSuggestedPriority({
      deadlineAt: '2026-09-07T12:00:00Z',
      blocksCount: 2,
      hasUnresolvedDependency: false,
      clientStrategicWeight: null,
      now: NOW,
    })
    expect(result.level).toBe('critical')
    expect(result.reason.toLowerCase()).toContain('atrasada')
    expect(result.reason).toContain('bloqueia')
  })

  it('marca como alta uma entrega que vence em 2 dias e também bloqueia outra tarefa', () => {
    // Um único fator moderado (só o prazo) não deve inflar para "alta" sozinho —
    // a seção 17 do briefing dá como exemplo de "alta" a combinação de vários
    // fatores (prazo + aprovação + dependências), não um fator isolado.
    const result = computeSuggestedPriority({
      deadlineAt: '2026-09-11T12:00:00Z',
      blocksCount: 1,
      hasUnresolvedDependency: false,
      clientStrategicWeight: null,
      now: NOW,
    })
    expect(result.level).toBe('high')
  })

  it('marca como normal uma entrega que vence em 2 dias sem outros fatores', () => {
    const result = computeSuggestedPriority({
      deadlineAt: '2026-09-11T12:00:00Z',
      blocksCount: 0,
      hasUnresolvedDependency: false,
      clientStrategicWeight: null,
      now: NOW,
    })
    expect(result.level).toBe('normal')
  })

  it('reduz a prioridade de uma tarefa que depende de etapa anterior não concluída', () => {
    const withDependency = computeSuggestedPriority({
      deadlineAt: '2026-09-11T12:00:00Z',
      blocksCount: 0,
      hasUnresolvedDependency: true,
      clientStrategicWeight: null,
      now: NOW,
    })
    const withoutDependency = computeSuggestedPriority({
      deadlineAt: '2026-09-11T12:00:00Z',
      blocksCount: 0,
      hasUnresolvedDependency: false,
      clientStrategicWeight: null,
      now: NOW,
    })
    expect(withDependency.score).toBeLessThan(withoutDependency.score)
  })

  it('aumenta a prioridade para clientes de alto peso estratégico', () => {
    const result = computeSuggestedPriority({
      deadlineAt: null,
      blocksCount: 0,
      hasUnresolvedDependency: false,
      clientStrategicWeight: 9,
      now: NOW,
    })
    expect(result.reason).toContain('peso estratégico')
  })

  it('marca como baixa uma tarefa sem prazo, sem bloqueios e sem cliente relevante', () => {
    const result = computeSuggestedPriority({
      deadlineAt: null,
      blocksCount: 0,
      hasUnresolvedDependency: false,
      clientStrategicWeight: null,
      now: NOW,
    })
    expect(result.level).toBe('low')
    expect(result.reason).toBe('Sem fatores de urgência identificados.')
  })

  it('sempre retorna uma justificativa legível (não esconde a lógica)', () => {
    const result = computeSuggestedPriority({
      deadlineAt: '2026-09-09T12:00:00Z',
      blocksCount: 1,
      hasUnresolvedDependency: false,
      clientStrategicWeight: 5,
      now: NOW,
    })
    expect(result.reason.length).toBeGreaterThan(0)
    expect(result.reason.endsWith('.')).toBe(true)
  })
})
