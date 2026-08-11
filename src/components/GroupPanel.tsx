import { useState, type FormEvent } from 'react'
import { Check, Loader2, Mail, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateInvite, useGroupMembers, useInvites } from '@/hooks/useGroups'

interface GroupPanelProps {
  groupId: string
}

export function GroupPanel({ groupId }: GroupPanelProps) {
  const { data: members, isLoading: loadingMembers } = useGroupMembers(groupId)
  const { data: invites } = useInvites(groupId)
  const createInvite = useCreateInvite(groupId)
  const [email, setEmail] = useState('')
  const [lastSent, setLastSent] = useState<string | null>(null)

  async function sendInvite(e: FormEvent) {
    e.preventDefault()
    const to = email.trim()
    if (!to) return
    setLastSent(null)
    await createInvite.mutateAsync(to)
    setLastSent(to)
    setEmail('')
  }

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Users className="h-4 w-4" /> Members
        </h3>
        {loadingMembers ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <ul className="space-y-1.5">
            {members?.map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm"
              >
                <span className="text-slate-200">
                  {m.profile?.display_name || 'Group member'}
                </span>
                {m.role === 'owner' && (
                  <Badge className="bg-indigo-500/20 text-indigo-300 ring-indigo-500/40">
                    Owner
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <UserPlus className="h-4 w-4" /> Invite someone
        </h3>
        <form onSubmit={sendInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="partner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={createInvite.isPending || !email.trim()}>
            {createInvite.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Invite
          </Button>
        </form>
        {lastSent && (
          <p className="mt-2 flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> Invite sent to {lastSent}.
          </p>
        )}
        {createInvite.isError && (
          <p className="mt-2 text-sm text-red-400">
            {(createInvite.error as Error).message}
          </p>
        )}
      </div>

      {invites && invites.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Pending invites</h3>
          <ul className="space-y-1.5">
            {invites
              .filter((i) => i.status === 'pending')
              .map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm"
                >
                  <span className="text-slate-300">{i.email}</span>
                  <Badge className="bg-slate-700 text-slate-300 ring-slate-600">Pending</Badge>
                </li>
              ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
