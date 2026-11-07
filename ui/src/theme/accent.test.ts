import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCENT_STORAGE_KEY,
  applyAccent,
  DEFAULT_ACCENT_HEX,
  deriveAccentTokens,
  normalizeAccentHex,
  readStoredAccent,
} from './accent';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('accent helpers', () => {
  it('normalizes six-digit hex and rejects junk', () => {
    expect(normalizeAccentHex('#FFD400')).toBe('#ffd400');
    expect(normalizeAccentHex('  #2563eb ')).toBe('#2563eb');
    expect(normalizeAccentHex('#fff')).toBeNull();
    expect(normalizeAccentHex('blue')).toBeNull();
  });

  it('defaults to OpenFlight yellow when storage is empty', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
    });
    vi.stubGlobal('window', { localStorage: { getItem: () => null } });
    expect(readStoredAccent()).toBe(DEFAULT_ACCENT_HEX);
  });

  it('reads a stored custom accent', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === ACCENT_STORAGE_KEY ? '#2563eb' : null),
      setItem: () => {},
    });
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => (key === ACCENT_STORAGE_KEY ? '#2563eb' : null),
      },
    });
    expect(readStoredAccent()).toBe('#2563eb');
  });

  it('keeps yellow as the block and picks a dark on-accent foreground', () => {
    const tokens = deriveAccentTokens('#ffd400', 'dark');
    expect(tokens.block).toBe('#ffd400');
    expect(tokens.fg).toBe('#0b0b0c');
  });

  it('darkens light-theme text accent until it clears body contrast', () => {
    const tokens = deriveAccentTokens('#ffd400', 'light');
    expect(tokens.block).toBe('#ffd400');
    expect(tokens.accent).not.toBe('#ffd400');
  });

  it('writes semantic accent variables onto the document', () => {
    const styles = new Map<string, string>();
    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: (name: string, value: string) => {
            styles.set(name, value);
          },
        },
      },
    });

    applyAccent('#2563eb', 'light');

    expect(styles.get('--color-accent-base')).toBe('#2563eb');
    expect(styles.get('--color-accent-block')).toBe('#2563eb');
    expect(styles.get('--color-accent-fg')).toBe('#ffffff');
    expect(styles.get('--color-accent')).toBeTruthy();
    expect(styles.get('--color-accent-soft')).toContain('color-mix');
  });
});
