import { useAuth } from '../../auth/AuthProvider'

export function Header() {
  const { profile, organization, signOut } = useAuth()

  return (
    <header className="app-header">
      <div className="app-header-org">{organization?.name}</div>
      <div className="app-header-user">
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
