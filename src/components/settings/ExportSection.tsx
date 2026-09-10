import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../data/supabase/client'
import { branding } from '../../config/branding'

/**
 * Exportação administrativa (seção 32 do briefing): um snapshot em JSON de
 * todos os dados operacionais da organização, para backup manual ou análise
 * fora do app. O RLS garante que só os dados da própria organização saem
 * daqui — nenhuma tabela aqui é acessível entre organizações diferentes.
 */
const EXPORTED_TABLES_WITH_ORG_COLUMN = [
  'clients',
  'projects',
  'categories',
  'tasks',
  'tags',
  'task_dependencies',
  'work_schedules',
  'calendar_blocks',
  'recurrence_rules',
  'task_templates',
  'template_steps',
  'planner_runs',
] as const

/** Não tem coluna organization_id própria — o escopo vem da tarefa (RLS cuida disso). */
const EXPORTED_TABLES_WITHOUT_ORG_COLUMN = ['task_tags'] as const

export function ExportSection() {
  const { organization } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    if (!organization) return
    setExporting(true)
    setError(null)
    try {
      const snapshot: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        organizationId: organization.id,
        organizationName: organization.name,
      }

      for (const table of EXPORTED_TABLES_WITH_ORG_COLUMN) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: queryError } = await (supabase.from as any)(table).select('*').eq('organization_id', organization.id)
        if (queryError) throw queryError
        snapshot[table] = data ?? []
      }
      for (const table of EXPORTED_TABLES_WITHOUT_ORG_COLUMN) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: queryError } = await (supabase.from as any)(table).select('*')
        if (queryError) throw queryError
        snapshot[table] = data ?? []
      }

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `${branding.productName.toLowerCase().replace(/\s+/g, '-')}-backup-${dateStamp}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível exportar os dados.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8 }}>
        Gera um arquivo JSON com todos os clientes, projetos, categorias, tarefas, dependências,
        modelos de trabalho e configurações de agenda da organização — útil como cópia de segurança
        manual, além dos backups automáticos do Supabase (retenção conforme o plano do projeto).
      </p>
      <button type="button" className="secondary-button" onClick={() => void handleExport()} disabled={exporting}>
        {exporting ? 'Gerando…' : 'Baixar backup em JSON'}
      </button>
      {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  )
}
