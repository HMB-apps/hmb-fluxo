import { useAuth } from '../auth/AuthProvider'
import { branding } from '../config/branding'

/**
 * Exibida quando o usuário já pertence a uma organização, mas ela ainda
 * está com status "pending" (Fase 8) — aguardando aprovação de um
 * superadmin da plataforma antes de poder usar o sistema de verdade.
 */
export function OrganizationPendingPage() {
  const { organization, signOut } = useAuth()

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Aguardando aprovação</h1>
        <p className="auth-subtitle">
          {organization ? (
            <>
              A organização <strong>{organization.name}</strong> foi criada e está aguardando revisão de um
              administrador da plataforma {branding.productName}.
            </>
          ) : (
            'Sua solicitação está aguardando revisão.'
          )}{' '}
          Você recebe acesso assim que ela for aprovada — não é preciso fazer mais nada por enquanto.
        </p>
        <button type="button" className="link-button" onClick={() => void signOut()}>
          Sair
        </button>
      </div>
    </div>
  )
}
