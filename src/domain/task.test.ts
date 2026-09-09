import { describe, expect, it } from 'vitest'
import { occupiesCapacity } from './task'

describe('occupiesCapacity', () => {
  it('tarefas em espera, concluídas, canceladas ou arquivadas não ocupam capacidade (regra #5)', () => {
    expect(occupiesCapacity('waiting_client')).toBe(false)
    expect(occupiesCapacity('waiting_internal')).toBe(false)
    expect(occupiesCapacity('paused')).toBe(false)
    expect(occupiesCapacity('done')).toBe(false)
    expect(occupiesCapacity('canceled')).toBe(false)
    expect(occupiesCapacity('archived')).toBe(false)
  })

  it('tarefas ativas ocupam capacidade', () => {
    expect(occupiesCapacity('inbox')).toBe(true)
    expect(occupiesCapacity('needs_review')).toBe(true)
    expect(occupiesCapacity('planned')).toBe(true)
    expect(occupiesCapacity('in_progress')).toBe(true)
  })
})
