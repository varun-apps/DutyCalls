// Hand-written types matching the Supabase schema in supabase/migrations/.
// Replace with generated types via: npm run supabase:types

export type TaskStatus = 'start' | 'in_progress' | 'complete'
export type GroupMemberRole = 'owner' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: GroupMemberRole
  joined_at: string
  /** Joined view: the member's profile (optional). */
  profile?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
}

export interface Task {
  id: string
  group_id: string
  title: string
  description: string | null
  status: TaskStatus
  task_date: string
  created_by: string
  assigned_to: string | null
  position: number
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface Invite {
  id: string
  group_id: string
  email: string
  invited_by: string
  status: InviteStatus
  token: string
  created_at: string
}

export interface ActivityLog {
  id: string
  group_id: string
  task_id: string | null
  actor_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}

/**
 * Minimal Database type so the typed Supabase client (`supabase.from('tasks')`)
 * understands table names and row shapes.
 */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      groups: { Row: Group; Insert: Partial<Group>; Update: Partial<Group> }
      group_members: { Row: GroupMember; Insert: Partial<GroupMember>; Update: Partial<GroupMember> }
      tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> }
      invites: { Row: Invite; Insert: Partial<Invite>; Update: Partial<Invite> }
      activity_log: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> }
    }
    Views: Record<string, never>
    Functions: {
      ensure_default_group: { Args: Record<string, never>; Returns: string }
      create_group: { Args: { p_name: string }; Returns: string }
      create_invite: { Args: { p_group_id: string; p_email: string }; Returns: string }
      accept_invite: { Args: { p_token: string }; Returns: string }
      register_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth_key: string }
        Returns: undefined
      }
    }
    Enums: {
      task_status: TaskStatus
      group_member_role: GroupMemberRole
      invite_status: InviteStatus
    }
  }
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['start', 'in_progress', 'complete']

/** Human-readable label for each status. */
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  start: 'To start',
  in_progress: 'In progress',
  complete: 'Complete'
}

/** Tailwind classes for the status badge + checkbox accent. */
export const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  start: 'bg-slate-700 text-slate-200 ring-slate-600',
  in_progress: 'bg-amber-500/20 text-amber-300 ring-amber-500/40',
  complete: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40'
}
