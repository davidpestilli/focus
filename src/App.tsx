import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LawsPage from './pages/LawsPage'
import ContestsPage from './pages/ContestsPage'
import QuestionsPage from './pages/QuestionsPage'
import StudySessionPage from './pages/StudySessionPage'
import { useAuth } from './contexts/AuthContext'

function ProtectedRoutes() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/laws" element={<LawsPage />} />
        <Route path="/contests" element={<ContestsPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/study-session" element={<StudySessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <ProtectedRoutes />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
