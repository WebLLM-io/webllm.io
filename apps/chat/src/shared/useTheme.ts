import { useSyncExternalStore } from 'react';
import { getTheme, toggleTheme, type Theme } from './theme';

function subscribe(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('theme-change', handler);
  return () => window.removeEventListener('theme-change', handler);
}

function getSnapshot(): Theme {
  return getTheme();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  return { theme, isDark: theme === 'dark', toggle: toggleTheme };
}
