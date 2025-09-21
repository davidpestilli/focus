import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type ProgressType = 'resumo' | 'questoes' | 'complete'

export interface UserProgress {
  id: string
  user_id: string
  law_element_id: string
  progress_type: ProgressType
  is_completed: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ProgressSummary {
  law_id: string
  law_name: string
  total_elements: number
  completed_resumo: number
  completed_questoes: number
  completed_complete: number
  total_completed: number // quantos elementos têm pelo menos um tipo de progresso
}

export function useProgress() {
  const [progress, setProgress] = useState<Map<string, Set<ProgressType>>>(new Map())
  const [loading, setLoading] = useState(true)

  // Carregar progresso do usuário
  const loadProgress = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .is('deleted_at', null)

      if (error) throw error

      // Organizar dados em Map para acesso rápido
      const progressMap = new Map<string, Set<ProgressType>>()

      data?.forEach((item: UserProgress) => {
        if (!progressMap.has(item.law_element_id)) {
          progressMap.set(item.law_element_id, new Set())
        }
        progressMap.get(item.law_element_id)!.add(item.progress_type)
      })

      setProgress(progressMap)
    } catch (error) {
      console.error('Erro ao carregar progresso:', error)
    } finally {
      setLoading(false)
    }
  }

  // Alternar estado do progresso (toggle)
  const toggleProgress = async (lawElementId: string, progressType: ProgressType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const currentProgress = progress.get(lawElementId) || new Set()
      const isCurrentlyCompleted = currentProgress.has(progressType)

      if (isCurrentlyCompleted) {
        // Desmarcar - soft delete
        const { error } = await supabase
          .from('user_progress')
          .update({
            is_completed: false,
            deleted_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('law_element_id', lawElementId)
          .eq('progress_type', progressType)

        if (error) throw error

        // Atualizar estado local
        const newProgress = new Map(progress)
        const elementProgress = new Set(currentProgress)
        elementProgress.delete(progressType)

        if (elementProgress.size === 0) {
          newProgress.delete(lawElementId)
        } else {
          newProgress.set(lawElementId, elementProgress)
        }

        setProgress(newProgress)
      } else {
        // Marcar - inserir ou reativar
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            law_element_id: lawElementId,
            progress_type: progressType,
            is_completed: true,
            deleted_at: null
          }, {
            onConflict: 'user_id,law_element_id,progress_type'
          })

        if (error) throw error

        // Atualizar estado local
        const newProgress = new Map(progress)
        const elementProgress = new Set(currentProgress)
        elementProgress.add(progressType)
        newProgress.set(lawElementId, elementProgress)

        setProgress(newProgress)
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
      return false
    }
  }

  // Verificar se um progresso específico está marcado
  const isProgressCompleted = (lawElementId: string, progressType: ProgressType): boolean => {
    return progress.get(lawElementId)?.has(progressType) || false
  }

  // Obter todos os tipos de progresso para um elemento
  const getElementProgress = (lawElementId: string): Set<ProgressType> => {
    return progress.get(lawElementId) || new Set()
  }

  // Calcular resumo de progresso por lei
  const getProgressSummary = async (): Promise<ProgressSummary[]> => {
    try {
      // Buscar todas as leis e seus elementos
      const { data: laws, error: lawsError } = await supabase
        .from('laws')
        .select(`
          id,
          name,
          law_elements (
            id
          )
        `)

      if (lawsError) throw lawsError

      const summaries: ProgressSummary[] = laws?.map(law => {
        const totalElements = law.law_elements?.length || 0
        let completedResumo = 0
        let completedQuestoes = 0
        let completedComplete = 0
        const completedElements = new Set<string>()

        law.law_elements?.forEach((element: any) => {
          const elementProgress = progress.get(element.id) || new Set()

          if (elementProgress.has('resumo')) {
            completedResumo++
            completedElements.add(element.id)
          }
          if (elementProgress.has('questoes')) {
            completedQuestoes++
            completedElements.add(element.id)
          }
          if (elementProgress.has('complete')) {
            completedComplete++
            completedElements.add(element.id)
          }
        })

        return {
          law_id: law.id,
          law_name: law.name,
          total_elements: totalElements,
          completed_resumo: completedResumo,
          completed_questoes: completedQuestoes,
          completed_complete: completedComplete,
          total_completed: completedElements.size
        }
      }) || []

      return summaries
    } catch (error) {
      console.error('Erro ao calcular resumo de progresso:', error)
      return []
    }
  }

  // Carregar dados na inicialização
  useEffect(() => {
    loadProgress()
  }, [])

  return {
    progress,
    loading,
    loadProgress,
    toggleProgress,
    isProgressCompleted,
    getElementProgress,
    getProgressSummary
  }
}