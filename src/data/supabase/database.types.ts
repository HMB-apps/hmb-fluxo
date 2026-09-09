/**
 * Tipos gerados manualmente para as tabelas/funções criadas até a Fase 1.
 *
 * Quando o projeto Supabase estiver conectado, regenere este arquivo com:
 *   npx supabase gen types typescript --project-id <id> > src/data/supabase/database.types.ts
 * e reintroduza aqui qualquer tipo manual que o CLI não gere.
 */
export type MemberRole = 'admin' | 'member'
export type MemberStatus = 'invited' | 'active' | 'disabled'
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          avatar_url: string | null
          color: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          avatar_url?: string | null
          color?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          name: string
          email: string
          avatar_url: string | null
          color: string | null
          active: boolean
          created_at: string
          updated_at: string
        }>
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: MemberRole
          status: MemberStatus
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: MemberRole
          status?: MemberStatus
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          organization_id: string
          user_id: string
          role: MemberRole
          status: MemberStatus
          invited_by: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: MemberRole
          status: InvitationStatus
          invited_by: string
          token: string
          created_at: string
          updated_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: MemberRole
          status?: InvitationStatus
          invited_by: string
          token?: string
          created_at?: string
          updated_at?: string
          expires_at?: string
        }
        Update: Partial<{
          id: string
          organization_id: string
          email: string
          role: MemberRole
          status: InvitationStatus
          invited_by: string
          token: string
          created_at: string
          updated_at: string
          expires_at: string
        }>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      claim_first_organization: {
        Args: { org_name: string }
        Returns: string
      }
      accept_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      get_invitation_preview: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          organization_name: string
          status: string
          expires_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
