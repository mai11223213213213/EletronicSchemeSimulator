
import { AuthProvider } from './auth/AuthContext'
import { AppContent } from './app/AppContent'

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
