import React, { useState } from 'react'
import { ArrowLeft, BookOpen, Plus, MessageSquare, Bot } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useLaws } from '../hooks/useLaws'
import { useLawElements } from '../hooks/useLawElements'
import LawSelector from '../components/LawSelector'
import LawHierarchy from '../components/LawHierarchy'
import { AITools } from '../components/AITools'
import type { Law, LawElement } from '../types/database'

export default function LawsPage() {
  const { selectedLaw, setSelectedLaw, selectedLawElement, setSelectedLawElement } = useApp()
  const { laws, loading: lawsLoading } = useLaws()
  const { elements, loading: elementsLoading, buildHierarchy } = useLawElements(selectedLaw?.id)
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'select' | 'study'>('select')

  const handleLawSelect = (law: Law) => {
    setSelectedLaw(law)
    setViewMode('study')
  }

  const handleElementSelect = (element: LawElement) => {
    setSelectedLawElement(element)
  }

  const getCleanContent = (element: LawElement) => {
    // Com a nova estrutura SQL, o content já vem limpo sem prefixos redundantes
    return element.content || ''
  }

  // Função para encontrar todos os descendentes de um elemento em ordem hierárquica
  const findAllDescendants = (elementId: string, allElements: LawElement[]): LawElement[] => {
    const descendants: LawElement[] = []

    // Encontrar filhos diretos ordenados por order_position
    const children = allElements
      .filter(el => el.parent_id === elementId)
      .sort((a, b) => {
        const aPos = a.order_position || 0
        const bPos = b.order_position || 0
        return aPos - bPos
      })

    // Para cada filho, adicionar ele primeiro, depois seus descendentes
    children.forEach(child => {
      descendants.push(child)
      // Recursivamente adicionar descendentes do filho
      const childDescendants = findAllDescendants(child.id, allElements)
      descendants.push(...childDescendants)
    })

    return descendants
  }

  // Função para obter conteúdo completo incluindo toda hierarquia descendente
  const getFullHierarchicalContent = (element: LawElement) => {
    if (!element) return ''

    let content = ''

    // Para o elemento principal, mostrar apenas o content (title já é exibido no cabeçalho)
    // Para subsection, não mostrar nada aqui pois title === content e title já aparece no header
    if (element.content && element.element_type !== 'subsection') {
      content += `${element.content}\n`
    }

    // Encontrar todos os descendentes em ordem hierárquica
    const descendants = findAllDescendants(element.id, elements)

    // Adicionar conteúdo de cada descendente mantendo a estrutura hierárquica
    descendants.forEach((desc, index) => {
      if (index > 0 || content.length > 0) {
        content += '\n'
      }

      // Para elementos numerados, mostrar o identificador (título) seguido do conteúdo
      if (['article', 'paragraph', 'clause', 'item', 'subitem'].includes(desc.element_type)) {
        if (desc.title) {
          content += `${desc.title}\n`
        }
        if (desc.content && desc.content !== desc.title) {
          content += `${desc.content}\n`
        }
      } else {
        // Para elementos descritivos (title, chapter, subsection, etc.)
        // Para subsection, mostrar apenas uma vez se title === content
        // Para outros (title, chapter), mostrar title seguido do content
        if (desc.element_type === 'subsection') {
          const displayText = desc.content || desc.title
          if (displayText) {
            content += `${displayText}\n`
          }
        } else {
          // Para title, chapter, etc. mostrar title seguido do content se diferentes
          if (desc.title) {
            content += `${desc.title}\n`
          }
          if (desc.content && desc.content !== desc.title) {
            content += `${desc.content}\n`
          }
        }
      }
    })

    return content.trim()
  }

  // Função para truncar conteúdo longo
  const getTruncatedContent = (fullContent: string, maxLength: number = 2000) => {
    if (fullContent.length <= maxLength) {
      return { content: fullContent, isTruncated: false }
    }

    return {
      content: fullContent.substring(0, maxLength) + '...',
      isTruncated: true,
      totalLength: fullContent.length
    }
  }

  // Função para obter contexto completo para IA (sem truncamento)
  const getAIContext = (element: LawElement) => {
    return getFullHierarchicalContent(element)
  }

  const hierarchy = buildHierarchy()

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="font-medium">Voltar ao Dashboard</span>
            </button>
            <div className="border-l border-gray-300 pl-6">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {viewMode === 'select' ? 'Acessar Lei' : selectedLaw?.name}
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                {viewMode === 'select'
                  ? 'Selecione uma lei para estudar e explorar'
                  : 'Explore a estrutura e conteúdo da lei selecionada'
                }
              </p>
            </div>
          </div>

          {viewMode === 'study' && selectedLaw && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="flex items-center space-x-2 text-gray-600 mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Lei selecionada</span>
                </div>
                <button
                  onClick={() => setViewMode('select')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200 text-sm font-medium"
                >
                  Trocar Lei
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full p-6 overflow-hidden">
        {viewMode === 'select' ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                        Leis Disponíveis
                      </h2>
                      <p className="text-base text-gray-600 font-medium">
                        Selecione uma lei para iniciar o estudo detalhado
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">
                        {laws.length}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">
                        leis disponíveis
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {lawsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                  <p className="mt-4 text-base text-gray-600 font-medium">Carregando leis...</p>
                </div>
              ) : laws.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Nenhuma lei encontrada
                  </h3>
                  <p className="text-gray-600 mb-6 text-base">
                    Não há leis cadastradas no sistema ainda.
                  </p>
                  <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 transition-all duration-200">
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Lei
                  </button>
                </div>
              ) : (
                <div className="p-8">
                  <LawSelector
                    onLawSelect={handleLawSelect}
                    selectedLaw={selectedLaw}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden xl:flex gap-6 h-full">
              {/* Layout para telas grandes - 3 colunas lado a lado */}
            {/* Lei Hierarchy - Left Side - 38% */}
            <div className="w-[38%] flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <BookOpen className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        Estrutura da Lei
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        Clique em qualquer elemento para selecioná-lo
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {elementsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Carregando estrutura...</p>
                    </div>
                  ) : (
                    <LawHierarchy
                      elements={hierarchy}
                      onElementSelect={handleElementSelect}
                      selectedElement={selectedLawElement}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Selected Element Details - Center - 31% */}
            <div className="w-[31%] flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                {/* Header fixo */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <MessageSquare className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        Elemento Selecionado
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        {selectedLawElement ? 'Visualizando conteúdo completo' : 'Nenhum elemento selecionado'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedLawElement ? (
                  <>
                    {/* Conteúdo com scroll */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <div>
                        {/* Não mostrar type/number para evitar duplicação - o title já contém a informação formatada */}

                        {/* Display strategy: show hierarchical content for all elements */}
                        <>
                          <h5 className="text-lg font-semibold text-gray-900 mt-1">
                            {selectedLawElement.title}
                          </h5>

                          {(() => {
                            const fullContent = getFullHierarchicalContent(selectedLawElement)
                            const { content, isTruncated, totalLength } = getTruncatedContent(fullContent, 2000)

                            return (
                              <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap text-sm">
                                  {content}
                                </p>
                                {isTruncated && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                    <p className="text-xs text-blue-700">
                                      <strong>Conteúdo truncado para exibição</strong><br/>
                                      Total: {totalLength?.toLocaleString()} caracteres. O conteúdo completo será usado para contextualizar perguntas à IA.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Estado vazio */
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Selecione um elemento da lei para ver detalhes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Tools - Right Side - 29% */}
            <div className="w-[29%] flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                {/* Header fixo */}
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <Bot className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                        Ferramentas de IA
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        {selectedLawElement ? 'Interaja com o conteúdo' : 'Selecione um elemento'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedLawElement ? (
                  <AITools
                    lawContent={getFullHierarchicalContent(selectedLawElement)}
                    lawTitle={selectedLawElement.title}
                    selectedElement={{
                      id: selectedLawElement.id,
                      law_id: selectedLawElement.law_id,
                      element_type: selectedLawElement.element_type,
                      element_number: selectedLawElement.element_number || '',
                      title: selectedLawElement.title,
                      content: selectedLawElement.content
                    }}
                  />
                ) : (
                  /* Estado vazio */
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">Selecione um elemento para usar as ferramentas de IA</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:hidden h-full flex flex-col gap-6">
            {/* Layout para telas médias e pequenas - Grid responsivo */}
            {/* Lei Hierarchy */}
            <div className="h-1/2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                      <BookOpen className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                        Estrutura da Lei
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5 font-medium">
                        Clique em qualquer elemento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 h-[calc(100%-4rem)] overflow-y-auto">
                  {elementsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Carregando estrutura...</p>
                    </div>
                  ) : (
                    <LawHierarchy
                      elements={hierarchy}
                      onElementSelect={handleElementSelect}
                      selectedElement={selectedLawElement}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row - Selected Element Details and AI Tools */}
            <div className="h-1/2 flex gap-6">
              {/* Selected Element Details */}
              <div className="flex-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                        <MessageSquare className="h-4 w-4 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                          Elemento Selecionado
                        </h3>
                      </div>
                    </div>
                  </div>

                  {selectedLawElement ? (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 mt-1">
                          {selectedLawElement.title}
                        </h5>

                        {(() => {
                          const fullContent = getFullHierarchicalContent(selectedLawElement)
                          const { content, isTruncated, totalLength } = getTruncatedContent(fullContent, 1000)

                          return (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700 whitespace-pre-wrap text-sm">
                                {content}
                              </p>
                              {isTruncated && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <p className="text-xs text-blue-700">
                                    <strong>Conteúdo truncado para exibição</strong><br/>
                                    Total: {totalLength?.toLocaleString()} caracteres.
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Selecione um elemento da lei para ver detalhes</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Tools */}
              <div className="flex-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                        <Bot className="h-4 w-4 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                          Ferramentas de IA
                        </h3>
                      </div>
                    </div>
                  </div>

                  {selectedLawElement ? (
                    <AITools
                      lawContent={getFullHierarchicalContent(selectedLawElement)}
                      lawTitle={selectedLawElement.title}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm">Selecione um elemento para usar as ferramentas de IA</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  )
}