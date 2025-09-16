import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TestConnection() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('laws').select('count', { count: 'exact' })
        if (error) {
          setError(error.message)
          setStatus('error')
        } else {
          setStatus('connected')
        }
      } catch (err: any) {
        setError(err.message)
        setStatus('error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 p-2 rounded bg-white shadow-lg border text-xs">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'loading' ? 'bg-yellow-500' :
          status === 'connected' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>
          {status === 'loading' && 'Conectando...'}
          {status === 'connected' && 'Supabase conectado'}
          {status === 'error' && `Erro: ${error}`}
        </span>
      </div>
    </div>
  )
}