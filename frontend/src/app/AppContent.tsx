
import { AuthPage } from '../components/AuthPage'
import { CircuitWorkspace } from '../components/CircuitWorkspace'
import { WorkspaceSkeleton } from '../components/WorkspaceSkeleton'
import { useAuth } from '../auth/AuthContext'

export function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return <WorkspaceSkeleton />
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#101716]">
      <CircuitWorkspace />
    </main>
  )
}
