-- Create reading_progress table for multi-device synchronization
CREATE TABLE IF NOT EXISTS reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  scroll_percentage FLOAT DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Create index for faster queries
CREATE INDEX idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_book_id ON reading_progress(book_id);
CREATE INDEX idx_reading_progress_updated_at ON reading_progress(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reading progress
CREATE POLICY "Users can view their own reading progress"
  ON reading_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own reading progress
CREATE POLICY "Users can insert their own reading progress"
  ON reading_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reading progress
CREATE POLICY "Users can update their own reading progress"
  ON reading_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reading progress
CREATE POLICY "Users can delete their own reading progress"
  ON reading_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_reading_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reading_progress_updated_at_trigger
BEFORE UPDATE ON reading_progress
FOR EACH ROW
EXECUTE FUNCTION update_reading_progress_timestamp();
