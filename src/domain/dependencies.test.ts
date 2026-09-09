import { describe, expect, it } from 'vitest'
import { topologicalOrder, wouldCreateCycle } from './dependencies'

describe('wouldCreateCycle', () => {
  it('detecta um ciclo direto (A bloqueia B, tentar fazer B bloquear A)', () => {
    const edges = [{ blockingTaskId: 'A', blockedTaskId: 'B' }]
    expect(wouldCreateCycle(edges, 'B', 'A')).toBe(true)
  })

  it('detecta um ciclo transitivo (A bloqueia B bloqueia C, tentar fazer C bloquear A)', () => {
    const edges = [
      { blockingTaskId: 'A', blockedTaskId: 'B' },
      { blockingTaskId: 'B', blockedTaskId: 'C' },
    ]
    expect(wouldCreateCycle(edges, 'C', 'A')).toBe(true)
  })

  it('não acusa ciclo quando a dependência é válida', () => {
    const edges = [{ blockingTaskId: 'A', blockedTaskId: 'B' }]
    expect(wouldCreateCycle(edges, 'B', 'C')).toBe(false)
  })

  it('rejeita uma tarefa depender de si mesma', () => {
    expect(wouldCreateCycle([], 'A', 'A')).toBe(true)
  })
})

describe('topologicalOrder', () => {
  it('ordena respeitando as dependências (nunca antes de quem bloqueia)', () => {
    const edges = [
      { blockingTaskId: 'A', blockedTaskId: 'B' },
      { blockingTaskId: 'B', blockedTaskId: 'C' },
    ]
    const order = topologicalOrder(['C', 'B', 'A'], edges)
    expect(order).not.toBeNull()
    expect(order!.indexOf('A')).toBeLessThan(order!.indexOf('B'))
    expect(order!.indexOf('B')).toBeLessThan(order!.indexOf('C'))
  })

  it('retorna null se houver um ciclo nos dados (não deveria acontecer, mas não deve travar)', () => {
    const edges = [
      { blockingTaskId: 'A', blockedTaskId: 'B' },
      { blockingTaskId: 'B', blockedTaskId: 'A' },
    ]
    expect(topologicalOrder(['A', 'B'], edges)).toBeNull()
  })

  it('tarefas sem dependência entre si mantêm-se todas na ordem', () => {
    const order = topologicalOrder(['X', 'Y', 'Z'], [])
    expect(order).toHaveLength(3)
  })
})
