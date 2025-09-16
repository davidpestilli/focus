import React, { createContext, useContext, useState } from 'react'
import type { Law, Contest, LawElement } from '../types/database'

interface AppState {
  currentView: 'dashboard' | 'laws' | 'contests' | 'questions' | 'study'
  selectedLaw: Law | null
  selectedContest: Contest | null
  selectedLawElement: LawElement | null
  currentTab: 'direito' | 'matematica' | 'portugues'
}

interface AppContextType extends AppState {
  setCurrentView: (view: AppState['currentView']) => void
  setSelectedLaw: (law: Law | null) => void
  setSelectedContest: (contest: Contest | null) => void
  setSelectedLawElement: (element: LawElement | null) => void
  setCurrentTab: (tab: AppState['currentTab']) => void
  goBack: () => void
  goToDashboard: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentView: 'dashboard',
    selectedLaw: null,
    selectedContest: null,
    selectedLawElement: null,
    currentTab: 'direito'
  })

  const setCurrentView = (view: AppState['currentView']) => {
    setState(prev => ({ ...prev, currentView: view }))
  }

  const setSelectedLaw = (law: Law | null) => {
    setState(prev => ({ ...prev, selectedLaw: law }))
  }

  const setSelectedContest = (contest: Contest | null) => {
    setState(prev => ({ ...prev, selectedContest: contest }))
  }

  const setSelectedLawElement = (element: LawElement | null) => {
    setState(prev => ({ ...prev, selectedLawElement: element }))
  }

  const setCurrentTab = (tab: AppState['currentTab']) => {
    setState(prev => ({ ...prev, currentTab: tab }))
  }

  const goBack = () => {
    // Simple navigation back to dashboard for now
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      selectedLaw: null,
      selectedContest: null,
      selectedLawElement: null
    }))
  }

  const goToDashboard = () => {
    setState(prev => ({
      ...prev,
      currentView: 'dashboard',
      selectedLaw: null,
      selectedContest: null,
      selectedLawElement: null
    }))
  }

  const value: AppContextType = {
    ...state,
    setCurrentView,
    setSelectedLaw,
    setSelectedContest,
    setSelectedLawElement,
    setCurrentTab,
    goBack,
    goToDashboard
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}