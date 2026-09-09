import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  listOrganizationMembers,
  updateMemberStatus,
} from '../data/repositories/organizationRepository'
import {
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
} from '../data/repositories/invitationRepository'
import type { Invitation, MemberWithProfile } from '../domain/types'
import { branding } from '../config/branding'
import { useCategories } from '../hooks/useOrgData'
import { useRealtimeTable } from '../hooks/useRealtimeTable'
import { createCategory, updateCategory } from '../data/repositories/categoryRepository'

export function SettingsPage() {
  const { profile, organization, user } = useAuth()
  const { items: categories, reload: reloadCategories } = useCategories()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)

  const isAdmin = members.some((m) => m.userId === user?.id && m.role === 'admin')
  const organizationId = organization?.id

  // Depende só do id (primitivo estável), não do objeto `organization` —
  // este é recriado a cada carga de dados do AuthProvider, o que fazia o
  // efeito abaixo reexecutar em loop e a tela travar em "Carregando…".
  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    setError(null)
    try {
      const [memberList, invitationList] = await Promise.all([
        listOrganizationMembers(organizationId),
        listPendingInvitations(organizationId),
      ])
      setMembers(memberList)
      setInvitations(invitationList.filter((i) => i.status === 'pending'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a equipe.')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeTable('organization_members', organizationId, load)

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    setInviting(true)
    setError(null)
    try {
      await createInvitation({
        organizationId: organization.id,
        email: inviteEmail,
        role: 'member',
        invitedBy: user.id,
      })
      setInviteEmail('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o convite.')
    } finally {
      setInviting(false)
    }
  }

  function invitationLink(token: string): string {
    return `${window.location.origin}/convite/${token}`
  }

  async function handleCopyLink(invitation: Invitation) {
    const link = invitationLink(invitation.token)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedInvitationId(invitation.id)
      setTimeout(() => setCopiedInvitationId((current) => (current === invitation.id ? null : current)), 2000)
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione e copie o link manualmente.')
    }
  }

  async function handleToggleStatus(member: MemberWithProfile) {
    const nextStatus = member.status === 'active' ? 'disabled' : 'active'
    try {
      await updateMemberStatus(member.id, nextStatus)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o integrante.')
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await revokeInvitation(invitationId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível revogar o convite.')
    }
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault()
    if (!organization || !newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      await createCategory(organization.id, { name: newCategoryName.trim(), sortOrder: categories.length })
      setNewCategoryName('')
      reloadCategories()
    } finally {
      setCreatingCategory(false)
    }
  }

  async function handleToggleCategory(id: string, active: boolean) {
    await updateCategory(id, { active: !active })
    reloadCategories()
  }

  return (
    <div className="settings-page">
      <h1>Configurações</h1>

      <section className="settings-section">
        <h2>Meu perfil</h2>
        <p>
          {profile?.name} — {profile?.email}
        </p>
      </section>

      <section className="settings-section">
        <h2>Equipe — {branding.organizationName}</h2>
        {error && <p className="auth-error">{error}</p>}
        {loading ? (
          <p>Carregando…</p>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.profile.name}</td>
                  <td>{member.profile.email}</td>
                  <td>{member.role === 'admin' ? 'Administrador' : 'Membro'}</td>
                  <td>{member.status}</td>
                  {isAdmin && (
                    <td>
                      {member.userId !== user?.id && (
                        <button type="button" className="link-button" onClick={() => void handleToggleStatus(member)}>
                          {member.status === 'active' ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {isAdmin && (
          <>
            <h3>Convidar novo integrante</h3>
            <form onSubmit={handleInvite} className="inline-form">
              <input
                type="email"
                placeholder="email@exemplo.com"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              <button type="submit" disabled={inviting}>
                {inviting ? 'Convidando…' : 'Convidar'}
              </button>
            </form>

            {invitations.length > 0 && (
              <>
                <h3>Convites pendentes</h3>
                <ul className="invitation-list">
                  {invitations.map((invitation) => (
                    <li key={invitation.id} className="invitation-item">
                      <div className="invitation-item-row">
                        <span>{invitation.email}</span>
                        <button type="button" className="link-button" onClick={() => void handleRevoke(invitation.id)}>
                          Revogar
                        </button>
                      </div>
                      <div className="invitation-item-row">
                        <input readOnly value={invitationLink(invitation.token)} onFocus={(e) => e.target.select()} />
                        <button type="button" className="link-button" onClick={() => void handleCopyLink(invitation)}>
                          {copiedInvitationId === invitation.id ? 'Copiado!' : 'Copiar link'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <section className="settings-section">
        <h2>Categorias</h2>
        <ul className="invitation-list">
          {categories.map((category) => (
            <li key={category.id} className="invitation-item">
              <div className="invitation-item-row">
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: category.color ?? '#94a3b8',
                      marginRight: 8,
                    }}
                  />
                  {category.name}
                </span>
                <button type="button" className="link-button" onClick={() => void handleToggleCategory(category.id, category.active)}>
                  {category.active ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={handleCreateCategory} className="inline-form">
          <input
            placeholder="Nova categoria"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <button type="submit" disabled={creatingCategory}>
            Adicionar
          </button>
        </form>
      </section>
    </div>
  )
}
