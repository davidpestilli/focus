import { useState } from 'react';
import { MessageSquare, BookOpen, HelpCircle, Loader2 } from 'lucide-react';
import { deepseekService } from '../lib/deepseek';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AIToolsProps {
  lawContent: string;
  lawTitle: string;
}

type ToolType = 'explain' | 'examples' | 'questions' | 'custom';

interface AIResponse {
  type: ToolType;
  content: string;
  timestamp: Date;
}

export function AITools({ lawContent, lawTitle }: AIToolsProps) {
  const [loading, setLoading] = useState(false);
  const [activeResponse, setActiveResponse] = useState<AIResponse | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

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
          </div>
          <div className="text-xs text-gray-400 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            Resposta gerada em {activeResponse.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}