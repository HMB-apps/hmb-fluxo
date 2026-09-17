import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useOrganizationTheme } from '../../hooks/useOrganizationTheme'

export function AppLayout() {
  useOrganizationTheme()

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Suspense fallback={<p>Carregando…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
