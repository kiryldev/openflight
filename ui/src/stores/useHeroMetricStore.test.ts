import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'openflight.hero-metric';
const FULLSCREEN_STORAGE_KEY = 'openflight.hero-expanded';
const CLUB_VIEW_STORAGE_KEY = 'openflight.club-view';
const PINNED_METRICS_STORAGE_KEY = 'openflight.pinned-row-metrics';

function installBrowser(initial: Record<string, string> = {}, options: { failWrites?: boolean } = {}) {
  const store = { ...initial };
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
  vi.stubGlobal('window', { localStorage });
  return store;
}

async function loadStore() {
  const module = await import('./useHeroMetricStore');
  return module.useHeroMetricStore;
}

describe('useHeroMetricStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with no promoted metric when nothing is stored', async () => {
    installBrowser();
    const useHeroMetricStore = await loadStore();

    expect(useHeroMetricStore.getState().heroMetricId).toBeNull();
    expect(useHeroMetricStore.getState().fullScreen).toBe(true);
    expect(useHeroMetricStore.getState().clubView).toBe(false);
    expect(useHeroMetricStore.getState().recentRowMetricIds).toEqual([
      'ball_speed',
      'carry',
      'club_speed',
      'spin',
      'club_path',
    ]);
  });

  it('restores the promoted metric from storage', async () => {
    installBrowser({ [STORAGE_KEY]: 'spin' });
    const useHeroMetricStore = await loadStore();

    expect(useHeroMetricStore.getState().heroMetricId).toBe('spin');
  });

  it('restores full screen off from storage', async () => {
    installBrowser({ [FULLSCREEN_STORAGE_KEY]: '0' });
    const useHeroMetricStore = await loadStore();

    expect(useHeroMetricStore.getState().fullScreen).toBe(false);
  });

  it('persists a new choice', async () => {
    const store = installBrowser();
    const useHeroMetricStore = await loadStore();

    useHeroMetricStore.getState().setHeroMetricId('carry');

    expect(useHeroMetricStore.getState().heroMetricId).toBe('carry');
    expect(store[STORAGE_KEY]).toBe('carry');
  });

  it('persists full screen on/off', async () => {
    const store = installBrowser();
    const useHeroMetricStore = await loadStore();

    useHeroMetricStore.getState().setFullScreen(false);

    expect(useHeroMetricStore.getState().fullScreen).toBe(false);
    expect(store[FULLSCREEN_STORAGE_KEY]).toBe('0');

    useHeroMetricStore.getState().setFullScreen(true);
    expect(store[FULLSCREEN_STORAGE_KEY]).toBe('1');
  });

  it('moves the latest selected metric to the front of the row history', async () => {
    const store = installBrowser();
    const useHeroMetricStore = await loadStore();

    useHeroMetricStore.getState().setClubView(true);
    useHeroMetricStore.getState().setHeroMetricId('spin');
    useHeroMetricStore.getState().setHeroMetricId('launch_v');

    expect(store[CLUB_VIEW_STORAGE_KEY]).toBe('1');
    expect(useHeroMetricStore.getState().recentRowMetricIds).toEqual([
      'launch_v', 'spin', 'ball_speed', 'carry', 'club_speed',
    ]);
    expect(JSON.parse(store[PINNED_METRICS_STORAGE_KEY])).toEqual([
      'launch_v',
      'spin',
      'ball_speed',
      'carry',
      'club_speed',
    ]);
  });

  it('restores recent selections and drops the oldest when a new one is selected', async () => {
    installBrowser({
      [CLUB_VIEW_STORAGE_KEY]: '1',
      [PINNED_METRICS_STORAGE_KEY]: JSON.stringify(['spin', 'carry', 'club_path', 'launch_v', 'launch_h']),
    });
    const useHeroMetricStore = await loadStore();

    expect(useHeroMetricStore.getState().clubView).toBe(true);
    useHeroMetricStore.getState().setHeroMetricId('smash');
    expect(useHeroMetricStore.getState().recentRowMetricIds).toEqual([
      'smash',
      'spin',
      'carry',
      'club_path',
      'launch_v',
    ]);
  });

  it('uses defaults for corrupt pinned-metric storage', async () => {
    installBrowser({ [PINNED_METRICS_STORAGE_KEY]: '{bad json' });
    const useHeroMetricStore = await loadStore();
    expect(useHeroMetricStore.getState().recentRowMetricIds).toHaveLength(5);
  });

  it('replaces rather than accumulates the stored id', async () => {
    const store = installBrowser();
    const useHeroMetricStore = await loadStore();

    useHeroMetricStore.getState().setHeroMetricId('spin');
    useHeroMetricStore.getState().setHeroMetricId('club_speed');

    expect(store[STORAGE_KEY]).toBe('club_speed');
  });

  it('keeps the choice for the session when storage rejects the write', async () => {
    installBrowser({}, { failWrites: true });
    const useHeroMetricStore = await loadStore();

    expect(() => useHeroMetricStore.getState().setHeroMetricId('carry')).not.toThrow();
    expect(useHeroMetricStore.getState().heroMetricId).toBe('carry');
    expect(() => useHeroMetricStore.getState().setFullScreen(false)).not.toThrow();
    expect(useHeroMetricStore.getState().fullScreen).toBe(false);
    expect(() => useHeroMetricStore.getState().setClubView(true)).not.toThrow();
    expect(useHeroMetricStore.getState().clubView).toBe(true);
  });

  it('falls back to no selection when there is no window (SSR / display route)', async () => {
    vi.stubGlobal('window', undefined);
    const useHeroMetricStore = await loadStore();

    expect(useHeroMetricStore.getState().heroMetricId).toBeNull();
    expect(useHeroMetricStore.getState().fullScreen).toBe(true);
    expect(useHeroMetricStore.getState().clubView).toBe(false);
  });
});
