import type { Theme } from './theme';

/** OpenFlight yellow — the project default brand fill. */
export const DEFAULT_ACCENT_HEX = '#ffd400';

export const ACCENT_STORAGE_KEY = 'openflight.accent';

/** Quick picks sized for kiosk taps; first entry is the project default. */
export const ACCENT_PRESETS = [
  { id: 'openflight', hex: '#ffd400' },
  { id: 'amber', hex: '#ffbe1b' },
  { id: 'blue', hex: '#2563eb' },
  { id: 'teal', hex: '#0f766e' },
  { id: 'green', hex: '#15803d' },
  { id: 'red', hex: '#b91c1c' },
  { id: 'violet', hex: '#6d28d9' },
] as const;

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id'];

const HEX_PATTERN = /^#([0-9a-f]{6})$/i;

export function normalizeAccentHex(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function readStoredAccent(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_ACCENT_HEX;
  }

  try {
    return normalizeAccentHex(window.localStorage.getItem(ACCENT_STORAGE_KEY)) ?? DEFAULT_ACCENT_HEX;
  } catch {
    return DEFAULT_ACCENT_HEX;
  }
}

function parseRgb(hex: string): [number, number, number] {
  const raw = hex.slice(1);
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseRgb(hex).map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function mixToward(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = parseRgb(hex);
  const [r2, g2, b2] = parseRgb(target);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function pickOnAccent(block: string): string {
  const white = '#ffffff';
  const black = '#0b0b0c';
  return contrastRatio(white, block) >= contrastRatio(black, block) ? white : black;
}

/**
 * Derive semantic accent tokens from a brand hex.
 * Block keeps the brand; text is shifted until it clears 4.5:1 on the page surface.
 */
export function deriveAccentTokens(hex: string, theme: Theme): {
  base: string;
  accent: string;
  block: string;
  fg: string;
} {
  const base = normalizeAccentHex(hex) ?? DEFAULT_ACCENT_HEX;
  const surface = theme === 'light' ? '#ffffff' : '#383838';
  const toward = theme === 'light' ? '#000000' : '#ffffff';
  let accent = base;

  for (let step = 0; step <= 12 && contrastRatio(accent, surface) < 4.5; step += 1) {
    accent = mixToward(base, toward, Math.min(0.72, 0.12 + step * 0.05));
  }

  return {
    base,
    accent,
    block: base,
    fg: pickOnAccent(base),
  };
}

export function applyAccent(hex: string, theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const tokens = deriveAccentTokens(hex, theme);
  const root = document.documentElement;
  root.style.setProperty('--color-accent-base', tokens.base);
  root.style.setProperty('--color-accent', tokens.accent);
  root.style.setProperty('--color-accent-block', tokens.block);
  root.style.setProperty('--color-accent-fg', tokens.fg);
  root.style.setProperty(
    '--color-accent-soft',
    `color-mix(in oklab, ${tokens.base} ${theme === 'light' ? '16%' : '28%'}, var(--color-surface))`
  );
}
