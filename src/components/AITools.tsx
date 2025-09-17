import { useState } from 'react';
import { MessageSquare, BookOpen, HelpCircle, Loader2, Save, CheckCircle } from 'lucide-react';
import { deepseekService } from '../lib/deepseek';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useQuestions, type QuestionToSave } from '../hooks/useQuestions';

interface AIToolsProps {
  lawContent: string;
  lawTitle: string;
  selectedElement?: {
    id: string;
    law_id: string;
    element_type: string;
    element_number: string;
    title: string;
    content: string;
  };
}

type ToolType = 'explain' | 'examples' | 'questions' | 'custom';

interface AIResponse {
  type: ToolType;
  content: string;
  timestamp: Date;
}

export function AITools({ lawContent, lawTitle, selectedElement }: AIToolsProps) {
  const [loading, setLoading] = useState(false);
  const [activeResponse, setActiveResponse] = useState<AIResponse | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set());
  const [savingQuestions, setSavingQuestions] = useState<Set<string>>(new Set());

  const { saveQuestion, generateTags, loading: savingQuestion, error: questionError } = useQuestions();

  // Função para extrair uma questão específica do texto baseado no índice
  const extractQuestionText = (content: string, questionIndex: number): string => {
    // Dividir o conteúdo em seções principais
    const sections = [];

    const multipleChoiceMatch = content.match(/(1\.\s*Questões de Múltipla Escolha[\s\S]*?)(?=2\.\s*Questões|$)/i);
    const trueFalseMatch = content.match(/(2\.\s*Questões de Verdadeiro ou Falso[\s\S]*?)(?=3\.\s*Questão|$)/i);
    const essayMatch = content.match(/(3\.\s*Questão Dissertativa[\s\S]*?)$/i);

    if (multipleChoiceMatch) sections.push(multipleChoiceMatch[1]);
    if (trueFalseMatch) sections.push(trueFalseMatch[1]);
    if (essayMatch) sections.push(essayMatch[1]);

    let currentIndex = 0;

    for (const section of sections) {
      // Para múltipla escolha e V/F, dividir por "Questão X"
      if (section.includes('Múltipla Escolha') || section.includes('Verdadeiro ou Falso')) {
        const questions = section.split(/(?=Questão\s+\d+)/);
        for (const q of questions) {
          if (q.trim() && q.includes('Questão')) {
            if (currentIndex === questionIndex) {
              return q.trim();
            }
            currentIndex++;
          }
        }
      } else if (section.includes('Dissertativa')) {
        // Para dissertativa, pegar a seção inteira
        if (currentIndex === questionIndex) {
          return section.trim();
        }
        currentIndex++;
      }
    }

    return '';
  };

  // Função para contar quantas questões existem no texto
  const countQuestions = (content: string): number => {
    let count = 0;

    const multipleChoiceMatch = content.match(/(1\.\s*Questões de Múltipla Escolha[\s\S]*?)(?=2\.\s*Questões|$)/i);
    const trueFalseMatch = content.match(/(2\.\s*Questões de Verdadeiro ou Falso[\s\S]*?)(?=3\.\s*Questão|$)/i);
    const essayMatch = content.match(/(3\.\s*Questão Dissertativa[\s\S]*?)$/i);

    if (multipleChoiceMatch) {
      const questions = multipleChoiceMatch[1].split(/(?=Questão\s+\d+)/);
      count += questions.filter(q => q.trim() && q.includes('Questão')).length;
    }

    if (trueFalseMatch) {
      const questions = trueFalseMatch[1].split(/(?=Questão\s+\d+)/);
      count += questions.filter(q => q.trim() && q.includes('Questão')).length;
    }

    if (essayMatch) {
      count += 1; // Uma questão dissertativa
    }

    return count;
  };

  // Função para obter informações de uma questão para display
  const getQuestionInfo = (content: string, questionIndex: number): { text: string; type: string } => {
    const questionText = extractQuestionText(content, questionIndex);

    let type = 'Questão';
    if (questionText.includes('Múltipla Escolha') || questionText.includes('A)')) {
      type = 'Múltipla Escolha';
    } else if (questionText.includes('Verdadeiro') || questionText.includes('Falso')) {
      type = 'Verdadeiro/Falso';
    } else if (questionText.includes('Dissertativa')) {
      type = 'Dissertativa';
    }

    // Extrair os primeiros 100 caracteres da questão para preview
    let preview = questionText.replace(/Questão\s+\d+\s*/, '').substring(0, 100);

    return { text: preview, type };
  };

  // Função para salvar questão individual
  const handleSaveQuestion = async (questionIndex: number) => {
    if (!activeResponse || activeResponse.type !== 'questions' || !selectedElement) return;

    const questionId = `${questionIndex}`;

    // Verificar se já está salva ou sendo salva
    if (savedQuestions.has(questionId) || savingQuestions.has(questionId)) return;

    try {
      // Marcar como "salvando"
      setSavingQuestions(prev => new Set([...prev, questionId]));

      // Extrair o texto da questão específica
      const questionText = extractQuestionText(activeResponse.content, questionIndex);

      if (!questionText) {
        console.error('Não foi possível extrair o texto da questão');
        return;
      }

      // Enviar para o DeepSeek estruturar
      const structuredQuestion = await deepseekService.structureSingleQuestion(questionText, lawTitle);

      // Preparar dados para salvamento
      const tags = generateTags(lawTitle, selectedElement.element_type, selectedElement.content);
      let articleNumber = selectedElement.element_number || '';
      if (articleNumber.includes('-')) {
        articleNumber = `Art. ${articleNumber.split('-')[0]}`;
      }

      const questionToSave: QuestionToSave = {
        law_element_id: selectedElement.id,
        law_id: selectedElement.law_id,
        law_name: lawTitle,
        article_number: articleNumber,
        type: structuredQuestion.type as 'multiple_choice' | 'true_false' | 'essay',
        question_text: structuredQuestion.question_text,
        options: structuredQuestion.options || null,
        correct_answer: structuredQuestion.correct_answer,
        explanation: { general: structuredQuestion.explanation },
        tags,
        topic: tags[0] || 'geral'
      };

      console.log('Questão estruturada pelo DeepSeek:', structuredQuestion);
      console.log('Dados preparados para salvamento:', questionToSave);

      const success = await saveQuestion(questionToSave);
      if (success) {
        setSavedQuestions(prev => new Set([...prev, questionId]));
      }
    } catch (error) {
      console.error('Erro ao estruturar e salvar questão:', error);
    } finally {
      // Remover do estado "salvando"
      setSavingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const handleToolClick = async (toolType: ToolType, customQ?: string) => {
    if (loading) return;

    setLoading(true);

    try {
      let response: string;

      switch (toolType) {
        case 'explain':
          response = await deepseekService.explainLawText(lawContent, lawTitle);
          break;
        case 'examples':
          response = await deepseekService.providePracticalExamples(lawContent, lawTitle);
          break;
        case 'questions':
          response = await deepseekService.generateQuestions(lawContent, lawTitle);
          break;
        case 'custom':
          if (!customQ?.trim()) return;
          response = await deepseekService.askCustomQuestion(lawContent, lawTitle, customQ);
          break;
        default:
          return;
      }

      setActiveResponse({
        type: toolType,
        content: response,
        timestamp: new Date()
      });

      if (toolType === 'custom') {
        setCustomQuestion('');
        setShowCustomInput(false);
      }
    } catch (error) {
      console.error('Erro ao consultar IA:', error);
      setActiveResponse({
        type: toolType,
        content: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const getToolTitle = (type: ToolType) => {
    switch (type) {
      case 'explain': return 'Explicação';
      case 'examples': return 'Exemplos Práticos';
      case 'questions': return 'Questões Geradas';
      case 'custom': return 'Consulta Personalizada';
      default: return 'Resposta';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Botões das ferramentas - sempre visíveis */}
      <div className="p-4 flex-shrink-0 border-b border-gray-200">
        <div className="space-y-2">
          <button
            onClick={() => handleToolClick('explain')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Explicar este trecho
            {loading && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
          </button>

          <button
            onClick={() => handleToolClick('examples')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm bg-green-50 hover:bg-green-100 rounded-md text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Dar exemplos práticos
            {loading && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
          </button>

          <button
            onClick={() => handleToolClick('questions')}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 rounded-md text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Gerar questões
            {loading && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
          </button>

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 rounded-md text-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Fazer pergunta personalizada
          </button>

          {/* Input para pergunta personalizada */}
          {showCustomInput && (
            <div className="space-y-2 mt-2">
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Digite sua pergunta sobre este trecho da lei..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none"
                rows={3}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => handleToolClick('custom', customQuestion)}
                  disabled={loading || !customQuestion.trim()}
                  className="flex-1 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mx-auto animate-spin" />
                  ) : (
                    'Enviar'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomQuestion('');
                  }}
                  className="px-3 py-2 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resposta da IA */}
      {activeResponse && (
        <div className="bg-white flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-200 flex-shrink-0">
            <h6 className="text-sm font-medium text-gray-900">
              {getToolTitle(activeResponse.type)}
            </h6>
            <button
              onClick={() => setActiveResponse(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Fechar ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <MarkdownRenderer content={activeResponse.content} />

            {/* Botões para salvar questões quando o tipo é 'questions' */}
            {activeResponse.type === 'questions' && selectedElement && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    Salvar Questões no Banco
                  </h4>
                  <span className="text-xs text-gray-500">
                    {countQuestions(activeResponse.content)} questões detectadas
                  </span>
                </div>

                <div className="space-y-2">
                  {Array.from({ length: countQuestions(activeResponse.content) }, (_, index) => {
                    const questionInfo = getQuestionInfo(activeResponse.content, index);
                    return (
                      <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 mr-3">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            Questão {index + 1} ({questionInfo.type}): {questionInfo.text}
                            {questionInfo.text.length > 100 ? '...' : ''}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              #{questionInfo.type.toLowerCase().replace('/', '_')}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              #estruturada
                            </span>
                          </div>
                        </div>

                      <button
                        onClick={() => handleSaveQuestion(index)}
                        disabled={savingQuestions.has(`${index}`) || savedQuestions.has(`${index}`)}
                        className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                          savedQuestions.has(`${index}`)
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : savingQuestions.has(`${index}`)
                            ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {savedQuestions.has(`${index}`) ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Salva</span>
                          </>
                        ) : savingQuestions.has(`${index}`) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Estruturando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Incluir no Banco</span>
                          </>
                        )}
                      </button>
                    </div>
                    );
                  })}
                </div>

                {/* Mostrar erro se houver */}
                {questionError && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      ⚠️ <strong>Erro:</strong> {questionError}
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Dica:</strong> As questões salvas aparecerão no Card Questões e podem ser usadas para criar sessões de estudo personalizadas.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            Resposta gerada em {activeResponse.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}