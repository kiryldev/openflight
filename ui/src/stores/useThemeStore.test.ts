import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from '../theme/theme';

function installBrowser(initial: Record<string, string> = {}, options: { failWrites?: boolean } = {}) {
  const store = { ...initial };
  const dataset: Record<string, string> = {};
  const classList = {
    add: vi.fn(),
    remove: vi.fn(),
  };
  const localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      if (options.failWrites) {
        throw new Error('quota exceeded');
      }
      store[key] = value;
    },
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('document', {
    documentElement: {
      dataset,
      classList,
      offsetHeight: 0,
      style: {
        setProperty: vi.fn(),
      },
    },
  });
  vi.stubGlobal('window', { localStorage });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  return { dataset, store };
}

describe('useThemeStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to light and persists dark', async () => {
    const { dataset, store } = installBrowser();
    const { useThemeStore } = await import('./useThemeStore');

    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().setTheme('dark');

    expect(useThemeStore.getState().theme).toBe('dark');
    expect(store[THEME_STORAGE_KEY]).toBe('dark');
    expect(dataset.theme).toBe('dark');
  });

  it('hydrates from stored light', async () => {
    installBrowser({ [THEME_STORAGE_KEY]: 'light' });
    const { useThemeStore } = await import('./useThemeStore');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('applies the theme for the session when storage rejects the write', async () => {
    const { dataset } = installBrowser({}, { failWrites: true });
    const { useThemeStore } = await import('./useThemeStore');

    expect(() => useThemeStore.getState().setTheme('light')).not.toThrow();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(dataset.theme).toBe('light');
  });
});
