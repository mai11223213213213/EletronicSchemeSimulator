
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { AppContent } from './app/AppContent'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
