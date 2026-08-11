import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  TASK_STATUS_STYLES,
  type Task,
  type TaskStatus
} from '@/types/db'

interface TaskItemProps {
  task: Task
  onCycleStatus: (task: Task, next: TaskStatus) => void
  onDelete: (task: Task) => void
}

/** Cycle indicator: clicking advances start → in_progress → complete → start. */
export function TaskItem({ task, onCycleStatus, onDelete }: TaskItemProps) {
  const next =
    TASK_STATUS_ORDER[(TASK_STATUS_ORDER.indexOf(task.status) + 1) % TASK_STATUS_ORDER.length]

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <button
        aria-label={`Set status to ${TASK_STATUS_LABEL[next]}`}
        onClick={() => onCycleStatus(task, next)}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition',
          statusDot(task.status)
        )}
      >
        {task.status === 'complete' && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {task.status === 'in_progress' && (
          <span className="h-2 w-2 rounded-full bg-amber-300" />
        )}
      </button>

      <span
        className={cn(
          'flex-1 text-sm',
          task.status === 'complete' ? 'text-slate-500 line-through' : 'text-slate-100'
        )}
      >
        {task.title}
      </span>

      <Badge className={TASK_STATUS_STYLES[task.status]}>
        {TASK_STATUS_LABEL[task.status]}
      </Badge>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete task"
        onClick={() => onDelete(task)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  )
}

function statusDot(status: TaskStatus): string {
  switch (status) {
    case 'start':
      return 'border-slate-600 hover:border-indigo-500'
    case 'in_progress':
      return 'border-amber-500/60 bg-amber-500/10 hover:border-amber-400'
    case 'complete':
      return 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300 hover:border-emerald-400'
  }
}
