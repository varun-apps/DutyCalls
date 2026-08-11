import { useEffect, useState } from 'react'
import { CalendarDays, LogOut, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DayView } from '@/components/DayView'
import { GroupPanel } from '@/components/GroupPanel'
import { useAuth } from '@/hooks/useAuth'
import {
  useAcceptInvite,
  useEnsureDefaultGroup,
  useGroups
} from '@/hooks/useGroups'
import { useTasksRealtime } from '@/hooks/useTasks'
import { cn } from '@/lib/utils'

type Tab = 'day' | 'group'

export function AppShell() {
  const { user, signOut } = useAuth()
  const { data: groups, isLoading: groupsLoading } = useGroups(user?.id ?? null)
  const ensureGroup = useEnsureDefaultGroup()
  const acceptInvite = useAcceptInvite()

  const [groupId, setGroupId] = useState<string | null>(null)
  const [date, setDate] = useState<Date>(() => new Date())
  const [tab, setTab] = useState<Tab>('day')
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  // Ensure the user has at least one group on first login.
  useEffect(() => {
    if (groups && groups.length === 0 && !ensureGroup.isPending) {
      ensureGroup.mutate()
    }
  }, [groups, ensureGroup])

  // Select the first group once it's available.
  useEffect(() => {
    if (groups && groups.length > 0 && !groupId) {
      setGroupId(groups[0].id)
    }
  }, [groups, groupId])

  // Accept an invite link (?token=…) on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) return
    acceptInvite.mutate(token, {
      onSuccess: () => setInviteMsg('You joined the shared list!'),
      onError: (e) => setInviteMsg(`Invite failed: ${(e as Error).message}`)
    })
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live updates for the selected group.
  useTasksRealtime(groupId)

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="safe-top sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Logo />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold">DutyCalls</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 pb-3">
          <select
            value={groupId ?? ''}
            onChange={(e) => setGroupId(e.target.value || null)}
            disabled={groupsLoading || !groups?.length}
            className="h-9 max-w-[60%] truncate rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex rounded-lg bg-slate-800 p-1">
            <TabButton active={tab === 'day'} onClick={() => setTab('day')}>
              <CalendarDays className="h-4 w-4" />
              Today
            </TabButton>
            <TabButton active={tab === 'group'} onClick={() => setTab('group')}>
              <Users className="h-4 w-4" />
              Share
            </TabButton>
          </div>
        </div>
      </header>

      {inviteMsg && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <p
            className={cn(
              'rounded-lg px-3 py-2 text-sm',
              inviteMsg.startsWith('Invite failed')
                ? 'bg-red-500/15 text-red-300'
                : 'bg-emerald-500/15 text-emerald-300'
            )}
          >
            {inviteMsg}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-6 safe-bottom">
        {groupsLoading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
        ) : !groupId ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Setting up your first list…
          </p>
        ) : tab === 'day' ? (
          <DayView groupId={groupId} date={date} onDateChange={setDate} />
        ) : (
          <GroupPanel groupId={groupId} />
        )}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
        active ? 'bg-slate-950 text-white' : 'text-slate-400 hover:text-slate-200'
      )}
    >
      {children}
    </button>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 512 512" className="h-5 w-5" aria-hidden>
      <path
        d="M150 268l60 60 152-152"
        fill="none"
        stroke="#fff"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
