import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { LawElement, Law } from '../types/database'

interface ContestLawElement {
  id: string
  contest_id: string
  law_element_id: string
  added_by: string | null
  added_at: string
  is_active: boolean
  notes: string | null
  // Dados expandidos da lei e elemento
  law_element?: LawElement & {
    law?: Law
  }
}

export function useContestLaws(contestId?: string) {
  const [contestLaws, setContestLaws] = useState<ContestLawElement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContestLaws = async () => {
    if (!contestId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contest_law_elements')
        .select(`
          *,
          law_element:law_elements (
            id,
            law_id,
            element_type,
            element_number,
            title,
            content,
            parent_id,
            path,
            order_position,
            created_at,
            law:laws (
              id,
              name,
              full_text,
              created_at,
              updated_at
            )
          )
        `)
        .eq('contest_id', contestId)
        .eq('is_active', true)
        .order('added_at', { ascending: false })

      if (error) throw error
      setContestLaws(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContestLaws()
  }, [contestId])

  const addLawElementsToContest = async (
    contestId: string,
    lawElementIds: string[],
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Inserir dados sem added_by por enquanto (evitar foreign key constraint)
      const insertData = lawElementIds.map(elementId => ({
        contest_id: contestId,
        law_element_id: elementId,
        added_by: null, // Temporary fix - set to null to avoid FK constraint
        notes: notes || null,
        is_active: true
      }))

      const { data, error } = await supabase
        .from('contest_law_elements')
        .insert(insertData)
        .select()

      if (error) throw error
      await fetchContestLaws() // Refresh list
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const removeLawElementFromContest = async (contestLawElementId: string) => {
    try {
      const { error } = await supabase
        .from('contest_law_elements')
        .update({ is_active: false })
        .eq('id', contestLawElementId)

      if (error) throw error
      await fetchContestLaws() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateContestLawElement = async (
    contestLawElementId: string,
    updates: { notes?: string; is_active?: boolean }
  ) => {
    try {
      const { error } = await supabase
        .from('contest_law_elements')
        .update(updates)
        .eq('id', contestLawElementId)

      if (error) throw error
      await fetchContestLaws() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // Agrupa elementos por lei no formato esperado pelo componente
  const getContestLawsByLaw = (): Array<{law: Law, selectedElements: LawElement[]}> => {
    const lawsMap = new Map<string, {law: Law, selectedElements: LawElement[]}>()

    contestLaws.forEach(contestLaw => {
      if (!contestLaw.law_element?.law) return

      const lawId = contestLaw.law_element.law_id
      if (!lawsMap.has(lawId)) {
        lawsMap.set(lawId, {
          law: contestLaw.law_element.law,
          selectedElements: []
        })
      }

      lawsMap.get(lawId)!.selectedElements.push(contestLaw.law_element)
    })

    return Array.from(lawsMap.values())
  }

  return {
    contestLaws,
    loading,
    error,
    refetch: fetchContestLaws,
    addLawElementsToContest,
    removeLawElementFromContest,
    updateContestLawElement,
    getContestLawsByLaw
  }
}