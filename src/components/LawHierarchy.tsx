import React, { useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen, FileText, Hash } from 'lucide-react'
import type { LawElement } from '../types/database'

interface LawHierarchyProps {
  elements: (LawElement & { children?: LawElement[] })[]
  onElementSelect?: (element: LawElement) => void
  selectedElement?: LawElement | null
}

interface LawElementNodeProps {
  element: LawElement & { children?: LawElement[] }
  level: number
  onSelect?: (element: LawElement) => void
  isSelected?: boolean
}

const getElementIcon = (type: LawElement['element_type']) => {
  switch (type) {
    case 'book':
      return <BookOpen className="h-4 w-4 text-indigo-700" />
    case 'part':
      return <BookOpen className="h-4 w-4 text-indigo-600" />
    case 'title':
      return <BookOpen className="h-4 w-4 text-blue-600" />
    case 'chapter':
      return <FileText className="h-4 w-4 text-green-600" />
    case 'section':
      return <Hash className="h-4 w-4 text-purple-600" />
    case 'subsection':
      return <Hash className="h-4 w-4 text-purple-500" />
    case 'article':
      return <Hash className="h-4 w-4 text-red-600" />
    case 'paragraph':
      return <Hash className="h-4 w-4 text-orange-600" />
    case 'clause':
      return <Hash className="h-4 w-4 text-yellow-600" />
    case 'item':
      return <Hash className="h-4 w-4 text-pink-600" />
    case 'subitem':
      return <Hash className="h-4 w-4 text-gray-500" />
    default:
      return <Hash className="h-4 w-4 text-gray-600" />
  }
}

const getElementTypeLabel = (type: LawElement['element_type']) => {
  const labels = {
    book: 'Livro',
    part: 'Parte',
    title: 'Título',
    chapter: 'Capítulo',
    section: 'Seção',
    subsection: 'Subseção',
    article: 'Artigo',
    paragraph: 'Parágrafo',
    clause: 'Inciso',
    item: 'Alínea',
    subitem: 'Item'
  }
  return labels[type] || type
}

const getDisplayTitle = (element: LawElement) => {
  // Estratégia simplificada: usar title para elementos numerados, content para descritivos

  switch (element.element_type) {
    case 'book':
    case 'part':
    case 'title':
    case 'chapter':
    case 'section':
    case 'subsection':
      // Para elementos descritivos, mostrar o conteúdo que é mais descritivo
      return element.content || element.title

    case 'article':
    case 'paragraph':
    case 'clause':
    case 'item':
    case 'subitem':
      // Para elementos numerados, mostrar o título (ex: "Art. 293", "§ 1º", "I", "a)")
      return element.title

    default:
      return element.title || element.content
  }
}

const getDisplaySubtitle = (element: LawElement) => {
  // Show a preview of content for elements that have substantial content
  const elementsWithSubtitle = ['article', 'paragraph', 'clause', 'item']

  if (elementsWithSubtitle.includes(element.element_type) && element.content) {
    let content = element.content

    // Para elementos numerados, o content já está limpo (sem prefixos)
    // Mostrar os primeiros 120 caracteres como preview
    return content.substring(0, 120) + (content.length > 120 ? '...' : '')
  }
  return null
}

function LawElementNode({ element, level, onSelect, isSelected }: LawElementNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2) // Auto-expand first 2 levels
  const hasChildren = element.children && element.children.length > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleSelect = () => {
    onSelect?.(element)
  }

  const indentClass = `ml-${level * 4}`

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer rounded-md transition-colors ${
          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
        } ${indentClass}`}
        onClick={handleSelect}
      >
        <div
          className="flex items-center mr-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <div className="flex items-center mr-3">
          {getElementIcon(element.element_type)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Only show type/number label for descriptive elements (not numbered ones) */}
          {!['article', 'paragraph', 'clause', 'item', 'subitem', 'subsection'].includes(element.element_type) && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {getElementTypeLabel(element.element_type)} {element.element_number}
              </span>
            </div>
          )}
          <div className="text-sm font-medium text-gray-900">
            {getDisplayTitle(element)}
          </div>
          {getDisplaySubtitle(element) && (
            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
              {getDisplaySubtitle(element)}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 border-l border-gray-200">
          {element.children!.map((child) => (
            <LawElementNode
              key={child.id}
              element={child}
              level={level + 1}
              onSelect={onSelect}
              isSelected={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LawHierarchy({ elements, onElementSelect, selectedElement }: LawHierarchyProps) {
  if (!elements || elements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Nenhum elemento encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {elements.map((element) => (
        <LawElementNode
          key={element.id}
          element={element}
          level={0}
          onSelect={onElementSelect}
          isSelected={selectedElement?.id === element.id}
        />
      ))}
    </div>
  )
}