import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { AuthScreen } from '@/components/AuthScreen'
import { AppShell } from '@/components/AppShell'

function Root() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-full items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    )
  }

  if (!session) return <AuthScreen />
  return <AppShell />
}

export default function App() {
  return <Root />
}

