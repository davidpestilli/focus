import React, { useState } from 'react'
import { ArrowRight, Copy, Save, Check, BookOpen, ArrowLeft } from 'lucide-react'
import { useLaws } from '../hooks/useLaws'
import { useLawElements } from '../hooks/useLawElements'
import LawSelector from './LawSelector'
import LawHierarchySelector from './LawHierarchySelector'
import type { Law, LawElement } from '../types/database'

interface ContestLawSelectorProps {
  onSave: (contestLaw: {
    law: Law
    selectedElements: LawElement[]
  }) => void
  onCancel: () => void
}

export default function ContestLawSelector({ onSave, onCancel }: ContestLawSelectorProps) {
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null)
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [copiedElements, setCopiedElements] = useState<LawElement[]>([])
  const [showCopiedStructure, setShowCopiedStructure] = useState(false)

  const { laws, loading: lawsLoading } = useLaws()
  const { elements, loading: elementsLoading, buildHierarchy } = useLawElements(selectedLaw?.id)

  const hierarchy = buildHierarchy()

  const handleLawSelect = (law: Law) => {
    setSelectedLaw(law)
    setSelectedElements(new Set())
    setCopiedElements([])
    setShowCopiedStructure(false)
  }

  const handleSelectionChange = (newSelectedElements: Set<string>) => {
    setSelectedElements(newSelectedElements)
  }

  const handleCopy = () => {
    // Filtrar apenas os elementos selecionados e seus descendentes
    const selectedElementsData = elements.filter(element =>
      selectedElements.has(element.id)
    )

    // Incluir todos os descendentes dos elementos selecionados
    const allSelectedElements: LawElement[] = []

    const addElementAndDescendants = (elementId: string) => {
      const element = elements.find(el => el.id === elementId)
      if (element) {
        allSelectedElements.push(element)

        // Adicionar todos os descendentes
        const descendants = elements.filter(el =>
          el.path.includes(elementId) && el.id !== elementId
        )
        allSelectedElements.push(...descendants)
      }
    }

    selectedElements.forEach(elementId => {
      addElementAndDescendants(elementId)
    })

    // Remover duplicatas
    const uniqueElements = allSelectedElements.filter((element, index, self) =>
      index === self.findIndex(el => el.id === element.id)
    )

    setCopiedElements(uniqueElements)
    setShowCopiedStructure(true)
  }

  const handleSave = () => {
    if (selectedLaw && copiedElements.length > 0) {
      onSave({
        law: selectedLaw,
        selectedElements: copiedElements
      })
    }
  }

  const buildCopiedHierarchy = () => {
    const hierarchyMap = new Map<string, LawElement & { children?: LawElement[] }>()

    // Criar mapa de elementos
    copiedElements.forEach(element => {
      hierarchyMap.set(element.id, { ...element, children: [] })
    })

    // Construir hierarquia
    const rootElements: (LawElement & { children?: LawElement[] })[] = []

    copiedElements.forEach(element => {
      const elementWithChildren = hierarchyMap.get(element.id)!

      if (element.parent_id && hierarchyMap.has(element.parent_id)) {
        const parent = hierarchyMap.get(element.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(elementWithChildren)
      } else {
        rootElements.push(elementWithChildren)
      }
    })

    // Ordenar elementos por order_position
    const sortElements = (elements: (LawElement & { children?: LawElement[] })[]) => {
      elements.sort((a, b) => (a.order_position || 0) - (b.order_position || 0))
      elements.forEach(element => {
        if (element.children) {
          sortElements(element.children)
        }
      })
    }

    sortElements(rootElements)
    return rootElements
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Adicionar Lei ao Concurso
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                Selecione uma lei e os elementos que deseja incluir no concurso
              </p>
            </div>
            <div className="border-l border-gray-300 pl-6">
              <div className="flex items-center space-x-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Leis Disponíveis
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    {laws.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {showCopiedStructure && (
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Lei no Concurso
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full p-6 overflow-hidden">
        {!selectedLaw ? (
          // Seleção de Lei
          <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100">
            {lawsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                  <p className="mt-4 text-base text-gray-600 font-medium">Carregando leis...</p>
                </div>
              </div>
            ) : (
              <div className="p-8 h-full overflow-y-auto">
                <LawSelector
                  onLawSelect={handleLawSelect}
                  selectedLaw={selectedLaw}
                />
              </div>
            )}
          </div>
        ) : (
          // Seleção de Elementos da Lei
          <div className="flex gap-6 h-full">
            {/* Estrutura da Lei Geral - Left Side */}
            <div className="w-1/2 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full">
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg border border-gray-200">
                        <BookOpen className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                          Estrutura da Lei Geral
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                          {selectedLaw.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedLaw(null)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Trocar Lei
                    </button>
                  </div>
                </div>

                <div className="p-6 h-[calc(100%-12rem)] overflow-y-auto">
                  {elementsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Carregando estrutura...</p>
                    </div>
                  ) : (
                    <LawHierarchySelector
                      elements={hierarchy}
                      selectedElements={selectedElements}
                      onSelectionChange={handleSelectionChange}
                    />
                  )}
                </div>

                {/* Copy Button */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={handleCopy}
                    disabled={selectedElements.size === 0}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Copy className="h-5 w-5 mr-2" />
                    Copiar Elementos Selecionados ({selectedElements.size})
                  </button>
                </div>
              </div>
            </div>

            {/* Arrow and Structure do Concurso - Right Side */}
            <div className="w-1/2 flex-shrink-0 flex flex-col">
              {/* Arrow */}
              {!showCopiedStructure && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ArrowRight className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Selecione elementos e clique em Copiar</p>
                    <p className="text-sm mt-2">Os elementos selecionados aparecerão aqui</p>
                  </div>
                </div>
              )}

              {/* Estrutura da Lei do Concurso */}
              {showCopiedStructure && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full">
                  <div className="px-8 py-6 border-b border-gray-100 bg-green-50">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg border border-green-200">
                        <Check className="h-5 w-5 text-green-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                          Estrutura da Lei do Concurso
                        </h3>
                        <p className="text-sm text-green-700 mt-1 font-medium">
                          {copiedElements.length} elementos selecionados
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 h-[calc(100%-6rem)] overflow-y-auto">
                    <div className="space-y-1">
                      {buildCopiedHierarchy().map((element) => (
                        <div key={element.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-3">
                            <BookOpen className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {element.title}
                              </div>
                              {element.content && element.content !== element.title && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {element.content.substring(0, 100)}...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}