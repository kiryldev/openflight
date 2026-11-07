import { create } from 'zustand';
import {
  ACCENT_STORAGE_KEY,
  applyAccent,
  DEFAULT_ACCENT_HEX,
  normalizeAccentHex,
  readStoredAccent,
} from '../theme/accent';
import { useThemeStore } from './useThemeStore';

interface AccentState {
  accent: string;
  setAccent: (hex: string) => void;
  resetAccent: () => void;
}

export const useAccentStore = create<AccentState>((set) => ({
  accent: readStoredAccent(),
  setAccent: (hex) => {
    const next = normalizeAccentHex(hex) ?? DEFAULT_ACCENT_HEX;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
      } catch {
        // Storage can be unavailable; the accent still applies for this session.
      }
    }
    applyAccent(next, useThemeStore.getState().theme);
    set({ accent: next });
  },
  resetAccent: () => {
    useAccentStore.getState().setAccent(DEFAULT_ACCENT_HEX);
  },
}));
