import { useState, useEffect, useCallback } from 'react';

interface OfflineBook {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  downloadedAt: string;
  chapters: OfflineChapter[];
}

interface OfflineChapter {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNumber: number;
  wordCount: number;
}

const DB_NAME = 'lettora_offline';
const DB_VERSION = 1;
const STORE_NAME = 'books';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const useOfflineStorage = () => {
  const [offlineBooks, setOfflineBooks] = useState<OfflineBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineBooks = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        setOfflineBooks(request.result || []);
        setLoading(false);
      };
      
      request.onerror = () => {
        console.error('Error loading offline books');
        setLoading(false);
      };
    } catch (error) {
      console.error('Error opening database:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfflineBooks();
  }, [loadOfflineBooks]);

  const saveBookOffline = useCallback(async (book: OfflineBook): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.put(book);
        request.onsuccess = () => {
          loadOfflineBooks();
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving book offline:', error);
      return false;
    }
  }, [loadOfflineBooks]);

  const removeBookOffline = useCallback(async (bookId: string): Promise<boolean> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(bookId);
        request.onsuccess = () => {
          loadOfflineBooks();
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error removing offline book:', error);
      return false;
    }
  }, [loadOfflineBooks]);

  const getOfflineBook = useCallback(async (bookId: string): Promise<OfflineBook | null> => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(bookId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting offline book:', error);
      return null;
    }
  }, []);

  const isBookDownloaded = useCallback((bookId: string): boolean => {
    return offlineBooks.some(book => book.id === bookId);
  }, [offlineBooks]);

  const getStorageUsage = useCallback(async (): Promise<{ used: number; total: number }> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        total: estimate.quota || 0,
      };
    }
    return { used: 0, total: 0 };
  }, []);

  return {
    offlineBooks,
    loading,
    isOnline,
    saveBookOffline,
    removeBookOffline,
    getOfflineBook,
    isBookDownloaded,
    getStorageUsage,
    refreshBooks: loadOfflineBooks,
  };
};

export type { OfflineBook, OfflineChapter };
