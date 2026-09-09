/**
 * Gerado a partir do projeto Supabase real com:
 *   npx supabase gen types typescript --project-id cztrxgqnqluguhnisyjg
 * Regenere sempre que uma nova migration mudar o schema.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_log_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categories_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          short_name: string | null
          strategic_weight: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          short_name?: string | null
          strategic_weight?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          short_name?: string | null
          strategic_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clients_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          payload: Json
          read_at: string | null
          task_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          payload?: Json
          read_at?: string | null
          task_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          read_at?: string | null
          task_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
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
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          color: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          color?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tags_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_tags_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          assigned_to: string | null
          canceled_at: string | null
          category_id: string | null
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          deadline_at: string | null
          deleted_at: string | null
          description: string | null
          estimate_minutes: number | null
          id: string
          impact: string | null
          internal_target_at: string | null
          manual_priority: string | null
          organization_id: string
          parent_task_id: string | null
          planned_end_at: string | null
          planned_start_at: string | null
          priority_reason: string | null
          priority_score: number | null
          project_id: string | null
          row_version: number
          schedule_locked: boolean
          source_text: string | null
          splittable: boolean
          status: string
          suggested_priority: string | null
          title: string
          updated_at: string
          updated_by: string
          waiting_followup_at: string | null
        }
        Insert: {
          actual_minutes?: number | null
          assigned_to?: string | null
          canceled_at?: string | null
          category_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          deadline_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimate_minutes?: number | null
          id?: string
          impact?: string | null
          internal_target_at?: string | null
          manual_priority?: string | null
          organization_id: string
          parent_task_id?: string | null
          planned_end_at?: string | null
          planned_start_at?: string | null
          priority_reason?: string | null
          priority_score?: number | null
          project_id?: string | null
          row_version?: number
          schedule_locked?: boolean
          source_text?: string | null
          splittable?: boolean
          status?: string
          suggested_priority?: string | null
          title: string
          updated_at?: string
          updated_by: string
          waiting_followup_at?: string | null
        }
        Update: {
          actual_minutes?: number | null
          assigned_to?: string | null
          canceled_at?: string | null
          category_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          deadline_at?: string | null
          deleted_at?: string | null
          description?: string | null
          estimate_minutes?: number | null
          id?: string
          impact?: string | null
          internal_target_at?: string | null
          manual_priority?: string | null
          organization_id?: string
          parent_task_id?: string | null
          planned_end_at?: string | null
          planned_start_at?: string | null
          priority_reason?: string | null
          priority_score?: number | null
          project_id?: string | null
          row_version?: number
          schedule_locked?: boolean
          source_text?: string | null
          splittable?: boolean
          status?: string
          suggested_priority?: string | null
          title?: string
          updated_at?: string
          updated_by?: string
          waiting_followup_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_completed_by_fkey'
            columns: ['completed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { invitation_token: string }; Returns: string }
      claim_first_organization: { Args: { org_name: string }; Returns: string }
      get_invitation_preview: {
        Args: { invitation_token: string }
        Returns: {
          email: string
          expires_at: string
          organization_name: string
          status: string
        }[]
      }
      is_org_admin: { Args: { target_org_id: string }; Returns: boolean }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals['public']

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']

/**
 * Os `check constraints` do banco (role/status/prioridade) não viram union
 * types automaticamente na geração do Supabase CLI — ficam como `string`.
 * Estas uniões espelham manualmente as migrations e são usadas pelos
 * mapeadores em `mappers.ts` para tipar o valor com segurança no domínio.
 */
export type MemberRole = 'admin' | 'member'
export type MemberStatus = 'invited' | 'active' | 'disabled'
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type TaskStatus =
  | 'inbox'
  | 'needs_review'
  | 'planned'
  | 'in_progress'
  | 'waiting_client'
  | 'waiting_internal'
  | 'paused'
  | 'done'
  | 'canceled'
  | 'archived'

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'
export type ProjectStatus = 'active' | 'paused' | 'closed'
