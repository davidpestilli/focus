import { AuthProvider } from './contexts/AuthContext'
import { AppProvider } from './contexts/AppContext'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import LawsPage from './pages/LawsPage'
import ContestsPage from './pages/ContestsPage'
import { useAuth } from './contexts/AuthContext'
import { useApp } from './contexts/AppContext'

function AppRouter() {
  const { currentView } = useApp()

  switch (currentView) {
    case 'laws':
      return <LawsPage />
    case 'contests':
      return <ContestsPage />
    case 'questions':
      // TODO: Implement QuestionsPage
      return <Dashboard />
    case 'study':
      // TODO: Implement StudyPage
      return <Dashboard />
    default:
      return <Dashboard />
  }
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

  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
