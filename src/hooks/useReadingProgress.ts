import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  chapter_number: number;
  scroll_percentage: number;
  last_read_at: string;
  updated_at: string;
}

export const useReadingProgress = (userId: string | undefined, bookId: string | undefined) => {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch current reading progress
  const fetchProgress = useCallback(async () => {
    if (!userId || !bookId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setProgress(data || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching reading progress:', err);
      setError(err instanceof Error ? err.message : 'Error fetching progress');
    } finally {
      setLoading(false);
    }
  }, [userId, bookId]);

  // Save or update reading progress
  const saveProgress = useCallback(
    async (chapterNumber: number, scrollPercentage: number = 0) => {
      if (!userId || !bookId) return;

      try {
        const { data, error: upsertError } = await supabase
          .from('reading_progress')
          .upsert(
            {
              user_id: userId,
              book_id: bookId,
              chapter_number: chapterNumber,
              scroll_percentage: Math.min(100, Math.max(0, scrollPercentage)),
              last_read_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,book_id' }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;
        setProgress(data);
        setError(null);
      } catch (err) {
        console.error('Error saving reading progress:', err);
        setError(err instanceof Error ? err.message : 'Error saving progress');
      }
    },
    [userId, bookId]
  );

  // Debounced save progress (to avoid too many updates)
  const debouncedSaveProgress = useCallback(
    (chapterNumber: number, scrollPercentage: number) => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        saveProgress(chapterNumber, scrollPercentage);
      }, 1000); // Save after 1 second of inactivity
    },
    [saveProgress]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId || !bookId) return;

    fetchProgress();

    // Subscribe to changes on this specific book's progress
    const channel = supabase
      .channel(`reading_progress:${userId}:${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reading_progress',
          filter: `user_id=eq.${userId} AND book_id=eq.${bookId}`,
        },
        (payload) => {
          if (payload.new) {
            setProgress(payload.new as ReadingProgress);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [userId, bookId, fetchProgress]);

  // Clear progress (when user finishes the book)
  const clearProgress = useCallback(async () => {
    if (!userId || !bookId) return;

    try {
      const { error: deleteError } = await supabase
        .from('reading_progress')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId);

      if (deleteError) throw deleteError;
      setProgress(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing reading progress:', err);
      setError(err instanceof Error ? err.message : 'Error clearing progress');
    }
  }, [userId, bookId]);

  return {
    progress,
    loading,
    error,
    saveProgress,
    debouncedSaveProgress,
    fetchProgress,
    clearProgress,
  };
};
