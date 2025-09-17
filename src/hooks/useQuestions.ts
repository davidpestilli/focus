import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface StudyQuestion {
  id: string
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  question_text: string
  options?: {
    a: string
    b: string
    c: string
    d: string
    e: string
  }
  correct_answer: string
  explanation: {
    general: string
    alternatives?: {
      a: string
      b: string
      c: string
      d: string
      e: string
    }
  }
  tags: string[]
  topic: string
  created_by: string
  created_at: string
}

export interface QuestionToSave {
  law_element_id: string
  law_id: string
  law_name: string
  article_number: string
  type: 'multiple_choice' | 'true_false' | 'essay'
  question_text: string
  options?: {
    a: string
    b: string
    c: string
    d: string
    e: string
  }
  correct_answer: string
  explanation: {
    general: string
    alternatives?: {
      a: string
      b: string
      c: string
      d: string
      e: string
    }
  }
  tags: string[]
  topic: string
}

export const useQuestions = () => {
  const [questions, setQuestions] = useState<StudyQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Gerar tags automáticas baseadas no contexto
  const generateTags = (lawName: string, elementType: string, content: string): string[] => {
    const tags: string[] = []

    // Tags baseadas na lei
    const lawLower = lawName.toLowerCase()
    if (lawLower.includes('penal')) tags.push('penal', 'crime')
    if (lawLower.includes('processo')) tags.push('processo', 'procedimento')
    if (lawLower.includes('constituição')) tags.push('constitucional', 'direitos')
    if (lawLower.includes('civil')) tags.push('civil')
    if (lawLower.includes('administrativo')) tags.push('administrativo')

    // Tags baseadas no tipo de elemento
    if (elementType === 'article') tags.push('artigo')
    if (elementType === 'paragraph') tags.push('parágrafo')
    if (elementType === 'chapter') tags.push('capítulo')

    // Tags baseadas no conteúdo (detectar palavras-chave)
    const contentLower = content.toLowerCase()
    if (contentLower.includes('falsificação')) tags.push('falsificação', 'documento')
    if (contentLower.includes('homicídio')) tags.push('homicídio', 'vida')
    if (contentLower.includes('furto')) tags.push('furto', 'patrimônio')
    if (contentLower.includes('roubo')) tags.push('roubo', 'patrimônio')
    if (contentLower.includes('estelionato')) tags.push('estelionato', 'fraude')
    if (contentLower.includes('peculato')) tags.push('peculato', 'administração')
    if (contentLower.includes('corrupção')) tags.push('corrupção', 'administração')
    if (contentLower.includes('lesão')) tags.push('lesão', 'integridade')
    if (contentLower.includes('sequestro')) tags.push('sequestro', 'liberdade')
    if (contentLower.includes('extorsão')) tags.push('extorsão', 'patrimônio')
    if (contentLower.includes('calúnia')) tags.push('calúnia', 'honra')
    if (contentLower.includes('difamação')) tags.push('difamação', 'honra')
    if (contentLower.includes('injúria')) tags.push('injúria', 'honra')
    if (contentLower.includes('prescrição')) tags.push('prescrição', 'temporal')
    if (contentLower.includes('competência')) tags.push('competência', 'jurisdição')
    if (contentLower.includes('recurso')) tags.push('recurso', 'impugnação')
    if (contentLower.includes('prova')) tags.push('prova', 'instrução')
    if (contentLower.includes('sentença')) tags.push('sentença', 'decisão')

    // Remover duplicatas e retornar
    return [...new Set(tags)]
  }

  // Salvar questão no banco
  const saveQuestion = async (questionData: QuestionToSave): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Preparar dados para inserção (apenas campos que existem na tabela)
      const dataToInsert = {
        law_element_id: questionData.law_element_id,
        law_id: questionData.law_id,
        law_name: questionData.law_name,
        article_number: questionData.article_number,
        type: questionData.type,
        question_text: questionData.question_text,
        options: questionData.options || null,
        correct_answer: questionData.correct_answer,
        explanation: questionData.explanation,
        tags: questionData.tags,
        topic: questionData.topic,
        created_by: user.id // Usando auth.uid() diretamente
      }

      console.log('Dados sendo enviados para Supabase:', dataToInsert)

      // Inserir nova questão
      const { data, error: saveError } = await supabase
        .from('study_questions')
        .insert(dataToInsert)
        .select()

      if (saveError) {
        console.error('Erro detalhado do Supabase:', saveError)
        setError(`Erro ao salvar questão: ${saveError.message}`)
        return false
      }

      if (data && data[0]) {
        setQuestions(prev => [data[0] as StudyQuestion, ...prev])
      }

      return true
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Buscar questões por lei
  const getQuestionsByLaw = async (lawId: string): Promise<StudyQuestion[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('study_questions')
        .select('*')
        .eq('law_id', lawId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(`Erro ao buscar questões: ${fetchError.message}`)
        return []
      }

      return data as StudyQuestion[] || []
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Buscar todas as questões do usuário
  const getAllQuestions = async (): Promise<StudyQuestion[]> => {
    if (!user) {
      setError('Usuário não autenticado')
      return []
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('study_questions')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(`Erro ao buscar questões: ${fetchError.message}`)
        return []
      }

      const questionsData = data as StudyQuestion[] || []
      setQuestions(questionsData)
      return questionsData
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Agrupar questões por lei
  const getQuestionsByLaws = async (): Promise<Record<string, StudyQuestion[]>> => {
    const allQuestions = await getAllQuestions()

    return allQuestions.reduce((acc, question) => {
      const lawKey = question.law_id
      if (!acc[lawKey]) {
        acc[lawKey] = []
      }
      acc[lawKey].push(question)
      return acc
    }, {} as Record<string, StudyQuestion[]>)
  }

  // Deletar questão
  const deleteQuestion = async (questionId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('study_questions')
        .delete()
        .eq('id', questionId)
        .eq('created_by', user.id) // Só pode deletar suas próprias questões

      if (deleteError) {
        setError(`Erro ao deletar questão: ${deleteError.message}`)
        return false
      }

      // Atualizar estado local
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      return true
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Deletar múltiplas questões
  const deleteMultipleQuestions = async (questionIds: string[]): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('study_questions')
        .delete()
        .in('id', questionIds)
        .eq('created_by', user.id) // Só pode deletar suas próprias questões

      if (deleteError) {
        setError(`Erro ao deletar questões: ${deleteError.message}`)
        return false
      }

      // Atualizar estado local
      setQuestions(prev => prev.filter(q => !questionIds.includes(q.id)))
      return true
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Atualizar questão
  const updateQuestion = async (questionId: string, questionData: Partial<QuestionToSave>): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('study_questions')
        .update(questionData)
        .eq('id', questionId)
        .eq('created_by', user.id) // Só pode atualizar suas próprias questões
        .select()

      if (updateError) {
        setError(`Erro ao atualizar questão: ${updateError.message}`)
        return false
      }

      if (data && data[0]) {
        // Atualizar estado local
        setQuestions(prev => prev.map(q => q.id === questionId ? data[0] as StudyQuestion : q))
      }

      return true
    } catch (err) {
      setError(`Erro inesperado: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    questions,
    loading,
    error,
    saveQuestion,
    getQuestionsByLaw,
    getAllQuestions,
    getQuestionsByLaws,
    deleteQuestion,
    deleteMultipleQuestions,
    updateQuestion,
    generateTags
  }
}