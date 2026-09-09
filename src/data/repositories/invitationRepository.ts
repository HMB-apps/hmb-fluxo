import { supabase } from '../supabase/client'
import { mapInvitation } from '../supabase/mappers'
import type { Invitation, MemberRole } from '../../domain/types'

export async function listPendingInvitations(organizationId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapInvitation)
}

export async function createInvitation(params: {
  organizationId: string
  email: string
  role: MemberRole
  invitedBy: string
}): Promise<Invitation> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: params.organizationId,
      email: params.email.trim().toLowerCase(),
      role: params.role,
      invited_by: params.invitedBy,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapInvitation(data)
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.from('invitations').update({ status: 'revoked' }).eq('id', invitationId)
  if (error) throw error
}

export interface InvitationPreview {
  email: string
  organizationName: string
  status: string
  expiresAt: string
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const { data, error } = await supabase.rpc('get_invitation_preview', { invitation_token: token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    email: row.email,
    organizationName: row.organization_name,
    status: row.status,
    expiresAt: row.expires_at,
  }
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invitation', { invitation_token: token })
  if (error) throw error
  return data as string
}
