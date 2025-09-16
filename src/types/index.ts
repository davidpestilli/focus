export * from './database'

export interface AppState {
  user: StudyUser | null
  currentTab: 'direito' | 'matematica' | 'portugues'
  isLoading: boolean
}

export interface QuestionGenerationRequest {
  lawElementId: string
  count: number
  type: 'multiple_choice' | 'true_false'
  difficulty: 'medium' | 'superior'
}

export interface AIPromptTemplate {
  template: string
  followUp?: string[]
}

import type { StudyUser } from './database'