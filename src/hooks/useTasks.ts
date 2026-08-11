import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, functionBaseUrl } from '@/lib/supabase'
import { qk } from '@/lib/queryClient'
import { toDateKey } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/db'

/** Subscribe to realtime task changes for a group and refresh affected caches. */
export function useTasksRealtime(groupId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!groupId) return
    const channel = supabase
      .channel(`tasks:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          // Invalidate the date the change belongs to (and today) for a refresh.
          const row = payload.new as Partial<Task> | null
          const dateKey = row?.task_date ?? toDateKey(new Date())
          queryClient.invalidateQueries({ queryKey: ['tasks', groupId, dateKey] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, queryClient])
}

/** Tasks for a given group on a given date (YYYY-MM-DD). */
export function useTasks(groupId: string | null, date: Date) {
  const dateKey = toDateKey(date)
  return useQuery({
    queryKey: groupId ? qk.tasks(groupId, dateKey) : ['tasks', 'disabled'],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return [] as Task[]
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('group_id', groupId)
        .eq('task_date', dateKey)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Task[]
    }
  })
}

/** Fire-and-forget push notification to other members (called after mutations). */
async function notifyOthers(
  sessionToken: string | undefined,
  payload: {
    group_id: string
    task_id: string
    title: string
    action: 'created' | 'updated' | 'status_changed' | 'deleted'
    status?: string
  }
) {
  if (!sessionToken) return
  try {
    await fetch(`${functionBaseUrl}/functions/v1/notify-group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify(payload)
    })
  } catch {
    // Notifications are best-effort; never block the UI on them.
  }
}

export function useCreateTask(groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      title,
      date,
      sessionToken
    }: {
      title: string
      date: Date
      sessionToken?: string
    }) => {
      if (!groupId) throw new Error('No group selected')
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          group_id: groupId,
          title: title.trim(),
          task_date: toDateKey(date),
          created_by: (await supabase.auth.getUser()).data.user?.id ?? ''
        })
        .select()
        .single()
      if (error) throw error
      void notifyOthers(sessionToken, {
        group_id: groupId,
        task_id: data.id,
        title: data.title,
        action: 'created'
      })
      return data as Task
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useUpdateTaskStatus(groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      task,
      nextStatus,
      sessionToken
    }: {
      task: Task
      nextStatus: TaskStatus
      sessionToken?: string
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id)
        .select()
        .single()
      if (error) throw error
      void notifyOthers(sessionToken, {
        group_id: task.group_id,
        task_id: task.id,
        title: task.title,
        action: 'status_changed',
        status: nextStatus
      })
      return data as Task
    },
    // Optimistic update for instant feedback.
    onMutate: async ({ task, nextStatus }) => {
      if (!groupId) return
      const dateKey = task.task_date
      await queryClient.cancelQueries({ queryKey: qk.tasks(groupId, dateKey) })
      const prev = queryClient.getQueryData<Task[]>(qk.tasks(groupId, dateKey))
      queryClient.setQueryData<Task[]>(qk.tasks(groupId, dateKey), (old = []) =>
        old.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      )
      return { prev, dateKey }
    },
    onError: (_err, _vars, ctx) => {
      if (groupId && ctx?.prev) {
        queryClient.setQueryData(qk.tasks(groupId, ctx.dateKey), ctx.prev)
      }
    },
    onSettled: (_data, _err, vars) => {
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: qk.tasks(groupId, vars.task.task_date) })
      }
    }
  })
}

export function useDeleteTask(_groupId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      task,
      sessionToken
    }: {
      task: Task
      sessionToken?: string
    }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id)
      if (error) throw error
      void notifyOthers(sessionToken, {
        group_id: task.group_id,
        task_id: task.id,
        title: task.title,
        action: 'deleted'
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}
