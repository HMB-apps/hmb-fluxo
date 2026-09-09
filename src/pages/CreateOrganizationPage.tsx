import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { claimFirstOrganization } from '../data/repositories/organizationRepository'
import { branding } from '../config/branding'

/**
 * Exibida quando um usuário autenticado ainda não pertence a nenhuma
 * organização. Na prática, isso só deve acontecer para o primeiro
 * administrador (Michel); Helena sempre chega via link de convite.
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
      await claimFirstOrganization(name.trim())
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o espaço de trabalho.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Bem-vindo ao {branding.productName}</h1>
        <p className="auth-subtitle">
          Sua conta ainda não está em nenhum espaço de trabalho. Se você é o primeiro a acessar o sistema,
          crie o espaço da sua equipe agora. Caso contrário, peça um convite ao administrador.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nome do espaço de trabalho
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Criando…' : 'Criar espaço de trabalho'}
          </button>
          <button type="button" className="link-button" onClick={() => void signOut()}>
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
