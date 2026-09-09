import { supabase } from '../supabase/client'
import { mapProfile } from '../supabase/mappers'
import type { Profile } from '../../domain/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function updateProfile(
  userId: string,
  changes: Partial<Pick<Profile, 'name' | 'avatarUrl' | 'color'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.avatarUrl !== undefined ? { avatar_url: changes.avatarUrl } : {}),
      ...(changes.color !== undefined ? { color: changes.color } : {}),
    })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return mapProfile(data)
}
