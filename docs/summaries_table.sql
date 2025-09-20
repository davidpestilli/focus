-- Tabela para armazenar resumos gerados pela IA
-- Baseada na estrutura similar à tabela 'questions'

CREATE TABLE summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  law_element_id UUID REFERENCES law_elements(id) ON DELETE CASCADE,
  law_id UUID REFERENCES laws(id) ON DELETE CASCADE,
  law_name TEXT NOT NULL,
  article_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('explanation', 'examples', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_summaries_law_id ON summaries(law_id);
CREATE INDEX idx_summaries_law_element_id ON summaries(law_element_id);
CREATE INDEX idx_summaries_article_number ON summaries(article_number);
CREATE INDEX idx_summaries_type ON summaries(type);
CREATE INDEX idx_summaries_created_at ON summaries(created_at);

-- RLS (Row Level Security) - Resumos são compartilhados
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "summaries_select_policy" ON summaries
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "summaries_insert_policy" ON summaries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização apenas pelo criador
CREATE POLICY "summaries_update_policy" ON summaries
  FOR UPDATE USING (auth.uid() = created_by);

-- Política para permitir exclusão apenas pelo criador
CREATE POLICY "summaries_delete_policy" ON summaries
  FOR DELETE USING (auth.uid() = created_by);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();