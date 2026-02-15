import { useEffect } from 'react';
import { useOfflineStorage } from './useOfflineStorage';

const CLEANUP_KEY = 'lettora_last_cleanup';
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BOOK_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const useAutoCleanup = () => {
  const { offlineBooks, removeBookOffline } = useOfflineStorage();

  useEffect(() => {
    const lastCleanup = localStorage.getItem(CLEANUP_KEY);
    const now = Date.now();

    if (lastCleanup && now - parseInt(lastCleanup) < CLEANUP_INTERVAL_MS) return;

    const cleanup = async () => {
      let cleaned = 0;

      // Remove old offline books
      for (const book of offlineBooks) {
        const age = now - new Date(book.downloadedAt).getTime();
        if (age > MAX_BOOK_AGE_MS) {
          await removeBookOffline(book.id);
          cleaned++;
        }
      }

      // Clear old localStorage items
      const keysToCheck = ['lettora_settings'];
      // We don't delete settings, just ensure cache is managed

      // Clear expired service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (name.includes('temp') || name.includes('old')) {
            await caches.delete(name);
          }
        }
      }

      localStorage.setItem(CLEANUP_KEY, now.toString());
      if (cleaned > 0) {
        console.log(`Auto cleanup: removed ${cleaned} old offline books`);
      }
    };

    if (offlineBooks.length > 0) {
      cleanup();
    } else {
      localStorage.setItem(CLEANUP_KEY, now.toString());
    }
  }, [offlineBooks, removeBookOffline]);
};
