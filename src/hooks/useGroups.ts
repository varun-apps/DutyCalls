import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryClient'
import type { Group, GroupMember, Invite } from '@/types/db'

/** All groups the current user belongs to. */
export function useGroups(userId: string | null) {
  return useQuery({
    queryKey: userId ? qk.groups(userId) : ['groups', 'disabled'],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as Group[]
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
      if (error) throw error
      const ids = (data ?? []).map((r) => r.group_id)
      if (ids.length === 0) return [] as Group[]
      const { data: groups, error: gErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: true })
      if (gErr) throw gErr
      return groups as Group[]
    }
  })
}

/** Members of a group (with profile display names). */
export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: groupId ? qk.groupMembers(groupId) : ['groupMembers', 'disabled'],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [] as GroupMember[]
      const { data, error } = await supabase
        .from('group_members')
        .select(
          'group_id, user_id, role, joined_at, profile:profiles!group_members_user_id_fkey(id, display_name, avatar_url)'
        )
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as GroupMember[]
    }
  })
}

/** Pending/accepted invites for a group. */
export function useInvites(groupId: string | null) {
  return useQuery({
    queryKey: groupId ? qk.invites(groupId) : ['invites', 'disabled'],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [] as Invite[]
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Invite[]
    }
  })
}

export function useEnsureDefaultGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('ensure_default_group')
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('create_group', { p_name: name })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    }
  })
}

export function useCreateInvite(groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      if (!groupId) throw new Error('No group selected')
      const { data, error } = await supabase.rpc('create_invite', {
        p_group_id: groupId,
        p_email: email
      })
      if (error) throw error
      // Edge Function / Supabase Auth will deliver the email in production.
      const { origin } = window.location
      return { inviteId: data as string, link: `${origin}/invite?token=` }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] })
    }
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groupMembers'] })
    }
  })
}
