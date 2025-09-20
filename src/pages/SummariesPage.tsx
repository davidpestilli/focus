import { useState, useEffect } from 'react'
import { ChevronLeft, BookOpen, Eye, Calendar, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSummaries, type Summary } from '../hooks/useSummaries'
import { useLaws } from '../hooks/useLaws'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface LawWithSummaries {
  id: string
  name: string
  summaryCount: number
  summaries: Summary[]
}

interface ArticleGroup {
  articleNumber: string
  summaryCount: number
  summaries: Summary[]
}

export default function SummariesPage() {
  const [currentView, setCurrentView] = useState<'laws' | 'articles' | 'summaries' | 'viewer'>('laws')
  const [selectedLaw, setSelectedLaw] = useState<LawWithSummaries | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ArticleGroup | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
  const [lawsWithSummaries, setLawsWithSummaries] = useState<LawWithSummaries[]>([])
  const [loading, setLoading] = useState(true)

  const { getSummariesByLaws, getTypeTranslation } = useSummaries()
  const { laws } = useLaws()
  const navigate = useNavigate()

  useEffect(() => {
    loadSummaries()
  }, [laws])

  const loadSummaries = async () => {
    if (laws.length === 0) return

    setLoading(true)
    try {
      // Carregar resumos agrupados por lei
      const summariesByLaws = await getSummariesByLaws()

      // Se não há resumos, definir lista vazia
      if (Object.keys(summariesByLaws).length === 0) {
        setLawsWithSummaries([])
        return
      }

      // Mapear resumos com informações das leis
      const lawsData: LawWithSummaries[] = Object.entries(summariesByLaws).map(([lawId, summaries]) => {
        const law = laws.find(l => l.id === lawId)
        return {
          id: lawId,
          name: law?.name || 'Lei não encontrada',
          summaryCount: summaries.length,
          summaries
        }
      }).filter(law => law.summaryCount > 0)

      setLawsWithSummaries(lawsData)
    } catch (error) {
      console.error('Erro ao carregar resumos:', error)
      setLawsWithSummaries([])
    } finally {
      setLoading(false)
    }
  }

  const handleLawSelect = (law: LawWithSummaries) => {
    setSelectedLaw(law)
    setCurrentView('articles')
  }

  const handleBackToLaws = () => {
    setCurrentView('laws')
    setSelectedLaw(null)
    setSelectedArticle(null)
    setSelectedSummary(null)
  }

  const handleArticleClick = (article: ArticleGroup) => {
    setSelectedArticle(article)
    setCurrentView('summaries')
    setSelectedSummary(null)
  }

  const handleBackToArticles = () => {
    setCurrentView('articles')
    setSelectedArticle(null)
    setSelectedSummary(null)
  }

  const handleSummaryClick = (summary: Summary) => {
    setSelectedSummary(summary)
    setCurrentView('viewer')
  }

  const handleBackToSummaries = () => {
    setCurrentView('summaries')
    setSelectedSummary(null)
  }

  // Agrupar resumos por artigo
  const getSummariesByArticle = (summaries: Summary[]) => {
    const grouped = summaries.reduce((acc, summary) => {
      const articleNumber = summary.article_number || 'Sem artigo'
      if (!acc[articleNumber]) {
        acc[articleNumber] = []
      }
      acc[articleNumber].push(summary)
      return acc
    }, {} as Record<string, Summary[]>)

    return Object.entries(grouped).map(([articleNumber, summaries]) => ({
      articleNumber,
      summaryCount: summaries.length,
      summaries
    }))
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando resumos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            {currentView === 'viewer' ? (
              <button
                onClick={handleBackToSummaries}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar aos Resumos</span>
              </button>
            ) : currentView === 'summaries' ? (
              <button
                onClick={handleBackToArticles}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar aos Artigos</span>
              </button>
            ) : currentView === 'articles' ? (
              <button
                onClick={handleBackToLaws}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar ao Dashboard</span>
              </button>
            )}
            <div className="border-l border-gray-300 pl-6">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {currentView === 'laws'
                  ? 'Resumos'
                  : currentView === 'articles'
                  ? `${selectedLaw?.name}`
                  : currentView === 'summaries'
                  ? `${selectedArticle?.articleNumber}`
                  : selectedSummary?.title
                }
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                {currentView === 'laws'
                  ? 'Organize seus resumos por lei e artigo'
                  : currentView === 'articles'
                  ? 'Selecione um artigo para visualizar os resumos disponíveis'
                  : currentView === 'summaries'
                  ? `${selectedArticle?.summaryCount} resumo(s) disponível(eis) para este artigo`
                  : 'Visualização do resumo em formato estruturado'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'laws' ? (
          // Vista de Leis
          <div className="h-full p-6">
            <div className="max-w-6xl mx-auto">
              {lawsWithSummaries.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum resumo encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece gerando resumos usando os botões "Explicar este trecho", "Dar exemplos práticos" ou "Fazer pergunta personalizada" na página de detalhes das leis.
                  </p>
                  <button
                    onClick={() => navigate('/laws')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Ir para Leis
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lawsWithSummaries.map((law) => (
                    <div
                      key={law.id}
                      onClick={() => handleLawSelect(law)}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {law.name}
                      </h3>

                      <p className="text-sm text-gray-600 mb-4">
                        {law.summaryCount} resumo(s) disponível(eis)
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Clique para ver artigos
                        </span>
                        <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'articles' ? (
          // Vista de Artigos
          selectedLaw && (
            <div className="h-full p-6">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getSummariesByArticle(selectedLaw.summaries).map((article) => (
                    <div
                      key={article.articleNumber}
                      onClick={() => handleArticleClick(article)}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {article.articleNumber}
                      </h3>

                      <p className="text-sm text-gray-600 mb-4">
                        {article.summaryCount} resumo(s) disponível(eis)
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Clique para ver resumos
                        </span>
                        <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : currentView === 'summaries' ? (
          // Vista de Resumos
          selectedArticle && (
            <div className="h-full p-6">
              <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Título
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedArticle.summaries.map((summary) => (
                          <tr key={summary.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {summary.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getTypeTranslation(summary.type)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(summary.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleSummaryClick(summary)}
                                className="flex items-center text-indigo-600 hover:text-indigo-900"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          // Vista de Visualização do Resumo
          selectedSummary && (
            <div className="h-full p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                    <MarkdownRenderer content={selectedSummary.content} />
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  )
}