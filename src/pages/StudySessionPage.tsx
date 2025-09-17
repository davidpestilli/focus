import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Target } from 'lucide-react'
import { StudyQuestion } from '../hooks/useQuestions'

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
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [startTime, setStartTime] = useState<number>(Date.now())

  // Verificar se temos dados da sessão
  useEffect(() => {
    if (!sessionData || !sessionData.questions || sessionData.questions.length === 0) {
      navigate('/questions')
    }
  }, [sessionData, navigate])

  // Reset quando muda de questão
  useEffect(() => {
    setSelectedAnswer('')
    setShowFeedback(false)
    setStartTime(Date.now())
  }, [currentQuestionIndex])

  if (!sessionData) return null

  const { questions, lawName, selectedArticles } = sessionData
  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = userAnswers.get(currentQuestion.id)

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return // Não permitir mudança após mostrar feedback
    setSelectedAnswer(answer)
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
    setShowFeedback(true)
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

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Questão Dissertativa:</strong> Leia a resposta esperada abaixo e avalie seu conhecimento.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Resposta Esperada:</h4>
              <p className="text-gray-700">{currentQuestion.correct_answer}</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleAnswerSelect('correct')}
                className={`flex-1 p-3 border rounded-lg transition-colors ${
                  selectedAnswer === 'correct'
                    ? 'bg-green-100 border-green-500 text-green-900'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                Sabia a resposta
              </button>
              <button
                onClick={() => handleAnswerSelect('incorrect')}
                className={`flex-1 p-3 border rounded-lg transition-colors ${
                  selectedAnswer === 'incorrect'
                    ? 'bg-red-100 border-red-500 text-red-900'
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <XCircle className="h-5 w-5 mx-auto mb-1" />
                Não sabia
              </button>
            </div>
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

            {/* Feedback */}
            {showFeedback && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Explicação:</h4>
                <p className="text-blue-800">{currentQuestion.explanation.general}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </button>

              <div className="space-x-3">
                {!showFeedback && selectedAnswer && (
                  <button
                    onClick={handleSubmitAnswer}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Confirmar Resposta
                  </button>
                )}

                {showFeedback && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}