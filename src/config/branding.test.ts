import { describe, expect, it } from 'vitest'
import { branding } from './branding'
import { appConfig } from './app'

describe('branding config', () => {
  it('nunca fica vazio (usado em vários pontos da UI e do PWA manifest)', () => {
    expect(branding.productName.length).toBeGreaterThan(0)
    expect(branding.organizationName.length).toBeGreaterThan(0)
  })
})

describe('app config', () => {
  it('usa fuso e semana do Brasil (seção 8 do briefing)', () => {
    expect(appConfig.timezone).toBe('America/Sao_Paulo')
    expect(appConfig.weekStartsOn).toBe(1)
  })
})
