import { ACCENT_PRESETS } from '../../theme/accent';
import { useAccentStore } from '../../stores/useAccentStore';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

/**
 * Accent controls for the menu sheet: preset swatches plus a color-wheel
 * swatch that opens the native picker.
 */
export function AccentColorPicker() {
  const { t } = useI18n();
  const accent = useAccentStore((state) => state.accent);
  const setAccent = useAccentStore((state) => state.setAccent);
  const isCustom = !ACCENT_PRESETS.some((preset) => preset.hex === accent);

  return (
    <section className="menu-sheet__section">
      <span className="menu-sheet__section-title">{t('menu.accent')}</span>
      <div className="menu-sheet__swatches" role="listbox" aria-label={t('menu.accentPresets')}>
        {ACCENT_PRESETS.map((preset) => {
          const selected = accent === preset.hex;
          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              className={`menu-sheet__swatch${selected ? ' menu-sheet__swatch--selected' : ''}`}
              style={{ background: preset.hex }}
              aria-selected={selected}
              aria-label={t(`menu.accentPreset.${preset.id}` as MessageKey)}
              onClick={() => setAccent(preset.hex)}
            />
          );
        })}
        <label
          className={`menu-sheet__swatch menu-sheet__swatch--wheel${isCustom ? ' menu-sheet__swatch--selected' : ''}`}
          role="option"
          aria-selected={isCustom}
        >
          <input
            type="color"
            className="menu-sheet__swatch-color-input"
            value={accent}
            aria-label={t('menu.accentCustom')}
            onChange={(event) => setAccent(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
