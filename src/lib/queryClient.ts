import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

/** Centralised query keys for consistent invalidation. */
export const qk = {
  tasks: (groupId: string, date: string) => ['tasks', groupId, date] as const,
  groups: (userId: string) => ['groups', userId] as const,
  groupMembers: (groupId: string) => ['groupMembers', groupId] as const,
  invites: (groupId: string) => ['invites', groupId] as const,
  activity: (groupId: string) => ['activity', groupId] as const
}
