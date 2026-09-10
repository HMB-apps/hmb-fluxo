import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { createInboxEntry, discardInboxEntry, getAiSettings, interpretInboxEntry, updateAiSettings } from '../../data/repositories/inboxRepository'
import type { AiSettings } from '../../domain/inbox'

export function AiSettingsSection() {
  const { organization, user } = useAuth()
  const [settings, setSettings] = useState<AiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!organization) return
    getAiSettings(organization.id).then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [organization])

  async function persist(next: AiSettings) {
    if (!organization) return
    setSettings(next)
    setSaving(true)
    try {
      await updateAiSettings(organization.id, { enabled: next.enabled, provider: next.provider, model: next.model })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    if (!organization || !user) return
    setTestStatus('testing')
    setTestMessage(null)
    try {
      const entry = await createInboxEntry(organization.id, user.id, 'Teste de conexão com a IA — pode ignorar.')
      try {
        await interpretInboxEntry(entry.id)
        setTestStatus('ok')
        setTestMessage('Conexão funcionando normalmente.')
      } finally {
        await discardInboxEntry(entry.id)
      }
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Falha ao testar a conexão.')
    }
  }

  if (loading || !settings) return <p>Carregando…</p>

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => void persist({ ...settings, enabled: e.target.checked })}
        />
        Interpretação por IA ativada
      </label>

      <div className="form-grid">
        <label>
          Provedor
          <select value={settings.provider} onChange={(e) => void persist({ ...settings, provider: e.target.value })}>
            <option value="gemini">Google Gemini (gratuito)</option>
          </select>
        </label>
        <label>
          Modelo
          <input value={settings.model} onChange={(e) => void persist({ ...settings, model: e.target.value })} />
        </label>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text)', marginTop: 10 }}>
        Ao clicar em "Interpretar e organizar", o texto que você escreveu na Caixa de Entrada e os
        nomes dos clientes e categorias já cadastrados (só os nomes, não o histórico completo) são
        enviados ao provedor configurado para identificar as tarefas. A chave de acesso fica
        guardada com segurança no servidor — nunca no navegador.
      </p>

      <button type="button" className="secondary-button" onClick={() => void handleTestConnection()} disabled={testStatus === 'testing' || saving}>
        {testStatus === 'testing' ? 'Testando…' : 'Testar conexão'}
      </button>
      {testMessage && (
        <p className={testStatus === 'error' ? 'auth-error' : 'auth-success'} style={{ marginTop: 8 }}>
          {testMessage}
        </p>
      )}
    </div>
  )
}
