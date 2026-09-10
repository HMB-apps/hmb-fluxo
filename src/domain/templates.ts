/** Modelos de trabalho (Fase 6, seção 19 do briefing): etapas predefinidas reaplicáveis. */
export interface TaskTemplate {
  id: string
  organizationId: string
  name: string
  description: string | null
  categoryId: string | null
  defaultEstimateMinutes: number | null
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface TemplateStep {
  id: string
  templateId: string
  organizationId: string
  position: number
  title: string
  description: string | null
  estimateMinutes: number | null
  dependsOnPosition: number | null
  createdAt: string
}

export interface TaskTemplateWithSteps extends TaskTemplate {
  steps: TemplateStep[]
}
