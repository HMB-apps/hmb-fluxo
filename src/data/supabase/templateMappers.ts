import type { Database } from './database.types'
import type { TaskTemplate, TemplateStep } from '../../domain/templates'

type TaskTemplateRow = Database['public']['Tables']['task_templates']['Row']
type TemplateStepRow = Database['public']['Tables']['template_steps']['Row']

export function mapTaskTemplate(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    defaultEstimateMinutes: row.default_estimate_minutes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  }
}

export function mapTemplateStep(row: TemplateStepRow): TemplateStep {
  return {
    id: row.id,
    templateId: row.template_id,
    organizationId: row.organization_id,
    position: row.position,
    title: row.title,
    description: row.description,
    estimateMinutes: row.estimate_minutes,
    dependsOnPosition: row.depends_on_position,
    createdAt: row.created_at,
  }
}
