import { useState, useEffect } from 'react'
import { ChevronLeft, BookOpen, HelpCircle, Trash2, Eye, EyeOff, Bot, X, Send, MessageCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuestions, type StudyQuestion } from '../hooks/useQuestions'
import { useLaws } from '../hooks/useLaws'
import { deepseekService } from '../lib/deepseek'
import { MarkdownRenderer } from '../components/MarkdownRenderer'

interface LawWithQuestions {
  id: string
  name: string
  questionCount: number
  questions: StudyQuestion[]
}

interface ArticleGroup {
  articleNumber: string
  questionCount: number
  questions: StudyQuestion[]
  tags: string[]
}

export default function QuestionsPage() {
  const [currentView, setCurrentView] = useState<'laws' | 'articles' | 'questions'>('laws')
  const [selectedLaw, setSelectedLaw] = useState<LawWithQuestions | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<ArticleGroup | null>(null)
  const [lawsWithQuestions, setLawsWithQuestions] = useState<LawWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [highlightedQuestions, setHighlightedQuestions] = useState<Set<string>>(new Set())
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [currentQuestionForAI, setCurrentQuestionForAI] = useState<StudyQuestion | null>(null)
  const [currentQuestionForChat, setCurrentQuestionForChat] = useState<StudyQuestion | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [chatPrompt, setChatPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [chatResponse, setChatResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{prompt: string, response: string}>>([])
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', message: string}>>([])
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    type: 'multiple_choice' | 'true_false' | 'essay'
    question_text: string
    options?: { a: string; b: string; c: string; d: string; e: string }
    correct_answer: string
    explanation: { general: string; alternatives?: any }
    tags: string[]
    topic: string
  }>>([])

  const { getQuestionsByLaws, getAllQuestions, deleteQuestion, deleteMultipleQuestions, updateQuestion, saveQuestion } = useQuestions()
  const { laws } = useLaws()
  const navigate = useNavigate()

  useEffect(() => {
    loadLawsWithQuestions()
  }, []) // Carregar apenas uma vez

  // Recarregar quando laws mudar e não estiver vazio
  useEffect(() => {
    if (laws.length > 0) {
      loadLawsWithQuestions()
    }
  }, [laws.length])

  const loadLawsWithQuestions = async () => {
    setLoading(true)
    try {
      // Carregar questões agrupadas por lei
      const questionsByLaws = await getQuestionsByLaws()
      console.log('Questões carregadas:', questionsByLaws)
      console.log('Leis disponíveis:', laws)

      // Se não há questões, definir lista vazia
      if (Object.keys(questionsByLaws).length === 0) {
        console.log('Nenhuma questão encontrada')
        setLawsWithQuestions([])
        return
      }

      // Mapear questões com informações das leis
      const lawsData: LawWithQuestions[] = Object.entries(questionsByLaws).map(([lawId, questions]) => {
        const law = laws.find(l => l.id === lawId)
        console.log(`Processando lei ${lawId}:`, law, `com ${questions.length} questões`)
        return {
          id: lawId,
          name: law?.name || 'Lei não encontrada',
          questionCount: questions.length,
          questions
        }
      }).filter(law => law.questionCount > 0)

      console.log('Dados finais das leis:', lawsData)
      setLawsWithQuestions(lawsData)
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
      setLawsWithQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleLawSelect = (law: LawWithQuestions) => {
    setSelectedLaw(law)
    setCurrentView('articles')
  }

  const handleBackToLaws = () => {
    setCurrentView('laws')
    setSelectedLaw(null)
    setSelectedArticles(new Set())
    setSelectedArticle(null)
    setSelectedQuestions(new Set())
    setHighlightedQuestions(new Set())
  }

  const handleArticleClick = (article: ArticleGroup) => {
    setSelectedArticle(article)
    setCurrentView('questions')
    setSelectedQuestions(new Set())
    setHighlightedQuestions(new Set())
  }

  const handleBackToArticles = () => {
    setCurrentView('articles')
    setSelectedArticle(null)
    setSelectedQuestions(new Set())
    setHighlightedQuestions(new Set())
  }

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const handleQuestionHighlight = (questionId: string) => {
    setHighlightedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedQuestions.size === 0) return

    if (confirm(`Tem certeza que deseja deletar ${selectedQuestions.size} questão(ões)?`)) {
      const success = await deleteMultipleQuestions(Array.from(selectedQuestions))
      if (success) {
        setSelectedQuestions(new Set())
        setHighlightedQuestions(new Set())
        // Recarregar dados
        await loadLawsWithQuestions()
      }
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (confirm('Tem certeza que deseja deletar esta questão?')) {
      const success = await deleteQuestion(questionId)
      if (success) {
        setSelectedQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
        setHighlightedQuestions(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
        // Recarregar dados
        await loadLawsWithQuestions()
      }
    }
  }

  const handleOpenAIModal = (question: StudyQuestion) => {
    setCurrentQuestionForAI(question)
    setAiPrompt('Modificar essa questão da seguinte forma: ')
    setAiResponse('')
    setConversationHistory([])
    setAiModalOpen(true)
  }

  const handleCloseAIModal = () => {
    setAiModalOpen(false)
    setCurrentQuestionForAI(null)
    setAiPrompt('')
    setAiResponse('')
    setConversationHistory([])
  }

  const handleSendToAI = async () => {
    if (!currentQuestionForAI || !aiPrompt.trim()) return

    setAiLoading(true)
    try {
      // Preparar contexto completo da questão
      const questionContext = {
        id: currentQuestionForAI.id,
        law_name: currentQuestionForAI.law_name,
        article_number: currentQuestionForAI.article_number,
        type: currentQuestionForAI.type,
        question_text: currentQuestionForAI.question_text,
        options: currentQuestionForAI.options,
        correct_answer: currentQuestionForAI.correct_answer,
        explanation: currentQuestionForAI.explanation,
        tags: currentQuestionForAI.tags,
        topic: currentQuestionForAI.topic
      }

      // Preparar histórico da conversa
      const conversationContext = conversationHistory.map(item =>
        `Prompt anterior: ${item.prompt}\nResposta anterior: ${item.response}`
      ).join('\n\n')

      const fullPrompt = `
QUESTÃO ORIGINAL:
${JSON.stringify(questionContext, null, 2)}

${conversationContext ? `HISTÓRICO DA CONVERSA:\n${conversationContext}\n\n` : ''}

SOLICITAÇÃO ATUAL:
${aiPrompt}

Por favor, retorne uma questão modificada seguindo exatamente o mesmo formato JSON da questão original. Mantenha todos os campos obrigatórios e a estrutura. A resposta deve conter APENAS o JSON da questão modificada, sem texto adicional.`

      const response = await deepseekService.chat([
        {
          role: 'user',
          content: fullPrompt
        }
      ])
      setAiResponse(response)

      // Adicionar ao histórico
      setConversationHistory(prev => [...prev, { prompt: aiPrompt, response }])

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      setAiResponse('Erro ao comunicar com a IA. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleOverwriteQuestion = async () => {
    if (!currentQuestionForAI || !aiResponse) return

    try {
      // Tentar fazer parse da resposta da IA como JSON
      const modifiedQuestion = JSON.parse(aiResponse)

      // Validar campos obrigatórios
      if (!modifiedQuestion.question_text || !modifiedQuestion.correct_answer) {
        alert('Resposta da IA inválida: campos obrigatórios estão faltando.')
        return
      }

      // Atualizar questão no banco
      const success = await updateQuestion(currentQuestionForAI.id, {
        law_element_id: modifiedQuestion.law_element_id || currentQuestionForAI.law_element_id,
        law_id: modifiedQuestion.law_id || currentQuestionForAI.law_id,
        law_name: modifiedQuestion.law_name || currentQuestionForAI.law_name,
        article_number: modifiedQuestion.article_number || currentQuestionForAI.article_number,
        type: modifiedQuestion.type || currentQuestionForAI.type,
        question_text: modifiedQuestion.question_text,
        options: modifiedQuestion.options,
        correct_answer: modifiedQuestion.correct_answer,
        explanation: modifiedQuestion.explanation || currentQuestionForAI.explanation,
        tags: modifiedQuestion.tags || currentQuestionForAI.tags,
        topic: modifiedQuestion.topic || currentQuestionForAI.topic
      })

      if (success) {
        alert('Questão atualizada com sucesso!')
        handleCloseAIModal()
        // Recarregar dados
        await loadLawsWithQuestions()
      } else {
        alert('Erro ao atualizar questão. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao fazer parse da resposta da IA:', error)
      alert('Resposta da IA não está em formato JSON válido. Peça para a IA reformular a resposta.')
    }
  }

  // Funções para o Chat Modal
  const handleOpenChatModal = (question: StudyQuestion) => {
    setCurrentQuestionForChat(question)
    setChatModalOpen(true)
    setChatHistory([])
    setGeneratedQuestions([])
  }

  const handleCloseChatModal = () => {
    setChatModalOpen(false)
    setCurrentQuestionForChat(null)
    setChatPrompt('')
    setChatResponse('')
    setChatHistory([])
    setGeneratedQuestions([])
  }

  const handleSendChatMessage = async (message: string) => {
    if (!currentQuestionForChat || !message.trim()) return

    setChatLoading(true)
    setChatHistory(prev => [...prev, { type: 'user', message }])

    try {
      // Preparar contexto completo da questão para o chat
      const questionContext = {
        law_name: currentQuestionForChat.law_name,
        article_number: currentQuestionForChat.article_number,
        type: currentQuestionForChat.type,
        question_text: currentQuestionForChat.question_text,
        options: currentQuestionForChat.options,
        correct_answer: currentQuestionForChat.correct_answer,
        explanation: currentQuestionForChat.explanation,
        tags: currentQuestionForChat.tags,
        topic: currentQuestionForChat.topic
      }

      // Preparar histórico do chat
      const chatHistoryContext = chatHistory.map(item =>
        `${item.type === 'user' ? 'Usuário' : 'IA'}: ${item.message}`
      ).join('\n')

      let systemPrompt = `Você é um assistente especializado em questões jurídicas. Você está conversando sobre uma questão específica.

CONTEXTO DA QUESTÃO:
Lei: ${questionContext.law_name}
Artigo: ${questionContext.article_number}
Tipo: ${questionContext.type}
Texto da questão: ${questionContext.question_text}
${questionContext.options ? `Alternativas: ${JSON.stringify(questionContext.options, null, 2)}` : ''}
Resposta correta: ${questionContext.correct_answer}
Explicação: ${questionContext.explanation.general}
Tags: ${questionContext.tags.join(', ')}
Tópico: ${questionContext.topic}

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

      setChatHistory(prev => [...prev, { type: 'ai', message: response }])

      // Se a resposta parece ser questões em JSON, tentar fazer parse
      if (message.toLowerCase().includes('criar') && (message.toLowerCase().includes('questão') || message.toLowerCase().includes('questões'))) {
        try {
          const questions = JSON.parse(response)
          if (Array.isArray(questions)) {
            setGeneratedQuestions(questions)
          }
        } catch (e) {
          // Se não conseguir fazer parse, não é um problema - a resposta será exibida normalmente
        }
      }

    } catch (error) {
      console.error('Erro ao comunicar com IA:', error)
      setChatHistory(prev => [...prev, { type: 'ai', message: 'Erro ao comunicar com a IA. Tente novamente.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSaveGeneratedQuestion = async (questionData: any) => {
    if (!currentQuestionForChat) return

    try {
      const questionToSave = {
        law_element_id: currentQuestionForChat.law_element_id,
        law_id: currentQuestionForChat.law_id,
        law_name: currentQuestionForChat.law_name,
        article_number: currentQuestionForChat.article_number,
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
        setGeneratedQuestions(prev => prev.filter(q => q !== questionData))
        // Recarregar dados
        await loadLawsWithQuestions()
      } else {
        alert('Erro ao salvar questão. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error)
      alert('Erro ao salvar questão. Tente novamente.')
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

  const handleStartStudySession = () => {
    if (!selectedLaw || selectedArticles.size === 0) return

    // Coletar todas as questões dos artigos selecionados
    const selectedQuestions = selectedLaw.questions.filter(question =>
      selectedArticles.has(question.article_number || 'Sem artigo')
    )

    // Navegar para a Mesa de Estudo com as questões selecionadas
    navigate('/study-session', {
      state: {
        questions: selectedQuestions,
        lawName: selectedLaw.name,
        selectedArticles: Array.from(selectedArticles)
      }
    })
  }

  // Agrupar questões por artigo
  const getQuestionsByArticle = (questions: StudyQuestion[]) => {
    const grouped = questions.reduce((acc, question) => {
      const articleKey = question.article_number || 'Sem artigo'
      if (!acc[articleKey]) {
        acc[articleKey] = []
      }
      acc[articleKey].push(question)
      return acc
    }, {} as Record<string, StudyQuestion[]>)

    return Object.entries(grouped).map(([articleNumber, questions]) => ({
      articleNumber,
      questionCount: questions.length,
      questions,
      tags: [...new Set(questions.flatMap(q => q.tags))]
    }))
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando questões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            {currentView === 'questions' ? (
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
                  ? 'Banco de Questões'
                  : currentView === 'articles'
                  ? `${selectedLaw?.name}`
                  : `${selectedArticle?.articleNumber}`
                }
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                {currentView === 'laws'
                  ? 'Organize suas questões por lei e artigo'
                  : currentView === 'articles'
                  ? 'Selecione os artigos para estudar'
                  : 'Gerencie as questões deste artigo'
                }
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {currentView === 'laws' ? (
          // Vista de Leis
          <div className="h-full">
            {lawsWithQuestions.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <HelpCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma questão salva ainda
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Use as Ferramentas de IA para gerar questões e salvá-las no banco.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full overflow-y-auto">
                {lawsWithQuestions.map((law) => (
                  <div
                    key={law.id}
                    onClick={() => handleLawSelect(law)}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6 h-fit"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <BookOpen className="h-8 w-8 text-indigo-600" />
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                        {law.questionCount} questões
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {law.name}
                    </h3>

                    <p className="text-sm text-gray-600 mb-4">
                      {getQuestionsByArticle(law.questions).length} artigos com questões
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {[...new Set(law.questions.flatMap(q => q.tags))].slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          {getQuestionsByArticle(selectedLaw.questions).length}
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
                          {selectedLaw.questionCount} questões totais
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-700 font-medium">
                          {selectedArticles.size} artigo(s) selecionado(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getQuestionsByArticle(selectedLaw.questions).map((article) => (
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
                            {article.questionCount} questões
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {article.tags.slice(0, 3).map(tag => (
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
                    {selectedLaw.questions
                      .filter(q => selectedArticles.has(q.article_number || 'Sem artigo'))
                      .length} questão(ões)
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
          // Vista de Questões do Artigo
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
                        <div className="flex flex-wrap gap-2">
                          {selectedArticle.tags.slice(0, 5).map(tag => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm font-medium rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                          {selectedArticle.tags.length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                              +{selectedArticle.tags.length - 5} mais
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-3xl font-bold text-gray-900">
                          {selectedArticle.questionCount}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          questões disponíveis
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
                            {selectedQuestions.size}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            questão(ões) selecionada(s)
                          </span>
                        </div>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-base font-semibold text-gray-700">
                            {highlightedQuestions.size}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            destacada(s)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedQuestions.size > 0 && (
                          <>
                            <button
                              onClick={() => setHighlightedQuestions(new Set(selectedQuestions))}
                              className="flex items-center px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Destacar Selecionadas
                            </button>
                            <button
                              onClick={handleDeleteSelected}
                              className="flex items-center px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar ({selectedQuestions.size})
                            </button>
                          </>
                        )}
                        {highlightedQuestions.size > 0 && (
                          <button
                            onClick={() => setHighlightedQuestions(new Set())}
                            className="flex items-center px-4 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200"
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            Limpar Destaques
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de questões */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {selectedArticle.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={`bg-white rounded-lg shadow p-6 transition-all ${
                        highlightedQuestions.has(question.id)
                          ? 'ring-2 ring-yellow-400 bg-yellow-50'
                          : 'hover:shadow-md'
                      } ${
                        selectedQuestions.has(question.id)
                          ? 'ring-2 ring-indigo-500'
                          : ''
                      }`}
                    >
                      {/* Header da questão */}
                      <div className="border-b border-gray-100 pb-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedQuestions.has(question.id)}
                              onChange={() => handleQuestionSelect(question.id)}
                              className="h-5 w-5 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                            />
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-bold text-gray-900">
                                Questão {index + 1}
                              </span>
                              <div className="h-5 w-px bg-gray-300"></div>
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full capitalize">
                                {question.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleQuestionHighlight(question.id)}
                              className={`p-2.5 rounded-lg transition-all duration-200 ${
                                highlightedQuestions.has(question.id)
                                  ? 'bg-gray-900 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                              }`}
                              title="Destacar questão"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenAIModal(question)}
                              className="p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200"
                              title="Modificar com IA"
                            >
                              <Bot className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenChatModal(question)}
                              className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all duration-200 border border-blue-200"
                              title="Conversar com IA sobre esta questão"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="p-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
                              title="Deletar questão"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo da questão */}
                      <div className="mb-4">
                        <p className="text-gray-900 font-medium mb-3">
                          {question.question_text}
                        </p>

                        {/* Opções para múltipla escolha */}
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2 mb-3">
                            {Object.entries(question.options).map(([key, value]) => (
                              <div
                                key={key}
                                className={`p-2 rounded border ${
                                  key === question.correct_answer
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <span className="font-medium uppercase">{key})</span> {value}
                                {key === question.correct_answer && (
                                  <span className="text-green-600 text-sm ml-2">✓ Correta</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Resposta para verdadeiro/falso */}
                        {question.type === 'true_false' && (
                          <div className="mb-3">
                            <span className="text-sm text-gray-600">Resposta: </span>
                            <span className={`font-medium ${
                              question.correct_answer === 'true' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {question.correct_answer === 'true' ? 'Verdadeiro' : 'Falso'}
                            </span>
                          </div>
                        )}

                        {/* Resposta para dissertativa */}
                        {question.type === 'essay' && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                            <span className="text-sm font-medium text-gray-700">Resposta esperada:</span>
                            <p className="text-gray-600 mt-1">{question.correct_answer}</p>
                          </div>
                        )}

                        {/* Explicação */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <span className="text-sm font-medium text-blue-700">Explicação:</span>
                          <p className="text-blue-600 mt-1">{question.explanation.general}</p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal de IA */}
      {aiModalOpen && currentQuestionForAI && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="bg-gray-50 border-b border-gray-200 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <Bot className="h-6 w-6 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                      Modificar Questão com IA
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-base text-gray-600 font-medium">
                        {currentQuestionForAI.law_name}
                      </span>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      <span className="text-base text-gray-600 font-medium">
                        {currentQuestionForAI.article_number}
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
              {/* Questão Atual */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Questão Atual:</h4>
                <p className="text-gray-700 mb-2">{currentQuestionForAI.question_text}</p>
                {currentQuestionForAI.type === 'multiple_choice' && currentQuestionForAI.options && (
                  <div className="text-sm text-gray-600">
                    <strong>Opções:</strong>
                    {Object.entries(currentQuestionForAI.options).map(([key, value]) => (
                      <div key={key} className={key === currentQuestionForAI.correct_answer ? 'font-semibold text-green-700' : ''}>
                        {key.toUpperCase()}) {value} {key === currentQuestionForAI.correct_answer && '✓'}
                      </div>
                    ))}
                  </div>
                )}
                {currentQuestionForAI.type === 'true_false' && (
                  <div className="text-sm text-gray-600">
                    <strong>Resposta:</strong> {currentQuestionForAI.correct_answer === 'true' ? 'Verdadeiro' : 'Falso'}
                  </div>
                )}
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
                    placeholder="Modificar essa questão da seguinte forma:"
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
                    onClick={() => setAiPrompt('Modifique ainda mais essa questão da seguinte forma: ')}
                    className="px-4 py-2 text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                  >
                    Solicitar Mais Modificações
                  </button>
                  <button
                    onClick={handleOverwriteQuestion}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Sobrescrever com essa questão
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Chat com IA */}
      {chatModalOpen && currentQuestionForChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Conversar com IA sobre a Questão
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentQuestionForChat.law_name} - Artigo {currentQuestionForChat.article_number}
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
                          ...(currentQuestionForChat.type === 'multiple_choice' ? ['Explique cada uma das alternativas'] : [])
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