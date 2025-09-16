import React, { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { useLaws } from '../hooks/useLaws'
import type { Law } from '../types/database'

interface LawSelectorProps {
  onLawSelect: (law: Law) => void
  selectedLaw?: Law | null
}

export default function LawSelector({ onLawSelect, selectedLaw }: LawSelectorProps) {
  const { laws, loading, error } = useLaws()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLaws = laws.filter(law =>
    law.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLawSelect = (law: Law) => {
    onLawSelect(law)
    setIsOpen(false)
    setSearchTerm('')
  }

  if (loading) {
    return (
      <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50">
        <div className="animate-pulse text-gray-500">Carregando leis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full p-3 border border-red-300 rounded-md bg-red-50 text-red-700">
        Erro ao carregar leis: {error}
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className="w-full p-3 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedLaw ? 'text-gray-900' : 'text-gray-500'}>
          {selectedLaw ? selectedLaw.name : 'Selecione uma lei'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lei..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredLaws.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">
                {searchTerm ? 'Nenhuma lei encontrada' : 'Nenhuma lei disponível'}
              </div>
            ) : (
              filteredLaws.map((law) => (
                <div
                  key={law.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleLawSelect(law)}
                >
                  <div className="font-medium text-gray-900">{law.name}</div>
                  {law.structure && typeof law.structure === 'object' && 'description' in law.structure && (
                    <div className="text-sm text-gray-600 mt-1">
                      {law.structure.description as string}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}