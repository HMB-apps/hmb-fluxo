import { describe, expect, it } from 'vitest'
import { getUsageAlerts, USAGE_ALERT_THRESHOLDS, type OrganizationUsage } from './platform'

function usage(overrides: Partial<OrganizationUsage>): OrganizationUsage {
  return {
    organizationId: 'org-1',
    organizationName: 'Organização Teste',
    status: 'active',
    memberCount: 2,
    clientCount: 5,
    taskCount: 20,
    projectCount: 3,
    inboxItemCount: 4,
    ...overrides,
  }
}

describe('getUsageAlerts', () => {
  it('retorna vazio para uso normal', () => {
    expect(getUsageAlerts(usage({}))).toEqual([])
  })

  it('avisa quando um contador ultrapassa o limiar', () => {
    const alerts = getUsageAlerts(usage({ taskCount: USAGE_ALERT_THRESHOLDS.taskCount + 1 }))
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toContain('tarefas')
  })

  it('não avisa quando o contador está exatamente no limiar', () => {
    expect(getUsageAlerts(usage({ clientCount: USAGE_ALERT_THRESHOLDS.clientCount }))).toEqual([])
  })

  it('acumula avisos de múltiplos contadores', () => {
    const alerts = getUsageAlerts(
      usage({
        memberCount: USAGE_ALERT_THRESHOLDS.memberCount + 1,
        projectCount: USAGE_ALERT_THRESHOLDS.projectCount + 1,
      }),
    )
    expect(alerts).toHaveLength(2)
  })
})
