import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccentColorPicker } from './AccentColorPicker';

describe('AccentColorPicker', () => {
  it('renders preset swatches and a color-wheel control in the same row', () => {
    const html = renderToString(<AccentColorPicker />);
    const css = readFileSync(fileURLToPath(new URL('./panel.css', import.meta.url)), 'utf8');

    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-label="Default"');
    expect(html).toContain('aria-label="Blue"');
    expect(html).toContain('menu-sheet__swatch--wheel');
    expect(html).toContain('type="color"');
    expect(html).toContain('aria-label="Custom color"');
    expect(html).toContain('value="#ffd400"');
    expect(html).not.toContain('Custom accent');
    expect(html).not.toContain('menu-sheet__color-field');
    expect(css).toMatch(/\.menu-sheet__swatches \{[^}]*flex-wrap: nowrap/);
  });
});
