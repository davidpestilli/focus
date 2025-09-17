export interface StudyUser {
  id: string
  email: string
  created_at: string
  preferences?: Record<string, any>
}

export interface Law {
  id: string
  name: string
  full_text?: string
  structure?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LawElement {
  id: string
  law_id: string
  element_type: 'book' | 'part' | 'title' | 'chapter' | 'section' | 'subsection' | 'article' | 'paragraph' | 'clause' | 'item' | 'subitem'
  element_number: string
  title: string
  content: string
  parent_id?: string
  path: string[]
  order_position?: number
  created_at: string
}

export interface Contest {
  id: string
  name: string
  description?: string
  active: boolean
  created_at: string
}

export interface ContestLaw {
  id: string
  contest_id: string
  law_id: string
  law_name: string
  selected_elements: string[] // IDs dos elementos selecionados
  created_at: string
}

export interface StudyQuestion {
  id: string
  law_element_id: string
  contest_id?: string
  type: 'multiple_choice' | 'true_false'
  difficulty: 'medium' | 'superior'
  question_text: string
  options?: Record<string, any>
  correct_answer: string
  explanation?: Record<string, any>
  law_id: string
  law_name: string
  article_number: string
  chapter_title?: string
  contest_name?: string
  tags?: string[]
  topic?: string
  content_hash: string
  quality_score?: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserAnswer {
  id: string
  user_id: string
  question_id: string
  session_id?: string
  answer: string
  is_correct: boolean
  time_spent?: string
  created_at: string
}

export interface StudySession {
  id: string
  user_id: string
  contest_id?: string
  law_element_id?: string
  questions_generated: number
  questions_answered: number
  correct_answers: number
  started_at: string
  ended_at?: string
}