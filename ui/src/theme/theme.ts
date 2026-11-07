export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'openflight.theme';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedValue) ? storedValue : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  // Force a style flush so the theme swap does not smear every color transition.
  void root.offsetHeight;
  requestAnimationFrame(() => {
    root.classList.remove('theme-switching');
  });
}
