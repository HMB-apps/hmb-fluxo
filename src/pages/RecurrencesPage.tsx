import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useRecurrenceRules, useTasks } from '../hooks/useOrgData'
import { deleteRecurrenceRule, generateRecurrenceInstances } from '../data/repositories/recurrenceRepository'
import type { RecurrenceRuleRecord } from '../domain/recurrence'

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function describeRule(rule: RecurrenceRuleRecord): string {
  if (rule.frequency === 'daily') return 'Todo dia'
  if (rule.frequency === 'weekly') return `Semanal (${(rule.daysOfWeek ?? []).map((d) => WEEKDAY_LABELS[d]).join(', ')})`
  if (rule.frequency === 'monthly') return `Mensal (dia ${rule.dayOfMonth})`
  return `A cada ${rule.intervalDays} dias`
}

export function RecurrencesPage() {
  const { user } = useAuth()
  const { items: rules, loading, reload } = useRecurrenceRules()
  const { items: tasks } = useTasks()
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [statusById, setStatusById] = useState<Record<string, string>>({})

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  async function handleGenerate(rule: RecurrenceRuleRecord) {
    const sourceTask = taskById.get(rule.taskId)
    if (!sourceTask || !user) return
    setGeneratingId(rule.id)
    try {
      const created = await generateRecurrenceInstances(rule, sourceTask, user.id)
      setStatusById((s) => ({ ...s, [rule.id]: created.length > 0 ? `${created.length} demanda(s) gerada(s).` : 'Nada novo para gerar agora.' }))
      reload()
    } catch (err) {
      setStatusById((s) => ({ ...s, [rule.id]: err instanceof Error ? err.message : 'Falha ao gerar.' }))
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleDelete(rule: RecurrenceRuleRecord) {
    if (!window.confirm('Remover esta recorrência? As demandas já geradas continuam existindo.')) return
    await deleteRecurrenceRule(rule.id)
    reload()
  }

  if (loading) return <p>Carregando…</p>

  return (
    <div>
      <h1>Recorrências</h1>
      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
        Demandas que se repetem automaticamente. Para criar uma nova recorrência, abra a demanda
        desejada e use a seção "Recorrência" no formulário de edição.
      </p>

      {rules.length === 0 ? (
        <div className="empty-state">Nenhuma recorrência configurada ainda.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Demanda-modelo</th>
              <th>Frequência</th>
              <th>Última geração</th>
              <th>Termina em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{taskById.get(rule.taskId)?.title ?? 'Tarefa removida'}</td>
                <td>{describeRule(rule)}</td>
                <td>{rule.lastGeneratedDate ?? 'Ainda não gerou'}</td>
                <td>{rule.endDate ?? 'Sem data final'}</td>
                <td style={{ width: 260 }}>
                  <button type="button" className="link-button" onClick={() => void handleGenerate(rule)} disabled={generatingId === rule.id}>
                    {generatingId === rule.id ? 'Gerando…' : 'Gerar próximas'}
                  </button>{' '}
                  <button type="button" className="danger-button" onClick={() => void handleDelete(rule)}>
                    Remover
                  </button>
                  {statusById[rule.id] && <div style={{ fontSize: 12, marginTop: 4 }}>{statusById[rule.id]}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
