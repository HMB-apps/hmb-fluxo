import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useInboxEntries } from '../hooks/useOrgData'
import {
  createInboxEntry,
  getLatestInterpretation,
  interpretInboxEntry,
} from '../data/repositories/inboxRepository'
import { InterpretationReviewModal } from '../components/inbox/InterpretationReviewModal'
import { TaskFormModal } from '../components/tasks/TaskFormModal'
import type { InboxEntry, InterpretedTaskDraft } from '../domain/inbox'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Salvo, ainda não interpretado',
  processing: 'Interpretando…',
  processed: 'Interpretado',
  failed: 'Falha na interpretação',
  discarded: 'Descartado',
}

export function InboxPage() {
  const { organization, user } = useAuth()
  const { items: allEntries, loading, reload } = useInboxEntries()
  const entries = allEntries.filter((e) => e.status !== 'discarded')

  const [rawText, setRawText] = useState('')
  const [saving, setSaving] = useState(false)
  const [interpreting, setInterpreting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [reviewing, setReviewing] = useState<InterpretedTaskDraft[] | null>(null)
  const [manualFallback, setManualFallback] = useState<InboxEntry | null>(null)

  async function handleSave(alsoInterpret: boolean) {
    if (!organization || !user || !rawText.trim()) return
    setSaving(true)
    setError(null)
    try {
      const entry = await createInboxEntry(organization.id, user.id, rawText.trim())
      setRawText('')
      reload()
      if (alsoInterpret) {
        await handleInterpret(entry.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleInterpret(entryId: string) {
    setInterpreting(entryId)
    setError(null)
    try {
      const { items } = await interpretInboxEntry(entryId)
      reload()
      if (items.length === 0) {
        setError('A IA não encontrou nenhuma demanda nesse texto. Você pode criar a tarefa manualmente.')
      } else {
        setReviewing(items)
      }
    } catch (err) {
      reload()
      setError(err instanceof Error ? err.message : 'Não foi possível interpretar o texto.')
    } finally {
      setInterpreting(null)
    }
  }

  async function handleViewEntry(entry: InboxEntry) {
    if (entry.status === 'processed') {
      const interpretation = await getLatestInterpretation(entry.id)
      if (interpretation?.items) setReviewing(interpretation.items)
    } else if (entry.status === 'failed' || entry.status === 'pending') {
      await handleInterpret(entry.id)
    }
  }

  return (
    <div>
      <h1>Caixa de entrada</h1>
      <p style={{ fontSize: 13, color: 'var(--text)' }}>
        Escreva livremente uma ou várias demandas. O texto é salvo imediatamente, mesmo que a
        interpretação por IA falhe ou esteja desativada.
      </p>

      <textarea
        className="inbox-textarea"
        rows={6}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 14 }}
        placeholder="Ex.: Ajustar o formulário do site da Brisa até amanhã, preparar dois conteúdos da Deltus até sexta..."
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
      />

      {error && <p className="auth-error">{error}</p>}

      <div className="form-actions" style={{ marginLeft: 0 }}>
        <button type="button" className="secondary-button" onClick={() => void handleSave(false)} disabled={saving || !rawText.trim()}>
          Salvar na caixa de entrada
        </button>
        <button type="button" className="primary-button" onClick={() => void handleSave(true)} disabled={saving || !rawText.trim()}>
          {saving ? 'Salvando…' : 'Interpretar e organizar'}
        </button>
      </div>

      <h2>Histórico</h2>
      {loading ? (
        <p>Carregando…</p>
      ) : entries.length === 0 ? (
        <div className="empty-state">Nenhum texto na caixa de entrada ainda.</div>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="inbox-entry-item" onClick={() => void handleViewEntry(entry)}>
            <div className="inbox-entry-text">{entry.rawText}</div>
            <div className="inbox-entry-meta">
              <span>
                {STATUS_LABELS[entry.status] ?? entry.status}
                {interpreting === entry.id && '…'}
              </span>
              <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            {entry.status === 'failed' && (
              <button
                type="button"
                className="link-button"
                onClick={(e) => {
                  e.stopPropagation()
                  setManualFallback(entry)
                }}
              >
                Transformar manualmente
              </button>
            )}
          </div>
        ))
      )}

      {reviewing && (
        <InterpretationReviewModal
          items={reviewing}
          onClose={() => setReviewing(null)}
          onConfirmed={() => {
            reload()
          }}
        />
      )}

      {manualFallback && (
        <TaskFormModal
          task={null}
          initialTitle={manualFallback.rawText.slice(0, 120)}
          initialDescription={manualFallback.rawText}
          onClose={() => setManualFallback(null)}
          onSaved={() => setManualFallback(null)}
        />
      )}
    </div>
  )
}
