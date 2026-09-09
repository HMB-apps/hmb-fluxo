import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../data/supabase/client'
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

export function SettingsPage() {
  const { profile, organization, user } = useAuth()
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  const isAdmin = members.some((m) => m.userId === user?.id && m.role === 'admin')

  const load = useCallback(async () => {
    if (!organization) return
    setLoading(true)
    setError(null)
    try {
      const [memberList, invitationList] = await Promise.all([
        listOrganizationMembers(organization.id),
        listPendingInvitations(organization.id),
      ])
      setMembers(memberList)
      setInvitations(invitationList.filter((i) => i.status === 'pending'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar a equipe.')
    } finally {
      setLoading(false)
    }
  }, [organization])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!organization) return
    const channel = supabase
      .channel(`org-members-${organization.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organization_members', filter: `organization_id=eq.${organization.id}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [organization, load])

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    setInviting(true)
    setError(null)
    try {
      const invitation = await createInvitation({
        organizationId: organization.id,
        email: inviteEmail,
        role: 'member',
        invitedBy: user.id,
      })
      setInviteEmail('')
      await load()
      const link = `${window.location.origin}/convite/${invitation.token}`
      window.prompt('Envie este link de convite para o novo integrante:', link)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o convite.')
    } finally {
      setInviting(false)
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
                    <li key={invitation.id}>
                      {invitation.email}
                      <button type="button" className="link-button" onClick={() => void handleRevoke(invitation.id)}>
                        Revogar
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
