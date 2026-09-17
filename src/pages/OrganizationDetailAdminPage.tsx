import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  getOrganizationById,
  reactivateOrganization,
  renameOrganizationAsPlatformAdmin,
  setMemberStatusAsPlatformAdmin,
  suspendOrganization,
} from '../data/repositories/platformRepository'
import { listOrganizationMembers } from '../data/repositories/organizationRepository'
import type { Organization, MemberWithProfile } from '../domain/types'
import { branding } from '../config/branding'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativa',
  rejected: 'Rejeitada',
  suspended: 'Suspensa',
}

/** Detalhe de uma organização, visto pelo superadmin (Fase 8.1) — fora do AppLayout, mesma área do painel da plataforma. */
export function OrganizationDetailAdminPage() {
  const { id } = useParams<{ id: string }>()
  const { signOut } = useAuth()

  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [nameInput, setNameInput] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [orgResult, membersResult] = await Promise.all([getOrganizationById(id), listOrganizationMembers(id)])
      setOrg(orgResult)
      setNameInput(orgResult?.name ?? '')
      setMembers(membersResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a organização.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRename() {
    if (!id || !nameInput.trim()) return
    setSaving(true)
    setError(null)
    try {
      await renameOrganizationAsPlatformAdmin(id, nameInput.trim())
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível renomear.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    if (!id || !org) return
    setSaving(true)
    setError(null)
    try {
      if (org.status === 'active') await suspendOrganization(id)
      else if (org.status === 'suspended') await reactivateOrganization(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMember(member: MemberWithProfile) {
    setSaving(true)
    setError(null)
    try {
      await setMemberStatusAsPlatformAdmin(member.id, member.status === 'active' ? 'disabled' : 'active')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o integrante.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="auth-screen" style={{ alignItems: 'flex-start', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <h1>Painel da plataforma — {branding.productName}</h1>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link to="/superadmin" className="link-button">
              ← Organizações
            </Link>
            <Link to="/meu-dia" className="link-button">
              Voltar para o app
            </Link>
            <button type="button" className="link-button" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {loading ? (
          <p>Carregando…</p>
        ) : !org ? (
          <div className="empty-state">Organização não encontrada.</div>
        ) : (
          <>
            <section className="settings-section">
              <h2>Dados da organização</h2>
              <div className="form-grid">
                <label>
                  Nome
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="button" onClick={() => void handleRename()} disabled={saving || !nameInput.trim()}>
                    Salvar nome
                  </button>
                </div>
              </div>
              <p style={{ marginTop: 12 }}>
                Status: <strong>{STATUS_LABELS[org.status] ?? org.status}</strong>
              </p>
              {(org.status === 'active' || org.status === 'suspended') && (
                <button type="button" className={org.status === 'active' ? 'danger-button' : ''} onClick={() => void handleToggleStatus()} disabled={saving}>
                  {org.status === 'active' ? 'Suspender organização' : 'Reativar organização'}
                </button>
              )}
              {org.status === 'pending' && (
                <p style={{ fontSize: 12, color: 'var(--text)' }}>
                  Esta organização ainda está pendente — aprove ou rejeite pela lista em{' '}
                  <Link to="/superadmin">Painel da plataforma</Link>.
                </p>
              )}
            </section>

            <section className="settings-section">
              <h2>Integrantes</h2>
              {members.length === 0 ? (
                <div className="empty-state">Nenhum integrante.</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Papel</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>{member.profile.name}</td>
                        <td>{member.profile.email}</td>
                        <td>{member.role === 'admin' ? 'Administrador' : 'Membro'}</td>
                        <td>{member.status}</td>
                        <td>
                          <button type="button" className="link-button" disabled={saving} onClick={() => void handleToggleMember(member)}>
                            {member.status === 'active' ? 'Desativar' : 'Reativar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
