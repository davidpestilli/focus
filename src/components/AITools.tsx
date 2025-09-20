import { useState } from 'react';
import { MessageSquare, BookOpen, HelpCircle, Loader2, Save, CheckCircle, X } from 'lucide-react';
import { deepseekService } from '../lib/deepseek';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useQuestions, type QuestionToSave } from '../hooks/useQuestions';
import { useSummaries, type SummaryToSave } from '../hooks/useSummaries';

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

type QuestionType = 'system_default' | 'true_false' | 'multiple_choice' | 'essay';

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
  const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savedSummary, setSavedSummary] = useState(false);

  const { saveQuestion, generateTags, loading: savingQuestion, error: questionError } = useQuestions();
  const { saveSummary, getTypeTranslation } = useSummaries();

  // Mapear o tipo da resposta para o tipo do resumo
  const typeMapping: Record<ToolType, 'explanation' | 'examples' | 'custom'> = {
    'explain': 'explanation',
    'examples': 'examples',
    'custom': 'custom',
    'questions': 'explanation' // fallback (não deveria ser usado)
  };

  // Função para extrair uma questão específica do texto baseado no índice
  const extractQuestionText = (content: string, questionIndex: number): string => {
    // Primeiro, tentar o formato de seções (Padrão do Sistema)
    const sections = [];

    const multipleChoiceMatch = content.match(/(1\.\s*Questões de Múltipla Escolha[\s\S]*?)(?=2\.\s*Questões|$)/i);
    const trueFalseMatch = content.match(/(2\.\s*Questões de Verdadeiro ou Falso[\s\S]*?)(?=3\.\s*Questão|$)/i);
    const essayMatch = content.match(/(3\.\s*Questão Dissertativa[\s\S]*?)$/i);

    if (multipleChoiceMatch) sections.push(multipleChoiceMatch[1]);
    if (trueFalseMatch) sections.push(trueFalseMatch[1]);
    if (essayMatch) sections.push(essayMatch[1]);

    // Se encontrou seções, usar o método antigo
    if (sections.length > 0) {
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
    } else {
      // Se não encontrou seções, tentar detectar questões individuais
      // Dividir por padrões comuns de questões
      const questionPatterns = [
        /(?=\*\*Questão\s+\d+)/gi,
        /(?=Questão\s+\d+[:\.]?)/gi,
        /(?=\d+\s*[\-\.]\s*)/gi,
        /(?=\*\*\d+\s*[\-\.])/gi
      ];

      for (const pattern of questionPatterns) {
        const questions = content.split(pattern).filter(q => q.trim().length > 10);
        if (questions.length > questionIndex && questions[questionIndex]) {
          return questions[questionIndex].trim();
        }
      }

      // Fallback: dividir por quebras de linha duplas e tentar encontrar questões
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
      if (paragraphs.length > questionIndex) {
        return paragraphs[questionIndex].trim();
      }
    }

    return '';
  };

  // Função para contar quantas questões existem no texto
  const countQuestions = (content: string): number => {
    let count = 0;

    // Primeiro, tentar o formato de seções (Padrão do Sistema)
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

    // Se encontrou seções, retornar a contagem
    if (count > 0) {
      return count;
    }

    // Se não encontrou seções, tentar contar questões individuais
    // Contar por padrões comuns de questões
    const questionPatterns = [
      /\*\*Questão\s+\d+/gi,
      /Questão\s+\d+[:\.]?/gi,
      /^\d+\s*[\-\.]\s*/gm,
      /\*\*\d+\s*[\-\.]/gi
    ];

    let maxCount = 0;
    for (const pattern of questionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        maxCount = Math.max(maxCount, matches.length);
      }
    }

    // Se ainda não encontrou, tentar contar por parágrafos substanciais
    if (maxCount === 0) {
      const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
      maxCount = Math.min(paragraphs.length, 6); // Limitar a 6 questões como esperado
    }

    return maxCount;
  };

  // Função para obter informações de uma questão para display
  const getQuestionInfo = (content: string, questionIndex: number): { text: string; type: string } => {
    const questionText = extractQuestionText(content, questionIndex);

    let type = 'Questão';

    // Detectar tipo por características do texto
    if (questionText.includes('Múltipla Escolha') || questionText.includes('A)') || questionText.includes('a)') ||
        questionText.includes('B)') || questionText.includes('b)') ||
        (questionText.includes('A.') && questionText.includes('B.') && questionText.includes('C.'))) {
      type = 'Múltipla Escolha';
    } else if (questionText.includes('Verdadeiro') || questionText.includes('Falso') ||
               questionText.includes('VERDADEIRO') || questionText.includes('FALSO') ||
               questionText.toLowerCase().includes('verdadeiro') || questionText.toLowerCase().includes('falso') ||
               questionText.includes('V ou F') || questionText.includes('(V/F)')) {
      type = 'Verdadeiro/Falso';
    } else if (questionText.includes('Dissertativa') || questionText.includes('dissertativa') ||
               questionText.includes('Discursiva') || questionText.includes('discursiva') ||
               questionText.includes('Comente') || questionText.includes('Explique') ||
               questionText.includes('Analise') || questionText.includes('Justifique') ||
               questionText.length > 300) { // Questões longas provavelmente são dissertativas
      type = 'Dissertativa';
    }

    // Extrair os primeiros 100 caracteres da questão para preview
    const preview = questionText
      .replace(/\*\*Questão\s+\d+\*\*\s*/i, '')
      .replace(/Questão\s+\d+[:\.]?\s*/i, '')
      .replace(/^\d+\s*[\-\.]\s*/, '')
      .substring(0, 100);

    return { text: preview, type };
  };

  // Função para detectar artigo(s) baseado no conteúdo da questão
  const detectArticleFromQuestion = (questionText: string, correctAnswer: string, explanation: string, fallbackArticle: string): string => {
    const fullText = `${questionText} ${correctAnswer} ${explanation}`.toLowerCase();

    console.log('🔍 Debug detecção:', {
      fullText: fullText.substring(0, 200) + '...',
      fallbackArticle
    });

    // Verificar padrões genéricos para QUALQUER artigo usando regex mais robusta
    const articleMatches = fullText.match(/\b(?:art\.?|artigo)\s*(\d+)/gi) || [];
    console.log('📄 Artigos encontrados (matches):', articleMatches);

    const articleNumbers = [...new Set(articleMatches.map(match => {
      const num = match.match(/(\d+)/)?.[1];
      return num ? parseInt(num) : null;
    }).filter((num): num is number => num !== null))].sort((a, b) => a - b);

    console.log('📄 Números de artigos únicos:', articleNumbers);

    // Se encontrou artigos, formatar adequadamente
    if (articleNumbers.length > 1) {
      const formatted = articleNumbers.map(num => `Art. ${num}`);
      const result = formatted.join(' e ');
      console.log('📄 Resultado (múltiplos artigos):', result);
      return result;
    } else if (articleNumbers.length === 1) {
      const result = `Art. ${articleNumbers[0]}`;
      console.log('📄 Resultado (artigo único):', result);
      return result;
    }

    // Fallback: usar o article_number atual do elemento selecionado
    console.log('📄 Resultado (fallback):', fallbackArticle);
    return fallbackArticle;
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
      const structuredQuestion = await deepseekService.structureSingleQuestion(questionText, lawTitle, questionIndex);

      // Preparar dados para salvamento
      const tags = generateTags(lawTitle, selectedElement.element_type, selectedElement.content);
      let fallbackArticleNumber = selectedElement.element_number || '';
      if (fallbackArticleNumber.includes('-')) {
        fallbackArticleNumber = `Art. ${fallbackArticleNumber.split('-')[0]}`;
      }

      // Detectar artigo(s) baseado no conteúdo da questão
      const detectedArticleNumber = detectArticleFromQuestion(
        structuredQuestion.question_text,
        structuredQuestion.correct_answer,
        structuredQuestion.explanation || '',
        fallbackArticleNumber
      );

      console.log('🔍 Detecção de Artigo:', {
        questionText: structuredQuestion.question_text,
        correctAnswer: structuredQuestion.correct_answer,
        explanation: structuredQuestion.explanation,
        fallbackArticleNumber,
        detectedArticleNumber
      });

      const questionToSave: QuestionToSave = {
        law_element_id: selectedElement.id,
        law_id: selectedElement.law_id,
        law_name: lawTitle,
        article_number: detectedArticleNumber,
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

  // Função para salvar resumo
  const handleSaveSummary = async () => {
    if (!activeResponse || !selectedElement) return;

    // Não salvar se for resposta de questões
    if (activeResponse.type === 'questions') return;

    setSavingSummary(true);

    try {
      const summaryType = typeMapping[activeResponse.type];

      // Gerar título usando IA
      const title = await deepseekService.generateSummaryTitle(activeResponse.content, summaryType);

      // Preparar dados do resumo
      let articleNumber = selectedElement.element_number || '';
      if (articleNumber.includes('-')) {
        articleNumber = `Art. ${articleNumber.split('-')[0]}`;
      }

      const summaryData: SummaryToSave = {
        law_element_id: selectedElement.id,
        law_id: selectedElement.law_id,
        law_name: lawTitle,
        article_number: articleNumber,
        type: summaryType,
        title: title,
        content: activeResponse.content
      };

      const success = await saveSummary(summaryData);

      if (success) {
        setSavedSummary(true);
        // Resetar o estado após alguns segundos
        setTimeout(() => {
          setSavedSummary(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao salvar resumo:', error);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleQuestionTypeSelect = async (questionType: QuestionType) => {
    setShowQuestionTypeModal(false);
    if (loading) return;

    setLoading(true);

    try {
      let response: string;

      if (questionType === 'system_default') {
        response = await deepseekService.generateQuestions(lawContent, lawTitle);
      } else {
        // Gerar questões com tipo específico
        response = await deepseekService.generateQuestionsByType(lawContent, lawTitle, questionType);
      }

      setActiveResponse({
        type: 'questions',
        content: response,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Erro ao consultar IA:', error);
      setActiveResponse({
        type: 'questions',
        content: `Erro ao processar solicitação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = async (toolType: ToolType, customQ?: string) => {
    if (loading) return;

    // Para questões, mostrar modal de seleção de tipo
    if (toolType === 'questions') {
      setShowQuestionTypeModal(true);
      return;
    }

    // Resetar estado do resumo salvo ao gerar nova resposta
    setSavedSummary(false);
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

            {/* Botão para salvar resumos quando o tipo NÃO é 'questions' */}
            {activeResponse.type !== 'questions' && selectedElement && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Salvar Resumo no Banco
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Tipo: {getTypeTranslation(typeMapping[activeResponse.type] || 'explanation')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSummary}
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

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 <strong>Dica:</strong> Os resumos salvos aparecerão no Card Resumos e podem ser acessados por artigo.
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

      {/* Modal de Seleção de Tipo de Questão */}
      {showQuestionTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Tipo de Questões
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione o tipo de questão que deseja gerar
                </p>
              </div>
              <button
                onClick={() => setShowQuestionTypeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Opções */}
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleQuestionTypeSelect('system_default')}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Padrão do Sistema</div>
                <div className="text-sm text-gray-600 mt-1">
                  Mix de questões: múltipla escolha, verdadeiro/falso e dissertativa
                </div>
              </button>

              <button
                onClick={() => handleQuestionTypeSelect('multiple_choice')}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Múltipla Escolha</div>
                <div className="text-sm text-gray-600 mt-1">
                  6 questões de múltipla escolha com 5 alternativas cada
                </div>
              </button>

              <button
                onClick={() => handleQuestionTypeSelect('true_false')}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Verdadeiro/Falso</div>
                <div className="text-sm text-gray-600 mt-1">
                  6 questões de verdadeiro ou falso
                </div>
              </button>

              <button
                onClick={() => handleQuestionTypeSelect('essay')}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Discursiva</div>
                <div className="text-sm text-gray-600 mt-1">
                  6 questões dissertativas com respostas detalhadas
                </div>
              </button>
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowQuestionTypeModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}