import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Summary {
  id: string
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string | null
  type: 'explanation' | 'examples' | 'custom'
  title: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface SummaryToSave {
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string
  type: 'explanation' | 'examples' | 'custom'
  title: string
  content: string
}

export interface LawWithSummaries {
  id: string
  name: string
  summaryCount: number
  summaries: Summary[]
}

export const useSummaries = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Função para salvar um resumo
  const saveSummary = async (summaryData: SummaryToSave): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      console.log('Dados sendo enviados para Supabase:', summaryData)

      const { data, error } = await supabase
        .from('summaries')
        .insert({
          ...summaryData,
          created_by: user.id
        })
        .select()

      if (error) {
        console.error('Erro do Supabase:', error)
        setError(error.message)
        return false
      }

      console.log('Resumo salvo com sucesso:', data)
      return true
    } catch (error) {
      console.error('Erro ao salvar resumo:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar resumos agrupados por lei
  const getSummariesByLaws = async (): Promise<Record<string, Summary[]>> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar resumos:', error)
        setError(error.message)
        return {}
      }

      // Agrupar resumos por law_id
      const grouped = (data || []).reduce((acc, summary) => {
        if (!acc[summary.law_id]) {
          acc[summary.law_id] = []
        }
        acc[summary.law_id].push(summary)
        return acc
      }, {} as Record<string, Summary[]>)

      return grouped
    } catch (error) {
      console.error('Erro ao processar resumos:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return {}
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar resumos de uma lei específica
  const getSummariesByLaw = async (lawId: string): Promise<Summary[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('law_id', lawId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar resumos da lei:', error)
        setError(error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao processar resumos da lei:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar resumos de um artigo específico
  const getSummariesByArticle = async (lawId: string, articleNumber: string): Promise<Summary[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('law_id', lawId)
        .eq('article_number', articleNumber)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar resumos do artigo:', error)
        setError(error.message)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Erro ao processar resumos do artigo:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return []
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar um resumo específico
  const getSummaryById = async (id: string): Promise<Summary | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erro ao buscar resumo:', error)
        setError(error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('Erro ao processar resumo:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Função para deletar um resumo
  const deleteSummary = async (id: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar resumo:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar resumo:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para deletar múltiplos resumos
  const deleteMultipleSummaries = async (ids: string[]): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Erro ao deletar resumos:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar resumos:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar um resumo
  const updateSummary = async (id: string, updates: Partial<SummaryToSave>): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('summaries')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Erro ao atualizar resumo:', error)
        setError(error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar resumo:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      return false
    } finally {
      setLoading(false)
    }
  }

  // Função para obter tradução dos tipos de resumo
  const getTypeTranslation = (type: Summary['type']): string => {
    const translations = {
      'explanation': 'Explicação',
      'examples': 'Exemplos Práticos',
      'custom': 'Pergunta Personalizada'
    }
    return translations[type] || type
  }

  return {
    loading,
    error,
    saveSummary,
    getSummariesByLaws,
    getSummariesByLaw,
    getSummariesByArticle,
    getSummaryById,
    deleteSummary,
    deleteMultipleSummaries,
    updateSummary,
    getTypeTranslation
  }
}