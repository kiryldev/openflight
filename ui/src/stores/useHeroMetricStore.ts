import { create } from 'zustand';

const STORAGE_KEY = 'openflight.hero-metric';
const FULLSCREEN_STORAGE_KEY = 'openflight.hero-expanded';
const CLUB_VIEW_STORAGE_KEY = 'openflight.club-view';
// Preserve the saved order while changing the picker to recent selection order.
const RECENT_METRICS_STORAGE_KEY = 'openflight.pinned-row-metrics';
export const DEFAULT_RECENT_ROW_METRICS = ['ball_speed', 'carry', 'club_speed', 'spin', 'club_path'];
const MAX_RECENT_ROW_METRICS = 5;

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the in-memory choice when storage is unavailable.
  }
}

/**
 * Which Live metric is selected and shown in full-screen mode. Persisted so
 * someone who cares about club speed keeps that choice across restarts.
 *
 * Stored as a plain metric id; an id that no longer exists falls back to the
 * first metric of the current set in LivePanel.
 */
function readStoredHeroMetric(): string | null {
  return readStorage(STORAGE_KEY);
}

/** Default on so the big-screen number is visible until Full screen is turned off. */
function readStoredFullScreen(): boolean {
  const stored = readStorage(FULLSCREEN_STORAGE_KEY);
  return stored === null ? true : stored !== '0';
}

function readStoredClubView(): boolean {
  return readStorage(CLUB_VIEW_STORAGE_KEY) === '1';
}

function readStoredRecentMetrics(): string[] {
  const stored = readStorage(RECENT_METRICS_STORAGE_KEY);
  if (!stored) return DEFAULT_RECENT_ROW_METRICS;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_RECENT_ROW_METRICS;
    const ids = parsed.filter((id): id is string => typeof id === 'string');
    return [...new Set(ids)].slice(0, MAX_RECENT_ROW_METRICS);
  } catch {
    return DEFAULT_RECENT_ROW_METRICS;
  }
}

interface HeroMetricState {
  heroMetricId: string | null;
  fullScreen: boolean;
  clubView: boolean;
  recentRowMetricIds: string[];
  setHeroMetricId: (id: string) => void;
  setFullScreen: (fullScreen: boolean) => void;
  setClubView: (clubView: boolean) => void;
}

export const useHeroMetricStore = create<HeroMetricState>((set) => ({
  heroMetricId: readStoredHeroMetric(),
  fullScreen: readStoredFullScreen(),
  clubView: readStoredClubView(),
  recentRowMetricIds: readStoredRecentMetrics(),
  setHeroMetricId: (heroMetricId) => {
    writeStorage(STORAGE_KEY, heroMetricId);
    set((state) => {
      const recentRowMetricIds = [
        heroMetricId,
        ...state.recentRowMetricIds.filter((id) => id !== heroMetricId),
      ].slice(0, MAX_RECENT_ROW_METRICS);
      writeStorage(RECENT_METRICS_STORAGE_KEY, JSON.stringify(recentRowMetricIds));
      return { heroMetricId, recentRowMetricIds };
    });
  },
  setFullScreen: (fullScreen) => {
    writeStorage(FULLSCREEN_STORAGE_KEY, fullScreen ? '1' : '0');
    set({ fullScreen });
  },
  setClubView: (clubView) => {
    writeStorage(CLUB_VIEW_STORAGE_KEY, clubView ? '1' : '0');
    set({ clubView });
  },
}));
