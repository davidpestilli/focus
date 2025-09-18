import React, { useState, useEffect } from 'react'
import { ArrowRight, Copy, Save, Check, BookOpen, ArrowLeft, Trash2, Loader2 } from 'lucide-react'
import { useLaws } from '../hooks/useLaws'
import { useLawElements } from '../hooks/useLawElements'
import LawSelector from './LawSelector'
import LawHierarchySelector from './LawHierarchySelector'
import type { Law, LawElement } from '../types/database'

interface ContestLawSelectorProps {
  onSave: (contestLaw: {
    law: Law
    selectedElements: LawElement[]
    elementsToRemove?: string[]
  }) => void
  onCancel: () => void
  editingContestLaw?: {
    law: Law
    selectedElements: LawElement[]
  } | null
  isSaving?: boolean
}

export default function ContestLawSelector({ onSave, onCancel, editingContestLaw, isSaving = false }: ContestLawSelectorProps) {
  const [selectedLaw, setSelectedLaw] = useState<Law | null>(null)
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [copiedElements, setCopiedElements] = useState<LawElement[]>([])
  const [showCopiedStructure, setShowCopiedStructure] = useState(false)
  const [selectedCopiedElement, setSelectedCopiedElement] = useState<string | null>(null)
  const [elementsToRemove, setElementsToRemove] = useState<Set<string>>(new Set())

  const { laws, loading: lawsLoading } = useLaws()
  const { elements, loading: elementsLoading, buildHierarchy } = useLawElements(selectedLaw?.id)

  const hierarchy = buildHierarchy()

  // Inicializar com dados de edição se fornecidos
  useEffect(() => {
    if (editingContestLaw) {
      setSelectedLaw(editingContestLaw.law)
      setCopiedElements(editingContestLaw.selectedElements)
      setShowCopiedStructure(true)
      setSelectedElements(new Set())
    }
  }, [editingContestLaw])

  const handleLawSelect = (law: Law) => {
    setSelectedLaw(law)
    setSelectedElements(new Set())
    setCopiedElements([])
    setShowCopiedStructure(false)
    setSelectedCopiedElement(null)
    setElementsToRemove(new Set())
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

  // Função para encontrar todos os descendentes de um elemento recursivamente
  const findAllDescendants = (elementId: string, allElements: LawElement[]): string[] => {
    const descendants: string[] = []

    // Função recursiva para encontrar descendentes
    const findDescendantsRecursive = (parentId: string) => {
      allElements.forEach(element => {
        if (element.parent_id === parentId) {
          descendants.push(element.id)
          // Recursivamente encontrar descendentes deste elemento
          findDescendantsRecursive(element.id)
        }
      })
    }

    findDescendantsRecursive(elementId)
    return descendants
  }

  const handleRemoveCopiedElement = () => {
    if (selectedCopiedElement) {
      // Encontrar todos os descendentes do elemento selecionado
      const descendants = findAllDescendants(selectedCopiedElement, copiedElements)

      // Adicionar o elemento selecionado e todos os seus descendentes à lista de remoção
      const elementsToRemoveIds = [selectedCopiedElement, ...descendants]
      setElementsToRemove(prev => new Set([...prev, ...elementsToRemoveIds]))

      // Remover o elemento selecionado e todos os seus descendentes da lista de elementos copiados
      setCopiedElements(prev => prev.filter(el => !elementsToRemoveIds.includes(el.id)))

      // Limpar seleção
      setSelectedCopiedElement(null)
    }
  }

  const handleSave = () => {
    if (selectedLaw && (copiedElements.length > 0 || elementsToRemove.size > 0)) {
      onSave({
        law: selectedLaw,
        selectedElements: copiedElements,
        elementsToRemove: Array.from(elementsToRemove)
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
    <div className={`${selectedLaw ? 'h-screen' : 'min-h-screen'} bg-gray-50 flex flex-col ${selectedLaw ? 'overflow-hidden' : ''}`}>
      {/* Save Button Header */}
      {showCopiedStructure && (
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-end max-w-7xl mx-auto">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Lei no Concurso
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full p-6 ${selectedLaw ? 'overflow-hidden' : ''}`}>
        {!selectedLaw ? (
          // Seleção de Lei
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {lawsLoading ? (
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                  <p className="mt-4 text-base text-gray-600 font-medium">Carregando leis...</p>
                </div>
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
        ) : (
          // Seleção de Elementos da Lei
          <div className="flex gap-6 h-full relative">
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
              </div>
            </div>

            {/* Action Buttons - Center */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col space-y-2">
              <button
                onClick={handleCopy}
                disabled={selectedElements.size === 0}
                className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
              >
                <Copy className="h-4 w-4 mr-1" />
                Incluir ({selectedElements.size})
              </button>

              {showCopiedStructure && (
                <button
                  onClick={handleRemoveCopiedElement}
                  disabled={!selectedCopiedElement}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </button>
              )}
            </div>

            {/* Structure do Concurso - Right Side */}
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
                        <div
                          key={element.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedCopiedElement === element.id
                              ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-500 ring-opacity-50'
                              : 'bg-green-50 border-green-200 hover:bg-green-100'
                          }`}
                          onClick={() => setSelectedCopiedElement(element.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <BookOpen className={`h-4 w-4 ${
                              selectedCopiedElement === element.id ? 'text-blue-600' : 'text-green-600'
                            }`} />
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