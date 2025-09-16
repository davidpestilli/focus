import React, { useState } from 'react'
import { ArrowLeft, Trophy, Plus, Calendar, Users } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useContests } from '../hooks/useContests'
import type { Contest } from '../types/database'

export default function ContestsPage() {
  const { goBack, setSelectedContest } = useApp()
  const { contests, loading, createContest } = useContests()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true
  })

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createContest(formData)
      setShowForm(false)
      setFormData({ name: '', description: '', active: true })
    } catch (error) {
      console.error('Erro ao criar concurso:', error)
    }
  }

  const handleContestSelect = (contest: Contest) => {
    setSelectedContest(contest)
    // TODO: Navigate to contest details page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Concursos Públicos
              </h1>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Concurso
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {showForm ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Criar Novo Concurso
              </h2>

              <form onSubmit={handleCreateContest} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome do Concurso
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ex: TJSP 2025"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Descrição do concurso..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                    Concurso ativo
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Criar Concurso
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Carregando concursos...</p>
              </div>
            ) : contests.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum concurso encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando seu primeiro concurso público.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Concurso
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contests.map((contest) => (
                  <div
                    key={contest.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleContestSelect(contest)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Trophy className="h-8 w-8 text-indigo-600" />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contest.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contest.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {contest.name}
                      </h3>

                      {contest.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {contest.description}
                        </p>
                      )}

                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Criado em {new Date(contest.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-3 rounded-b-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          0 participantes
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContestSelect(contest)
                          }}
                          className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Acessar →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}