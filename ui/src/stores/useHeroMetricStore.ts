import { create } from 'zustand';

const STORAGE_KEY = 'openflight.hero-metric';
const FULLSCREEN_STORAGE_KEY = 'openflight.hero-expanded';

/**
 * Which Live metric is selected: yellow title in the grid, and the value shown
 * in full-screen mode. Persisted so someone who cares about club speed keeps
 * that choice across restarts.
 *
 * Stored as a plain metric id; an id that no longer exists falls back to the
 * first metric of the current set in LivePanel.
 */
function readStoredHeroMetric(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Default on so the big-screen number is visible until Full screen is turned off. */
function readStoredFullScreen(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const stored = window.localStorage.getItem(FULLSCREEN_STORAGE_KEY);
    if (stored === null) {
      return true;
    }
    return stored !== '0';
  } catch {
    return true;
  }
}

interface HeroMetricState {
  heroMetricId: string | null;
  fullScreen: boolean;
  setHeroMetricId: (id: string) => void;
  setFullScreen: (fullScreen: boolean) => void;
}

export const useHeroMetricStore = create<HeroMetricState>((set) => ({
  heroMetricId: readStoredHeroMetric(),
  fullScreen: readStoredFullScreen(),
  setHeroMetricId: (heroMetricId) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, heroMetricId);
      } catch {
        // Storage can be unavailable (private mode, quota); the choice still
        // applies for this session.
      }
    }

    set({ heroMetricId });
  },
  setFullScreen: (fullScreen) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(FULLSCREEN_STORAGE_KEY, fullScreen ? '1' : '0');
      } catch {
        // Same as metric id: keep the in-memory choice when storage fails.
      }
    }

    set({ fullScreen });
  },
}));
