import React, { useState, useEffect } from 'react'
import { ArrowLeft, Trophy, Plus, Calendar, Users, BookOpen, Settings, MessageSquare, Bot, Edit, Trash2, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { useContests } from '../hooks/useContests'
import { useLawElements } from '../hooks/useLawElements'
import { useContestLaws } from '../hooks/useContestLaws'
import { useLaws } from '../hooks/useLaws'
import ContestLawSelector from '../components/ContestLawSelector'
import LawHierarchy from '../components/LawHierarchy'
import { AITools } from '../components/AITools'
import { ProgressCard } from '../components/ProgressCard'
import type { Contest, Law, LawElement } from '../types/database'

type ViewMode = 'list' | 'form' | 'contest-detail' | 'add-law' | 'study-law'

export default function ContestsPage() {
  const navigate = useNavigate()
  const { setSelectedContest } = useApp()
  const { contests, loading, createContest, updateContest, deleteContest } = useContests()
  const { laws } = useLaws()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedContest, setSelectedContestLocal] = useState<Contest | null>(null)
  const [editingContest, setEditingContest] = useState<Contest | null>(null)
  const [editingContestLaw, setEditingContestLaw] = useState<{law: Law, selectedElements: LawElement[]} | null>(null)
  const [isSavingContestLaw, setIsSavingContestLaw] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true
  })
  const { contestLaws: contestLawsFromDB, loading: contestLawsLoading, addLawElementsToContest, getContestLawsByLaw, removeLawElementFromContest } = useContestLaws(selectedContest?.id)
  const [contestLaws, setContestLaws] = useState<Array<{law: Law, selectedElements: LawElement[]}>>([])  // Local state for display
  const [studyingLaw, setStudyingLaw] = useState<{law: Law, selectedElements: LawElement[]} | null>(null)
  const [selectedLawElement, setSelectedLawElement] = useState<LawElement | null>(null)
  const [selectedLawForProgress, setSelectedLawForProgress] = useState<string | null>(null)

  const { elements: studyLawElements, loading: studyElementsLoading, buildHierarchy: buildStudyHierarchy } = useLawElements(studyingLaw?.law.id)

  // Carregar leis do concurso quando o concurso for selecionado
  useEffect(() => {
    if (selectedContest && !contestLawsLoading) {
      // Reconstruir formato esperado a partir dos dados do banco
      const lawsFromDB = getContestLawsByLaw()
      setContestLaws(lawsFromDB)
    }
  }, [contestLawsFromDB, selectedContest, contestLawsLoading])

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingContest) {
        await updateContest(editingContest.id, formData)
        setEditingContest(null)
      } else {
        await createContest(formData)
      }
      setViewMode('list')
      setFormData({ name: '', description: '', active: true })
    } catch (error) {
      console.error('Erro ao salvar concurso:', error)
    }
  }

  const handleEditContest = (contest: Contest) => {
    setEditingContest(contest)
    setFormData({
      name: contest.name,
      description: contest.description || '',
      active: contest.active
    })
    setViewMode('form')
  }

  const handleDeleteContest = async (contestId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este concurso? Esta ação não pode ser desfeita.')) {
      try {
        await deleteContest(contestId)
      } catch (error) {
        console.error('Erro ao excluir concurso:', error)
        alert('Erro ao excluir concurso. Tente novamente.')
      }
    }
  }

  const handleContestSelect = (contest: Contest) => {
    setSelectedContestLocal(contest)
    setSelectedContest(contest)
    setViewMode('contest-detail')
    // Limpar estado local - será recarregado pelo useEffect
    setContestLaws([])
    setStudyingLaw(null)
    setSelectedLawElement(null)
  }

  const handleAddLawToContest = () => {
    setViewMode('add-law')
  }

  const handleSaveContestLaw = async (contestLaw: {law: Law, selectedElements: LawElement[], elementsToRemove?: string[]}) => {
    if (!selectedContest) return

    setIsSavingContestLaw(true)
    try {
      // Remover elementos se há elementos para remover
      if (contestLaw.elementsToRemove && contestLaw.elementsToRemove.length > 0) {
        // Encontrar os IDs dos contest_law_elements a serem removidos
        const elementsToRemoveFromDB = contestLawsFromDB.filter(
          contestLawEl => contestLaw.elementsToRemove!.includes(contestLawEl.law_element?.id || '')
        )

        // Remover cada elemento do banco
        for (const element of elementsToRemoveFromDB) {
          await removeLawElementFromContest(element.id)
        }
      }

      // Extrair IDs dos elementos selecionados
      const elementIds = contestLaw.selectedElements.map(element => element.id)

      // Se há novos elementos, adicionar ao banco
      if (elementIds.length > 0) {
        await addLawElementsToContest(selectedContest.id, elementIds)
      }

      // Atualizar estado local
      if (editingContestLaw) {
        // Se não há mais elementos, remover a lei completamente da lista
        if (contestLaw.selectedElements.length === 0) {
          setContestLaws(prev => prev.filter(existingLaw => existingLaw.law.id !== contestLaw.law.id))
        } else {
          // Atualizar lei existente
          setContestLaws(prev => prev.map(existingLaw =>
            existingLaw.law.id === contestLaw.law.id ? contestLaw : existingLaw
          ))
        }
        setEditingContestLaw(null)
      } else {
        // Adicionar nova lei (somente se há elementos)
        if (contestLaw.selectedElements.length > 0) {
          setContestLaws(prev => [...prev, contestLaw])
        }
      }

      setViewMode('contest-detail')
    } catch (error) {
      console.error('Erro ao salvar lei no concurso:', error)
      alert('Erro ao salvar lei no concurso. Tente novamente.')
    } finally {
      setIsSavingContestLaw(false)
    }
  }

  const handleEditContestLaw = (contestLaw: {law: Law, selectedElements: LawElement[]}) => {
    setEditingContestLaw(contestLaw)
    setViewMode('add-law')
  }

  const handleCancelAddLaw = () => {
    setViewMode('contest-detail')
    setEditingContestLaw(null)
    setIsSavingContestLaw(false)
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedContestLocal(null)
    setContestLaws([])
    setStudyingLaw(null)
    setSelectedLawElement(null)
  }

  const handleStudyLaw = (contestLaw: {law: Law, selectedElements: LawElement[]}) => {
    setStudyingLaw(contestLaw)
    setSelectedLawElement(null)
    setViewMode('study-law')
  }

  const handleBackToContest = () => {
    setViewMode('contest-detail')
    setStudyingLaw(null)
    setSelectedLawElement(null)
  }

  const handleRemoveLawFromContest = async (lawId: string) => {
    if (!selectedContest) return

    if (window.confirm('Tem certeza que deseja remover esta lei do concurso? Esta ação não pode ser desfeita.')) {
      try {
        // Encontrar todos os elementos da lei no concurso
        const elementsToRemove = contestLawsFromDB.filter(
          contestLaw => contestLaw.law_element?.law_id === lawId
        )

        // Remover todos os elementos da lei
        for (const element of elementsToRemove) {
          await removeLawElementFromContest(element.id)
        }

        // Atualizar estado local
        setContestLaws(prev => prev.filter(contestLaw => contestLaw.law.id !== lawId))
      } catch (error) {
        console.error('Erro ao remover lei do concurso:', error)
        alert('Erro ao remover lei do concurso. Tente novamente.')
      }
    }
  }

  const handleElementSelect = (element: LawElement) => {
    setSelectedLawElement(element)
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
    if (!element || !studyingLaw) return ''

    const selectedIds = new Set(studyingLaw.selectedElements.map(el => el.id))
    let content = ''

    // Para o elemento principal, mostrar apenas o content (title já é exibido no cabeçalho)
    // Para subsection, não mostrar nada aqui pois title === content e title já aparece no header
    if (element.content && element.element_type !== 'subsection') {
      content += `${element.content}\n`
    }

    // Encontrar todos os descendentes em ordem hierárquica
    const descendants = findAllDescendants(element.id, studyLawElements)

    // Filtrar apenas descendentes que foram selecionados ou são filhos diretos de elementos selecionados
    const relevantDescendants = descendants.filter(desc => {
      // Se o descendente foi selecionado, incluir
      if (selectedIds.has(desc.id)) return true

      // Se o elemento atual foi selecionado, incluir todos os seus descendentes
      if (selectedIds.has(element.id)) return true

      // Caso contrário, não incluir
      return false
    })

    // Adicionar conteúdo de cada descendente relevante mantendo a estrutura hierárquica
    relevantDescendants.forEach((desc, index) => {
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

  // Filtrar apenas os elementos selecionados para o concurso
  const getFilteredHierarchy = () => {
    if (!studyingLaw || !studyLawElements) return []

    const selectedIds = new Set(studyingLaw.selectedElements.map(el => el.id))

    // Função para verificar se um elemento deve ser incluído
    const shouldIncludeElement = (element: LawElement): boolean => {
      // Se o elemento foi diretamente selecionado, incluir
      if (selectedIds.has(element.id)) return true

      // Se o elemento é ancestral de algum elemento selecionado, incluir apenas como contexto
      const descendants = findAllDescendants(element.id, studyLawElements)
      return descendants.some(desc => selectedIds.has(desc.id))
    }

    // Construir hierarquia filtrada recursivamente
    const buildFilteredHierarchy = (elements: (LawElement & { children?: LawElement[] })[]): (LawElement & { children?: LawElement[] })[] => {
      return elements
        .filter(shouldIncludeElement)
        .map(element => {
          const filteredChildren = element.children ? buildFilteredHierarchy(element.children) : []

          return {
            ...element,
            children: filteredChildren.length > 0 ? filteredChildren : undefined
          }
        })
    }

    return buildFilteredHierarchy(buildStudyHierarchy())
  }

  return (
    <div className={`${viewMode === 'add-law' || viewMode === 'study-law' ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gray-50 ${viewMode === 'study-law' ? 'flex flex-col' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            {viewMode === 'contest-detail' ? (
              <button
                onClick={handleBackToList}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar aos Concursos</span>
              </button>
            ) : viewMode === 'study-law' ? (
              <button
                onClick={handleBackToContest}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar ao Concurso</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="font-medium">Voltar ao Dashboard</span>
              </button>
            )}
            <div className="border-l border-gray-300 pl-6">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {viewMode === 'contest-detail'
                  ? selectedContest?.name
                  : viewMode === 'study-law'
                  ? studyingLaw?.law.name
                  : viewMode === 'add-law'
                  ? 'Adicionar Lei ao Concurso'
                  : 'Concursos'
                }
              </h1>
              <p className="text-base text-gray-600 mt-2 font-medium">
                {viewMode === 'contest-detail'
                  ? 'Configure as leis e elementos do concurso'
                  : viewMode === 'study-law'
                  ? 'Explore a estrutura e conteúdo da lei selecionada'
                  : viewMode === 'add-law'
                  ? 'Selecione uma lei e os elementos que deseja incluir no concurso'
                  : 'Gerencie seus concursos públicos'
                }
              </p>
            </div>
            {viewMode === 'add-law' && (
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
            )}
          </div>
          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('form')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Concurso
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'add-law' ? (
        <ContestLawSelector
          onSave={handleSaveContestLaw}
          onCancel={handleCancelAddLaw}
          editingContestLaw={editingContestLaw}
          isSaving={isSavingContestLaw}
        />
      ) : viewMode === 'study-law' && studyingLaw ? (
        /* Study Law View - 3 Containers */
        <main className="flex-1 w-full p-6 overflow-hidden">
          <div className="flex gap-6 h-full">
            {/* Law Hierarchy - Left Side - 38% */}
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
                        Elementos selecionados para o concurso
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {studyElementsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Carregando estrutura...</p>
                    </div>
                  ) : (
                    <LawHierarchy
                      elements={getFilteredHierarchy()}
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
        </main>
      ) : (
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {viewMode === 'form' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {editingContest ? 'Editar Concurso' : 'Criar Novo Concurso'}
              </h2>

              <form onSubmit={handleCreateContest} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome do Concurso
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Ex: TJSP 2025"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Descrição do concurso..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                    Concurso ativo
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list')
                      setEditingContest(null)
                      setFormData({ name: '', description: '', active: true })
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {editingContest ? 'Salvar Alterações' : 'Criar Concurso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : viewMode === 'contest-detail' && selectedContest ? (
          /* Contest Detail View */
          <div className="space-y-6">
            {/* Contest Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedContest.name}</h2>
                  {selectedContest.description && (
                    <p className="text-gray-600 mt-1">{selectedContest.description}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedContest.active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedContest.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {/* Laws Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-gray-700" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Leis do Concurso</h3>
                      <p className="text-sm text-gray-600">
                        {contestLaws.length} lei(s) adicionada(s)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddLawToContest}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Lei
                  </button>
                </div>
              </div>

              <div className="p-6">
                {contestLaws.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma lei adicionada ainda
                    </h4>
                    <p className="text-gray-600 mb-4">
                      Adicione leis ao concurso para que os participantes possam estudar.
                    </p>
                    <button
                      onClick={handleAddLawToContest}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeira Lei
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contestLaws.map((contestLaw, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            <h4 className="font-medium text-gray-900">{contestLaw.law.name}</h4>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditContestLaw(contestLaw)
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveLawFromContest(contestLaw.law.id)
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>{contestLaw.selectedElements.length} elementos selecionados</p>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Adicionada em {new Date().toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => setSelectedLawForProgress(contestLaw.law.id)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Progresso
                            </button>
                            <button
                              onClick={() => handleStudyLaw(contestLaw)}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Estudar →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Carregando concursos...</p>
              </div>
            ) : contests.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum concurso encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece criando seu primeiro concurso público.
                </p>
                <button
                  onClick={() => setViewMode('form')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Concurso
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contests.map((contest) => (
                  <div
                    key={contest.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Trophy className="h-8 w-8 text-indigo-600" />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditContest(contest)
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteContest(contest.id)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            contest.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {contest.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="cursor-pointer"
                        onClick={() => handleContestSelect(contest)}
                      >
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {contest.name}
                        </h3>

                        {contest.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {contest.description}
                          </p>
                        )}

                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Criado em {new Date(contest.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-3 rounded-b-lg">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <Users className="h-4 w-4 mr-1" />
                          0 participantes
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContestSelect(contest)
                          }}
                          className="text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Acessar →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      )}

      {/* Modal de Progresso */}
      {selectedLawForProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Progresso da Lei</h2>
              <button
                onClick={() => setSelectedLawForProgress(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
              <ProgressCard lawId={selectedLawForProgress} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}