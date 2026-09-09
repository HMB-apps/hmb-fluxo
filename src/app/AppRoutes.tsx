import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { CreateOrganizationPage } from '../pages/CreateOrganizationPage'
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { SettingsPage } from '../pages/SettingsPage'
import { getPendingInvitationToken } from '../auth/pendingInvitation'

export function AppRoutes() {
  const { loading, user, needsOrganization } = useAuth()

  if (loading) {
    return (
      <div className="auth-screen">
        <p>Carregando…</p>
      </div>
    )
  }

  // Alguém que confirmou o e-mail por um link de convite volta autenticado,
  // mas ainda sem organização — sem isso, cairia na tela de "criar espaço de
  // trabalho" em vez de retomar o aceite do convite pendente.
  const pendingInvitationToken = user && needsOrganization ? getPendingInvitationToken() : null

  return (
    <Routes>
      <Route path="/convite/:token" element={<AcceptInvitationPage />} />

      {!user && (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}

      {user && needsOrganization && pendingInvitationToken && (
        <Route path="*" element={<Navigate to={`/convite/${pendingInvitationToken}`} replace />} />
      )}

      {user && needsOrganization && !pendingInvitationToken && (
        <>
          <Route path="*" element={<CreateOrganizationPage />} />
        </>
      )}

      {user && !needsOrganization && (
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/meu-dia" replace />} />
          <Route path="/meu-dia" element={<PlaceholderPage title="Meu dia" phase="Fase 3" />} />
          <Route path="/equipe" element={<PlaceholderPage title="Equipe" phase="Fase 3" />} />
          <Route path="/caixa-de-entrada" element={<PlaceholderPage title="Caixa de entrada" phase="Fase 5" />} />
          <Route path="/linha-do-tempo" element={<PlaceholderPage title="Linha do tempo" phase="Fase 3/4" />} />
          <Route path="/quadro" element={<PlaceholderPage title="Quadro" phase="Fase 3" />} />
          <Route path="/calendario" element={<PlaceholderPage title="Calendário" phase="Fase 3" />} />
          <Route path="/clientes" element={<PlaceholderPage title="Clientes" phase="Fase 2" />} />
          <Route path="/projetos" element={<PlaceholderPage title="Projetos" phase="Fase 2" />} />
          <Route path="/recorrencias" element={<PlaceholderPage title="Recorrências" phase="Fase 6" />} />
          <Route path="/concluidos" element={<PlaceholderPage title="Concluídos" phase="Fase 2" />} />
          <Route path="/lixeira" element={<PlaceholderPage title="Lixeira" phase="Fase 2" />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/meu-dia" replace />} />
        </Route>
      )}
    </Routes>
  )
}
