
import { AuthPage } from '../components/AuthPage'
import { PersonalPage } from '../components/PersonalPage'
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

  return <PersonalPage />
}
