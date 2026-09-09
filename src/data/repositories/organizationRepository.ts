import { supabase } from '../supabase/client'
import { mapMemberWithProfile, mapOrganization } from '../supabase/mappers'
import type { MemberWithProfile, Organization } from '../../domain/types'

/**
 * Busca a organização ativa do usuário autenticado (Fase 1: no máximo uma).
 * Retorna null se o usuário ainda não pertence a nenhuma organização —
 * nesse caso a interface deve oferecer "criar o espaço da HMB" (apenas
 * para o primeiro usuário) ou orientar a aguardar um convite.
 */
export async function getMyOrganization(): Promise<Organization | null> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  if (membershipError) throw membershipError
  if (!membership) return null

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single()
  if (orgError) throw orgError

  return mapOrganization(org)
}

export async function claimFirstOrganization(orgName: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_first_organization', { org_name: orgName })
  if (error) throw error
  return data as string
}

export async function listOrganizationMembers(organizationId: string): Promise<MemberWithProfile[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*, profiles(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMemberWithProfile)
}

export async function updateMemberStatus(
  memberId: string,
  status: 'active' | 'disabled',
): Promise<void> {
  const { error } = await supabase.from('organization_members').update({ status }).eq('id', memberId)
  if (error) throw error
}
