import { useState, type FormEvent } from 'react'
import { supabase } from '../data/supabase/client'
import { branding } from '../config/branding'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Verifique sua conexão e tente novamente.',
      )
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Informe seu e-mail para receber o link de redefinição de senha.')
      return
    }
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
    if (resetError) {
      setError('Não foi possível enviar o e-mail de redefinição. Tente novamente.')
      return
    }
    setResetSent(true)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>{branding.productName}</h1>
        <p className="auth-subtitle">{branding.organizationName}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {resetSent && <p className="auth-success">Enviamos um e-mail com o link para redefinir sua senha.</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="link-button" onClick={handleResetPassword}>
            Esqueci minha senha
          </button>
        </form>

        <p className="auth-footnote">
          O acesso é restrito a integrantes convidados da {branding.organizationName}. Se você recebeu um
          link de convite, abra-o para criar sua conta.
        </p>
      </div>
    </div>
  )
}
