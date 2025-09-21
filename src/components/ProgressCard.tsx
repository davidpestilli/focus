import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Circle, BookOpen, FileText, Target } from 'lucide-react'
import { useProgress, type ProgressType } from '../hooks/useProgress'
import { useLaws } from '../hooks/useLaws'
import { supabase } from '../lib/supabase'
import type { LawElement } from '../types/database'

interface LawElementWithChildren extends LawElement {
  children?: LawElementWithChildren[]
}

interface ProgressCardProps {
  lawId: string
}

export function ProgressCard({ lawId }: ProgressCardProps) {
  const [lawElements, setLawElements] = useState<LawElementWithChildren[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [lawName, setLawName] = useState('')

  const { laws } = useLaws()
  const {
    progress,
    loading: progressLoading,
    toggleProgress,
    isProgressCompleted,
    getElementProgress
  } = useProgress()

  // Carregar elementos da lei
  useEffect(() => {
    const loadLawElements = async () => {
      try {
        setLoading(true)

        // Encontrar nome da lei
        const law = laws.find(l => l.id === lawId)
        setLawName(law?.name || 'Lei não encontrada')

        // Buscar elementos da lei usando Supabase
        const { data: elements, error } = await supabase
          .from('law_elements')
          .select('*')
          .eq('law_id', lawId)
          .order('order_position', { ascending: true })

        if (error) throw error

        // Organizar em hierarquia
        const hierarchicalElements = buildHierarchy(elements)
        setLawElements(hierarchicalElements)

        // Expandir primeiro nível por padrão
        const firstLevelIds = hierarchicalElements.map(el => el.id)
        setExpandedItems(new Set(firstLevelIds))

      } catch (error) {
        console.error('Erro ao carregar elementos da lei:', error)
      } finally {
        setLoading(false)
      }
    }

    if (lawId && laws.length > 0) {
      loadLawElements()
    }
  }, [lawId, laws])

  // Construir hierarquia de elementos
  const buildHierarchy = (elements: LawElement[]): LawElementWithChildren[] => {
    const elementMap = new Map<string, LawElementWithChildren>()
    const rootElements: LawElementWithChildren[] = []

    // Primeiro, criar mapa de todos os elementos
    elements.forEach(element => {
      elementMap.set(element.id, { ...element, children: [] })
    })

    // Depois, organizar hierarquia
    elements.forEach(element => {
      const elementWithChildren = elementMap.get(element.id)!

      if (element.parent_id && elementMap.has(element.parent_id)) {
        const parent = elementMap.get(element.parent_id)!
        parent.children = parent.children || []
        parent.children.push(elementWithChildren)
      } else {
        rootElements.push(elementWithChildren)
      }
    })

    // Ordenar por order_position
    const sortByOrder = (a: LawElementWithChildren, b: LawElementWithChildren) => (a.order_position || 0) - (b.order_position || 0)
    rootElements.sort(sortByOrder)
    rootElements.forEach(element => {
      if (element.children) {
        element.children.sort(sortByOrder)
      }
    })

    return rootElements
  }

  // Toggle expansão de item
  const toggleExpanded = (elementId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(elementId)) {
      newExpanded.delete(elementId)
    } else {
      newExpanded.add(elementId)
    }
    setExpandedItems(newExpanded)
  }

  // Obter ícone do tipo de progresso
  const getProgressIcon = (progressType: ProgressType, isCompleted: boolean) => {
    const iconProps = {
      className: `h-4 w-4 transition-colors ${isCompleted ? 'text-green-600' : 'text-gray-400'}`,
    }

    switch (progressType) {
      case 'resumo':
        return isCompleted ?
          <CheckCircle {...iconProps} /> :
          <Circle {...iconProps} />
      case 'questoes':
        return isCompleted ?
          <CheckCircle {...iconProps} /> :
          <Circle {...iconProps} />
      case 'complete':
        return isCompleted ?
          <CheckCircle {...iconProps} /> :
          <Circle {...iconProps} />
      default:
        return <Circle {...iconProps} />
    }
  }

  // Obter label do tipo de progresso
  const getProgressLabel = (progressType: ProgressType) => {
    switch (progressType) {
      case 'resumo':
        return 'Resumo'
      case 'questoes':
        return 'Questões'
      case 'complete':
        return 'Complete'
      default:
        return progressType
    }
  }

  // Renderizar elemento e seus filhos
  const renderElement = (element: LawElementWithChildren, depth: number = 0) => {
    const hasChildren = element.children && element.children.length > 0
    const isExpanded = expandedItems.has(element.id)
    const paddingLeft = depth * 20

    const progressTypes: ProgressType[] = ['resumo', 'questoes', 'complete']

    return (
      <div key={element.id} className="border-b border-gray-100 last:border-b-0">
        {/* Cabeçalho do elemento */}
        <div
          className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          style={{ paddingLeft: `${paddingLeft + 12}px` }}
        >
          <div className="flex items-center flex-1 min-w-0">
            {/* Botão de expansão */}
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(element.id)}
                className="mr-2 p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}

            {/* Ícone do tipo */}
            <div className="mr-2">
              {element.element_type === 'article' ? (
                <FileText className="h-4 w-4 text-blue-500" />
              ) : (
                <BookOpen className="h-4 w-4 text-gray-500" />
              )}
            </div>

            {/* Título */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {element.element_type === 'article' && element.element_number && (
                  <span className="text-blue-600 mr-2">
                    Art. {element.element_number}
                  </span>
                )}
                {element.title}
              </h3>
            </div>
          </div>

          {/* Botões de progresso - sempre visíveis para artigos */}
          {element.element_type === 'article' && (
            <div className="flex items-center space-x-3 ml-4">
              {progressTypes.map(progressType => {
                const isCompleted = isProgressCompleted(element.id, progressType)
                return (
                  <button
                    key={progressType}
                    onClick={() => toggleProgress(element.id, progressType)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105 ${
                      isCompleted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={progressLoading}
                  >
                    {getProgressIcon(progressType, isCompleted)}
                    <span>{getProgressLabel(progressType)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Filhos (se expandido) */}
        {hasChildren && isExpanded && element.children && (
          <div>
            {element.children.map(child => renderElement(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Calcular estatísticas de progresso
  const calculateStats = () => {
    let totalArticles = 0
    let completedResumo = 0
    let completedQuestoes = 0
    let completedComplete = 0
    let totalCompleted = 0

    const countElements = (elements: LawElementWithChildren[]) => {
      elements.forEach(element => {
        if (element.element_type === 'article') {
          totalArticles++
          const elementProgress = getElementProgress(element.id)

          if (elementProgress.has('resumo')) completedResumo++
          if (elementProgress.has('questoes')) completedQuestoes++
          if (elementProgress.has('complete')) completedComplete++
          if (elementProgress.size > 0) totalCompleted++
        }

        if (element.children) {
          countElements(element.children)
        }
      })
    }

    countElements(lawElements)

    return {
      totalArticles,
      completedResumo,
      completedQuestoes,
      completedComplete,
      totalCompleted
    }
  }

  const stats = calculateStats()

  if (loading || progressLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Cabeçalho com estatísticas */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{lawName}</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.totalCompleted}</div>
            <div className="text-sm text-blue-600">de {stats.totalArticles} artigos</div>
            <div className="text-xs text-gray-500">Com progresso</div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completedResumo}</div>
            <div className="text-sm text-green-600">Resumos</div>
            <div className="text-xs text-gray-500">Concluídos</div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.completedQuestoes}</div>
            <div className="text-sm text-purple-600">Questões</div>
            <div className="text-xs text-gray-500">Concluídas</div>
          </div>

          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.completedComplete}</div>
            <div className="text-sm text-orange-600">Complete</div>
            <div className="text-xs text-gray-500">Finalizados</div>
          </div>
        </div>
      </div>

      {/* Lista de elementos */}
      <div className="max-h-96 overflow-y-auto">
        {lawElements.length > 0 ? (
          lawElements.map(element => renderElement(element))
        ) : (
          <div className="p-6 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum elemento encontrado para esta lei</p>
          </div>
        )}
      </div>
    </div>
  )
}