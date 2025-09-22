import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Target, MessageCircle, X, Send, Loader2, Save } from 'lucide-react'
import { CompleteExercise, useCompleteExercises } from '../hooks/useCompleteExercises'
import { useSummaries, type SummaryToSave } from '../hooks/useSummaries'
import { deepseekService } from '../lib/deepseek'
import { supabase } from '../lib/supabase'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface CompleteExerciseStudySessionState {
  exercises: CompleteExercise[]
  lawName: string
  selectedArticles: string[]
}

interface UserAnswer {
  exerciseId: string
  selectedAnswer: string
  isCorrect: boolean
  timeSpent: number
}

export default function CompleteExerciseStudyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionData = location.state as CompleteExerciseStudySessionState

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map())

  // Estados locais por exercício (persistem durante a sessão)
  const [exerciseStates, setExerciseStates] = useState<Map<string, {
    userAnswer: string
    showFeedback: boolean
    chatHistory: Array<{type: 'user' | 'ai', message: string}>
    startTime: number
    activeChatResponse: {type: string, content: string} | null
    savingSummary: boolean
    savedSummary: boolean
  }>>(new Map())

  // Estados para o chat modal
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const { getTypeTranslation } = useCompleteExercises()
  const { saveSummary } = useSummaries()

  // Verificar se temos dados da sessão
  useEffect(() => {
    if (!sessionData || !sessionData.exercises || sessionData.exercises.length === 0) {
      navigate('/complete-exercises')
    }
  }, [sessionData, navigate])

  if (!sessionData) return null

  const { exercises, lawName, selectedArticles } = sessionData

  // Verificação adicional para garantir que temos exercícios
  if (!exercises || exercises.length === 0) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Nenhum exercício encontrado</h1>
          <p className="text-gray-600 mb-6">
            Não foi possível encontrar exercícios para os artigos selecionados.
          </p>
          <button
            onClick={() => navigate('/complete-exercises')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Voltar aos Exercícios
          </button>
        </div>
      </div>
    )
  }

  const currentExercise = exercises[currentExerciseIndex]

  // Verificação adicional para o exercício atual
  if (!currentExercise) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Exercício não encontrado</h1>
          <p className="text-gray-600 mb-6">
            Ocorreu um erro ao carregar o exercício atual.
          </p>
          <button
            onClick={() => navigate('/complete-exercises')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Voltar aos Exercícios
          </button>
        </div>
      </div>
    )
  }

  const currentAnswer = userAnswers.get(currentExercise.id)

  // Funções para gerenciar estado local por exercício
  const getExerciseState = (exerciseId: string) => {
    return exerciseStates.get(exerciseId) || {
      userAnswer: '',
      showFeedback: false,
      chatHistory: [],
      startTime: Date.now(),
      activeChatResponse: null,
      savingSummary: false,
      savedSummary: false
    }
  }

  const updateExerciseState = (exerciseId: string, updates: Partial<typeof exerciseStates extends Map<string, infer T> ? T : never>) => {
    setExerciseStates(prev => {
      const current = getExerciseState(exerciseId)
      const updated = { ...current, ...updates }
      return new Map(prev.set(exerciseId, updated))
    })
  }

  // Estados derivados do exercício atual
  const currentExerciseState = getExerciseState(currentExercise?.id || '')
  const userAnswer = currentExerciseState.userAnswer
  const showFeedback = currentExerciseState.showFeedback
  const chatHistory = currentExerciseState.chatHistory
  const startTime = currentExerciseState.startTime
  const activeChatResponse = currentExerciseState.activeChatResponse
  const savingSummary = currentExerciseState.savingSummary
  const savedSummary = currentExerciseState.savedSummary

  const handleAnswerInput = (answer: string) => {
    if (showFeedback) return // Não permitir mudança após mostrar feedback
    updateExerciseState(currentExercise.id, { userAnswer: answer })
  }

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return

    const timeSpent = Date.now() - startTime
    const isCorrect = userAnswer.trim().toLowerCase() === currentExercise.correct_answer.trim().toLowerCase()

    const answer: UserAnswer = {
      exerciseId: currentExercise.id,
      selectedAnswer: userAnswer,
      isCorrect,
      timeSpent
    }

    setUserAnswers(prev => new Map(prev.set(currentExercise.id, answer)))
    updateExerciseState(currentExercise.id, { showFeedback: true })
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
    }
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1)
    }
  }

  const handleFinishSession = () => {
    // Calcular estatísticas
    const totalExercises = exercises.length
    const answeredExercises = userAnswers.size
    const correctAnswers = Array.from(userAnswers.values()).filter(a => a.isCorrect).length

    navigate('/complete-exercises', {
      state: {
        sessionResults: {
          totalExercises,
          answeredExercises,
          correctAnswers,
          accuracy: answeredExercises > 0 ? (correctAnswers / answeredExercises) * 100 : 0
        }
      }
    })
  }

  // Funções para o Chat Modal
  const handleOpenChatModal = () => {
    setChatModalOpen(true)
  }

  const handleCloseChatModal = () => {
    setChatModalOpen(false)
    setChatPrompt('')
    // Limpar estados relacionados ao resumo
    updateExerciseState(currentExercise.id, {
      activeChatResponse: null,
      savedSummary: false
    });
  }

  const handleSendChatMessage = async (message: string) => {
    if (!message.trim()) return

    setChatLoading(true)
    updateExerciseState(currentExercise.id, {
      chatHistory: [...chatHistory, { type: 'user', message }]
    })

    try {
      // Preparar contexto completo do exercício para o chat
      const exerciseContext = {
        law_name: currentExercise.law_name,
        article_number: currentExercise.article_number,
        type: currentExercise.type,
        exercise_text: currentExercise.exercise_text,
        options: currentExercise.options,
        correct_answer: currentExercise.correct_answer,
        explanation: currentExercise.explanation,
        tags: currentExercise.tags,
        topic: currentExercise.topic
      }

      // Preparar histórico do chat
      const chatHistoryContext = chatHistory.map(item =>
        `${item.type === 'user' ? 'Usuário' : 'IA'}: ${item.message}`
      ).join('\n')

      // Adicionar contexto da resposta do usuário se houver
      let userAnswerContext = ''
      if (currentAnswer) {
        userAnswerContext = `\nResposta do usuário: "${currentAnswer.selectedAnswer}" (${currentAnswer.isCorrect ? 'Correta' : 'Incorreta'})`
      } else if (userAnswer) {
        userAnswerContext = `\nResposta atual: "${userAnswer}"`
      }

      let systemPrompt = `Você é um assistente especializado em exercícios jurídicos do tipo "complete a lacuna". Você está conversando sobre um exercício específico durante uma Mesa de Estudo.

CONTEXTO DO EXERCÍCIO:
Lei: ${exerciseContext.law_name}
Artigo: ${exerciseContext.article_number}
Tipo: ${getTypeTranslation(exerciseContext.type)} (${exerciseContext.type})
Texto do exercício: ${exerciseContext.exercise_text}
${exerciseContext.options ? `Alternativas: ${JSON.stringify(exerciseContext.options, null, 2)}` : ''}
Resposta correta: ${exerciseContext.correct_answer}
Explicação: ${exerciseContext.explanation.general}
Tags: ${exerciseContext.tags.join(', ')}
Tópico: ${exerciseContext.topic}${userAnswerContext}

${chatHistoryContext ? `HISTÓRICO DA CONVERSA:\n${chatHistoryContext}\n\n` : ''}`

      // Verificar se é um prompt específico para salvar como resumo
      const isSpecificPrompt = [
        'pedir maiores explicações',
        'pedir exemplos práticos',
        'explicar o tipo de exercício'
      ].some(prompt => message.toLowerCase().includes(prompt.toLowerCase()));

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

      const updates: any = {
        chatHistory: [...chatHistory, { type: 'user', message }, { type: 'ai', message: response }]
      };

      if (isSpecificPrompt) {
        // Resetar estado do resumo salvo ao gerar nova resposta
        updates.savedSummary = false;
        updates.activeChatResponse = {
          type: message,
          content: response
        };
      }

      updateExerciseState(currentExercise.id, updates);

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      updateExerciseState(currentExercise.id, {
        chatHistory: [...chatHistory, { type: 'user', message }, { type: 'ai', message: 'Erro ao comunicar com a IA. Tente novamente.' }]
      })
    } finally {
      setChatLoading(false)
    }
  }

  // Função para salvar resumo
  const handleSaveSummary = async () => {
    const currentState = getExerciseState(currentExercise.id);
    if (!currentState.activeChatResponse) {
      return;
    }

    updateExerciseState(currentExercise.id, { savingSummary: true });

    try {
      // Determinar o tipo baseado no conteúdo da resposta
      let summaryType: 'explanation' | 'examples' | 'custom' = 'explanation';

      if (currentState.activeChatResponse.type.toLowerCase().includes('exemplos')) {
        summaryType = 'examples';
      } else if (currentState.activeChatResponse.type.toLowerCase().includes('explicações')) {
        summaryType = 'explanation';
      } else {
        summaryType = 'custom';
      }

      // Gerar título usando IA
      const title = await deepseekService.generateSummaryTitle(currentState.activeChatResponse.content, summaryType);

      // Buscar o elemento da lei para obter dados completos
      const { data: lawElement, error } = await supabase
        .from('law_elements')
        .select('*')
        .eq('id', currentExercise.law_element_id)
        .single();

      if (error || !lawElement) {
        throw new Error('Não foi possível encontrar o elemento da lei original');
      }

      // Preparar dados do resumo
      let articleNumber = currentExercise.article_number || '';
      if (articleNumber.includes('-')) {
        articleNumber = `Art. ${articleNumber.split('-')[0]}`;
      }

      // Incluir o exercício no conteúdo
      const exerciseContext = `**EXERCÍCIO (${getTypeTranslation(currentExercise.type)}):**

${currentExercise.exercise_text}

${currentExercise.options ? Object.entries(currentExercise.options).map(([key, value]) =>
  `${key.toUpperCase()}) ${value}`).join('\n') : ''}

**Resposta Correta:** ${currentExercise.correct_answer}

---

**CONTEÚDO DO RESUMO:**

`;

      const finalContent = exerciseContext + currentState.activeChatResponse.content;

      const summaryData: SummaryToSave = {
        law_element_id: currentExercise.law_element_id,
        law_id: currentExercise.law_id,
        law_name: currentExercise.law_name,
        article_number: articleNumber,
        type: summaryType,
        title: title,
        content: finalContent
      };

      const success = await saveSummary(summaryData);

      if (success) {
        updateExerciseState(currentExercise.id, { savingSummary: false });

        setTimeout(() => {
          updateExerciseState(currentExercise.id, { savedSummary: true });
        }, 100);

        setTimeout(() => {
          updateExerciseState(currentExercise.id, { savedSummary: false });
        }, 3000);
      } else {
        alert('Erro ao salvar resumo. Tente novamente.');
        updateExerciseState(currentExercise.id, { savingSummary: false });
      }
    } catch (error) {
      alert(`Erro ao salvar resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      updateExerciseState(currentExercise.id, { savingSummary: false });
    }
  };

  const renderExerciseContent = () => {
    // Para exercícios com alternativas (T2)
    if (currentExercise.options) {
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Exercício {getTypeTranslation(currentExercise.type)}:</strong> Complete a lacuna selecionando a alternativa correta.
            </p>
          </div>

          <div className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">
            {currentExercise.exercise_text}
          </div>

          {!showFeedback ? (
            <div className="space-y-3">
              {Object.entries(currentExercise.options).map(([key, value]) => (
                <div
                  key={key}
                  onClick={() => handleAnswerInput(key)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    userAnswer === key
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-900'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      userAnswer === key ? 'border-current' : 'border-gray-300'
                    }`}>
                      {userAnswer === key && <div className="w-3 h-3 rounded-full bg-current" />}
                    </div>
                    <span className="font-medium uppercase">{key})</span>
                    <span>{value}</span>
                  </div>
                </div>
              ))}

              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Resposta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mostrar alternativas com feedback visual */}
              <div className="space-y-3">
                {Object.entries(currentExercise.options).map(([key, value]) => (
                  <div
                    key={key}
                    className={`p-4 border rounded-lg ${
                      key === currentExercise.correct_answer
                        ? 'bg-green-100 border-green-500 text-green-900'
                        : userAnswer === key && key !== currentExercise.correct_answer
                        ? 'bg-red-100 border-red-500 text-red-900'
                        : 'bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        key === currentExercise.correct_answer ? 'border-current' :
                        userAnswer === key ? 'border-current' : 'border-gray-300'
                      }`}>
                        {key === currentExercise.correct_answer ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : userAnswer === key && key !== currentExercise.correct_answer ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : null}
                      </div>
                      <span className="font-medium uppercase">{key})</span>
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Explicação */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Explicação:</h4>
                <p className="text-blue-800">{currentExercise.explanation.general}</p>
              </div>
            </div>
          )}
        </div>
      )
    } else {
      // Para exercícios sem alternativas (T1, T3, T4, T5)
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Exercício {getTypeTranslation(currentExercise.type)}:</strong> Complete a(s) lacuna(s) digitando a resposta correta.
            </p>
          </div>

          <div className="text-lg text-gray-900 leading-relaxed whitespace-pre-wrap">
            {currentExercise.exercise_text}
          </div>

          {!showFeedback ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sua resposta:
                </label>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => handleAnswerInput(e.target.value)}
                  placeholder="Digite sua resposta aqui..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Resposta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resposta do usuário */}
              <div className={`border rounded-lg p-4 ${
                currentAnswer?.isCorrect
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  currentAnswer?.isCorrect ? 'text-green-900' : 'text-red-900'
                }`}>
                  Sua resposta: "{userAnswer}"
                </h4>
                <div className={`flex items-center ${
                  currentAnswer?.isCorrect ? 'text-green-800' : 'text-red-800'
                }`}>
                  {currentAnswer?.isCorrect ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 mr-2" />
                  )}
                  <span className="font-medium">
                    {currentAnswer?.isCorrect ? 'Correto!' : 'Incorreto'}
                  </span>
                </div>
              </div>

              {/* Resposta correta */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Resposta Esperada:</h4>
                <p className="text-blue-800 font-medium">"{currentExercise.correct_answer}"</p>
              </div>

              {/* Explicação */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Explicação:</h4>
                <p className="text-gray-800">{currentExercise.explanation.general}</p>
              </div>
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/complete-exercises')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Sair do Estudo
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <Target className="h-5 w-5 mr-2 text-indigo-600" />
                Mesa de Estudo - Exercícios Complete
              </h1>
              <p className="text-sm text-gray-600">
                {lawName} • {selectedArticles.join(', ')}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Exercício {currentExerciseIndex + 1} de {exercises.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Exercise header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-600">
                  {currentExercise.article_number}
                </span>
                <span className="text-sm text-gray-500">
                  {getTypeTranslation(currentExercise.type)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentExercise.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Exercise content */}
            {renderExerciseContent()}

            {/* Action buttons */}
            <div className="mt-6 flex justify-between">
              <div className="flex items-center space-x-3">
                {/* Botão Anterior sempre visível */}
                <button
                  onClick={handlePreviousExercise}
                  disabled={currentExerciseIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </button>

                <button
                  onClick={handleOpenChatModal}
                  className="flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-200 border border-blue-200"
                  title="Conversar com IA sobre este exercício"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Peça Ajuda à IA
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Botões de navegação sempre visíveis */}
                {currentExerciseIndex < exercises.length - 1 ? (
                  <button
                    onClick={handleNextExercise}
                    className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinishSession}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Finalizar Estudo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Chat com IA */}
      {chatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Conversar com IA sobre o Exercício
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentExercise.law_name} - Artigo {currentExercise.article_number} ({getTypeTranslation(currentExercise.type)})
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
                        'Pedir maiores explicações',
                        'Pedir exemplos práticos',
                        'Explicar o tipo de exercício'
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendChatMessage(prompt)}
                          className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-left border border-blue-200"
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
                            ? 'bg-blue-600 text-white'
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

                    {/* Botão para salvar resumo - apenas para respostas de IA dos botões específicos */}
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
                                  Esta resposta pode ser salva como resumo
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

                            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-700">
                                💡 <strong>Dica:</strong> Os resumos salvos aparecerão no Card Resumos e podem ser acessados por artigo.
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      )}
    </div>
  )
}