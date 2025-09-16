import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Contest } from '../types/database'

export function useContests() {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContests(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContests()
  }, [])

  const createContest = async (contest: Omit<Contest, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .insert([contest])
        .select()
        .single()

      if (error) throw error
      await fetchContests() // Refresh list
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateContest = async (id: string, updates: Partial<Contest>) => {
    try {
      const { error } = await supabase
        .from('contests')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchContests() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const deleteContest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contests')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchContests() // Refresh list
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const getActiveContests = () => {
    return contests.filter(contest => contest.active)
  }

  return {
    contests,
    loading,
    error,
    refetch: fetchContests,
    createContest,
    updateContest,
    deleteContest,
    getActiveContests
  }
}