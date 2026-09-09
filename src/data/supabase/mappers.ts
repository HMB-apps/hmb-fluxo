import type { Database, InvitationStatus, MemberRole, MemberStatus } from './database.types'
import type { Invitation, MemberWithProfile, Organization, OrganizationMember, Profile } from '../../domain/types'

type OrganizationRow = Database['public']['Tables']['organizations']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type MemberRow = Database['public']['Tables']['organization_members']['Row']
type InvitationRow = Database['public']['Tables']['invitations']['Row']

export function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    color: row.color,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMember(row: MemberRow): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role as MemberRole,
    status: row.status as MemberStatus,
    invitedBy: row.invited_by,
    invitedAt: row.invited_at,
    joinedAt: row.joined_at,
  }
}

export function mapMemberWithProfile(row: MemberRow & { profiles: ProfileRow }): MemberWithProfile {
  return {
    ...mapMember(row),
    profile: mapProfile(row.profiles),
  }
}

export function mapInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role as MemberRole,
    status: row.status as InvitationStatus,
    invitedBy: row.invited_by,
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}
