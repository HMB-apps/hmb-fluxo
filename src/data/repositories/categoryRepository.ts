import { supabase } from '../supabase/client'
import { mapCategory } from '../supabase/taskMappers'
import type { Category } from '../../domain/task'

export interface CategoryInput {
  name: string
  color?: string | null
  sortOrder?: number
  active?: boolean
}

export async function listCategories(organizationId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapCategory)
}

export async function createCategory(organizationId: string, input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      organization_id: organizationId,
      name: input.name,
      color: input.color ?? null,
      sort_order: input.sortOrder ?? 0,
      active: input.active ?? true,
    })
    .select('*')
    .single()
  if (error) throw error
  return mapCategory(data)
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapCategory(data)
}
