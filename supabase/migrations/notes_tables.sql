-- Tabla para almacenar notas de usuario
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 80),
  song JSONB, -- { title, artist, videoId, lyrics, startTime, duration }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Índices para optimizar consultas
CREATE INDEX idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX idx_user_notes_expires_at ON user_notes(expires_at);
CREATE INDEX idx_user_notes_created_at ON user_notes(created_at DESC);

-- Tabla para almacenar reacciones a notas (opcional, para futuras mejoras)
CREATE TABLE IF NOT EXISTS note_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES user_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(note_id, user_id, reaction_type)
);

-- Índices para reacciones
CREATE INDEX idx_note_reactions_note_id ON note_reactions(note_id);
CREATE INDEX idx_note_reactions_user_id ON note_reactions(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para user_notes
CREATE POLICY "Users can view their own notes" ON user_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON user_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON user_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas de RLS para note_reactions
CREATE POLICY "Users can view note reactions" ON note_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions to notes" ON note_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON note_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Función para limpiar notas expiradas automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_notes()
RETURNS void AS $$
BEGIN
  DELETE FROM user_notes WHERE expires_at < NOW();
  DELETE FROM note_reactions WHERE note_id NOT IN (SELECT id FROM user_notes);
END;
$$ LANGUAGE plpgsql;

-- Crear un job para ejecutar la limpieza cada hora (si usas pg_cron)
-- SELECT cron.schedule('cleanup_expired_notes', '0 * * * *', 'SELECT cleanup_expired_notes()');
