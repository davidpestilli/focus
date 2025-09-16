import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Law } from '../types/database'

export function useLaws() {
  const [laws, setLaws] = useState<Law[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLaws = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('laws')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLaws(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLaws()
  }, [])

  const createLaw = async (law: Omit<Law, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('laws')
        .insert([law])
        .select()
        .single()

      if (error) throw error
      await fetchLaws() // Refresh list
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateLaw = async (id: string, updates: Partial<Law>) => {
    try {
      const { error } = await supabase
        .from('laws')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchLaws() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const deleteLaw = async (id: string) => {
    try {
      const { error } = await supabase
        .from('laws')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchLaws() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return {
    laws,
    loading,
    error,
    refetch: fetchLaws,
    createLaw,
    updateLaw,
    deleteLaw
  }
}