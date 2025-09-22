import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'
import { useNavigate } from 'react-router-dom'
import { Book, FileText, HelpCircle, Plus, Search, LogOut, BookOpen, Target } from 'lucide-react'
import TestConnection from '../components/TestConnection'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { currentTab, setCurrentTab } = useApp()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro ao sair:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">
                App de Estudos
              </h1>

              {/* Navigation Tabs */}
              <nav className="flex space-x-8">
                {[
                  { id: 'direito', label: 'Direito' },
                  { id: 'matematica', label: 'Matemática' },
                  { id: 'portugues', label: 'Português' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as typeof currentTab)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentTab === tab.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {currentTab === 'direito' ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Direito</h2>
              <p className="mt-2 text-lg text-gray-600">
                Estude leis e prepare-se para concursos públicos
              </p>
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/contests')}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Plus className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Concurso
                      </h3>
                      <p className="text-sm text-gray-500">
                        Cadastre um novo concurso público
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/laws')}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Book className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Acessar Lei
                      </h3>
                      <p className="text-sm text-gray-500">
                        Estude leis específicas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/questions')}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <HelpCircle className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Questões
                      </h3>
                      <p className="text-sm text-gray-500">
                        Pratique com questões geradas por IA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/summaries')}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BookOpen className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Resumos
                      </h3>
                      <p className="text-sm text-gray-500">
                        Acesse seus resumos organizados por lei
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/complete-exercises')}
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Target className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Exercícios Complete
                      </h3>
                      <p className="text-sm text-gray-500">
                        Treine memorização com exercícios "complete a lacuna"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 capitalize">
              {currentTab}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Conteúdo em desenvolvimento. Foque inicial na aba Direito.
            </p>
          </div>
        )}
      </main>
      <TestConnection />
    </div>
  )
}