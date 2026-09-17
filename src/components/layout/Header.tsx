import { useAuth } from '../../auth/AuthProvider'
import { NotificationBell } from './NotificationBell'

export function Header() {
  const { profile, organization, signOut } = useAuth()

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Reservado para o logotipo do próprio app HMB Fluxo (ainda não
            fornecido) — menor e à parte do logo de organização, que fica
            maior no sidebar. Espaço de tamanho fixo para não haver
            deslocamento de layout quando o asset for adicionado. */}
        <div className="app-header-brand-slot" aria-hidden="true" />
        <div className="app-header-org">{organization?.name}</div>
      </div>
      <div className="app-header-user">
        <NotificationBell />
        <span className="user-badge" style={{ backgroundColor: profile?.color ?? '#64748b' }}>
          {(profile?.name ?? '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="user-name">{profile?.name}</span>
        <button type="button" className="link-button" onClick={() => void signOut()}>
          Sair
        </button>
      </div>
    </header>
  )
}
