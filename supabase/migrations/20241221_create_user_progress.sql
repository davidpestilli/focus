-- Criação da tabela user_progress para tracking do progresso do usuário por artigo
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  law_element_id UUID NOT NULL REFERENCES law_elements(id) ON DELETE CASCADE,
  progress_type VARCHAR(20) NOT NULL CHECK (progress_type IN ('resumo', 'questoes', 'complete')),
  is_completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,

  -- Garantir que um usuário não tenha duplicatas para o mesmo element/type
  UNIQUE(user_id, law_element_id, progress_type)
);

-- Índices para performance
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_law_element_id ON user_progress(law_element_id);
CREATE INDEX idx_user_progress_user_element ON user_progress(user_id, law_element_id);
CREATE INDEX idx_user_progress_deleted_at ON user_progress(deleted_at) WHERE deleted_at IS NULL;

-- RLS (Row Level Security)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver/editar seu próprio progresso
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE user_progress IS 'Tracking do progresso do usuário por elemento de lei (artigo)';
COMMENT ON COLUMN user_progress.progress_type IS 'Tipo de progresso: resumo, questoes, complete';
COMMENT ON COLUMN user_progress.is_completed IS 'Se true, item está marcado; se false, foi desmarcado';
COMMENT ON COLUMN user_progress.deleted_at IS 'Soft delete - quando não é null, registro foi deletado';