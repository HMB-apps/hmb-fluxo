/**
 * Tipos de domínio da Fase 1 (organização, perfis e membros).
 * Tarefas, clientes, projetos etc. entram nas fases seguintes.
 */

export type MemberRole = 'admin' | 'member'
export type MemberStatus = 'invited' | 'active' | 'disabled'

export interface Organization {
  id: string
  name: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  color: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: MemberRole
  status: MemberStatus
  invitedBy: string | null
  invitedAt: string | null
  joinedAt: string | null
}

export interface MemberWithProfile extends OrganizationMember {
  profile: Profile
}

export interface Invitation {
  id: string
  organizationId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  invitedBy: string
  token: string
  createdAt: string
  expiresAt: string
}
