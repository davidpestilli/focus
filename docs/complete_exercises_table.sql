-- Tabela para armazenar exercícios complete gerados pela IA
-- Baseada na estrutura similar às tabelas 'questions' e 'summaries'

CREATE TABLE complete_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  law_element_id UUID REFERENCES law_elements(id) ON DELETE CASCADE,
  law_id UUID REFERENCES laws(id) ON DELETE CASCADE,
  law_name TEXT NOT NULL,
  article_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('T1', 'T2', 'T3', 'T4', 'T5')),
  exercise_text TEXT NOT NULL,
  options JSONB, -- Para alternativas de resposta (quando aplicável)
  correct_answer TEXT NOT NULL,
  explanation JSONB NOT NULL, -- JSON com campos 'general' e opcionalmente 'alternatives'
  tags TEXT[] DEFAULT '{}',
  topic TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_complete_exercises_law_id ON complete_exercises(law_id);
CREATE INDEX idx_complete_exercises_law_element_id ON complete_exercises(law_element_id);
CREATE INDEX idx_complete_exercises_article_number ON complete_exercises(article_number);
CREATE INDEX idx_complete_exercises_type ON complete_exercises(type);
CREATE INDEX idx_complete_exercises_created_at ON complete_exercises(created_at);
CREATE INDEX idx_complete_exercises_tags ON complete_exercises USING GIN(tags);
CREATE INDEX idx_complete_exercises_topic ON complete_exercises(topic);

-- RLS (Row Level Security) - Exercícios são compartilhados
ALTER TABLE complete_exercises ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "complete_exercises_select_policy" ON complete_exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "complete_exercises_insert_policy" ON complete_exercises
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização apenas pelo criador
CREATE POLICY "complete_exercises_update_policy" ON complete_exercises
  FOR UPDATE USING (auth.uid() = created_by);

-- Política para permitir exclusão apenas pelo criador
CREATE POLICY "complete_exercises_delete_policy" ON complete_exercises
  FOR DELETE USING (auth.uid() = created_by);

-- Trigger para atualizar updated_at automaticamente
-- (Reutiliza a função update_updated_at_column já criada para outras tabelas)
CREATE TRIGGER update_complete_exercises_updated_at
  BEFORE UPDATE ON complete_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE complete_exercises IS 'Exercícios de "complete a lacuna" gerados pela IA para treinamento de memorização legal';
COMMENT ON COLUMN complete_exercises.type IS 'Tipo do exercício: T1 (lacuna simples), T2 (alternativas semelhantes), T3 (palavra trocada), T4 (por blocos), T5 (múltiplas lacunas)';
COMMENT ON COLUMN complete_exercises.exercise_text IS 'Texto do exercício com lacunas indicadas';
COMMENT ON COLUMN complete_exercises.options IS 'JSON com opções de resposta (a, b, c, d, e) quando aplicável';
COMMENT ON COLUMN complete_exercises.correct_answer IS 'Resposta correta (letra da alternativa ou texto da resposta)';
COMMENT ON COLUMN complete_exercises.explanation IS 'JSON com explicação geral e opcionalmente explicações por alternativa';
COMMENT ON COLUMN complete_exercises.tags IS 'Array de tags para categorização e busca';
COMMENT ON COLUMN complete_exercises.topic IS 'Tópico/assunto principal do exercício';