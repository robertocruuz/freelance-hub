export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          budget_date: string | null
          client_id: string | null
          created_at: string
          delivery_date: string | null
          discount: number
          id: string
          items: Json
          name: string | null
          notes: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
          validity_date: string | null
        }
        Insert: {
          budget_date?: string | null
          client_id?: string | null
          created_at?: string
          delivery_date?: string | null
          discount?: number
          id?: string
          items?: Json
          name?: string | null
          notes?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
          validity_date?: string | null
        }
        Update: {
          budget_date?: string | null
          client_id?: string | null
          created_at?: string
          delivery_date?: string | null
          discount?: number
          id?: string
          items?: Json
          name?: string | null
          notes?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          color: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          responsible: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          responsible?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          responsible?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          discount: number
          due_date: string | null
          id: string
          items: Json
          name: string | null
          payment_method: string | null
          status: string
          taxes: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          items?: Json
          name?: string | null
          payment_method?: string | null
          status?: string
          taxes?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          items?: Json
          name?: string | null
          payment_method?: string | null
          status?: string
          taxes?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          name: string
          position: number
          project_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          project_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_boards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_columns: {
        Row: {
          board_id: string | null
          created_at: string
          id: string
          name: string
          position: number
          user_id: string
          wip_limit: number | null
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          user_id: string
          wip_limit?: number | null
        }
        Update: {
          board_id?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          business_email: string | null
          business_phone: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          complement: string | null
          created_at: string
          id: string
          logo_url: string | null
          municipal_registration: string | null
          neighborhood: string | null
          state: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_email?: string | null
          business_phone?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          municipal_registration?: string | null
          neighborhood?: string | null
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_email?: string | null
          business_phone?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          complement?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          municipal_registration?: string | null
          neighborhood?: string | null
          state?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      password_vault: {
        Row: {
          category: string | null
          created_at: string
          encrypted_password: string
          id: string
          notes: string | null
          title: string
          url: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          encrypted_password: string
          id?: string
          notes?: string | null
          title: string
          url?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          encrypted_password?: string
          id?: string
          notes?: string | null
          title?: string
          url?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          description: string | null
          file_type: string
          id: string
          name: string
          project_id: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          project_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          project_id: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          contract_url: string | null
          created_at: string
          discount: number
          due_date: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          contract_url?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          contract_url?: string | null
          created_at?: string
          discount?: number
          due_date?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          created_by: string
          id: string
          resource_id: string
          resource_type: string
          share_type: string
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          resource_id: string
          resource_type: string
          share_type: string
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          resource_id?: string
          resource_type?: string
          share_type?: string
          shared_with_user_id?: string | null
        }
        Relationships: []
      }
      task_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          due_date: string | null
          id: string
          is_completed: boolean
          position: number
          title: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          title: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "task_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          created_at: string
          id: string
          position: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          task_id: string
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_label_assignments: {
        Row: {
          id: string
          label_id: string
          task_id: string
        }
        Insert: {
          id?: string
          label_id: string
          task_id: string
        }
        Update: {
          id?: string
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "task_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_label_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          client_id: string | null
          column_id: string | null
          completed_at: string | null
          complexity: number | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_time: number | null
          estimated_value: number | null
          id: string
          position: number
          priority: string
          project_id: string | null
          real_value: number | null
          start_date: string | null
          status: string
          task_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          column_id?: string | null
          completed_at?: string | null
          complexity?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          estimated_value?: number | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          real_value?: number | null
          start_date?: string | null
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          column_id?: string | null
          completed_at?: string | null
          complexity?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_time?: number | null
          estimated_value?: number | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          real_value?: number | null
          start_date?: string | null
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          duration: number | null
          end_time: string | null
          id: string
          project_id: string | null
          start_time: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          project_id?: string | null
          start_time: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          project_id?: string | null
          start_time?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_org_role: { Args: { _data_user_id: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      is_board_shared_column: { Args: { _column_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_colleague: { Args: { _data_user_id: string }; Returns: boolean }
      is_shared_with_me: {
        Args: { _resource_id: string; _resource_type: string }
        Returns: boolean
      }
      is_task_shared: { Args: { _task_id: string }; Returns: boolean }
      notify_org_admins_on_accept: {
        Args: { _accepted_user_name: string; _org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      org_role: "admin" | "collaborator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      org_role: ["admin", "collaborator"],
    },
  },
} as const
