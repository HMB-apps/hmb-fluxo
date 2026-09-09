import { supabase } from '../supabase/client'
import { listTasks, updateTask } from './taskRepository'
import type { PlannerRun, PlannerRunChange } from '../../domain/planning'
import type { Database } from '../supabase/database.types'

type Row = Database['public']['Tables']['planner_runs']['Row']

function mapRow(row: Row): PlannerRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    changes: row.changes as unknown as PlannerRunChange[],
    createdAt: row.created_at,
    undoneAt: row.undone_at,
  }
}

export async function createPlannerRun(
  organizationId: string,
  createdBy: string,
  changes: PlannerRunChange[],
): Promise<PlannerRun> {
  const { data, error } = await supabase
    .from('planner_runs')
    .insert({ organization_id: organizationId, created_by: createdBy, changes: changes as unknown as never })
    .select('*')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function getLastPlannerRun(organizationId: string): Promise<PlannerRun | null> {
  const { data, error } = await supabase
    .from('planner_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .is('undone_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

/**
 * Desfaz uma reorganização automática (seção 16.3): restaura a data/hora
 * planejada anterior de cada tarefa afetada. Feito melhor-esforço — se uma
 * tarefa individual já mudou de novo por outro motivo, ela é ignorada em vez
 * de travar o desfazer inteiro.
 */
export async function undoPlannerRun(run: PlannerRun): Promise<void> {
  const tasks = await listTasks(run.organizationId, { includeTrashed: false })
  const byId = new Map(tasks.map((t) => [t.id, t]))

  for (const change of run.changes) {
    const current = byId.get(change.taskId)
    if (!current) continue
    try {
      await updateTask(change.taskId, current.rowVersion, {
        plannedStartAt: change.before.plannedStartAt,
        plannedEndAt: change.before.plannedEndAt,
      })
    } catch {
      // Conflito individual: segue desfazendo as demais em vez de travar tudo.
    }
  }

  const { error } = await supabase.from('planner_runs').update({ undone_at: new Date().toISOString() }).eq('id', run.id)
  if (error) throw error
}
