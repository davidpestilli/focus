import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { LawElement } from '../types/database'

export function useLawElements(lawId?: string) {
  const [elements, setElements] = useState<LawElement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchElements = async (targetLawId?: string) => {
    try {
      setLoading(true)
      let query = supabase
        .from('law_elements')
        .select('*')
        .order('path', { ascending: true })
        .order('order_position', { ascending: true })

      if (targetLawId || lawId) {
        query = query.eq('law_id', targetLawId || lawId)
      }

      const { data, error } = await query

      if (error) throw error
      setElements(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (lawId) {
      fetchElements()
    }
  }, [lawId])

  const getElementsByType = (type: LawElement['element_type']) => {
    return elements.filter(el => el.element_type === type)
  }

  const getChildElements = (parentId: string) => {
    return elements.filter(el => el.parent_id === parentId)
  }

  const getRootElements = () => {
    return elements.filter(el => !el.parent_id)
  }

  const buildHierarchy = (): LawElement[] => {
    const elementMap = new Map<string, LawElement & { children: LawElement[] }>()

    // First pass: create map with children array
    elements.forEach(element => {
      elementMap.set(element.id, { ...element, children: [] })
    })

    const rootElements: (LawElement & { children: LawElement[] })[] = []

    // Second pass: build hierarchy
    elements.forEach(element => {
      const elementWithChildren = elementMap.get(element.id)!

      if (element.parent_id) {
        const parent = elementMap.get(element.parent_id)
        if (parent) {
          parent.children.push(elementWithChildren)
        }
      } else {
        rootElements.push(elementWithChildren)
      }
    })

    // Third pass: sort children by order_position
    const sortChildren = (element: LawElement & { children: LawElement[] }) => {
      element.children.sort((a, b) => (a.order_position || 0) - (b.order_position || 0))
      element.children.forEach(sortChildren)
    }

    rootElements.forEach(sortChildren)
    rootElements.sort((a, b) => (a.order_position || 0) - (b.order_position || 0))

    return rootElements
  }

  return {
    elements,
    loading,
    error,
    refetch: fetchElements,
    getElementsByType,
    getChildElements,
    getRootElements,
    buildHierarchy
  }
}