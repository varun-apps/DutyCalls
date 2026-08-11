import { useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TaskItem } from '@/components/TaskItem'
import { useAuth } from '@/hooks/useAuth'
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTaskStatus
} from '@/hooks/useTasks'
import { addDays, toDateKey } from '@/lib/utils'

interface DayViewProps {
  groupId: string
  date: Date
  onDateChange: (date: Date) => void
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DayView({ groupId, date, onDateChange }: DayViewProps) {
  const { session } = useAuth()
  const { data: tasks, isLoading } = useTasks(groupId, date)
  const createTask = useCreateTask(groupId)
  const updateStatus = useUpdateTaskStatus(groupId)
  const deleteTask = useDeleteTask(groupId)
  const [draft, setDraft] = useState('')

  const todayKey = toDateKey(new Date())
  const isToday = toDateKey(date) === todayKey

  function addTask(e: FormEvent) {
    e.preventDefault()
    const title = draft.trim()
    if (!title) return
    createTask.mutate(
      { title, date, sessionToken: session?.access_token },
      { onSuccess: () => setDraft('') }
    )
  }

  return (
    <section className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => onDateChange(addDays(date, -1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center">
          <span className="text-lg font-semibold text-slate-100">
            {isToday ? 'Today' : WEEKDAY[date.getDay()] + ', ' + date.toLocaleDateString()}
          </span>
          <span className="text-xs text-slate-400">
            {date.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>

        <Button variant="ghost" size="icon" onClick={() => onDateChange(addDays(date, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
          disabled={isToday}
        >
          <CalendarDays className="h-4 w-4" />
          Jump to today
        </Button>
      </div>

      {/* Add task */}
      <form onSubmit={addTask} className="flex gap-2">
        <Input
          placeholder="Add a task for this day…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
        />
        <Button type="submit" disabled={createTask.isPending || !draft.trim()}>
          {createTask.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </form>
      {createTask.isError && (
        <p className="text-sm text-red-400">Couldn’t add task. Try again.</p>
      )}

      {/* Task list */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading tasks…</p>
      ) : tasks && tasks.length > 0 ? (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onCycleStatus={(t, next) =>
                updateStatus.mutate({ task: t, nextStatus: next, sessionToken: session?.access_token })
              }
              onDelete={(t) =>
                deleteTask.mutate({ task: t, sessionToken: session?.access_token })
              }
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
          No tasks for this day yet.
        </p>
      )}
    </section>
  )
}
