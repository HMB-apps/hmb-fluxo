/** Tipos de domínio da Fase 8: painel do superadmin da plataforma. */

export interface OrganizationUsage {
  organizationId: string
  organizationName: string
  status: string
  memberCount: number
  clientCount: number
  taskCount: number
  projectCount: number
  inboxItemCount: number
}

/**
 * Limiares informativos (Fase 8.1) para sinalizar uma organização com
 * volume de dados fora do comum — números redondos escolhidos com folga
 * em relação ao uso real da HMB, não um limite técnico do banco. Servem só
 * para o superadmin notar crescimento incomum, não para bloquear nada.
 */
export const USAGE_ALERT_THRESHOLDS = {
  memberCount: 20,
  clientCount: 200,
  taskCount: 2000,
  projectCount: 100,
  inboxItemCount: 1000,
} as const

/** Retorna uma lista de avisos em português para uma organização, vazia se nada estiver fora do comum. */
export function getUsageAlerts(usage: OrganizationUsage): string[] {
  const alerts: string[] = []
  if (usage.memberCount > USAGE_ALERT_THRESHOLDS.memberCount) {
    alerts.push(`mais de ${USAGE_ALERT_THRESHOLDS.memberCount} membros`)
  }
  if (usage.clientCount > USAGE_ALERT_THRESHOLDS.clientCount) {
    alerts.push(`mais de ${USAGE_ALERT_THRESHOLDS.clientCount} clientes`)
  }
  if (usage.taskCount > USAGE_ALERT_THRESHOLDS.taskCount) {
    alerts.push(`mais de ${USAGE_ALERT_THRESHOLDS.taskCount} tarefas`)
  }
  if (usage.projectCount > USAGE_ALERT_THRESHOLDS.projectCount) {
    alerts.push(`mais de ${USAGE_ALERT_THRESHOLDS.projectCount} projetos`)
  }
  if (usage.inboxItemCount > USAGE_ALERT_THRESHOLDS.inboxItemCount) {
    alerts.push(`mais de ${USAGE_ALERT_THRESHOLDS.inboxItemCount} itens na caixa de entrada`)
  }
  return alerts
}
