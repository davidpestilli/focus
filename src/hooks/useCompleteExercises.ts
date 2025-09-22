import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface CompleteExercise {
  id: string
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string
  type: 'T1' | 'T2' | 'T3' | 'T4' | 'T5'
  exercise_text: string
  options?: {
    a: string
    b: string
    c: string
    d: string
    e?: string
  }
  correct_answer: string
  explanation: {
    general: string
    alternatives?: {
      a: string
      b: string
      c: string
      d: string
      e?: string
    }
  }
  tags: string[]
  topic: string
  created_by: string
  created_at: string
}

export interface CompleteExerciseToSave {
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string
  type: 'T1' | 'T2' | 'T3' | 'T4' | 'T5'
  exercise_text: string
  options?: {
    a: string
    b: string
    c: string
    d: string
    e?: string
  }
  correct_answer: string
  explanation: {
    general: string
    alternatives?: {
      a: string
      b: string
      c: string
      d: string
      e?: string
    }
  }
  tags: string[]
  topic: string
}

export const useCompleteExercises = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Função para salvar exercício
  const saveCompleteExercise = async (exerciseData: CompleteExerciseToSave): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('complete_exercises')
        .insert({
          ...exerciseData,
          created_by: user.id
        })
        .select()

      if (error) {
        console.error('Erro ao salvar exercício complete:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao salvar exercício complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar exercícios agrupados por lei
  const getCompleteExercisesByLaws = async (): Promise<Record<string, CompleteExercise[]>> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('complete_exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar exercícios complete:', error)
        setError(error.message)
        return {}
      }

      // Agrupar exercícios por law_id
      const grouped = (data || []).reduce((acc, exercise) => {
        if (!acc[exercise.law_id]) {
          acc[exercise.law_id] = []
        }
        acc[exercise.law_id].push(exercise)
        return acc
      }, {} as Record<string, CompleteExercise[]>)

      return grouped
    } catch (error) {
      console.error('Erro ao processar exercícios complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return {}
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar todos os exercícios
  const getAllCompleteExercises = async (): Promise<CompleteExercise[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('complete_exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar exercícios complete:', error)
        setError(error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao processar exercícios complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Função para deletar exercício
  const deleteCompleteExercise = async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('complete_exercises')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar exercício complete:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar exercício complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para deletar múltiplos exercícios
  const deleteMultipleCompleteExercises = async (ids: string[]): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('complete_exercises')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Erro ao deletar exercícios complete:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar exercícios complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar exercício
  const updateCompleteExercise = async (id: string, updates: Partial<CompleteExerciseToSave>): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('complete_exercises')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Erro ao atualizar exercício complete:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar exercício complete:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para gerar tags (adaptada para exercícios complete)
  const generateTags = (lawTitle: string, elementType: string, content: string): string[] => {
    const tags: string[] = []

    // Adicionar tag específica para exercícios complete
    tags.push('complete')

    // Adicionar tag baseada no título da lei
    if (lawTitle) {
      if (lawTitle.toLowerCase().includes('constituição')) {
        tags.push('constitucional')
      } else if (lawTitle.toLowerCase().includes('código civil')) {
        tags.push('civil')
      } else if (lawTitle.toLowerCase().includes('código penal')) {
        tags.push('penal')
      } else if (lawTitle.toLowerCase().includes('trabalhista')) {
        tags.push('trabalhista')
      } else {
        // Pegar primeira palavra significativa do título
        const firstWord = lawTitle.split(' ').find(word =>
          word.length > 3 && !['lei', 'decreto', 'portaria'].includes(word.toLowerCase())
        )
        if (firstWord) {
          tags.push(firstWord.toLowerCase())
        }
      }
    }

    // Adicionar tag baseada no tipo do elemento (evitar 'subsection' genérico)
    if (elementType && elementType.toLowerCase() !== 'subsection') {
      tags.push(elementType.toLowerCase())
    }

    // Adicionar tags baseadas no conteúdo
    const contentLower = content.toLowerCase()

    if (contentLower.includes('direito') || contentLower.includes('garantia')) {
      tags.push('direitos')
    }
    if (contentLower.includes('processo') || contentLower.includes('procedimento')) {
      tags.push('processual')
    }
    if (contentLower.includes('crime') || contentLower.includes('pena')) {
      tags.push('criminal')
    }
    if (contentLower.includes('contrato') || contentLower.includes('obrigação')) {
      tags.push('obrigações')
    }

    // Remover duplicatas e limitar a 4 tags (1 para 'complete' + 3 outras)
    const uniqueTags = [...new Set(tags)]
    return uniqueTags.slice(0, 4)
  }

  // Função para obter tradução dos tipos de exercício
  const getTypeTranslation = (type: CompleteExercise['type']): string => {
    const translations = {
      'T1': 'Lacuna Simples',
      'T2': 'Alternativas Semelhantes',
      'T3': 'Palavra Trocada',
      'T4': 'Complete por Blocos',
      'T5': 'Múltiplas Lacunas'
    }
    return translations[type] || type
  }

  return {
    loading,
    error,
    saveCompleteExercise,
    getCompleteExercisesByLaws,
    getAllCompleteExercises,
    deleteCompleteExercise,
    deleteMultipleCompleteExercises,
    updateCompleteExercise,
    generateTags,
    getTypeTranslation
  }
}