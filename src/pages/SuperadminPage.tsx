import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  approveOrganization,
  getOrganizationUsage,
  listPendingOrganizations,
  rejectOrganization,
} from '../data/repositories/platformRepository'
import type { Organization } from '../domain/types'
import type { OrganizationUsage } from '../domain/platform'
import { branding } from '../config/branding'

/**
 * Painel do superadmin da plataforma (Fase 8) — fora do AppLayout de
 * qualquer organização, porque é uma área conceitualmente separada da
 * navegação por organização.
 */
export function SuperadminPage() {
  const { signOut } = useAuth()
  const [pending, setPending] = useState<Organization[]>([])
  const [usage, setUsage] = useState<OrganizationUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pendingResult, usageResult] = await Promise.all([listPendingOrganizations(), getOrganizationUsage()])
      setPending(pendingResult)
      setUsage(usageResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o painel.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleApprove(orgId: string) {
    setActingOn(orgId)
    try {
      await approveOrganization(orgId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível aprovar.')
    } finally {
      setActingOn(null)
    }
  }

  async function handleReject(orgId: string, orgName: string) {
    if (!window.confirm(`Rejeitar a solicitação de "${orgName}"? Isso não apaga os dados, só bloqueia o acesso.`)) return
    setActingOn(orgId)
    try {
      await rejectOrganization(orgId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível rejeitar.')
    } finally {
      setActingOn(null)
    }
  }

  return (
    <div className="auth-screen" style={{ alignItems: 'flex-start', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <h1>Painel da plataforma — {branding.productName}</h1>
          <button type="button" className="link-button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <section className="settings-section">
          <h2>Organizações pendentes</h2>
          {loading ? (
            <p>Carregando…</p>
          ) : pending.length === 0 ? (
            <div className="empty-state">Nenhuma solicitação pendente.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organização</th>
                  <th>Solicitada em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((org) => (
                  <tr key={org.id}>
                    <td>{org.name}</td>
                    <td>{new Date(org.createdAt).toLocaleString('pt-BR')}</td>
                    <td style={{ width: 220 }}>
                      <button
                        type="button"
                        className="link-button"
                        disabled={actingOn === org.id}
                        onClick={() => void handleApprove(org.id)}
                      >
                        Aprovar
                      </button>{' '}
                      <button
                        type="button"
                        className="danger-button"
                        disabled={actingOn === org.id}
                        onClick={() => void handleReject(org.id, org.name)}
                      >
                        Rejeitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="settings-section">
          <h2>Uso por organização</h2>
          <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8 }}>
            Contagens de linhas por organização — útil para acompanhar volume relativo entre organizações. Não mede
            bytes reais de disco contra o limite do plano do Supabase.
          </p>
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organização</th>
                  <th>Status</th>
                  <th>Membros</th>
                  <th>Clientes</th>
                  <th>Tarefas</th>
                  <th>Projetos</th>
                  <th>Caixa de entrada</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.organizationId}>
                    <td>{row.organizationName}</td>
                    <td>{row.status}</td>
                    <td>{row.memberCount}</td>
                    <td>{row.clientCount}</td>
                    <td>{row.taskCount}</td>
                    <td>{row.projectCount}</td>
                    <td>{row.inboxItemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
