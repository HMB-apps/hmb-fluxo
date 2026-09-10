import { supabase } from '../supabase/client'
import { mapTaskTemplate, mapTemplateStep } from '../supabase/templateMappers'
import { createTask } from './taskRepository'
import { addDependency } from './dependencyRepository'
import type { TaskTemplate, TaskTemplateWithSteps, TemplateStep } from '../../domain/templates'
import type { Task } from '../../domain/task'

export async function listTaskTemplates(organizationId: string): Promise<TaskTemplateWithSteps[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*, template_steps(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...mapTaskTemplate(row),
    steps: (row.template_steps ?? [])
      .map((s: Parameters<typeof mapTemplateStep>[0]) => mapTemplateStep(s))
      .sort((a: TemplateStep, b: TemplateStep) => a.position - b.position),
  }))
}

export interface TemplateStepInput {
  title: string
  description?: string | null
  estimateMinutes?: number | null
  dependsOnPosition?: number | null
}

export async function createTaskTemplate(
  organizationId: string,
  actorId: string,
  input: { name: string; description?: string | null; categoryId?: string | null; defaultEstimateMinutes?: number | null },
  steps: TemplateStepInput[],
): Promise<TaskTemplateWithSteps> {
  const { data: template, error } = await supabase
    .from('task_templates')
    .insert({
      organization_id: organizationId,
      created_by: actorId,
      name: input.name,
      description: input.description ?? null,
      category_id: input.categoryId ?? null,
      default_estimate_minutes: input.defaultEstimateMinutes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  if (steps.length > 0) {
    const { error: stepsError } = await supabase.from('template_steps').insert(
      steps.map((step, index) => ({
        template_id: template.id,
        organization_id: organizationId,
        position: index,
        title: step.title,
        description: step.description ?? null,
        estimate_minutes: step.estimateMinutes ?? null,
        depends_on_position: step.dependsOnPosition ?? null,
      })),
    )
    if (stepsError) throw stepsError
  }

  const { data: stepRows, error: stepsFetchError } = await supabase
    .from('template_steps')
    .select('*')
    .eq('template_id', template.id)
    .order('position', { ascending: true })
  if (stepsFetchError) throw stepsFetchError

  return { ...mapTaskTemplate(template), steps: (stepRows ?? []).map(mapTemplateStep) }
}

export async function updateTaskTemplate(id: string, patch: { name?: string; description?: string | null; active?: boolean }): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapTaskTemplate(data)
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('task_templates').delete().eq('id', id)
  if (error) throw error
}

/**
 * Aplica um modelo criando uma tarefa por etapa (todas com o mesmo cliente/
 * projeto informado), encadeando as dependências conforme `dependsOnPosition`.
 */
export async function applyTaskTemplate(
  organizationId: string,
  actorId: string,
  template: TaskTemplateWithSteps,
  context: { clientId?: string | null; projectId?: string | null; assignedTo?: string | null; deadlineAt?: string | null },
): Promise<Task[]> {
  const createdByPosition = new Map<number, Task>()

  for (const step of template.steps) {
    const task = await createTask(organizationId, actorId, {
      title: step.title,
      description: step.description,
      clientId: context.clientId ?? null,
      projectId: context.projectId ?? null,
      categoryId: template.categoryId,
      estimateMinutes: step.estimateMinutes ?? template.defaultEstimateMinutes ?? null,
      assignedTo: context.assignedTo ?? null,
      deadlineAt: context.deadlineAt ?? null,
      sourceText: `Gerada a partir do modelo "${template.name}".`,
    })
    createdByPosition.set(step.position, task)
  }

  for (const step of template.steps) {
    if (step.dependsOnPosition === null || step.dependsOnPosition === undefined) continue
    const blocking = createdByPosition.get(step.dependsOnPosition)
    const blocked = createdByPosition.get(step.position)
    if (blocking && blocked) {
      await addDependency(organizationId, actorId, blocking.id, blocked.id)
    }
  }

  return [...createdByPosition.values()]
}
