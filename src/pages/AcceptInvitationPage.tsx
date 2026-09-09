import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../data/supabase/client'
import { clearPendingInvitationToken, setPendingInvitationToken } from '../auth/pendingInvitation'
import { acceptInvitation, getInvitationPreview, type InvitationPreview } from '../data/repositories/invitationRepository'
import { branding } from '../config/branding'

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, refresh } = useAuth()

  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false)

  useEffect(() => {
    if (!token) return
    setPendingInvitationToken(token)
    getInvitationPreview(token)
      .then((result) => {
        if (!result) {
          setLoadError('Convite não encontrado. Peça um novo link ao administrador.')
        } else if (result.status !== 'pending') {
          setLoadError('Este convite já foi utilizado, revogado ou expirou.')
        } else {
          setPreview(result)
        }
      })
      .catch(() => setLoadError('Não foi possível carregar este convite.'))
      .finally(() => setLoadingPreview(false))
  }, [token])

  async function finishAccepting() {
    if (!token) return
    setSubmitting(true)
    setActionError(null)
    try {
      await acceptInvitation(token)
      clearPendingInvitationToken()
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível aceitar o convite.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault()
    if (!preview) return
    setSubmitting(true)
    setActionError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: preview.email,
      password,
      options: { data: { name } },
    })
    if (signUpError) {
      setActionError(
        signUpError.message.includes('already registered')
          ? 'Já existe uma conta com este e-mail. Faça login para aceitar o convite.'
          : 'Não foi possível criar sua conta. Tente novamente.',
      )
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    if (!data.session) {
      // Confirmação de e-mail está habilitada no projeto: a conta foi criada,
      // mas ainda não há sessão para aceitar o convite. O token já ficou
      // salvo (setPendingInvitationToken) para retomar automaticamente
      // assim que a pessoa confirmar o e-mail e voltar autenticada.
      setAwaitingEmailConfirmation(true)
      return
    }
    await finishAccepting()
  }

  if (loadingPreview) return <div className="auth-screen">Carregando convite…</div>

  if (loadError) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>{branding.productName}</h1>
          <p className="auth-error">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!preview) return null

  if (awaitingEmailConfirmation) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Confirme seu e-mail</h1>
          <p className="auth-subtitle">
            Sua conta foi criada. Enviamos um e-mail de confirmação para <strong>{preview.email}</strong>. Abra-o e
            clique no link de confirmação — você voltará automaticamente para o {branding.productName} já conectado
            e com o convite aceito.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Já confirmei, continuar
          </button>
        </div>
      </div>
    )
  }

  const loggedInWithWrongEmail = user && user.email?.toLowerCase() !== preview.email.toLowerCase()

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Convite para {preview.organizationName}</h1>
        <p className="auth-subtitle">Convite enviado para {preview.email}</p>

        {actionError && <p className="auth-error">{actionError}</p>}

        {loggedInWithWrongEmail ? (
          <p className="auth-error">
            Você está logado com outra conta. Saia e entre com {preview.email} para aceitar este convite.
          </p>
        ) : user ? (
          <button type="button" onClick={() => void finishAccepting()} disabled={submitting}>
            {submitting ? 'Entrando na organização…' : 'Aceitar convite'}
          </button>
        ) : (
          <form onSubmit={handleCreateAccount} className="auth-form">
            <label>
              Seu nome
              <input value={name} onChange={(event) => setName(event.target.value)} required />
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
            <button type="submit" disabled={submitting}>
              {submitting ? 'Criando conta…' : 'Criar conta e entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
