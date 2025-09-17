import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, BookOpen, FileText, Hash, Check } from 'lucide-react'
import type { LawElement } from '../types/database'

interface LawHierarchySelectorProps {
  elements: (LawElement & { children?: LawElement[] })[]
  selectedElements: Set<string>
  onSelectionChange: (selectedElements: Set<string>) => void
}

interface LawElementSelectorNodeProps {
  element: LawElement & { children?: LawElement[] }
  level: number
  selectedElements: Set<string>
  onSelectionChange: (selectedElements: Set<string>) => void
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
    subsection: 'Nome do Artigo',
    article: 'Artigo',
    paragraph: 'Parágrafo',
    clause: 'Inciso',
    item: 'Alínea',
    subitem: 'Item'
  }
  return labels[type] || type
}

const getDisplayTitle = (element: LawElement) => {
  switch (element.element_type) {
    case 'book':
    case 'part':
    case 'title':
    case 'chapter':
    case 'section':
    case 'subsection':
      return element.content || element.title

    case 'article':
    case 'paragraph':
    case 'clause':
    case 'item':
    case 'subitem':
      return element.title

    default:
      return element.title || element.content
  }
}

const getDisplaySubtitle = (element: LawElement) => {
  const elementsWithSubtitle = ['article', 'paragraph', 'clause', 'item']

  if (elementsWithSubtitle.includes(element.element_type) && element.content) {
    let content = element.content
    return content.substring(0, 120) + (content.length > 120 ? '...' : '')
  }
  return null
}

// Elementos que devem ter checkboxes (até subsection/Nome do Artigo)
const SELECTABLE_ELEMENTS = ['title', 'chapter', 'subsection']

// Função para coletar todos os descendentes de um elemento
const getAllDescendants = (element: LawElement & { children?: LawElement[] }, allElements: (LawElement & { children?: LawElement[] })[] = []): string[] => {
  const descendants: string[] = []

  if (element.children) {
    element.children.forEach(child => {
      descendants.push(child.id)
      descendants.push(...getAllDescendants(child, allElements))
    })
  }

  return descendants
}

// Função para verificar se todos os filhos estão selecionados
const areAllChildrenSelected = (element: LawElement & { children?: LawElement[] }, selectedElements: Set<string>): boolean => {
  if (!element.children || element.children.length === 0) {
    return false
  }

  return element.children.every(child => {
    if (SELECTABLE_ELEMENTS.includes(child.element_type)) {
      return selectedElements.has(child.id)
    }
    return areAllChildrenSelected(child, selectedElements)
  })
}

// Função para verificar se alguns filhos estão selecionados (estado indeterminado)
const areSomeChildrenSelected = (element: LawElement & { children?: LawElement[] }, selectedElements: Set<string>): boolean => {
  if (!element.children || element.children.length === 0) {
    return false
  }

  return element.children.some(child => {
    if (SELECTABLE_ELEMENTS.includes(child.element_type)) {
      return selectedElements.has(child.id)
    }
    return areSomeChildrenSelected(child, selectedElements)
  })
}

function LawElementSelectorNode({ element, level, selectedElements, onSelectionChange }: LawElementSelectorNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const hasChildren = element.children && element.children.length > 0
  const isSelectable = SELECTABLE_ELEMENTS.includes(element.element_type)
  const isSelected = selectedElements.has(element.id)
  const allChildrenSelected = areAllChildrenSelected(element, selectedElements)
  const someChildrenSelected = areSomeChildrenSelected(element, selectedElements)
  const isIndeterminate = someChildrenSelected && !allChildrenSelected && !isSelected

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    if (!isSelectable) return

    const newSelectedElements = new Set(selectedElements)

    if (checked) {
      // Selecionar o elemento atual
      newSelectedElements.add(element.id)

      // Selecionar todos os descendentes selecionáveis
      const descendants = getAllDescendants(element)
      descendants.forEach(descendantId => {
        // Encontrar o elemento descendente para verificar se é selecionável
        const findElementById = (elements: (LawElement & { children?: LawElement[] })[], id: string): LawElement | null => {
          for (const el of elements) {
            if (el.id === id) return el
            if (el.children) {
              const found = findElementById(el.children, id)
              if (found) return found
            }
          }
          return null
        }

        // Para encontrar o elemento, precisaríamos de acesso a todos os elementos
        // Por enquanto, vamos assumir que queremos selecionar todos os descendentes diretos selecionáveis
        newSelectedElements.add(descendantId)
      })
    } else {
      // Desselecionar o elemento atual
      newSelectedElements.delete(element.id)

      // Desselecionar todos os descendentes
      const descendants = getAllDescendants(element)
      descendants.forEach(descendantId => {
        newSelectedElements.delete(descendantId)
      })
    }

    onSelectionChange(newSelectedElements)
  }

  const indentClass = `ml-${level * 4}`

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-md transition-colors ${indentClass}`}
      >
        {/* Toggle button */}
        <div
          className="flex items-center mr-2 cursor-pointer"
          onClick={handleToggle}
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

        {/* Checkbox (only for selectable elements) */}
        {isSelectable && (
          <div className="mr-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={isSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = isIndeterminate
                  }
                }}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              {isIndeterminate && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-0.5 bg-blue-600 rounded"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Icon */}
        <div className="flex items-center mr-3">
          {getElementIcon(element.element_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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
            <LawElementSelectorNode
              key={child.id}
              element={child}
              level={level + 1}
              selectedElements={selectedElements}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LawHierarchySelector({ elements, selectedElements, onSelectionChange }: LawHierarchySelectorProps) {
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
        <LawElementSelectorNode
          key={element.id}
          element={element}
          level={0}
          selectedElements={selectedElements}
          onSelectionChange={onSelectionChange}
        />
      ))}
    </div>
  )
}