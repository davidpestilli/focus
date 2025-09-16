import React, { useState } from 'react'
import { ArrowLeft, BookOpen, Plus, MessageSquare } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { useLaws } from '../hooks/useLaws'
import { useLawElements } from '../hooks/useLawElements'
import LawSelector from '../components/LawSelector'
import LawHierarchy from '../components/LawHierarchy'
import { AITools } from '../components/AITools'
import type { Law, LawElement } from '../types/database'

export default function LawsPage() {
  const { goBack, selectedLaw, setSelectedLaw, selectedLawElement, setSelectedLawElement } = useApp()
  const { laws, loading: lawsLoading } = useLaws()
  const { elements, loading: elementsLoading, buildHierarchy } = useLawElements(selectedLaw?.id)

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
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                Acessar Lei
              </h1>
            </div>

            {viewMode === 'study' && selectedLaw && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <BookOpen className="inline h-4 w-4 mr-1" />
                  {selectedLaw.name}
                </div>
                <button
                  onClick={() => setViewMode('select')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Trocar Lei
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full p-6 overflow-hidden">
        {viewMode === 'select' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Selecionar Lei para Estudo
              </h2>

              {lawsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Carregando leis...</p>
                </div>
              ) : laws.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma lei encontrada
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Não há leis cadastradas no sistema ainda.
                  </p>
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Lei
                  </button>
                </div>
              ) : (
                <LawSelector
                  onLawSelect={handleLawSelect}
                  selectedLaw={selectedLaw}
                />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden xl:flex gap-6 h-full">
              {/* Layout para telas grandes - 3 colunas lado a lado */}
            {/* Lei Hierarchy - Left Side - 38% */}
            <div className="w-[38%] flex-shrink-0">
              <div className="bg-white rounded-lg shadow h-full">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Estrutura da Lei
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em qualquer elemento para selecioná-lo
                  </p>
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

            {/* Selected Element Details - Center - 31% */}
            <div className="w-[31%] flex-shrink-0">
              <div className="bg-white rounded-lg shadow h-full flex flex-col">
                {/* Header fixo */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    Elemento Selecionado
                  </h3>
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
              <div className="bg-white rounded-lg shadow h-full flex flex-col">
                {/* Header fixo */}
                <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    Ferramentas de IA
                  </h3>
                </div>

                {selectedLawElement ? (
                  <AITools
                    lawContent={getFullHierarchicalContent(selectedLawElement)}
                    lawTitle={selectedLawElement.title}
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
              <div className="bg-white rounded-lg shadow h-full">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Estrutura da Lei
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em qualquer elemento para selecioná-lo
                  </p>
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
                <div className="bg-white rounded-lg shadow h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      Elemento Selecionado
                    </h3>
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
                <div className="bg-white rounded-lg shadow h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      Ferramentas de IA
                    </h3>
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