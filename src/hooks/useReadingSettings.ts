import { useState, useEffect, useCallback } from 'react';

export interface ReadingSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans-serif' | 'mono';
  theme: 'light' | 'dark' | 'sepia' | 'midnight';
  margin: 'compact' | 'normal' | 'wide';
  textAlign: 'left' | 'justify';
  autoScroll: boolean;
  scrollSpeed: number;
  pageAnimation: 'slide' | 'fade' | 'flip' | 'none';
  keepScreenOn: boolean;
  showProgress: boolean;
  tapNavigation: boolean;
}

const DEFAULT_SETTINGS: ReadingSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme: 'dark',
  margin: 'normal',
  textAlign: 'left',
  autoScroll: false,
  scrollSpeed: 50,
  pageAnimation: 'slide',
  keepScreenOn: true,
  showProgress: true,
  tapNavigation: true,
};

const STORAGE_KEY = 'lettora_reading_settings';

export const useReadingSettings = () => {
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const getThemeStyles = useCallback(() => {
    switch (settings.theme) {
      case 'light':
        return { bg: 'bg-white', text: 'text-gray-900', accent: 'border-gray-200' };
      case 'sepia':
        return { bg: 'bg-amber-50', text: 'text-amber-900', accent: 'border-amber-200' };
      case 'midnight':
        return { bg: 'bg-slate-950', text: 'text-slate-200', accent: 'border-slate-800' };
      default:
        return { bg: 'bg-background', text: 'text-foreground', accent: 'border-border' };
    }
  }, [settings.theme]);

  const getFontFamily = useCallback(() => {
    switch (settings.fontFamily) {
      case 'serif':
        return "'Playfair Display', Georgia, serif";
      case 'sans-serif':
        return "'DM Sans', -apple-system, sans-serif";
      case 'mono':
        return "'SF Mono', 'Fira Code', monospace";
      default:
        return 'inherit';
    }
  }, [settings.fontFamily]);

  const getMarginClass = useCallback(() => {
    switch (settings.margin) {
      case 'compact':
        return 'max-w-xl px-3';
      case 'wide':
        return 'max-w-4xl px-8';
      default:
        return 'max-w-2xl px-4';
    }
  }, [settings.margin]);

  return {
    settings,
    updateSetting,
    resetSettings,
    getThemeStyles,
    getFontFamily,
    getMarginClass,
  };
};
