import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../pages/LoginPage'
import { getPendingInvitationToken } from '../auth/pendingInvitation'

// Carregadas sob demanda (Fase 7): reduz o pacote inicial só ao necessário
// para autenticar — o resto do app chega em pedaços, um por rota, conforme
// a pessoa navega. As telas fora do AppLayout (convite, solicitação de
// acesso, painel do superadmin) também são lazy — o <Suspense> no final
// deste arquivo cobre todas elas.
const CreateOrganizationPage = lazy(() =>
  import('../pages/CreateOrganizationPage').then((m) => ({ default: m.CreateOrganizationPage })),
)
const AcceptInvitationPage = lazy(() =>
  import('../pages/AcceptInvitationPage').then((m) => ({ default: m.AcceptInvitationPage })),
)
const RequestOrganizationPage = lazy(() =>
  import('../pages/RequestOrganizationPage').then((m) => ({ default: m.RequestOrganizationPage })),
)
const OrganizationPendingPage = lazy(() =>
  import('../pages/OrganizationPendingPage').then((m) => ({ default: m.OrganizationPendingPage })),
)
const SuperadminPage = lazy(() => import('../pages/SuperadminPage').then((m) => ({ default: m.SuperadminPage })))
const OrganizationDetailAdminPage = lazy(() =>
  import('../pages/OrganizationDetailAdminPage').then((m) => ({ default: m.OrganizationDetailAdminPage })),
)
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
  const { loading, user, needsOrganization, organization, isPlatformAdmin } = useAuth()

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

  // Fase 8: organização existe, mas ainda não foi aprovada por um superadmin
  // da plataforma — bloqueia o uso normal do app sem cair de volta na tela
  // de "criar espaço de trabalho" (a organização já existe, só não está ativa).
  const orgPending = Boolean(user) && organization !== null && organization.status === 'pending'

  return (
    <Suspense
      fallback={
        <div className="auth-screen">
          <p>Carregando…</p>
        </div>
      }
    >
      <Routes>
        <Route path="/convite/:token" element={<AcceptInvitationPage />} />
        <Route path="/solicitar-acesso" element={<RequestOrganizationPage />} />

        {!user && (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}

        {user && isPlatformAdmin && (
          <>
            <Route path="/superadmin" element={<SuperadminPage />} />
            <Route path="/superadmin/organizacoes/:id" element={<OrganizationDetailAdminPage />} />
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

        {user && !needsOrganization && orgPending && <Route path="*" element={<OrganizationPendingPage />} />}

        {user && !needsOrganization && !orgPending && (
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
    </Suspense>
  )
}
