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
