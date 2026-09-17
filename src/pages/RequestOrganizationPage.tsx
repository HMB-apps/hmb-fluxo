import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../data/supabase/client'
import { clearPendingOrgRequestName, getPendingOrgRequestName, setPendingOrgRequestName } from '../auth/pendingOrgRequest'
import { requestNewOrganization } from '../data/repositories/organizationRepository'
import { branding } from '../config/branding'

/**
 * Tela pública de autoatendimento (Fase 8): qualquer pessoa pode solicitar
 * uma organização nova, mas ela nasce em status "pending" — só passa a
 * funcionar depois que um superadmin da plataforma aprova (ver
 * OrganizationPendingPage e SuperadminPage).
 */
export function RequestOrganizationPage() {
  const { user, organization, refresh } = useAuth()
  const navigate = useNavigate()

  const [orgName, setOrgName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)

  // Se a pessoa já está autenticada e tinha uma solicitação pendente salva
  // (voltou depois de confirmar o e-mail), completa sozinho em vez de pedir
  // os dados de novo.
  useEffect(() => {
    if (!user || organization) return
    const savedOrgName = getPendingOrgRequestName()
    if (!savedOrgName) return
    requestNewOrganization(savedOrgName)
      .then(() => {
        clearPendingOrgRequestName()
        return refresh()
      })
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível concluir a solicitação.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, organization])

  async function finishRequesting() {
    setSubmitting(true)
    setError(null)
    try {
      await requestNewOrganization(orgName.trim())
      clearPendingOrgRequestName()
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Já existe uma conta com este e-mail. Faça login.'
          : 'Não foi possível criar sua conta. Tente novamente.',
      )
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    if (!data.session) {
      // Confirmação de e-mail habilitada no projeto: salva o nome da
      // organização para retomar sozinho quando a pessoa voltar autenticada.
      setPendingOrgRequestName(orgName.trim())
      setAwaitingEmailConfirmation(true)
      return
    }
    await finishRequesting()
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Confirme seu e-mail</h1>
          <p className="auth-subtitle">
            Sua conta foi criada. Enviamos um e-mail de confirmação para <strong>{email}</strong>. Abra-o e clique no
            link — você volta automaticamente para o {branding.productName} e sua solicitação de acesso é enviada
            sozinha.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Já confirmei, continuar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Solicitar acesso ao {branding.productName}</h1>
        <p className="auth-subtitle">
          Crie sua conta e o nome da sua empresa. Um administrador da plataforma revisa e aprova o acesso antes de
          você poder usar o sistema.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nome da sua empresa
            <input value={orgName} onChange={(event) => setOrgName(event.target.value)} required />
          </label>
          <label>
            Seu nome
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Crie uma senha
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={submitting || !orgName.trim()}>
            {submitting ? 'Enviando…' : 'Solicitar acesso'}
          </button>
        </form>
      </div>
    </div>
  )
}
