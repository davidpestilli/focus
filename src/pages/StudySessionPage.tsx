import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Target, MessageCircle, X, Send } from 'lucide-react'
import { StudyQuestion, useQuestions } from '../hooks/useQuestions'
import { deepseekService } from '../lib/deepseek'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface StudySessionState {
  questions: StudyQuestion[]
  lawName: string
  selectedArticles: string[]
}

interface UserAnswer {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
  timeSpent: number
}

export default function StudySessionPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionData = location.state as StudySessionState

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Map<string, UserAnswer>>(new Map())

  // Estados locais por questão (persistem durante a sessão)
  const [questionStates, setQuestionStates] = useState<Map<string, {
    selectedAnswer: string
    showFeedback: boolean
    essayAnswer: string
    essayEvaluation: {
      score: number
      feedback: string
      isCorrect: boolean
    } | null
    chatHistory: Array<{type: 'user' | 'ai', message: string}>
    generatedQuestions: Array<{
      type: 'multiple_choice' | 'true_false' | 'essay'
      question_text: string
      options?: { a: string; b: string; c: string; d: string; e: string }
      correct_answer: string
      explanation: { general: string; alternatives?: any }
      tags: string[]
      topic: string
    }>
    startTime: number
  }>>(new Map())

  // Estados temporários para questão atual
  const [evaluatingEssay, setEvaluatingEssay] = useState(false)

  // Estados para o chat modal
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [chatPrompt, setChatPrompt] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const { saveQuestion } = useQuestions()

  // Verificar se temos dados da sessão
  useEffect(() => {
    if (!sessionData || !sessionData.questions || sessionData.questions.length === 0) {
      navigate('/questions')
    }
  }, [sessionData, navigate])

  if (!sessionData) return null

  const { questions, lawName, selectedArticles } = sessionData
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = userAnswers.get(currentQuestion.id)

  // Funções para gerenciar estado local por questão
  const getQuestionState = (questionId: string) => {
    return questionStates.get(questionId) || {
      selectedAnswer: '',
      showFeedback: false,
      essayAnswer: '',
      essayEvaluation: null,
      chatHistory: [],
      generatedQuestions: [],
      startTime: Date.now()
    }
  }

  const updateQuestionState = (questionId: string, updates: Partial<typeof questionStates extends Map<string, infer T> ? T : never>) => {
    setQuestionStates(prev => {
      const current = getQuestionState(questionId)
      const updated = { ...current, ...updates }
      return new Map(prev.set(questionId, updated))
    })
  }

  // Estados derivados da questão atual
  const currentQuestionState = getQuestionState(currentQuestion?.id || '')
  const selectedAnswer = currentQuestionState.selectedAnswer
  const showFeedback = currentQuestionState.showFeedback
  const essayAnswer = currentQuestionState.essayAnswer
  const essayEvaluation = currentQuestionState.essayEvaluation
  const chatHistory = currentQuestionState.chatHistory
  const generatedQuestions = currentQuestionState.generatedQuestions
  const startTime = currentQuestionState.startTime

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return // Não permitir mudança após mostrar feedback
    updateQuestionState(currentQuestion.id, { selectedAnswer: answer })
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return

    const timeSpent = Date.now() - startTime
    const isCorrect = selectedAnswer === currentQuestion.correct_answer

    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer,
      isCorrect,
      timeSpent
    }

    setUserAnswers(prev => new Map(prev.set(currentQuestion.id, userAnswer)))
    updateQuestionState(currentQuestion.id, { showFeedback: true })
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleFinishSession = () => {
    // Calcular estatísticas
    const totalQuestions = questions.length
    const answeredQuestions = userAnswers.size
    const correctAnswers = Array.from(userAnswers.values()).filter(a => a.isCorrect).length

    navigate('/questions', {
      state: {
        sessionResults: {
          totalQuestions,
          answeredQuestions,
          correctAnswers,
          accuracy: answeredQuestions > 0 ? (correctAnswers / answeredQuestions) * 100 : 0
        }
      }
    })
  }

  // Função para avaliar resposta dissertativa
  const handleEvaluateEssay = async () => {
    if (!essayAnswer.trim()) return

    setEvaluatingEssay(true)

    try {
      const evaluationPrompt = `Você é um avaliador especialista em questões jurídicas dissertativas. Analise a resposta do estudante e forneça uma avaliação detalhada.

CONTEXTO DA QUESTÃO:
Lei: ${currentQuestion.law_name}
Artigo: ${currentQuestion.article_number}
Questão: ${currentQuestion.question_text}
Resposta Esperada (Gabarito): ${currentQuestion.correct_answer}
Tags: ${currentQuestion.tags.join(', ')}
Tópico: ${currentQuestion.topic}

RESPOSTA DO ESTUDANTE:
${essayAnswer}

INSTRUÇÕES:
1. Compare a resposta do estudante com a resposta esperada
2. Avalie o conhecimento demonstrado sobre o tema
3. Considere conceitos jurídicos, precisão técnica e completude
4. Atribua uma nota de 0 a 10 (números inteiros)
5. Determine se a resposta pode ser considerada "correta" (nota >= 6)

Retorne APENAS um JSON no seguinte formato:
{
  "score": [nota de 0 a 10],
  "feedback": "[explicação detalhada da avaliação, pontos positivos e negativos, sugestões de melhoria]",
  "isCorrect": [true se nota >= 6, false caso contrário]
}`

      const response = await deepseekService.chat([
        {
          role: 'user',
          content: evaluationPrompt
        }
      ])

      // Tentar fazer parse da resposta
      try {
        const evaluation = JSON.parse(response)
        updateQuestionState(currentQuestion.id, {
          essayEvaluation: evaluation,
          showFeedback: true
        })

        // Registrar a resposta como userAnswer
        const timeSpent = Date.now() - startTime
        const userAnswer: UserAnswer = {
          questionId: currentQuestion.id,
          selectedAnswer: essayAnswer,
          isCorrect: evaluation.isCorrect,
          timeSpent
        }

        setUserAnswers(prev => new Map(prev.set(currentQuestion.id, userAnswer)))

      } catch (parseError) {
        console.error('Erro ao fazer parse da avaliação:', parseError)
        const errorEvaluation = {
          score: 0,
          feedback: 'Erro ao processar avaliação. Tente novamente.',
          isCorrect: false
        }
        updateQuestionState(currentQuestion.id, {
          essayEvaluation: errorEvaluation,
          showFeedback: true
        })
      }

    } catch (error) {
      console.error('Erro ao avaliar resposta dissertativa:', error)
      const errorEvaluation = {
        score: 0,
        feedback: 'Erro ao comunicar com a IA. Tente novamente.',
        isCorrect: false
      }
      updateQuestionState(currentQuestion.id, {
        essayEvaluation: errorEvaluation,
        showFeedback: true
      })
    } finally {
      setEvaluatingEssay(false)
    }
  }

  // Funções para o Chat Modal
  const handleOpenChatModal = () => {
    setChatModalOpen(true)
    // Não resetar mais o chatHistory e generatedQuestions - eles persistem por questão
  }

  const handleCloseChatModal = () => {
    setChatModalOpen(false)
    setChatPrompt('')
    // Não resetar mais o chatHistory e generatedQuestions - eles persistem por questão
  }

  const handleSendChatMessage = async (message: string) => {
    if (!message.trim()) return

    setChatLoading(true)
    updateQuestionState(currentQuestion.id, {
      chatHistory: [...chatHistory, { type: 'user', message }]
    })

    try {
      // Preparar contexto completo da questão para o chat
      const questionContext = {
        law_name: currentQuestion.law_name,
        article_number: currentQuestion.article_number,
        type: currentQuestion.type,
        question_text: currentQuestion.question_text,
        options: currentQuestion.options,
        correct_answer: currentQuestion.correct_answer,
        explanation: currentQuestion.explanation,
        tags: currentQuestion.tags,
        topic: currentQuestion.topic
      }

      // Preparar histórico do chat
      const chatHistoryContext = chatHistory.map(item =>
        `${item.type === 'user' ? 'Usuário' : 'IA'}: ${item.message}`
      ).join('\n')

      // Adicionar contexto da resposta do usuário se houver
      let userAnswerContext = ''
      if (currentQuestion.type === 'essay' && essayEvaluation) {
        userAnswerContext = `\nResposta dissertativa do usuário: ${essayAnswer}\nAvaliação da IA: ${essayEvaluation.score}/10 (${essayEvaluation.isCorrect ? 'Correta' : 'Incorreta'})\nFeedback: ${essayEvaluation.feedback}`
      } else if (currentAnswer) {
        userAnswerContext = `\nResposta do usuário: ${currentAnswer.selectedAnswer} (${currentAnswer.isCorrect ? 'Correta' : 'Incorreta'})`
      } else if (selectedAnswer) {
        userAnswerContext = `\nResposta selecionada: ${selectedAnswer}`
      }

      let systemPrompt = `Você é um assistente especializado em questões jurídicas. Você está conversando sobre uma questão específica durante uma Mesa de Estudo.

CONTEXTO DA QUESTÃO:
Lei: ${questionContext.law_name}
Artigo: ${questionContext.article_number}
Tipo: ${questionContext.type}
Texto da questão: ${questionContext.question_text}
${questionContext.options ? `Alternativas: ${JSON.stringify(questionContext.options, null, 2)}` : ''}
Resposta correta: ${questionContext.correct_answer}
Explicação: ${questionContext.explanation.general}
Tags: ${questionContext.tags.join(', ')}
Tópico: ${questionContext.topic}${userAnswerContext}

${chatHistoryContext ? `HISTÓRICO DA CONVERSA:\n${chatHistoryContext}\n\n` : ''}`

      // Verificar se é um prompt de criação de questões
      if (message.toLowerCase().includes('criar') && (message.toLowerCase().includes('questão') || message.toLowerCase().includes('questões'))) {
        systemPrompt += `
IMPORTANTE: O usuário está pedindo para criar novas questões. Você deve retornar questões em formato JSON seguindo exatamente esta estrutura:

[
  {
    "type": "multiple_choice" | "true_false" | "essay",
    "question_text": "texto da questão",
    "options": {
      "a": "alternativa a",
      "b": "alternativa b",
      "c": "alternativa c",
      "d": "alternativa d",
      "e": "alternativa e"
    },
    "correct_answer": "a",
    "explanation": {
      "general": "explicação geral",
      "alternatives": {
        "a": "por que A está correta",
        "b": "por que B está incorreta",
        "c": "por que C está incorreta",
        "d": "por que D está incorreta",
        "e": "por que E está incorreta"
      }
    },
    "tags": ["tag1", "tag2"],
    "topic": "tópico da questão"
  }
]

Crie questões relacionadas ao mesmo contexto legal (mesma lei e artigo). Retorne APENAS o array JSON, sem texto adicional.`
      }

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

      updateQuestionState(currentQuestion.id, {
        chatHistory: [...chatHistory, { type: 'user', message }, { type: 'ai', message: response }]
      })

      // Se a resposta parece ser questões em JSON, tentar fazer parse
      if (message.toLowerCase().includes('criar') && (message.toLowerCase().includes('questão') || message.toLowerCase().includes('questões'))) {
        try {
          const questions = JSON.parse(response)
          if (Array.isArray(questions)) {
            updateQuestionState(currentQuestion.id, {
              generatedQuestions: questions
            })
          }
        } catch (e) {
          // Se não conseguir fazer parse, não é um problema - a resposta será exibida normalmente
        }
      }

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      updateQuestionState(currentQuestion.id, {
        chatHistory: [...chatHistory, { type: 'user', message }, { type: 'ai', message: 'Erro ao comunicar com a IA. Tente novamente.' }]
      })
    } finally {
      setChatLoading(false)
    }
  }

  const handleSaveGeneratedQuestion = async (questionData: any) => {
    try {
      const questionToSave = {
        law_element_id: currentQuestion.law_element_id,
        law_id: currentQuestion.law_id,
        law_name: currentQuestion.law_name,
        article_number: currentQuestion.article_number,
        type: questionData.type,
        question_text: questionData.question_text,
        options: questionData.options,
        correct_answer: questionData.correct_answer,
        explanation: questionData.explanation,
        tags: questionData.tags,
        topic: questionData.topic
      }

      const success = await saveQuestion(questionToSave)
      if (success) {
        alert('Questão salva com sucesso!')
        // Remover questão da lista de geradas
        updateQuestionState(currentQuestion.id, {
          generatedQuestions: generatedQuestions.filter(q => q !== questionData)
        })
      } else {
        alert('Erro ao salvar questão. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error)
      alert('Erro ao salvar questão. Tente novamente.')
    }
  }

  const renderQuestionContent = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            <p className="text-lg text-gray-900 mb-6">
              {currentQuestion.question_text}
            </p>

            <div className="space-y-3">
              {Object.entries(currentQuestion.options || {}).map(([key, value]) => (
                <div
                  key={key}
                  onClick={() => handleAnswerSelect(key)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnswer === key
                      ? showFeedback
                        ? key === currentQuestion.correct_answer
                          ? 'bg-green-100 border-green-500 text-green-900'
                          : 'bg-red-100 border-red-500 text-red-900'
                        : 'bg-indigo-100 border-indigo-500 text-indigo-900'
                      : showFeedback && key === currentQuestion.correct_answer
                      ? 'bg-green-100 border-green-500 text-green-900'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === key ? 'border-current' : 'border-gray-300'
                    }`}>
                      {selectedAnswer === key && <div className="w-3 h-3 rounded-full bg-current" />}
                    </div>
                    <span className="font-medium uppercase">{key})</span>
                    <span>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'true_false':
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-900">
              {currentQuestion.question_text}
            </p>

            <div className="space-y-3">
              {['true', 'false'].map((option) => (
                <div
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnswer === option
                      ? showFeedback
                        ? option === currentQuestion.correct_answer
                          ? 'bg-green-100 border-green-500 text-green-900'
                          : 'bg-red-100 border-red-500 text-red-900'
                        : 'bg-indigo-100 border-indigo-500 text-indigo-900'
                      : showFeedback && option === currentQuestion.correct_answer
                      ? 'bg-green-100 border-green-500 text-green-900'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === option ? 'border-current' : 'border-gray-300'
                    }`}>
                      {selectedAnswer === option && <div className="w-3 h-3 rounded-full bg-current" />}
                    </div>
                    <span className="font-medium">
                      {option === 'true' ? 'Verdadeiro' : 'Falso'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'essay':
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-900">
              {currentQuestion.question_text}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Questão Dissertativa:</strong> Digite sua resposta no campo abaixo. A IA avaliará sua resposta e dará uma nota de 0 a 10.
              </p>
            </div>

            {!showFeedback ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sua resposta:
                  </label>
                  <textarea
                    value={essayAnswer}
                    onChange={(e) => updateQuestionState(currentQuestion.id, { essayAnswer: e.target.value })}
                    placeholder="Digite sua resposta dissertativa aqui..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical"
                    rows={6}
                    disabled={evaluatingEssay}
                  />
                </div>

                <button
                  onClick={handleEvaluateEssay}
                  disabled={!essayAnswer.trim() || evaluatingEssay}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {evaluatingEssay ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Avaliando resposta...
                    </>
                  ) : (
                    'Enviar para Avaliação'
                  )}
                </button>
              </div>
            ) : essayEvaluation && (
              <div className="space-y-4">
                {/* Resposta do usuário */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sua resposta:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{essayAnswer}</p>
                </div>

                {/* Avaliação da IA */}
                <div className={`border rounded-lg p-4 ${
                  essayEvaluation.isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-medium ${
                      essayEvaluation.isCorrect ? 'text-green-900' : 'text-red-900'
                    }`}>
                      Avaliação da IA
                    </h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      essayEvaluation.isCorrect
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      Nota: {essayEvaluation.score}/10
                    </div>
                  </div>
                  <p className={`text-sm ${
                    essayEvaluation.isCorrect ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {essayEvaluation.feedback}
                  </p>
                </div>

                {/* Resposta esperada (mostrada após avaliação) */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Resposta Esperada (Gabarito):</h4>
                  <p className="text-blue-800">{currentQuestion.correct_answer}</p>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/questions')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Sair do Estudo
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center">
                <Target className="h-5 w-5 mr-2 text-indigo-600" />
                Mesa de Estudo
              </h1>
              <p className="text-sm text-gray-600">
                {lawName} • {selectedArticles.join(', ')}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Questão {currentQuestionIndex + 1} de {questions.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Question header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-600">
                  {currentQuestion.article_number}
                </span>
                <span className="text-sm text-gray-500 capitalize">
                  {currentQuestion.type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {currentQuestion.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Question content */}
            {renderQuestionContent()}

            {/* Feedback (não mostrar para dissertativas, pois já tem avaliação integrada) */}
            {showFeedback && currentQuestion.type !== 'essay' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Explicação:</h4>
                <p className="text-blue-800">{currentQuestion.explanation.general}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-between">
              <div className="flex items-center space-x-3">
                {/* Botão Anterior sempre visível */}
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </button>

                <button
                  onClick={handleOpenChatModal}
                  className="flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-200 border border-blue-200"
                  title="Conversar com IA sobre esta questão"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Peça Ajuda à IA
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {!showFeedback && selectedAnswer && currentQuestion.type !== 'essay' && (
                  <button
                    onClick={handleSubmitAnswer}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Confirmar Resposta
                  </button>
                )}

                {/* Botões de navegação sempre visíveis */}
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Próxima
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
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Conversar com IA sobre a Questão
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentQuestion.law_name} - Artigo {currentQuestion.article_number}
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
            <div className="flex-1 flex overflow-hidden">
              {/* Lado esquerdo - Chat */}
              <div className="flex-1 flex flex-col">
                {/* Área de conversa */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Prompts pré-prontos */}
                  {chatHistory.length === 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Prompts rápidos:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'Pedir maiores explicações',
                          'Criação de novas questões',
                          'Pedir exemplos práticos',
                          ...(currentQuestion.type === 'multiple_choice' ? ['Explique cada uma das alternativas'] : [])
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
                    <div
                      key={index}
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

              {/* Lado direito - Questões geradas (se houver) */}
              {generatedQuestions.length > 0 && (
                <div className="w-1/2 border-l border-gray-200 bg-gray-50">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">Questões Geradas</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {generatedQuestions.length} questão(ões) criada(s)
                    </p>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-96 space-y-4">
                    {generatedQuestions.map((question, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-gray-900">
                            Questão {index + 1} - {question.type.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => handleSaveGeneratedQuestion(question)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            Inserir no Banco
                          </button>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{question.question_text}</p>

                        {/* Opções para múltipla escolha */}
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-1 mb-2">
                            {Object.entries(question.options).map(([key, value]) => (
                              <div
                                key={key}
                                className={`text-xs p-1 rounded ${
                                  key === question.correct_answer
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <span className="font-medium uppercase">{key})</span> {value}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Resposta:</span> {question.correct_answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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