import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { requestNewOrganization } from '../data/repositories/organizationRepository'
import { branding } from '../config/branding'

/**
 * Exibida quando um usuário autenticado ainda não pertence a nenhuma
 * organização e não veio de um link de convite nem de /solicitar-acesso —
 * ex.: alguém criado direto no painel do Supabase por um administrador.
 * A partir da Fase 8, a organização criada aqui também nasce "pending":
 * quem enviar precisa aguardar aprovação de um superadmin da plataforma
 * (o app leva sozinho para essa tela de espera depois do submit).
 */
export function CreateOrganizationPage() {
  const { refresh, signOut } = useAuth()
  const [name, setName] = useState<string>(branding.organizationName)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await requestNewOrganization(name.trim())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Bem-vindo ao {branding.productName}</h1>
        <p className="auth-subtitle">
          Sua conta ainda não está em nenhum espaço de trabalho. Informe o nome da sua organização — um
          administrador da plataforma revisa e aprova antes de você poder usar o sistema.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nome do espaço de trabalho
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Enviando…' : 'Solicitar acesso'}
          </button>
          <button type="button" className="link-button" onClick={() => void signOut()}>
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
