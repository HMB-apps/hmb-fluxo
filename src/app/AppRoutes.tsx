import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { CreateOrganizationPage } from '../pages/CreateOrganizationPage'
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage'
import { getPendingInvitationToken } from '../auth/pendingInvitation'

// Carregadas sob demanda (Fase 7): reduz o pacote inicial só ao necessário
// para autenticar — o resto do app chega em pedaços, um por rota, conforme
// a pessoa navega.
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ClientsPage = lazy(() => import('../pages/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const ClientDetailPage = lazy(() => import('../pages/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })))
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
const BoardPage = lazy(() => import('../pages/BoardPage').then((m) => ({ default: m.BoardPage })))
const CompletedPage = lazy(() => import('../pages/CompletedPage').then((m) => ({ default: m.CompletedPage })))
const TrashPage = lazy(() => import('../pages/TrashPage').then((m) => ({ default: m.TrashPage })))
const MyDayPage = lazy(() => import('../pages/MyDayPage').then((m) => ({ default: m.MyDayPage })))
const TeamPage = lazy(() => import('../pages/TeamPage').then((m) => ({ default: m.TeamPage })))
const CalendarPage = lazy(() => import('../pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const TimelinePage = lazy(() => import('../pages/TimelinePage').then((m) => ({ default: m.TimelinePage })))
const InboxPage = lazy(() => import('../pages/InboxPage').then((m) => ({ default: m.InboxPage })))
const RecurrencesPage = lazy(() => import('../pages/RecurrencesPage').then((m) => ({ default: m.RecurrencesPage })))

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
          <Route path="/meu-dia" element={<MyDayPage />} />
          <Route path="/equipe" element={<TeamPage />} />
          <Route path="/caixa-de-entrada" element={<InboxPage />} />
          <Route path="/linha-do-tempo" element={<TimelinePage />} />
          <Route path="/quadro" element={<BoardPage />} />
          <Route path="/calendario" element={<CalendarPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/projetos" element={<ProjectsPage />} />
          <Route path="/recorrencias" element={<RecurrencesPage />} />
          <Route path="/concluidos" element={<CompletedPage />} />
          <Route path="/lixeira" element={<TrashPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/meu-dia" replace />} />
        </Route>
      )}
    </Routes>
  )
}
