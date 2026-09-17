import { supabase } from '../supabase/client'
import { mapOrganization } from '../supabase/mappers'
import type { Organization } from '../../domain/types'
import type { OrganizationUsage } from '../../domain/platform'

/** true só para o(s) usuário(s) listado(s) em platform_admins (hoje, só Michel). */
export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) throw error
  return Boolean(data)
}

export async function listPendingOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapOrganization)
}

export async function approveOrganization(organizationId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_organization', { target_org_id: organizationId })
  if (error) throw error
}

export async function rejectOrganization(organizationId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_organization', { target_org_id: organizationId })
  if (error) throw error
}

export async function getOrganizationUsage(): Promise<OrganizationUsage[]> {
  const { data, error } = await supabase.rpc('get_organization_usage')
  if (error) throw error
  return (data ?? []).map((row) => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    status: row.status,
    memberCount: row.member_count,
    clientCount: row.client_count,
    taskCount: row.task_count,
    projectCount: row.project_count,
    inboxItemCount: row.inbox_item_count,
  }))
}
