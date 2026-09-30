import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../data/supabase/client'
import { getMyOrganization } from '../data/repositories/organizationRepository'
import { getProfile } from '../data/repositories/profileRepository'
import { isPlatformAdmin as fetchIsPlatformAdmin } from '../data/repositories/platformRepository'
import type { Organization, Profile } from '../domain/types'

interface AuthState {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  organization: Organization | null
  /** true quando o usuário está autenticado mas ainda não pertence a nenhuma organização */
  needsOrganization: boolean
  /** true só para quem está em platform_admins (Fase 8) — gerencia aprovação de organizações e uso da plataforma. */
  isPlatformAdmin: boolean
  /**
   * true quando a última tentativa de carregar perfil/organização falhou (ex.: banco
   * instável logo após sair de pausa por inatividade) — nunca inferir "sem organização"
   * a partir de um erro de rede, ou um usuário com organização ativa cairia na tela
   * errada de "solicitar acesso" por uma falha transitória.
   */
  loadError: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadUserData = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setProfile(null)
      setOrganization(null)
      setIsPlatformAdmin(false)
      setLoadError(false)
      return
    }
    try {
      const [profileResult, orgResult, platformAdminResult] = await Promise.all([
        getProfile(currentSession.user.id),
        getMyOrganization(),
        fetchIsPlatformAdmin(),
      ])
      setProfile(profileResult)
      setOrganization(orgResult)
      setIsPlatformAdmin(platformAdminResult)
      setLoadError(false)
    } catch (error) {
      // Não mexe em profile/organization/isPlatformAdmin: uma falha transitória
      // (ex. banco saindo de pausa) não pode ser lida como "usuário sem organização".
      console.error('Falha ao carregar dados do usuário', error)
      setLoadError(true)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadUserData(data.session)
  }, [loadUserData])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadUserData(data.session)
      if (active) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      void loadUserData(newSession)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadUserData])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      organization,
      needsOrganization: Boolean(session?.user) && organization === null && !loadError,
      isPlatformAdmin,
      loadError,
      refresh,
      signOut,
    }),
    [loading, session, profile, organization, isPlatformAdmin, loadError, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
