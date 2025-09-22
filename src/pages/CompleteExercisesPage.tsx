import { useState, useEffect } from 'react'
import { ChevronLeft, BookOpen, Target, Trash2, Eye, EyeOff, Bot, X, Send, MessageCircle, Loader2, CheckCircle, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCompleteExercises, type CompleteExercise } from '../hooks/useCompleteExercises'
import { useLaws } from '../hooks/useLaws'
import { useSummaries, type SummaryToSave } from '../hooks/useSummaries'
import { deepseekService } from '../lib/deepseek'
import { supabase } from '../lib/supabase'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface LawWithCompleteExercises {
  id: string
  name: string
  exerciseCount: number
  exercises: CompleteExercise[]
}

interface ArticleGroup {
  articleNumber: string
  exerciseCount: number
  exercises: CompleteExercise[]
  tags: string[]
}

export default function CompleteExercisesPage() {
  const [currentView, setCurrentView] = useState<'laws' | 'articles' | 'exercises'>('laws')
  const [selectedLaw, setSelectedLaw] = useState<LawWithCompleteExercises | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ArticleGroup | null>(null)
  const [lawsWithExercises, setLawsWithExercises] = useState<LawWithCompleteExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set())
  const [highlightedExercises, setHighlightedExercises] = useState<Set<string>>(new Set())
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [currentExerciseForAI, setCurrentExerciseForAI] = useState<CompleteExercise | null>(null)
  const [currentExerciseForChat, setCurrentExerciseForChat] = useState<CompleteExercise | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [chatPrompt, setChatPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{prompt: string, response: string}>>([])
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string}>>([])
  const [activeChatResponse, setActiveChatResponse] = useState<{type: string, content: string} | null>(null)
  const [savingSummary, setSavingSummary] = useState(false)
  const [savedSummary, setSavedSummary] = useState(false)

  const { getCompleteExercisesByLaws, getTypeTranslation, deleteCompleteExercise, deleteMultipleCompleteExercises, updateCompleteExercise } = useCompleteExercises()
  const { laws } = useLaws()
  const { saveSummary } = useSummaries()
  const navigate = useNavigate()

  useEffect(() => {
    loadExercises()
  }, [laws])

  const loadExercises = async () => {
    if (laws.length === 0) return

    setLoading(true)
    try {
      // Carregar exercícios agrupados por lei
      const exercisesByLaws = await getCompleteExercisesByLaws()

      // Se não há exercícios, definir lista vazia
      if (Object.keys(exercisesByLaws).length === 0) {
        setLawsWithExercises([])
        return
      }

      // Mapear exercícios com informações das leis
      const lawsData: LawWithCompleteExercises[] = Object.entries(exercisesByLaws).map(([lawId, exercises]) => {
        const law = laws.find(l => l.id === lawId)
        return {
          id: lawId,
          name: law?.name || 'Lei não encontrada',
          exerciseCount: exercises.length,
          exercises
        }
      }).filter(law => law.exerciseCount > 0)

      setLawsWithExercises(lawsData)
    } catch (error) {
      console.error('Erro ao carregar exercícios complete:', error)
      setLawsWithExercises([])
    } finally {
      setLoading(false)
    }
  }

  const handleLawSelect = (law: LawWithCompleteExercises) => {
    setSelectedLaw(law)
    setCurrentView('articles')
  }

  const handleBackToLaws = () => {
    setCurrentView('laws')
    setSelectedLaw(null)
    setSelectedArticle(null)
    setSelectedArticles(new Set())
    setSelectedExercises(new Set())
  }

  const handleArticleClick = (article: ArticleGroup) => {
    setSelectedArticle(article)
    setCurrentView('exercises')
    setSelectedExercises(new Set())
  }

  const handleBackToArticles = () => {
    setCurrentView('articles')
    setSelectedArticle(null)
    setSelectedExercises(new Set())
  }

  // Agrupar exercícios por artigo
  const getExercisesByArticle = (exercises: CompleteExercise[]) => {
    const grouped = exercises.reduce((acc, exercise) => {
      const articleNumber = exercise.article_number || 'Sem artigo'
      if (!acc[articleNumber]) {
        acc[articleNumber] = []
      }
      acc[articleNumber].push(exercise)
      return acc
    }, {} as Record<string, CompleteExercise[]>)

    return Object.entries(grouped).map(([articleNumber, exercises]) => ({
      articleNumber,
      exerciseCount: exercises.length,
      exercises,
      tags: [...new Set(exercises.flatMap(q => q.tags || []))]
    }))
  }

  const handleExerciseSelect = (exerciseId: string) => {
    setSelectedExercises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId)
      } else {
        newSet.add(exerciseId)
      }
      return newSet
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedExercises.size === 0) return

    if (confirm(`Tem certeza que deseja deletar ${selectedExercises.size} exercício(s)?`)) {
      const success = await deleteMultipleCompleteExercises(Array.from(selectedExercises))
      if (success) {
        setSelectedExercises(new Set())
        await loadExercises()
      }
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (confirm('Tem certeza que deseja deletar este exercício?')) {
      const success = await deleteCompleteExercise(exerciseId)
      if (success) {
        setSelectedExercises(prev => {
          const newSet = new Set(prev)
          newSet.delete(exerciseId)
          return newSet
        })
        await loadExercises()
      }
    }
  }

  const handleArticleToggle = (articleNumber: string) => {
    setSelectedArticles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(articleNumber)) {
        newSet.delete(articleNumber)
      } else {
        newSet.add(articleNumber)
      }
      return newSet
    })
  }

  // Função para verificar se um exercício pertence a um artigo selecionado
  const exerciseBelongsToSelectedArticle = (exercise: CompleteExercise): boolean => {
    // Detectar qual grupo de artigo este exercício pertence usando a MESMA lógica
    const detectedArticle = exercise.article_number || 'Sem artigo'
    // Verificar se este artigo detectado está entre os selecionados
    return selectedArticles.has(detectedArticle)
  }

  const handleStartStudySession = () => {
    if (!selectedLaw || selectedArticles.size === 0) return

    // Coletar todos os exercícios dos artigos selecionados
    const selectedExerciseList = selectedLaw.exercises.filter(exercise =>
      exerciseBelongsToSelectedArticle(exercise)
    )

    // Navegar para a Mesa de Estudo com os exercícios selecionados
    navigate('/complete-exercise-study', {
      state: {
        exercises: selectedExerciseList,
        lawName: selectedLaw.name,
        selectedArticles: Array.from(selectedArticles)
      }
    })
  }


  // Funções para o Modal de IA
  const handleOpenAIModal = (exercise: CompleteExercise) => {
    setCurrentExerciseForAI(exercise)
    setAiPrompt('Modificar esse exercício da seguinte forma: ')
    setAiResponse('')
    setConversationHistory([])
    setAiModalOpen(true)
  }

  const handleCloseAIModal = () => {
    setAiModalOpen(false)
    setCurrentExerciseForAI(null)
    setAiPrompt('')
    setAiResponse('')
    setConversationHistory([])
  }

  const handleSendToAI = async () => {
    if (!currentExerciseForAI || !aiPrompt.trim()) return

    setAiLoading(true)
    try {
      const exerciseContext = {
        id: currentExerciseForAI.id,
        law_name: currentExerciseForAI.law_name,
        article_number: currentExerciseForAI.article_number,
        type: currentExerciseForAI.type,
        exercise_text: currentExerciseForAI.exercise_text,
        options: currentExerciseForAI.options,
        correct_answer: currentExerciseForAI.correct_answer
      }

      const conversationContext = conversationHistory.map(item =>
        `Prompt anterior: ${item.prompt}\nResposta anterior: ${item.response}`
      ).join('\n\n')

      const fullPrompt = `
EXERCÍCIO COMPLETE ORIGINAL:
${JSON.stringify(exerciseContext, null, 2)}

${conversationContext ? `HISTÓRICO DA CONVERSA:\n${conversationContext}\n\n` : ''}

SOLICITAÇÃO ATUAL:
${aiPrompt}

Por favor, retorne um exercício complete modificado seguindo exatamente o mesmo formato JSON do exercício original. Mantenha todos os campos obrigatórios e a estrutura. A resposta deve conter APENAS o JSON do exercício modificado, sem texto adicional.`

      const response = await deepseekService.chat([
        {
          role: 'user',
          content: fullPrompt
        }
      ])
      setAiResponse(response)

      setConversationHistory(prev => [...prev, { prompt: aiPrompt, response }])

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      setAiResponse('Erro ao comunicar com a IA. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleOverwriteExercise = async () => {
    if (!currentExerciseForAI || !aiResponse) return

    try {
      const modifiedExercise = JSON.parse(aiResponse)

      if (!modifiedExercise.exercise_text || !modifiedExercise.correct_answer) {
        alert('Resposta da IA inválida: campos obrigatórios estão faltando.')
        return
      }

      const success = await updateCompleteExercise(currentExerciseForAI.id, {
        law_element_id: modifiedExercise.law_element_id || currentExerciseForAI.law_element_id,
        law_id: modifiedExercise.law_id || currentExerciseForAI.law_id,
        law_name: modifiedExercise.law_name || currentExerciseForAI.law_name,
        article_number: modifiedExercise.article_number || currentExerciseForAI.article_number,
        type: modifiedExercise.type || currentExerciseForAI.type,
        exercise_text: modifiedExercise.exercise_text,
        options: modifiedExercise.options,
        correct_answer: modifiedExercise.correct_answer,
        explanation: modifiedExercise.explanation || currentExerciseForAI.explanation,
        tags: modifiedExercise.tags || currentExerciseForAI.tags,
        topic: modifiedExercise.topic || currentExerciseForAI.topic
      })

      if (success) {
        alert('Exercício atualizado com sucesso!')
        handleCloseAIModal()
        await loadExercises()
      } else {
        alert('Erro ao atualizar exercício. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao fazer parse da resposta da IA:', error)
      alert('Resposta da IA não está em formato JSON válido. Peça para a IA reformular a resposta.')
    }
  }

  // Funções para o Chat Modal
  const handleOpenChatModal = (exercise: CompleteExercise) => {
    setCurrentExerciseForChat(exercise)
    setChatModalOpen(true)
    setChatHistory([])
  }

  const handleCloseChatModal = () => {
    setChatModalOpen(false)
    setCurrentExerciseForChat(null)
    setChatPrompt('')
    setChatResponse('')
    setChatHistory([])
    setActiveChatResponse(null)
    setSavedSummary(false)
  }

  const handleSendChatMessage = async (message: string) => {
    if (!currentExerciseForChat || !message.trim()) return

    setChatLoading(true)
    setChatHistory(prev => [...prev, { type: 'user', message }])

    try {
      const exerciseContext = {
        law_name: currentExerciseForChat.law_name,
        article_number: currentExerciseForChat.article_number,
        type: currentExerciseForChat.type,
        exercise_text: currentExerciseForChat.exercise_text,
        options: currentExerciseForChat.options,
        correct_answer: currentExerciseForChat.correct_answer
      }

      const chatHistoryContext = chatHistory.map(item =>
        `${item.type === 'user' ? 'Usuário' : 'IA'}: ${item.message}`
      ).join('\n')

      const systemPrompt = `Você é um assistente especializado em exercícios "complete a lacuna" jurídicos. Você está conversando sobre um exercício específico.

CONTEXTO DO EXERCÍCIO:
Lei: ${exerciseContext.law_name}
Artigo: ${exerciseContext.article_number}
Tipo: ${exerciseContext.type}
Texto: ${exerciseContext.exercise_text}
Resposta Correta: ${exerciseContext.correct_answer}

${chatHistoryContext ? `HISTÓRICO DA CONVERSA:\n${chatHistoryContext}\n\n` : ''}`

      const response = await deepseekService.chat([
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ])

      setChatHistory(prev => [...prev, { type: 'ai', message: response }])

      // Verificar se é uma resposta específica para salvar como resumo
      const isSpecificPrompt = [
        'criar variações deste exercício',
        'explicar a técnica utilizada',
        'gerar exercícios similares'
      ].some(prompt => message.toLowerCase().includes(prompt.toLowerCase()));

      if (isSpecificPrompt) {
        setSavedSummary(false);
        setActiveChatResponse({
          type: message,
          content: response
        });
      }

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      setChatHistory(prev => [...prev, { type: 'ai', message: 'Erro ao comunicar com a IA. Tente novamente.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Função para salvar resumo a partir do chat
  const handleSaveSummary = async () => {
    if (!activeChatResponse || !currentExerciseForChat) {
      return;
    }

    setSavingSummary(true);

    try {
      let summaryType: 'explanation' | 'examples' | 'custom' = 'custom';

      if (activeChatResponse.type.toLowerCase().includes('explicar')) {
        summaryType = 'explanation';
      } else if (activeChatResponse.type.toLowerCase().includes('variações') ||
                 activeChatResponse.type.toLowerCase().includes('similares')) {
        summaryType = 'examples';
      }

      const title = await deepseekService.generateSummaryTitle(activeChatResponse.content, summaryType);

      const { data: lawElement, error } = await supabase
        .from('law_elements')
        .select('*')
        .eq('id', currentExerciseForChat.law_element_id)
        .single();

      if (error || !lawElement) {
        throw new Error('Não foi possível encontrar o elemento da lei original');
      }

      let articleNumber = currentExerciseForChat.article_number || '';
      if (articleNumber.includes('-')) {
        articleNumber = `Art. ${articleNumber.split('-')[0]}`;
      }

      const summaryData: SummaryToSave = {
        law_element_id: currentExerciseForChat.law_element_id,
        law_id: currentExerciseForChat.law_id,
        law_name: currentExerciseForChat.law_name,
        article_number: articleNumber,
        type: summaryType,
        title: title,
        content: activeChatResponse.content
      };

      const success = await saveSummary(summaryData);

      if (success) {
        setSavingSummary(false);
        setTimeout(() => {
          setSavedSummary(true);
        }, 100);
        setTimeout(() => {
          setSavedSummary(false);
        }, 3000);
      } else {
        alert('Erro ao salvar resumo. Tente novamente.');
        setSavingSummary(false);
      }
    } catch (error) {
      alert(`Erro ao salvar resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setSavingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando exercícios complete...</p>
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
            {currentView === 'exercises' ? (
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
                  ? 'Exercícios Complete'
                  : currentView === 'articles'
                  ? `${selectedLaw?.name}`
                  : `${selectedArticle?.articleNumber}`
                }
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                {currentView === 'laws'
                  ? 'Treine memorização da lei com exercícios "complete a lacuna"'
                  : currentView === 'articles'
                  ? 'Selecione um artigo para praticar os exercícios complete'
                  : 'Gerencie os exercícios complete deste artigo'
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
              {lawsWithExercises.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum exercício complete encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Comece gerando exercícios usando o botão "Gere exercícios complete" nas Ferramentas de IA.
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
                  {lawsWithExercises.map((law) => (
                    <div
                      key={law.id}
                      onClick={() => handleLawSelect(law)}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-200"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {law.name}
                      </h3>

                      <p className="text-sm text-gray-600 mb-4">
                        {law.exerciseCount} exercício(s) complete disponível(eis)
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
            <div className="h-full flex flex-col">
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                          Artigos Disponíveis
                        </h2>
                        <p className="text-base text-gray-600 font-medium">
                          Selecione os artigos que deseja incluir no estudo
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          {getExercisesByArticle(selectedLaw.exercises).length}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          artigos disponíveis
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-8 py-4 bg-white">
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
                        <span className="text-gray-700 font-medium">
                          {selectedLaw.exerciseCount} exercícios totais
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                        <span className="text-gray-700 font-medium">
                          {selectedLaw.exercises
                            .filter(e => exerciseBelongsToSelectedArticle(e))
                            .length} exercícios selecionados
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getExercisesByArticle(selectedLaw.exercises).map((article) => (
                    <div
                      key={article.articleNumber}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 relative"
                    >
                      {/* Área clicável principal do card */}
                      <div
                        onClick={() => handleArticleClick(article)}
                        className="cursor-pointer mb-3"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-gray-900">
                            {article.articleNumber}
                          </h3>
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                            {article.exerciseCount} exercícios
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(article.tags || []).slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Área do checkbox - separada para evitar conflito de clique */}
                      <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                        <input
                          type="checkbox"
                          checked={selectedArticles.has(article.articleNumber)}
                          onChange={() => handleArticleToggle(article.articleNumber)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <label
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArticleToggle(article.articleNumber)
                          }}
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          Incluir no estudo
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col items-center space-y-3">
                  <div className="text-sm text-gray-600">
                    {selectedArticles.size} artigo(s) selecionado(s) •{' '}
                    {selectedLaw.exercises
                      .filter(e => exerciseBelongsToSelectedArticle(e))
                      .length} exercício(s)
                  </div>
                  <button
                    onClick={handleStartStudySession}
                    disabled={selectedArticles.size === 0}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Enviar para Mesa de Estudo
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          // Vista de Exercícios
          selectedArticle && (
            <div className="h-full flex flex-col">
              {/* Header da seleção */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {selectedArticle.articleNumber}
                          </h2>
                          <div className="h-6 w-px bg-gray-300"></div>
                          <span className="text-lg text-gray-600 font-medium">
                            {selectedLaw?.name}
                          </span>
                        </div>
                        {selectedArticle.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedArticle.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-3xl font-bold text-gray-900">
                          {selectedArticle.exerciseCount}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          exercícios disponíveis
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de ações */}
              <div className="mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-8 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                          <span className="text-base font-semibold text-gray-900">
                            {selectedExercises.size}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            exercício(s) selecionado(s)
                          </span>
                          {selectedExercises.size === 0 && (
                            <span className="text-sm text-blue-600 font-medium">
                              • Selecione exercícios para usar a Mesa de Estudo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedExercises.size > 0 && (
                          <button
                            onClick={handleDeleteSelected}
                            className="flex items-center px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar ({selectedExercises.size})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de exercícios */}
              <div className="flex-1 overflow-hidden">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={selectedExercises.size === selectedArticle.exercises.length && selectedArticle.exercises.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExercises(new Set(selectedArticle.exercises.map(q => q.id)))
                                } else {
                                  setSelectedExercises(new Set())
                                }
                              }}
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Exercício
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tags
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedArticle.exercises.map((exercise) => (
                          <tr
                            key={exercise.id}
                            className={`hover:bg-gray-50 ${
                              selectedExercises.has(exercise.id) ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedExercises.has(exercise.id)}
                                onChange={() => handleExerciseSelect(exercise.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 max-w-xs">
                                {exercise.exercise_text.length > 100
                                  ? exercise.exercise_text.substring(0, 100) + '...'
                                  : exercise.exercise_text
                                }
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {getTypeTranslation(exercise.type)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {exercise.tags?.slice(0, 2).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {(exercise.tags?.length || 0) > 2 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                    +{(exercise.tags?.length || 0) - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleOpenAIModal(exercise)}
                                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
                                  title="Modificar com IA"
                                >
                                  <Bot className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenChatModal(exercise)}
                                  className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-all duration-200"
                                  title="Conversar com IA sobre este Exercício"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExercise(exercise.id)}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-all duration-200"
                                  title="Deletar exercício"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
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
        )}
      </main>

      {/* Modal de IA */}
      {aiModalOpen && currentExerciseForAI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="bg-gray-50 border-b border-gray-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <Bot className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                      Modificar Exercício Complete com IA
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-base text-gray-600 font-medium">
                        {currentExerciseForAI.law_name}
                      </span>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span className="text-base text-gray-600 font-medium">
                        {currentExerciseForAI.article_number}
                      </span>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span className="text-base text-gray-600 font-medium">
                        {getTypeTranslation(currentExerciseForAI.type)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseAIModal}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              {/* Exercício Atual */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Exercício Atual:</h4>
                <p className="text-gray-700 font-medium mb-2">{currentExerciseForAI.exercise_text}</p>
                <div className="text-sm text-gray-600">
                  <p><strong>Resposta:</strong> {currentExerciseForAI.correct_answer}</p>
                  <p><strong>Tipo:</strong> {getTypeTranslation(currentExerciseForAI.type)}</p>
                </div>
              </div>

              {/* Histórico da Conversa */}
              {conversationHistory.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Histórico da Conversa:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {conversationHistory.map((item, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="text-sm font-medium text-blue-900">Você disse:</div>
                        <div className="text-sm text-blue-700 mb-2">{item.prompt}</div>
                        <div className="text-sm font-medium text-blue-900">IA respondeu:</div>
                        <div className="text-sm text-blue-700">{item.response.substring(0, 200)}...</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input do Prompt */}
              <div>
                <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Prompt:
                </label>
                <div className="flex space-x-2">
                  <textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Modificar esse exercício da seguinte forma:"
                  />
                  <button
                    onClick={handleSendToAI}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {aiLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Resposta da IA */}
              {aiResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resposta da IA:
                  </label>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <pre className="text-sm text-green-800 whitespace-pre-wrap overflow-x-auto">
                      {aiResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseAIModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              {aiResponse && (
                <>
                  <button
                    onClick={() => setAiPrompt('Modifique ainda mais esse exercício da seguinte forma: ')}
                    className="px-4 py-2 text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                  >
                    Solicitar Mais Modificações
                  </button>
                  <button
                    onClick={handleOverwriteExercise}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Sobrescrever com esse exercício
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Chat com IA */}
      {chatModalOpen && currentExerciseForChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Conversar com IA sobre o Exercício Complete
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentExerciseForChat.law_name} - {currentExerciseForChat.article_number} - {getTypeTranslation(currentExerciseForChat.type)}
                </p>
              </div>
              <button
                onClick={handleCloseChatModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Área de conversa */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Prompts pré-prontos */}
                {chatHistory.length === 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Prompts rápidos:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        'Explicar a técnica utilizada neste exercício',
                        'Criar variações deste exercício',
                        'Gerar exercícios similares',
                        'Perguntar sobre tópicos específicos'
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendChatMessage(prompt)}
                          className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-left border border-indigo-200"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-500">
                        Ou digite sua própria pergunta abaixo
                      </p>
                    </div>
                  </div>
                )}

                {/* Histórico de conversa */}
                {chatHistory.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-3xl p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.type === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap text-white">{message.message}</p>
                        ) : (
                          <div className="text-sm">
                            <MarkdownRenderer content={message.message} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botão para salvar resumo - apenas para respostas específicas */}
                    {message.type === 'ai' && activeChatResponse &&
                     activeChatResponse.content === message.message &&
                     index === chatHistory.length - 1 && (
                      <div className="flex justify-start mt-3">
                        <div className="max-w-3xl">
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  Salvar Resumo no Banco
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  Esta resposta pode ser salva como um novo resumo
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (!savingSummary && !savedSummary) {
                                  handleSaveSummary();
                                }
                              }}
                              disabled={savingSummary || savedSummary}
                              className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors ${
                                savedSummary
                                  ? 'bg-green-100 text-green-700 cursor-default'
                                  : savingSummary
                                  ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {savedSummary ? (
                                <>
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Resumo Salvo</span>
                                </>
                              ) : savingSummary ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  <span>Salvar no Banco</span>
                                </>
                              )}
                            </button>

                            <div className="mt-3 p-2 bg-indigo-50 rounded-lg">
                              <p className="text-xs text-indigo-700">
                                🎯 <strong>Dica:</strong> Os resumos salvos aparecerão no Card Resumos e podem ser acessados por artigo.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicador de carregamento */}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm text-gray-600">IA está digitando...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input de mensagem */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (chatPrompt.trim()) {
                          handleSendChatMessage(chatPrompt)
                          setChatPrompt('')
                        }
                      }
                    }}
                    placeholder="Digite sua pergunta..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={() => {
                      if (chatPrompt.trim()) {
                        handleSendChatMessage(chatPrompt)
                        setChatPrompt('')
                      }
                    }}
                    disabled={chatLoading || !chatPrompt.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {chatLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseChatModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}