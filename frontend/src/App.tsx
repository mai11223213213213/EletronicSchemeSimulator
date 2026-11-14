
import { CircuitWorkspace } from './components/CircuitWorkspace'
import { AuthPage } from './components/AuthPage'
import { AuthProvider, useAuth } from './auth/AuthContext'

function AppContent() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">
          Checking authentication...
        </p>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-100">
      <header className="z-30 flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <span className="text-sm font-semibold text-gray-800">
          Electronic Scheme Simulator
        </span>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gray-600 sm:inline">
            {user.email}
          </span>

          <button
            type="button"
            onClick={() => {
              void logout().catch((error) => {
                console.error('Failed to logout:', error)
              })
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CircuitWorkspace />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
