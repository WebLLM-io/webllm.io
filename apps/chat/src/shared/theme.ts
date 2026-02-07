const STORAGE_KEY = 'webllm-chat-theme';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}

export function toggleTheme(): void {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}
